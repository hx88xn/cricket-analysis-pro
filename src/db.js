// ============================================================================
// JSON-file database for Cricket Analysis Pro (main process)
// ----------------------------------------------------------------------------
// We avoid a native SQLite dependency (none is installed and electron-builder
// would have to recompile it). Instead the whole dataset lives in a single
// JSON document under the Electron userData directory. It is seeded from
// src/seed/seed.js on first run, then read/written in place. The shape is the
// relational model the UI expects: teams, players, competitions, officials,
// grounds, matchTypes and matches.
// ============================================================================

const fs = require("fs");
const path = require("path");
const { buildSeed } = require("./seed/seed");

let DB_FILE = null;
let cache = null;

function init(userDataDir) {
  DB_FILE = path.join(userDataDir, "cricket-db.json");
  cache = read();
  return cache;
}

function read() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.teams)) return data;
  } catch {
    /* not yet created or unreadable -> seed below */
  }
  const seeded = buildSeed();
  write(seeded);
  return seeded;
}

function write(data) {
  cache = data;
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("db write failed", e);
  }
}

function db() {
  if (!cache) cache = read();
  return cache;
}

function genId(prefix, list) {
  let n = list.length + 1;
  let id = `${prefix}${n}`;
  const taken = new Set(list.map((x) => x.id));
  while (taken.has(id)) {
    n += 1;
    id = `${prefix}${n}`;
  }
  return id;
}

// ---- Read helpers ---------------------------------------------------------

function teams() {
  return db().teams.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function playersByTeam(teamId) {
  return db()
    .players.filter((p) => p.teamId === teamId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function allPlayers() {
  return db().players.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function competitions() {
  return db().competitions.slice();
}

function officials(role) {
  const list = db().officials.slice();
  return role ? list.filter((o) => o.role === role) : list;
}

function grounds() {
  return db().grounds.slice();
}

function matchTypes() {
  return db().matchTypes.slice();
}

function matches() {
  return db()
    .matches.slice()
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function getMatch(id) {
  return db().matches.find((m) => m.id === id) || null;
}

// A registration row needs the squad expanded into player objects so the UI
// can render names without round-tripping per player.
function getMatchExpanded(id) {
  const m = getMatch(id);
  if (!m) return null;
  const players = db().players;
  const byId = (pid) => players.find((p) => p.id === pid) || null;
  const expandSide = (side) => ({
    ...side,
    squadPlayers: (side.squad || []).map(byId).filter(Boolean),
    playingXIPlayers: (side.playingXI || []).map(byId).filter(Boolean),
  });
  return { ...m, teamA: expandSide(m.teamA), teamB: expandSide(m.teamB) };
}

// ---- Write helpers --------------------------------------------------------

function saveTeam(team) {
  const data = db();
  if (team.id) {
    const i = data.teams.findIndex((t) => t.id === team.id);
    if (i >= 0) data.teams[i] = { ...data.teams[i], ...team };
    else data.teams.push(team);
  } else {
    team.id = genId("t", data.teams);
    data.teams.push(team);
  }
  write(data);
  return team;
}

function savePlayer(player) {
  const data = db();
  if (player.teamId) {
    const t = data.teams.find((x) => x.id === player.teamId);
    if (t) player.teamName = t.name;
  }
  if (player.id) {
    const i = data.players.findIndex((p) => p.id === player.id);
    if (i >= 0) data.players[i] = { ...data.players[i], ...player };
    else data.players.push(player);
  } else {
    player.id = genId("p", data.players);
    data.players.push(player);
  }
  write(data);
  return player;
}

function saveMatch(match) {
  const data = db();
  if (match.id) {
    const i = data.matches.findIndex((m) => m.id === match.id);
    if (i >= 0) {
      data.matches[i] = { ...data.matches[i], ...match };
      write(data);
      return data.matches[i];
    }
  }
  match.id = match.id || genId("m", data.matches);
  match.createdAt = match.createdAt || new Date().toISOString();
  match.status = match.status || "RESUME";
  data.matches.push(match);
  write(data);
  return match;
}

function saveMatchState(id, scoringState, status) {
  const data = db();
  const m = data.matches.find((x) => x.id === id);
  if (!m) return null;
  m.state = scoringState;
  if (status) m.status = status;
  m.updatedAt = new Date().toISOString();
  write(data);
  return m;
}

function deleteMatch(id) {
  const data = db();
  const before = data.matches.length;
  data.matches = data.matches.filter((m) => m.id !== id);
  write(data);
  return { deleted: before - data.matches.length };
}

module.exports = {
  init,
  teams,
  playersByTeam,
  allPlayers,
  competitions,
  officials,
  grounds,
  matchTypes,
  matches,
  getMatch,
  getMatchExpanded,
  saveTeam,
  savePlayer,
  saveMatch,
  saveMatchState,
  deleteMatch,
};
