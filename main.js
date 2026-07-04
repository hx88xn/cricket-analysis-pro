const { app, BrowserWindow, ipcMain, dialog, Menu, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const db = require("./src/db");

if (process.env.ELECTRON_DOCKER === "1") {
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-dev-shm-usage");
}

const DEFAULT_CONFIG = {
  recordingsPath: "",
  databasePath: "",
  cameraDeviceId: "",
  shortcuts: {},
  videoResolution: "1280x720",
  videoBitrate: "Medium",
  recordAudio: false,
  localCapture: false,
  deinterlace: false,
  operationMode: "Offline",
};

function configFilePath() {
  return path.join(app.getPath("userData"), "config.json");
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(configFilePath(), "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(next) {
  const merged = { ...DEFAULT_CONFIG, ...next };
  fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
  fs.writeFileSync(configFilePath(), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

// Default database location: keep the dev DB inside the repo (data/cricket.sqlite)
// so it is versioned alongside the code; packaged, __dirname lives inside the
// read-only app.asar, so fall back to the per-user userData dir instead.
function defaultDbFile() {
  const dir = app.isPackaged ? app.getPath("userData") : path.join(__dirname, "data");
  return path.join(dir, "cricket.sqlite");
}

// The database the app should open: an explicit user-chosen file when set in
// config, otherwise the default location.
function resolveDbFile() {
  const p = (loadConfig().databasePath || "").trim();
  return p || defaultDbFile();
}

// Remove a SQLite file and its WAL/SHM sidecars so a fresh DB can be created
// cleanly in its place.
function removeDbFiles(filePath) {
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(filePath + suffix, { force: true });
    } catch {
      /* ignore */
    }
  }
}

ipcMain.handle("config:get", () => loadConfig());

ipcMain.handle("config:set", (_event, patch) => {
  const cur = loadConfig();
  return saveConfig({ ...cur, ...patch });
});

ipcMain.handle("dialog:select-directory", async (event, opts) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: opts?.title || "Select folder",
    defaultPath: opts?.defaultPath || undefined,
    properties: ["openDirectory", "createDirectory"],
  });
  if (canceled || !filePaths?.length) return { canceled: true };
  return { canceled: false, path: filePaths[0] };
});

ipcMain.handle("dialog:select-database-file", async (event, opts) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: opts?.title || "Select database file",
    defaultPath: opts?.defaultPath || undefined,
    properties: ["openFile"],
    filters: [
      { name: "SQLite", extensions: ["sqlite", "db"] },
      { name: "All files", extensions: ["*"] },
    ],
  });
  if (canceled || !filePaths?.length) return { canceled: true };
  return { canceled: false, path: filePaths[0] };
});

// Sanitise an untrusted folder/file segment so it can't escape the root.
function safeSegment(s) {
  return String(s || "").replace(/[^A-Za-z0-9 _-]/g, "").replace(/\s+/g, " ").trim();
}

// Sanitise an untrusted relative subpath (e.g. "Tournament/Match") segment by
// segment so it can't escape the recordings root, then join with the OS sep.
function safeSubpath(rel) {
  return String(rel || "")
    .split(/[\\/]+/)
    .map(safeSegment)
    .filter(Boolean)
    .join(path.sep);
}

// Create the per-match subfolder under the configured recordings root. Called
// as soon as a match opens so its folder exists before any recording. Returns
// { ok, path } when a root is configured, otherwise { ok:false } so the renderer
// knows it will have to fall back to the Save As dialog on capture.
ipcMain.handle("recordings:ensure-folder", async (_event, folderName) => {
  const cfg = loadConfig();
  const root = (cfg.recordingsPath || "").trim();
  const sub = safeSubpath(folderName);
  if (!root || !sub) return { ok: false };
  try {
    const dir = path.join(root, sub);
    await fs.promises.mkdir(dir, { recursive: true });
    return { ok: true, path: dir };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
});

ipcMain.handle("save-recording", async (event, arrayBuffer, defaultName, subfolder) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const cfg = loadConfig();
  const baseName = defaultName || "cricket-capture.webm";
  const root = (cfg.recordingsPath || "").trim();
  const sub = safeSubpath(subfolder);

  // If a recordings root is configured, save straight into it (inside the
  // per-match subfolder when given) without prompting. Dialog only on failure.
  if (root) {
    try {
      const dir = sub ? path.join(root, sub) : root;
      await fs.promises.mkdir(dir, { recursive: true });
      const filePath = path.join(dir, path.basename(baseName));
      await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
      return { ok: true, filePath, auto: true };
    } catch {
      /* fall through to the save dialog */
    }
  }

  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    defaultPath: baseName,
    filters: [{ name: "WebM video", extensions: ["webm"] }],
  });
  if (canceled || !filePath) {
    return { ok: false, canceled: true };
  }
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
  return { ok: true, filePath };
});

// Count the video files actually saved in a match's recordings subfolder, so the
// Video Count Validation screen can compare real clips against balls coded.
ipcMain.handle("recordings:count", async (_event, folderName, innings) => {
  const cfg = loadConfig();
  const root = (cfg.recordingsPath || "").trim();
  if (!root) return { ok: false, reason: "no-root" };
  const sub = safeSubpath(folderName);
  const dir = sub ? path.join(root, sub) : root;
  // When an innings is given, only count clips whose filename carries that
  // innings' INN<n> label (see the capture filename in renderer.js).
  const innTag = innings ? new RegExp(`INN${Number(innings)}\\b`, "i") : null;
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const count = entries.filter((e) =>
      e.isFile() &&
      /\.(webm|mp4|mov|mkv|avi|m4v)$/i.test(e.name) &&
      (!innTag || innTag.test(e.name))).length;
    return { ok: true, count, dir };
  } catch (e) {
    return { ok: false, reason: "no-dir", error: String((e && e.message) || e) };
  }
});

// ---- Database IPC ---------------------------------------------------------

ipcMain.handle("db:teams", () => db.teams());
ipcMain.handle("db:players", (_e, teamId) => (teamId ? db.playersByTeam(teamId) : db.allPlayers()));
ipcMain.handle("db:competitions", () => db.competitions());
ipcMain.handle("db:officials", (_e, role) => db.officials(role));
ipcMain.handle("db:grounds", () => db.grounds());
ipcMain.handle("db:matchTypes", () => db.matchTypes());
ipcMain.handle("db:masters", (_e, category) => db.masters(category));
ipcMain.handle("db:master:save", (_e, item) => db.saveMaster(item));
ipcMain.handle("db:master:delete", (_e, id) => db.deleteMaster(id));
ipcMain.handle("db:master:reorder", (_e, { category, grp, ids }) => db.reorderMaster(category, grp, ids));
ipcMain.handle("db:matches", () => db.matches());
ipcMain.handle("db:match:get", (_e, id) => db.getMatchExpanded(id));
ipcMain.handle("db:team:save", (_e, team) => db.saveTeam(team));
ipcMain.handle("db:team:delete", (_e, id) => db.deleteTeam(id));
ipcMain.handle("db:player:save", (_e, player) => db.savePlayer(player));
ipcMain.handle("db:player:reorder", (_e, { teamId, ids }) => db.reorderPlayers(teamId, ids));
ipcMain.handle("db:player:delete", (_e, id) => db.deletePlayer(id));
ipcMain.handle("db:official:save", (_e, o) => db.saveOfficial(o));
ipcMain.handle("db:official:delete", (_e, id) => db.deleteOfficial(id));
ipcMain.handle("db:ground:save", (_e, g) => db.saveGround(g));
ipcMain.handle("db:ground:delete", (_e, id) => db.deleteGround(id));
ipcMain.handle("db:bowlerSpecs", () => db.bowlerSpecs());
ipcMain.handle("db:bowlerSpec:save", (_e, s) => db.saveBowlerSpec(s));
ipcMain.handle("db:bowlerSpec:delete", (_e, id) => db.deleteBowlerSpec(id));
ipcMain.handle("db:coaches", () => db.coaches());
ipcMain.handle("db:coach:save", (_e, c) => db.saveCoach(c));
ipcMain.handle("db:coach:delete", (_e, id) => db.deleteCoach(id));
ipcMain.handle("db:import", async (event, { mode }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: mode === "master" ? "Import Master Data" : "Import Reconciled Data",
    filters: [{ name: "SQLite database", extensions: ["sqlite", "db", "sqlite3"] }],
    properties: ["openFile"],
  });
  if (canceled || !filePaths?.length) return { canceled: true };
  return db.importFromFile(filePaths[0], mode);
});
ipcMain.handle("db:competition:save", (_e, c) => db.saveCompetition(c));
ipcMain.handle("db:competition:delete", (_e, id) => db.deleteCompetition(id));
ipcMain.handle("db:match:save", (_e, match) => db.saveMatch(match));
ipcMain.handle("db:match:saveState", (_e, { id, state, status }) => db.saveMatchState(id, state, status));
ipcMain.handle("db:match:delete", (_e, id) => db.deleteMatch(id));
ipcMain.handle("db:report:bowling", (_e, matchId) => db.bowlingFigures(matchId));
ipcMain.handle("db:report:batting", (_e, matchId) => db.battingCard(matchId));

// ---- Database management (open / new / export for file hand-off) ----------

ipcMain.handle("db:current", () => ({ path: db.currentFile() }));

// Switch the live database to an existing file. On any failure (e.g. the file
// is not a valid SQLite database) re-open the previous one so the app keeps
// working, and report the error.
ipcMain.handle("db:switch", (_e, filePath) => {
  const prev = db.currentFile();
  if (!filePath) return { ok: true, path: prev };
  // Selecting the file that is already open: no reload needed, but still record
  // it as the user's explicit, saved choice so the config screen reflects it.
  if (filePath === prev) {
    saveConfig({ ...loadConfig(), databasePath: filePath });
    return { ok: true, path: filePath };
  }
  try {
    db.close();
    db.init(filePath);
    saveConfig({ ...loadConfig(), databasePath: filePath });
    return { ok: true, path: filePath };
  } catch (err) {
    try {
      db.close();
      db.init(prev);
    } catch {
      /* best effort */
    }
    return { ok: false, error: String((err && err.message) || err) };
  }
});

// Create a fresh, blank (seeded) database at a chosen path and switch to it.
ipcMain.handle("db:new", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: "Create new database",
    defaultPath: "match.sqlite",
    filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  const prev = db.currentFile();
  try {
    db.close();
    removeDbFiles(filePath); // guarantee a truly blank database
    db.init(filePath, { seed: false }); // schema + Masters only, no demo records
    saveConfig({ ...loadConfig(), databasePath: filePath });
    return { ok: true, path: filePath };
  } catch (err) {
    try {
      db.close();
      db.init(prev);
    } catch {
      /* best effort */
    }
    return { ok: false, error: String((err && err.message) || err) };
  }
});

// Empty the CURRENT database in place: delete the live file (+ WAL/SHM) and
// recreate it blank (schema + Masters option lists, no demo records) at the same
// path. Used by "Clear all data" to wipe a database that was seeded by an older
// build, without making the user hunt down the file under userData.
ipcMain.handle("db:reset", () => {
  const file = db.currentFile();
  if (!file) return { ok: false, error: "No database open." };
  try {
    db.close();
    removeDbFiles(file); // guarantee a truly blank database
    db.init(file, { seed: false });
    return { ok: true, path: file };
  } catch (err) {
    try {
      db.init(file);
    } catch {
      /* best effort */
    }
    return { ok: false, error: String((err && err.message) || err) };
  }
});

// Export a consistent copy of the CURRENT database (does not switch to it).
ipcMain.handle("db:export", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: "Export / back up database",
    defaultPath: "cricket-export.sqlite",
    filters: [{ name: "SQLite", extensions: ["sqlite", "db"] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  try {
    await db.backupTo(filePath);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
});

function createWindow() {
  // Create the window already at the full work-area size so the renderer's first
  // layout happens at the final dimensions — no open-then-maximize resize that
  // would make the scaled UI visibly re-fit.
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width,
    height,
    minWidth: 1360,
    minHeight: 820,
    backgroundColor: "#050b14",
    autoHideMenuBar: true, // hide the File/Edit/View strip on Windows/Linux
    icon: path.join(__dirname, "src", "assets", "app-icon.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.maximize();
  win.once("ready-to-show", () => win.show());

  // Dev affordance: CAP_START="prototype.html?screen=match-registration" jumps
  // straight to a screen so individual flows can be inspected in isolation.
  const start = process.env.CAP_START;
  if (start) {
    const [file, query] = start.split("?");
    win.loadFile(path.join(__dirname, "src", file), query ? { search: query } : undefined);
  } else {
    win.loadFile(path.join(__dirname, "src", "home.html"));
  }
}

// One-time cleanup for machines upgraded from an older build that auto-seeded
// the demo dataset into the user's database. The current build never seeds when
// packaged, but it also never wipes an existing file — so that leftover sample
// data keeps showing up. If the DEFAULT database still holds ONLY the pristine
// sample dataset (nothing the user added or scored), retire it to a .bak and
// start fresh & empty. Conservative by design: it never touches a database the
// user explicitly opened, or one that has any real work in it.
//
// Demo rows from buildSeed() use zero-padded ids (teams t01.., competition c01,
// players p001..); user-created rows use non-padded ids via genId (t1, c1), so
// the padding is a reliable "this is untouched sample data" signature.
function healDefaultDemoDb() {
  if (!app.isPackaged) return; // dev intentionally keeps its seeded data
  if ((loadConfig().databasePath || "").trim()) return; // user chose a file — leave it
  try {
    const teams = db.teams();
    const comps = db.competitions();
    const pristineDemo =
      teams.length > 0 && teams.every((t) => /^t\d\d$/.test(t.id)) && // only demo teams (t01..)
      comps.length > 0 && comps.every((c) => /^c\d\d$/.test(c.id)) && // only demo comps (c01..)
      db.matches().length <= 1 && // at most the single demo match (m0001)
      db.ballCount() === 0; // no deliveries scored => no real work
    if (!pristineDemo) return;

    const file = db.currentFile();
    db.close();
    try {
      fs.renameSync(file, `${file}.sample-${Date.now()}.bak`); // keep, don't destroy
    } catch {
      /* if rename fails, removeDbFiles below still clears it */
    }
    removeDbFiles(file); // drop the original (if still present) + WAL/SHM sidecars
    db.init(file, { seed: false }); // schema + Masters only
  } catch {
    // Best effort: if anything looks off, leave the database exactly as it was.
    try {
      if (!db.currentFile()) db.init(resolveDbFile(), { seed: false });
    } catch {
      /* ignore */
    }
  }
}

app.whenReady().then(() => {
  // Only seed the demo dataset (sample teams, players, competitions) in dev so
  // those flows are easy to inspect. A packaged build starts empty — schema +
  // Masters option lists only — so a fresh install isn't pre-filled with sample
  // data (ensureMasters/ensureColumns still run regardless, inside init).
  db.init(resolveDbFile(), { seed: !app.isPackaged });
  healDefaultDemoDb(); // clear sample data left by an older auto-seeding build
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
