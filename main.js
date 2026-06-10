const { app, BrowserWindow, ipcMain, dialog } = require("electron");
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
ipcMain.handle("db:player:delete", (_e, id) => db.deletePlayer(id));
ipcMain.handle("db:official:save", (_e, o) => db.saveOfficial(o));
ipcMain.handle("db:official:delete", (_e, id) => db.deleteOfficial(id));
ipcMain.handle("db:ground:save", (_e, g) => db.saveGround(g));
ipcMain.handle("db:ground:delete", (_e, id) => db.deleteGround(id));
ipcMain.handle("db:competition:save", (_e, c) => db.saveCompetition(c));
ipcMain.handle("db:competition:delete", (_e, id) => db.deleteCompetition(id));
ipcMain.handle("db:match:save", (_e, match) => db.saveMatch(match));
ipcMain.handle("db:match:saveState", (_e, { id, state, status }) => db.saveMatchState(id, state, status));
ipcMain.handle("db:match:delete", (_e, id) => db.deleteMatch(id));
ipcMain.handle("db:report:bowling", (_e, matchId) => db.bowlingFigures(matchId));
ipcMain.handle("db:report:batting", (_e, matchId) => db.battingCard(matchId));

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1360,
    minHeight: 820,
    backgroundColor: "#141a24",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
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

app.whenReady().then(() => {
  // Dev: keep the live DB inside the repo (data/cricket.sqlite) so it is
  // versioned alongside the code. Packaged: __dirname lives inside the
  // read-only app.asar, so write to the per-user userData dir instead.
  const dbDir = app.isPackaged ? app.getPath("userData") : path.join(__dirname, "data");
  db.init(dbDir);
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
