const { app, BrowserWindow, ipcMain, dialog, Menu, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const db = require("./src/db");

// Locate ffmpeg/ffprobe: prefer common install paths (a packaged app's PATH may
// not include Homebrew), else fall back to a bare PATH lookup.
function findBinary(name) {
  for (const c of [`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`, `/usr/bin/${name}`]) {
    try { if (fs.existsSync(c)) return c; } catch { /* ignore */ }
  }
  return name;
}
const FFMPEG = findBinary("ffmpeg");
const FFPROBE = findBinary("ffprobe");

function run(bin, args) {
  return new Promise((resolve, reject) => {
    execFile(bin, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve({ stdout, stderr });
    });
  });
}

async function hasAudioStream(file) {
  try {
    const { stdout } = await run(FFPROBE,
      ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file]);
    return stdout.trim().length > 0;
  } catch { return false; }
}

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
  // per-match subfolder when given) without prompting. The user has explicitly
  // told us where to save, so on failure we surface the real error instead of
  // silently popping the OS Save As dialog (which just looks like the configured
  // path was ignored). The interactive dialog is only for the no-root case.
  if (root) {
    const dir = sub ? path.join(root, sub) : root;
    const filePath = path.join(dir, path.basename(baseName));
    try {
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
      return { ok: true, filePath, auto: true };
    } catch (err) {
      console.error("save-recording: could not write into configured root", filePath, err);
      return { ok: false, error: String((err && err.message) || err), filePath };
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

// Fetch the video clip saved for a specific ball so the coding screen's mini
// player can play it back. Matches the ball's INN/OVER/BALL label within the
// match folder and returns the file bytes (played as a blob: URL in the
// renderer, since the recordings root is outside the app's file:// origin and
// blocked by CSP). Only files under the configured root are ever read.
ipcMain.handle("recordings:clip", async (_event, folderName, innings, over, ball) => {
  const cfg = loadConfig();
  const root = (cfg.recordingsPath || "").trim();
  if (!root) return { ok: false, reason: "no-root" };
  const sub = safeSubpath(folderName);
  const dir = sub ? path.join(root, sub) : root;
  const label = `INN${Number(innings)}-OVER${Number(over)}-BALL${Number(ball)}`;
  try {
    const entries = await fs.promises.readdir(dir);
    // Exact label boundary so BALL1 doesn't also match BALL10/BALL11.
    const rx = new RegExp(`${label}(?![0-9])`);
    const name = entries.find((n) =>
      rx.test(n) && /\.(webm|mp4|mov|mkv|avi|m4v)$/i.test(n));
    if (!name) return { ok: false, reason: "not-found" };
    const ext = path.extname(name).slice(1).toLowerCase();
    const mime = ext === "mp4" || ext === "m4v" ? "video/mp4"
      : ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : `video/${ext}`;
    const buf = await fs.promises.readFile(path.join(dir, name));
    return { ok: true, name, mime, bytes: buf };
  } catch (e) {
    return { ok: false, reason: "no-dir", error: String((e && e.message) || e) };
  }
});

// List the saved clips for a match (optionally one innings), sorted by over/ball,
// for the Movie Organiser. Parses the OVER/BALL label out of each filename.
ipcMain.handle("recordings:list", async (_event, folderName, innings) => {
  const cfg = loadConfig();
  const root = (cfg.recordingsPath || "").trim();
  if (!root) return { ok: false, reason: "no-root" };
  const sub = safeSubpath(folderName);
  const dir = sub ? path.join(root, sub) : root;
  const innTag = innings ? new RegExp(`INN${Number(innings)}(?![0-9])`, "i") : null;
  try {
    const entries = await fs.promises.readdir(dir);
    const clips = entries
      .filter((n) => /\.(webm|mp4|mov|mkv|avi|m4v)$/i.test(n) && (!innTag || innTag.test(n)))
      .map((n) => {
        const m = /OVER(\d+)-BALL(\d+)/i.exec(n);
        return { name: n, over: m ? Number(m[1]) : null, ball: m ? Number(m[2]) : null };
      })
      .sort((a, b) => (a.over - b.over) || (a.ball - b.ball) || a.name.localeCompare(b.name));
    return { ok: true, clips, dir };
  } catch (e) {
    return { ok: false, reason: "no-dir", error: String((e && e.message) || e) };
  }
});

// Read a clip's bytes by filename (for the Movie Organiser's preview player).
ipcMain.handle("recordings:clipBytes", async (_event, folderName, name) => {
  const cfg = loadConfig();
  const root = (cfg.recordingsPath || "").trim();
  if (!root) return { ok: false, reason: "no-root" };
  const sub = safeSubpath(folderName);
  const dir = sub ? path.join(root, sub) : root;
  try {
    // path.basename strips any directory parts so the read can't escape dir,
    // while keeping the extension (unlike safeSegment, which drops the dot).
    const buf = await fs.promises.readFile(path.join(dir, path.basename(String(name || ""))));
    const ext = path.extname(name).slice(1).toLowerCase();
    const mime = ext === "mp4" || ext === "m4v" ? "video/mp4"
      : ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : `video/${ext}`;
    return { ok: true, mime, bytes: buf };
  } catch (e) {
    return { ok: false, reason: "read-failed", error: String((e && e.message) || e) };
  }
});

// Trim each selected clip to its in/out points, normalise them to a common
// format, concatenate into one movie, and save it where the user chooses.
ipcMain.handle("movie:export", async (event, folderName, segments, defaultName) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const cfg = loadConfig();
  const root = (cfg.recordingsPath || "").trim();
  if (!root) return { ok: false, reason: "no-root" };
  if (!Array.isArray(segments) || !segments.length) return { ok: false, reason: "no-clips" };
  const sub = safeSubpath(folderName);
  const dir = sub ? path.join(root, sub) : root;

  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    defaultPath: defaultName || "match-movie.mp4",
    filters: [{ name: "MP4 video", extensions: ["mp4"] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  // Every segment is normalised to 1280x720 / 30fps / H.264 + AAC so the parts
  // can be concatenated with a plain stream copy.
  const VF = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30";
  const work = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cricmovie-"));
  try {
    const parts = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i] || {};
      const inFile = path.join(dir, path.basename(String(seg.name || "")));
      if (!fs.existsSync(inFile)) continue;
      const out = path.join(work, `part${String(i).padStart(3, "0")}.mp4`);
      const inSec = Number(seg.in) > 0 ? Number(seg.in) : 0;
      const outSec = seg.out != null && seg.out !== "" ? Number(seg.out) : null;
      const trim = [];
      if (inSec > 0) trim.push("-ss", String(inSec));
      if (outSec != null && outSec > inSec) trim.push("-t", String(outSec - inSec));
      const audio = await hasAudioStream(inFile);
      const args = audio
        ? ["-y", ...trim, "-i", inFile, "-vf", VF, "-c:v", "libx264", "-preset", "veryfast",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "128k", out]
        : ["-y", ...trim, "-i", inFile, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
           "-vf", VF, "-map", "0:v:0", "-map", "1:a:0", "-shortest", "-c:v", "libx264", "-preset", "veryfast",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", out];
      await run(FFMPEG, args);
      parts.push(out);
    }
    if (!parts.length) return { ok: false, reason: "no-valid-clips" };
    const listFile = path.join(work, "list.txt");
    await fs.promises.writeFile(listFile,
      parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
    const finalTmp = path.join(work, "movie.mp4");
    await run(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", finalTmp]);
    await fs.promises.copyFile(finalTmp, filePath);
    return { ok: true, filePath, count: parts.length };
  } catch (e) {
    return { ok: false, reason: "ffmpeg-failed", error: String((e && e.message) || e) };
  } finally {
    try { await fs.promises.rm(work, { recursive: true, force: true }); } catch { /* ignore */ }
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
    // Keep mins below small Windows laptop screens (1366x768 minus taskbar):
    // the renderer scale-to-fits any size, so a forced-too-tall window would
    // only clip against the screen edge.
    minWidth: 1024,
    minHeight: 640,
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

  // Fullscreen toggle for Windows/Linux. macOS gets it natively via the green
  // traffic-light button, but with autoHideMenuBar there is no visible control
  // on Windows — so bind F11 (and Alt+Enter) directly, independent of any menu.
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const f11 = input.key === "F11";
    const altEnter = input.alt && input.key === "Enter";
    if (f11 || altEnter) {
      event.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });

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
