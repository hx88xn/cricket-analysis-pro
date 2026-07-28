// ============================================================================
// SQLite database for CRICPRO (main process)
// ----------------------------------------------------------------------------
// Single-machine desktop deployment: the whole dataset lives in an embedded
// SQLite file under the Electron userData directory (single process, single
// writer — no DB server, no network surface). On first run the schema is
// created and seeded from src/seed/seed.js (buildSeed()), then read/written in
// place with prepared statements and transactions.
//
// This module is the only place that touches storage. Its exported functions
// and their return/argument shapes are an API contract consumed by preload.js,
// the db:* IPC handlers in main.js, and prototype.js / renderer.js — they must
// not change, so callers stay storage-agnostic.
// ============================================================================

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { buildSeed, buildMasters, MATCH_TYPES } = require("./seed/seed");

let db = null; // better-sqlite3 instance
let dbFile = null; // absolute path of the currently open database file

// ---- schema ---------------------------------------------------------------

const SCHEMA = `
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY, name TEXT, code TEXT, type TEXT
);
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY, team_id TEXT, name TEXT, short_name TEXT, role TEXT,
  batting_style TEXT, batting_style_code TEXT, bowling_style TEXT,
  bowling_type TEXT, bowling_spec TEXT, dob TEXT, sort_order INTEGER
);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY, name TEXT, trophy TEXT, season TEXT, format TEXT,
  match_type TEXT, start_date TEXT, end_date TEXT
);
CREATE TABLE IF NOT EXISTS competition_teams (
  competition_id TEXT, team_id TEXT,
  PRIMARY KEY (competition_id, team_id)
);
-- Officials (umpires / match referees) allocated to a competition. Match
-- Registration and Fixtures offer only these officials once a competition has
-- an allocation; an empty allocation means "any official from the master".
CREATE TABLE IF NOT EXISTS competition_officials (
  competition_id TEXT, official_id TEXT,
  PRIMARY KEY (competition_id, official_id)
);
CREATE TABLE IF NOT EXISTS officials (
  id TEXT PRIMARY KEY, name TEXT, role TEXT, country TEXT, category TEXT
);
CREATE TABLE IF NOT EXISTS grounds (
  id TEXT PRIMARY KEY, name TEXT, country TEXT, state TEXT, city TEXT
);
CREATE TABLE IF NOT EXISTS bowler_specs (
  id TEXT PRIMARY KEY, name TEXT, bowling_type TEXT, bowling_style TEXT
);
CREATE TABLE IF NOT EXISTS coaches (
  id TEXT PRIMARY KEY, name TEXT, teams TEXT, specializations TEXT, image TEXT
);
CREATE TABLE IF NOT EXISTS match_types (
  name TEXT PRIMARY KEY, ord INTEGER
);
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY, competition_id TEXT, competition_name TEXT,
  match_name TEXT, match_type TEXT, overs INTEGER, match_date TEXT,
  ground_id TEXT, venue_name TEXT, neutral_venue INTEGER, day_night INTEGER,
  umpire1_id TEXT, umpire2_id TEXT, umpire3_id TEXT, referee_id TEXT,
  status TEXT, created_at TEXT, updated_at TEXT,
  team_a_id TEXT, team_a_name TEXT, team_a_code TEXT,
  team_a_captain_id TEXT, team_a_keeper_id TEXT,
  team_b_id TEXT, team_b_name TEXT, team_b_code TEXT,
  team_b_captain_id TEXT, team_b_keeper_id TEXT
);
CREATE TABLE IF NOT EXISTS match_squad (
  match_id TEXT, side TEXT, player_id TEXT,
  in_xi INTEGER, squad_order INTEGER, xi_order INTEGER
);
CREATE INDEX IF NOT EXISTS idx_squad_match ON match_squad(match_id, side);
CREATE TABLE IF NOT EXISTS match_state (
  match_id TEXT PRIMARY KEY, json TEXT
);
CREATE TABLE IF NOT EXISTS balls (
  id INTEGER PRIMARY KEY AUTOINCREMENT, match_id TEXT, seq INTEGER,
  num TEXT, bowler TEXT, striker TEXT, nonstriker TEXT,
  bowl_type TEXT, shot_type TEXT, runs INTEGER, ext TEXT, created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_balls_match ON balls(match_id, seq);
CREATE TABLE IF NOT EXISTS masters (
  id TEXT PRIMARY KEY, category TEXT, grp TEXT, name TEXT, ord INTEGER
);
CREATE INDEX IF NOT EXISTS idx_masters_cat ON masters(category, grp, ord);
CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT);
`;

// ---- init + seed ----------------------------------------------------------

// Open (and if needed create + seed) the database at an absolute file path.
// The directory holding the file doubles as the lookup root for the legacy
// JSON import, so a fresh file in any folder still gets seeded correctly.
//
// Pass { seed: false } to create a genuinely empty database: schema + the
// Masters option lists only, with NO sample teams/players/competitions. Used
// by "New blank database" so a fresh hand-off file starts clean rather than
// pre-filled with the demo dataset.
function init(filePath, { seed: doSeed = true } = {}) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  db = new Database(filePath);
  dbFile = filePath;
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  if (doSeed && db.prepare("SELECT COUNT(*) c FROM teams").get().c === 0) {
    seed(maybeImportJson(dir) || buildSeed());
  }
  ensureColumns(); // add/back-fill columns added after a DB was first created
  migrateMasterCategories(); // rename legacy master categories in place
  ensureMasters(); // option lists for the coding screen (also back-fills existing DBs)
  ensureMatchTypes(); // Match Type option list (back-fills blank/packaged DBs)
  ensureBowlerSpecs(); // bowler specialization master defaults (back-fills existing DBs)
  migrateUppercaseData(); // one-time: upper-case existing free-text fields
  return db;
}

// Absolute path of the database currently open (null before init).
function currentFile() {
  return dbFile;
}

// Close the open database so a different file can be opened, or so a file can
// be deleted/overwritten on disk. Safe to call when nothing is open.
function close() {
  if (db) {
    db.close();
    db = null;
    dbFile = null;
  }
}

// Produce a consistent single-file copy of the live database at destPath.
// better-sqlite3's online backup folds in the WAL, so the result is safe to
// hand off even while the app keeps writing. Returns a promise.
function backupTo(destPath) {
  return db.backup(destPath);
}

// Add columns introduced after a database was first created, and give existing
// rows a sensible starting value. Runs every init so older DBs are upgraded in
// place. Currently: players.sort_order (custom display order in Player Master).
function ensureColumns() {
  // Generic "add column if missing" so older DBs gain fields added later.
  const addCol = (table, col, type) => {
    const have = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!have.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  };
  // Officials portrait + state; Ground profile/image/size diagram.
  addCol("officials", "state", "TEXT");
  addCol("officials", "image", "TEXT");
  addCol("grounds", "profile", "TEXT");
  addCol("grounds", "image", "TEXT");
  addCol("grounds", "size_json", "TEXT");
  addCol("players", "image", "TEXT"); // player portrait (data URL)
  addCol("players", "nationality", "TEXT"); // player nationality
  addCol("teams", "image", "TEXT"); // team logo (data URL)
  // Match registration extras (result, reference id, phase, points per side).
  addCol("matches", "match_result", "TEXT");
  addCol("matches", "ref_id", "TEXT");
  addCol("matches", "phase", "TEXT");
  addCol("matches", "points_a", "TEXT");
  addCol("matches", "points_b", "TEXT");
  addCol("matches", "scorer_id", "TEXT");   // fixture scorer allocation
  addCol("matches", "scorer_name", "TEXT");
  // Toss result + opening players, captured by the Toss popup on Match Details
  // before the coding screen is ever opened. toss_won_by holds the winning
  // side's team *code* (matching the Match Info Edit convention on the coding
  // screen); toss_decision is "Bat" or "Bowl".
  addCol("matches", "toss_won_by", "TEXT");
  addCol("matches", "toss_decision", "TEXT");
  addCol("matches", "opening_striker_id", "TEXT");
  addCol("matches", "opening_nonstriker_id", "TEXT");
  addCol("matches", "opening_bowler_id", "TEXT");

  const cols = db.prepare("PRAGMA table_info(players)").all().map((c) => c.name);
  if (!cols.includes("sort_order")) {
    db.exec("ALTER TABLE players ADD COLUMN sort_order INTEGER");
  }
  // Back-fill any players without an order (legacy rows, freshly seeded data) so
  // drag/▲▼ reordering has a stable, deterministic starting point: number them
  // per team, alphabetically — matching the previous name-sorted display.
  if (db.prepare("SELECT COUNT(*) c FROM players WHERE sort_order IS NULL").get().c > 0) {
    const teamIds = db.prepare("SELECT DISTINCT team_id FROM players").all();
    const sel = db.prepare("SELECT id FROM players WHERE team_id IS ? ORDER BY name");
    const upd = db.prepare("UPDATE players SET sort_order = ? WHERE id = ?");
    db.transaction(() => {
      teamIds.forEach(({ team_id }) => sel.all(team_id).forEach((r, i) => upd.run(i, r.id)));
    })();
  }
}

// Rename master categories that were relabeled after a database was created, so
// existing rows keep showing under the new name (and the coding screen still
// finds them). "Bowl Spec" was renamed to "Ball Type".
function migrateMasterCategories() {
  db.prepare("UPDATE masters SET category = 'Ball Type' WHERE category = 'Bowl Spec'").run();
}

// One-time pass that upper-cases existing free-text data so older records match
// the app's "all inputs in capital letters" behaviour. Only name/place/profile
// style columns are touched — never enum/select columns (role, match type,
// bowling type/style, etc.), ids, dates or JSON. Guarded by an app_meta marker
// so it runs exactly once per database.
function migrateUppercaseData() {
  const done = db.prepare("SELECT value FROM app_meta WHERE key = 'uppercased_v1'").get();
  if (done) return;
  const up = (table, cols) => db.exec(`UPDATE ${table} SET ${cols.map((c) => `${c} = UPPER(${c})`).join(", ")}`);
  db.transaction(() => {
    up("teams", ["name", "code"]);
    up("players", ["name", "short_name"]);
    up("competitions", ["name", "trophy"]);
    up("officials", ["name", "country", "state"]);
    up("grounds", ["name", "country", "state", "city", "profile"]);
    up("coaches", ["name"]);
    up("bowler_specs", ["name"]);
    up("masters", ["name"]);
    up("matches", ["match_name", "competition_name", "team_a_name", "team_b_name",
      "team_a_code", "team_b_code", "venue_name"]);
    db.prepare("INSERT INTO app_meta (key, value) VALUES ('uppercased_v1', ?)").run(new Date().toISOString());
  })();
}

// Seed the Ball Type / Shot Type / Fielding Factor option lists if absent. Run
// every init so databases created before this feature get the defaults too.
function ensureMasters() {
  if (db.prepare("SELECT COUNT(*) c FROM masters").get().c > 0) return;
  const ins = db.prepare("INSERT INTO masters (id,category,grp,name,ord) VALUES (?,?,?,?,?)");
  const tx = db.transaction((items) => {
    items.forEach((m, i) => ins.run(`mst${i + 1}`, m.category, m.grp || "", m.name, m.ord));
  });
  tx(buildMasters());
}

// Seed the Match Type master if empty. These are option lists, not demo data:
// a packaged build and "New blank database" both open with { seed: false } and
// so never ran seed(), which left Match Type dropdowns with nothing to pick.
function ensureMatchTypes() {
  if (db.prepare("SELECT COUNT(*) c FROM match_types").get().c > 0) return;
  const ins = db.prepare("INSERT OR IGNORE INTO match_types (name,ord) VALUES (?,?)");
  db.transaction(() => MATCH_TYPES.forEach((m, i) => ins.run(m, i)))();
}

// Seed the Bowler Specialization master with sensible defaults if empty. Runs
// every init so databases created before this feature get the defaults too.
function ensureBowlerSpecs() {
  if (db.prepare("SELECT COUNT(*) c FROM bowler_specs").get().c > 0) return;
  const rows = [
    { name: "CHINAMAN", bowlingType: "Spin", bowlingStyle: "Left Arm" },
    { name: "FAST", bowlingType: "Fast", bowlingStyle: "Both" },
    { name: "FAST MEDIUM", bowlingType: "Fast", bowlingStyle: "Both" },
    { name: "LEG SPIN", bowlingType: "Spin", bowlingStyle: "Right Arm" },
    { name: "MEDIUM", bowlingType: "Fast", bowlingStyle: "Both" },
    { name: "MEDIUM FAST", bowlingType: "Fast", bowlingStyle: "Both" },
    { name: "OFF SPIN", bowlingType: "Spin", bowlingStyle: "Right Arm" },
    { name: "ORTHODOX", bowlingType: "Spin", bowlingStyle: "Left Arm" },
  ];
  const ins = db.prepare("INSERT INTO bowler_specs (id,name,bowling_type,bowling_style) VALUES (?,?,?,?)");
  db.transaction(() => rows.forEach((r, i) => ins.run(`bspec${i + 1}`, r.name, r.bowlingType, r.bowlingStyle)))();
}

// If a legacy JSON store exists from the previous engine, import it once so the
// user keeps any matches they created; otherwise fall back to the fresh seed.
function maybeImportJson(userDataDir) {
  try {
    const legacy = path.join(userDataDir, "cricket-db.json");
    const raw = fs.readFileSync(legacy, "utf8");
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.teams) && data.teams.length) return data;
  } catch {
    /* none / unreadable */
  }
  return null;
}

function seed(data) {
  const tx = db.transaction((d) => {
    const insTeam = db.prepare("INSERT INTO teams (id,name,code,type) VALUES (@id,@name,@code,@type)");
    d.teams.forEach((t) => insTeam.run({ id: t.id, name: t.name, code: t.code, type: t.type }));

    const insPlayer = db.prepare(`INSERT INTO players
      (id,team_id,name,short_name,role,batting_style,batting_style_code,bowling_style,bowling_type,bowling_spec,dob)
      VALUES (@id,@team_id,@name,@short_name,@role,@batting_style,@batting_style_code,@bowling_style,@bowling_type,@bowling_spec,@dob)`);
    d.players.forEach((p) => insPlayer.run({
      id: p.id, team_id: p.teamId, name: p.name, short_name: p.shortName || "", role: p.role || "",
      batting_style: p.battingStyle || "", batting_style_code: p.battingStyleCode || "",
      bowling_style: p.bowlingStyle || "", bowling_type: p.bowlingType || "",
      bowling_spec: p.bowlingSpec || "", dob: p.dob || "",
    }));

    const insComp = db.prepare(`INSERT INTO competitions
      (id,name,trophy,season,format,match_type,start_date,end_date)
      VALUES (@id,@name,@trophy,@season,@format,@match_type,@start_date,@end_date)`);
    const insCompTeam = db.prepare("INSERT OR IGNORE INTO competition_teams (competition_id,team_id) VALUES (?,?)");
    const insCompOff = db.prepare("INSERT OR IGNORE INTO competition_officials (competition_id,official_id) VALUES (?,?)");
    (d.competitions || []).forEach((c) => {
      insComp.run({ id: c.id, name: c.name, trophy: c.trophy || "", season: c.season || "",
        format: c.format || "", match_type: c.matchType || "", start_date: c.startDate || "", end_date: c.endDate || "" });
      (c.teamIds || []).forEach((tid) => insCompTeam.run(c.id, tid));
      (c.officialIds || []).forEach((oid) => insCompOff.run(c.id, oid));
    });

    const insOff = db.prepare("INSERT INTO officials (id,name,role,country,category) VALUES (@id,@name,@role,@country,@category)");
    (d.officials || []).forEach((o) => insOff.run({ id: o.id, name: o.name, role: o.role || "", country: o.country || "", category: o.category || "" }));

    const insGround = db.prepare("INSERT INTO grounds (id,name,country,state,city) VALUES (@id,@name,@country,@state,@city)");
    (d.grounds || []).forEach((g) => insGround.run({ id: g.id, name: g.name, country: g.country || "", state: g.state || "", city: g.city || "" }));

    const insType = db.prepare("INSERT OR IGNORE INTO match_types (name,ord) VALUES (?,?)");
    (d.matchTypes || []).forEach((m, i) => insType.run(m, i));

    (d.matches || []).forEach((m) => writeMatch(m));
  });
  tx(data);
}

// ---- mappers (snake_case row -> camelCase object the UI expects) ----------

const mapTeam = (r) => r && { id: r.id, name: r.name, code: r.code, type: r.type, image: r.image || "" };
const mapPlayer = (r) => r && {
  id: r.id, teamId: r.team_id, teamName: r.team_name || "", name: r.name,
  shortName: r.short_name, role: r.role, battingStyle: r.batting_style,
  battingStyleCode: r.batting_style_code, bowlingStyle: r.bowling_style,
  bowlingType: r.bowling_type, bowlingSpec: r.bowling_spec, dob: r.dob,
  nationality: r.nationality || "", image: r.image || "",
};
// Parse a stored value that may be JSON (array/object) or a legacy plain string.
function parseJsonArray(v) {
  if (v == null || v === "") return [];
  try { const x = JSON.parse(v); return Array.isArray(x) ? x : (x ? [x] : []); }
  catch { return [v]; } // legacy single value stored as a bare string
}
function parseJson(v, fallback) {
  if (v == null || v === "") return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

const mapOfficial = (r) => r && {
  id: r.id, name: r.name, role: r.role, country: r.country,
  state: r.state || "", image: r.image || "", category: parseJsonArray(r.category),
};
const mapCoach = (r) => r && {
  id: r.id, name: r.name, image: r.image || "",
  teams: parseJsonArray(r.teams), specializations: parseJsonArray(r.specializations),
};
const mapGround = (r) => r && {
  id: r.id, name: r.name, country: r.country, state: r.state, city: r.city,
  profile: r.profile || "", image: r.image || "", size: parseJson(r.size_json, []),
};
const mapBowlerSpec = (r) => r && { id: r.id, name: r.name, bowlingType: r.bowling_type, bowlingStyle: r.bowling_style };

// ---- id generation (keeps prefixes compatible with seed ids) --------------

function genId(prefix, table) {
  const taken = new Set(db.prepare(`SELECT id FROM ${table}`).all().map((r) => r.id));
  let n = taken.size + 1;
  let id = `${prefix}${n}`;
  while (taken.has(id)) { n += 1; id = `${prefix}${n}`; }
  return id;
}

// ---- read helpers ---------------------------------------------------------

function teams() {
  return db.prepare("SELECT * FROM teams ORDER BY name").all().map(mapTeam);
}

// Players are returned in their custom display order (sort_order, set in Player
// Master); rows without one fall to the end, then alphabetical as a tiebreak.
const PLAYER_ORDER = "ORDER BY p.sort_order IS NULL, p.sort_order, p.name";

function playersByTeam(teamId) {
  return db.prepare(`SELECT p.*, t.name AS team_name FROM players p
    LEFT JOIN teams t ON t.id = p.team_id WHERE p.team_id = ? ${PLAYER_ORDER}`).all(teamId).map(mapPlayer);
}

function allPlayers() {
  return db.prepare(`SELECT p.*, t.name AS team_name FROM players p
    LEFT JOIN teams t ON t.id = p.team_id ${PLAYER_ORDER}`).all().map(mapPlayer);
}

// Number of recorded deliveries across all matches — a reliable signal of real
// scoring work (used to tell pristine demo data from a database in real use).
function ballCount() {
  return db.prepare("SELECT COUNT(*) c FROM balls").get().c;
}

function competitions() {
  const comps = db.prepare("SELECT * FROM competitions ORDER BY name").all();
  const teamStmt = db.prepare("SELECT team_id FROM competition_teams WHERE competition_id = ?");
  // Only officials that still exist in the master are returned, so a deleted
  // official can never linger as a stale id in a competition's allocation.
  const offStmt = db.prepare(`SELECT co.official_id FROM competition_officials co
    JOIN officials o ON o.id = co.official_id WHERE co.competition_id = ? ORDER BY o.name`);
  return comps.map((c) => ({
    id: c.id, name: c.name, trophy: c.trophy, season: c.season, format: c.format,
    matchType: c.match_type, startDate: c.start_date, endDate: c.end_date,
    teamIds: teamStmt.all(c.id).map((r) => r.team_id),
    officialIds: offStmt.all(c.id).map((r) => r.official_id),
  }));
}

function officials(role) {
  const rows = role
    ? db.prepare("SELECT * FROM officials WHERE role = ? ORDER BY name").all(role)
    : db.prepare("SELECT * FROM officials ORDER BY name").all();
  return rows.map(mapOfficial);
}

function grounds() {
  return db.prepare("SELECT * FROM grounds ORDER BY name").all().map(mapGround);
}

function bowlerSpecs() {
  return db.prepare("SELECT * FROM bowler_specs ORDER BY name").all().map(mapBowlerSpec);
}

function matchTypes() {
  return db.prepare("SELECT name FROM match_types ORDER BY ord").all().map((r) => r.name);
}

// ---- masters (Bowl Spec / Shot Type / Fielding Factor option lists) --------

const mapMaster = (r) => r && { id: r.id, category: r.category, grp: r.grp, name: r.name, ord: r.ord };

function masters(category) {
  const rows = category
    ? db.prepare("SELECT * FROM masters WHERE category = ? ORDER BY grp, ord, name").all(category)
    : db.prepare("SELECT * FROM masters ORDER BY category, grp, ord").all();
  return rows.map(mapMaster);
}

function saveMaster(item) {
  const id = item.id || genId("mst", "masters");
  const grp = item.grp || "";
  let ord = item.ord;
  if (ord == null) {
    const r = db.prepare("SELECT MAX(ord) m FROM masters WHERE category = ? AND grp = ?").get(item.category, grp);
    ord = (r.m == null ? -1 : r.m) + 1; // append to the end of its group
  }
  db.prepare(`INSERT INTO masters (id,category,grp,name,ord) VALUES (@id,@category,@grp,@name,@ord)
    ON CONFLICT(id) DO UPDATE SET category=@category, grp=@grp, name=@name, ord=@ord`)
    .run({ id, category: item.category, grp, name: item.name, ord });
  return { id, category: item.category, grp, name: item.name, ord };
}

function deleteMaster(id) {
  const r = db.prepare("DELETE FROM masters WHERE id = ?").run(id);
  return { deleted: r.changes };
}

// Persist a new order for a category+group: ids[] in the desired order.
function reorderMaster(category, grp, ids) {
  const g = grp || "";
  const tx = db.transaction((list) => {
    const upd = db.prepare("UPDATE masters SET ord = ? WHERE id = ? AND category = ? AND grp = ?");
    list.forEach((id, i) => upd.run(i, id, category, g));
  });
  tx(ids || []);
  return masters(category);
}

// rebuild the nested teamA/teamB squad+playingXI for a match side
function sideOf(matchId, side, m) {
  const rows = db.prepare(
    "SELECT player_id, in_xi, squad_order, xi_order FROM match_squad WHERE match_id = ? AND side = ?"
  ).all(matchId, side);
  const squad = rows.slice().sort((a, b) => a.squad_order - b.squad_order).map((r) => r.player_id);
  const playingXI = rows.filter((r) => r.in_xi)
    .sort((a, b) => a.xi_order - b.xi_order).map((r) => r.player_id);
  const sx = side === "A" ? "team_a" : "team_b";
  return {
    id: m[`${sx}_id`], name: m[`${sx}_name`], code: m[`${sx}_code`],
    squad, playingXI,
    captainId: m[`${sx}_captain_id`] || "", keeperId: m[`${sx}_keeper_id`] || "",
  };
}

function rowToMatch(m) {
  if (!m) return null;
  let state = null;
  const st = db.prepare("SELECT json FROM match_state WHERE match_id = ?").get(m.id);
  if (st && st.json) { try { state = JSON.parse(st.json); } catch { state = null; } }
  return {
    id: m.id, competitionId: m.competition_id, competitionName: m.competition_name,
    matchName: m.match_name, matchType: m.match_type, overs: m.overs, matchDate: m.match_date,
    groundId: m.ground_id, venueName: m.venue_name,
    neutralVenue: !!m.neutral_venue, dayNight: !!m.day_night,
    umpire1Id: m.umpire1_id, umpire2Id: m.umpire2_id, umpire3Id: m.umpire3_id, refereeId: m.referee_id,
    status: m.status, createdAt: m.created_at, updatedAt: m.updated_at,
    matchResult: m.match_result || "", refId: m.ref_id || "", phase: m.phase || "",
    pointsA: m.points_a || "", pointsB: m.points_b || "",
    scorerId: m.scorer_id || "", scorerName: m.scorer_name || "",
    tossWonBy: m.toss_won_by || "", tossDecision: m.toss_decision || "",
    openingStrikerId: m.opening_striker_id || "",
    openingNonStrikerId: m.opening_nonstriker_id || "",
    openingBowlerId: m.opening_bowler_id || "",
    teamA: sideOf(m.id, "A", m), teamB: sideOf(m.id, "B", m),
    state,
  };
}

function matches() {
  return db.prepare("SELECT * FROM matches ORDER BY created_at DESC").all().map(rowToMatch);
}

function getMatch(id) {
  return rowToMatch(db.prepare("SELECT * FROM matches WHERE id = ?").get(id));
}

function getMatchExpanded(id) {
  const m = getMatch(id);
  if (!m) return null;
  const byId = db.prepare("SELECT p.*, t.name AS team_name FROM players p LEFT JOIN teams t ON t.id = p.team_id WHERE p.id = ?");
  const expand = (pid) => mapPlayer(byId.get(pid)) || null;
  const expandSide = (side) => ({
    ...side,
    squadPlayers: (side.squad || []).map(expand).filter(Boolean),
    playingXIPlayers: (side.playingXI || []).map(expand).filter(Boolean),
  });
  return { ...m, teamA: expandSide(m.teamA), teamB: expandSide(m.teamB) };
}

// ---- write helpers --------------------------------------------------------

function saveTeam(team) {
  const id = team.id || genId("t", "teams");
  db.prepare(`INSERT INTO teams (id,name,code,type,image) VALUES (@id,@name,@code,@type,@image)
    ON CONFLICT(id) DO UPDATE SET name=@name, code=@code, type=@type, image=@image`)
    .run({ id, name: team.name, code: team.code, type: team.type || "", image: team.image || "" });
  return { ...team, id };
}

function savePlayer(player) {
  const id = player.id || genId("p", "players");
  let teamName = player.teamName;
  if (player.teamId) {
    const t = db.prepare("SELECT name FROM teams WHERE id = ?").get(player.teamId);
    if (t) teamName = t.name;
  }
  const teamId = player.teamId || "";
  // New players append to the end of their team's order; existing players keep
  // the order they already have (DO UPDATE deliberately omits sort_order).
  const exists = db.prepare("SELECT 1 FROM players WHERE id = ?").get(id);
  let sortOrder = null;
  if (!exists) {
    const max = db.prepare("SELECT MAX(sort_order) m FROM players WHERE team_id = ?").get(teamId).m;
    sortOrder = (max == null ? -1 : max) + 1;
  }
  db.prepare(`INSERT INTO players
    (id,team_id,name,short_name,role,batting_style,batting_style_code,bowling_style,bowling_type,bowling_spec,dob,nationality,image,sort_order)
    VALUES (@id,@team_id,@name,@short_name,@role,@batting_style,@batting_style_code,@bowling_style,@bowling_type,@bowling_spec,@dob,@nationality,@image,@sort_order)
    ON CONFLICT(id) DO UPDATE SET team_id=@team_id, name=@name, short_name=@short_name, role=@role,
      batting_style=@batting_style, batting_style_code=@batting_style_code, bowling_style=@bowling_style,
      bowling_type=@bowling_type, bowling_spec=@bowling_spec, dob=@dob, nationality=@nationality, image=@image`)
    .run({
      id, team_id: teamId, name: player.name, short_name: player.shortName || "",
      role: player.role || "", batting_style: player.battingStyle || "",
      batting_style_code: player.battingStyleCode || "", bowling_style: player.bowlingStyle || "",
      bowling_type: player.bowlingType || "", bowling_spec: player.bowlingSpec || "", dob: player.dob || "",
      nationality: player.nationality || "", image: player.image || "",
      sort_order: sortOrder,
    });
  return { ...player, id, teamName };
}

// Persist a new player display order within a team: ids[] in the desired order.
function reorderPlayers(teamId, ids) {
  const tid = teamId || "";
  const upd = db.prepare("UPDATE players SET sort_order = ? WHERE id = ? AND team_id = ?");
  db.transaction((list) => list.forEach((id, i) => upd.run(i, id, tid)))(ids || []);
  return playersByTeam(tid);
}

function deleteTeam(id) {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM players WHERE team_id = ?").run(id);
    db.prepare("DELETE FROM competition_teams WHERE team_id = ?").run(id);
    return db.prepare("DELETE FROM teams WHERE id = ?").run(id).changes;
  });
  return { deleted: tx() };
}

function deletePlayer(id) {
  return { deleted: db.prepare("DELETE FROM players WHERE id = ?").run(id).changes };
}

function saveOfficial(o) {
  const id = o.id || genId("o", "officials");
  const category = JSON.stringify(Array.isArray(o.category) ? o.category : (o.category ? [o.category] : []));
  db.prepare(`INSERT INTO officials (id,name,role,country,state,category,image)
    VALUES (@id,@name,@role,@country,@state,@category,@image)
    ON CONFLICT(id) DO UPDATE SET name=@name, role=@role, country=@country, state=@state, category=@category, image=@image`)
    .run({ id, name: o.name, role: o.role || "", country: o.country || "", state: o.state || "", category, image: o.image || "" });
  return { ...o, id };
}

function deleteOfficial(id) {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM competition_officials WHERE official_id = ?").run(id);
    return db.prepare("DELETE FROM officials WHERE id = ?").run(id).changes;
  });
  return { deleted: tx() };
}

function saveGround(g) {
  const id = g.id || genId("g", "grounds");
  db.prepare(`INSERT INTO grounds (id,name,country,state,city,profile,image,size_json)
    VALUES (@id,@name,@country,@state,@city,@profile,@image,@size_json)
    ON CONFLICT(id) DO UPDATE SET name=@name, country=@country, state=@state, city=@city,
      profile=@profile, image=@image, size_json=@size_json`)
    .run({
      id, name: g.name, country: g.country || "", state: g.state || "", city: g.city || "",
      profile: g.profile || "", image: g.image || "", size_json: JSON.stringify(g.size || []),
    });
  return { ...g, id };
}

function deleteGround(id) {
  return { deleted: db.prepare("DELETE FROM grounds WHERE id = ?").run(id).changes };
}

function coaches() {
  return db.prepare("SELECT * FROM coaches ORDER BY name").all().map(mapCoach);
}

// Import rows from another CAP database file into the current one. "master"
// copies the reference/master tables; "reconciled" copies match data. Columns
// are intersected with the source so version differences are tolerated; rows
// are INSERT OR REPLACE'd by primary key. Returns a per-table added/updated count.
const IMPORT_SETS = {
  master: ["teams", "players", "competitions", "competition_teams", "competition_officials",
    "officials", "grounds", "coaches", "bowler_specs", "masters", "match_types"],
  reconciled: ["matches", "match_squad", "match_state", "balls"],
};

function importFromFile(srcPath, mode) {
  const tables = IMPORT_SETS[mode];
  if (!tables) return { ok: false, error: "Unknown import type" };
  let attached = false;
  try {
    db.prepare("ATTACH DATABASE ? AS src").run(srcPath);
    attached = true;
    const summary = {};
    db.transaction(() => {
      for (const t of tables) {
        let srcCols;
        try { srcCols = db.prepare(`SELECT * FROM src.${t} LIMIT 0`).columns().map((c) => c.name); }
        catch { continue; } // table missing in the source file — skip it
        const curCols = db.prepare(`SELECT * FROM ${t} LIMIT 0`).columns().map((c) => c.name);
        const common = curCols.filter((c) => srcCols.includes(c));
        if (!common.length) continue;
        const list = common.map((c) => `"${c}"`).join(",");
        const before = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
        db.exec(`INSERT OR REPLACE INTO ${t} (${list}) SELECT ${list} FROM src.${t}`);
        summary[t] = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c - before;
      }
    })();
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  } finally {
    if (attached) { try { db.prepare("DETACH DATABASE src").run(); } catch { /* ignore */ } }
  }
}

function saveCoach(c) {
  const id = c.id || genId("coach", "coaches");
  db.prepare(`INSERT INTO coaches (id,name,teams,specializations,image)
    VALUES (@id,@name,@teams,@specializations,@image)
    ON CONFLICT(id) DO UPDATE SET name=@name, teams=@teams, specializations=@specializations, image=@image`)
    .run({
      id, name: c.name,
      teams: JSON.stringify(c.teams || []),
      specializations: JSON.stringify(c.specializations || []),
      image: c.image || "",
    });
  return { ...c, id };
}

function deleteCoach(id) {
  return { deleted: db.prepare("DELETE FROM coaches WHERE id = ?").run(id).changes };
}

function saveBowlerSpec(s) {
  const id = s.id || genId("bspec", "bowler_specs");
  db.prepare(`INSERT INTO bowler_specs (id,name,bowling_type,bowling_style)
    VALUES (@id,@name,@bowling_type,@bowling_style)
    ON CONFLICT(id) DO UPDATE SET name=@name, bowling_type=@bowling_type, bowling_style=@bowling_style`)
    .run({ id, name: s.name, bowling_type: s.bowlingType || "", bowling_style: s.bowlingStyle || "" });
  return { ...s, id };
}

function deleteBowlerSpec(id) {
  return { deleted: db.prepare("DELETE FROM bowler_specs WHERE id = ?").run(id).changes };
}

function saveCompetition(c) {
  const id = c.id || genId("c", "competitions");
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO competitions (id,name,trophy,season,format,match_type,start_date,end_date)
      VALUES (@id,@name,@trophy,@season,@format,@match_type,@start_date,@end_date)
      ON CONFLICT(id) DO UPDATE SET name=@name, trophy=@trophy, season=@season, format=@format,
        match_type=@match_type, start_date=@start_date, end_date=@end_date`)
      .run({ id, name: c.name, trophy: c.trophy || "", season: c.season || "", format: c.format || "",
        match_type: c.matchType || "", start_date: c.startDate || "", end_date: c.endDate || "" });
    db.prepare("DELETE FROM competition_teams WHERE competition_id = ?").run(id);
    const insCT = db.prepare("INSERT OR IGNORE INTO competition_teams (competition_id,team_id) VALUES (?,?)");
    (c.teamIds || []).forEach((tid) => insCT.run(id, tid));
    // Officials allocated to the competition (umpires / referees), replaced wholesale.
    db.prepare("DELETE FROM competition_officials WHERE competition_id = ?").run(id);
    const insCO = db.prepare("INSERT OR IGNORE INTO competition_officials (competition_id,official_id) VALUES (?,?)");
    (c.officialIds || []).forEach((oid) => insCO.run(id, oid));
  });
  tx();
  return { ...c, id };
}

function deleteCompetition(id) {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM competition_teams WHERE competition_id = ?").run(id);
    db.prepare("DELETE FROM competition_officials WHERE competition_id = ?").run(id);
    return db.prepare("DELETE FROM competitions WHERE id = ?").run(id).changes;
  });
  return { deleted: tx() };
}

// low-level match writer (used by seed + saveMatch); assumes inside a tx
function writeMatch(match) {
  const id = match.id || genId("m", "matches");
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT created_at FROM matches WHERE id = ?").get(id);
  const createdAt = match.createdAt || (existing && existing.created_at) || now;
  const A = match.teamA || {}, B = match.teamB || {};
  // Guard: a match may only be created for teams participating in its competition.
  if (match.competitionId) {
    const partRows = db.prepare("SELECT team_id FROM competition_teams WHERE competition_id = ?").all(match.competitionId);
    const allowed = new Set(partRows.map((r) => r.team_id));
    if (allowed.size) {
      [A, B].forEach((side) => {
        if (side.id && !allowed.has(side.id)) {
          throw new Error(`Team "${side.name || side.id}" is not a participating team of this competition`);
        }
      });
    }
  }
  db.prepare(`INSERT INTO matches
    (id,competition_id,competition_name,match_name,match_type,overs,match_date,ground_id,venue_name,
     neutral_venue,day_night,umpire1_id,umpire2_id,umpire3_id,referee_id,status,created_at,updated_at,
     team_a_id,team_a_name,team_a_code,team_a_captain_id,team_a_keeper_id,
     team_b_id,team_b_name,team_b_code,team_b_captain_id,team_b_keeper_id)
    VALUES (@id,@competition_id,@competition_name,@match_name,@match_type,@overs,@match_date,@ground_id,@venue_name,
     @neutral_venue,@day_night,@umpire1_id,@umpire2_id,@umpire3_id,@referee_id,@status,@created_at,@updated_at,
     @team_a_id,@team_a_name,@team_a_code,@team_a_captain_id,@team_a_keeper_id,
     @team_b_id,@team_b_name,@team_b_code,@team_b_captain_id,@team_b_keeper_id)
    ON CONFLICT(id) DO UPDATE SET competition_id=@competition_id, competition_name=@competition_name,
      match_name=@match_name, match_type=@match_type, overs=@overs, match_date=@match_date,
      ground_id=@ground_id, venue_name=@venue_name, neutral_venue=@neutral_venue, day_night=@day_night,
      umpire1_id=@umpire1_id, umpire2_id=@umpire2_id, umpire3_id=@umpire3_id, referee_id=@referee_id,
      status=@status, updated_at=@updated_at,
      team_a_id=@team_a_id, team_a_name=@team_a_name, team_a_code=@team_a_code,
      team_a_captain_id=@team_a_captain_id, team_a_keeper_id=@team_a_keeper_id,
      team_b_id=@team_b_id, team_b_name=@team_b_name, team_b_code=@team_b_code,
      team_b_captain_id=@team_b_captain_id, team_b_keeper_id=@team_b_keeper_id`)
    .run({
      id, competition_id: match.competitionId || "", competition_name: match.competitionName || "",
      match_name: match.matchName || "", match_type: match.matchType || "", overs: match.overs || 0,
      match_date: match.matchDate || "", ground_id: match.groundId || "", venue_name: match.venueName || "",
      neutral_venue: match.neutralVenue ? 1 : 0, day_night: match.dayNight ? 1 : 0,
      umpire1_id: match.umpire1Id || "", umpire2_id: match.umpire2Id || "", umpire3_id: match.umpire3Id || "",
      referee_id: match.refereeId || "", status: match.status || "TOSS",
      created_at: createdAt, updated_at: now,
      team_a_id: A.id || "", team_a_name: A.name || "", team_a_code: A.code || "",
      team_a_captain_id: A.captainId || "", team_a_keeper_id: A.keeperId || "",
      team_b_id: B.id || "", team_b_name: B.name || "", team_b_code: B.code || "",
      team_b_captain_id: B.captainId || "", team_b_keeper_id: B.keeperId || "",
    });

  // Match registration extras (added as columns after the original schema).
  db.prepare(`UPDATE matches SET match_result=@match_result, ref_id=@ref_id, phase=@phase,
      points_a=@points_a, points_b=@points_b, scorer_id=@scorer_id, scorer_name=@scorer_name WHERE id=@id`)
    .run({
      id, match_result: match.matchResult || "", ref_id: match.refId || "",
      phase: match.phase || "", points_a: match.pointsA || "", points_b: match.pointsB || "",
      scorer_id: match.scorerId || "", scorer_name: match.scorerName || "",
    });

  // replace squad rows for both sides
  db.prepare("DELETE FROM match_squad WHERE match_id = ?").run(id);
  const insSquad = db.prepare(`INSERT INTO match_squad (match_id,side,player_id,in_xi,squad_order,xi_order)
    VALUES (?,?,?,?,?,?)`);
  const writeSide = (side, s) => {
    const xi = s.playingXI || [];
    // union of squad + any XI ids not in squad, preserving order
    const squad = (s.squad && s.squad.length ? s.squad.slice() : xi.slice());
    xi.forEach((pid) => { if (!squad.includes(pid)) squad.push(pid); });
    squad.forEach((pid, si) => {
      const xiIdx = xi.indexOf(pid);
      insSquad.run(id, side, pid, xiIdx >= 0 ? 1 : 0, si, xiIdx >= 0 ? xiIdx : null);
    });
  };
  writeSide("A", A);
  writeSide("B", B);

  // optional embedded state (seed match may carry one)
  if (match.state) {
    db.prepare("INSERT INTO match_state (match_id,json) VALUES (?,?) ON CONFLICT(match_id) DO UPDATE SET json=excluded.json")
      .run(id, JSON.stringify(match.state));
  }
  return id;
}

function saveMatch(match) {
  const id = db.transaction(() => writeMatch(match))();
  return getMatch(id);
}

// Record the toss and the opening players for a match, then move it out of the
// "TOSS" status so Match Details offers RESUME. Deliberately separate from
// writeMatch: re-saving a match from Match Registration must not wipe a toss
// that has already been taken, so registration never touches these columns.
function saveMatchToss(id, toss = {}) {
  const m = db.prepare("SELECT id FROM matches WHERE id = ?").get(id);
  if (!m) return null;
  db.prepare(`UPDATE matches SET toss_won_by=@toss_won_by, toss_decision=@toss_decision,
      opening_striker_id=@opening_striker_id, opening_nonstriker_id=@opening_nonstriker_id,
      opening_bowler_id=@opening_bowler_id, status=@status, updated_at=@updated_at WHERE id=@id`)
    .run({
      id,
      toss_won_by: toss.tossWonBy || "",
      toss_decision: toss.tossDecision || "",
      opening_striker_id: toss.openingStrikerId || "",
      opening_nonstriker_id: toss.openingNonStrikerId || "",
      opening_bowler_id: toss.openingBowlerId || "",
      status: toss.status || "RESUME",
      updated_at: new Date().toISOString(),
    });
  return getMatch(id);
}

// persist live scoring snapshot (resume) + rebuild queryable ball rows
function saveMatchState(id, scoringState, status) {
  const m = db.prepare("SELECT id FROM matches WHERE id = ?").get(id);
  if (!m) return null;
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO match_state (match_id,json) VALUES (?,?) ON CONFLICT(match_id) DO UPDATE SET json=excluded.json")
      .run(id, JSON.stringify(scoringState || {}));
    db.prepare("DELETE FROM balls WHERE match_id = ?").run(id);
    const log = (scoringState && scoringState.log) || [];
    if (log.length) {
      const insBall = db.prepare(`INSERT INTO balls
        (match_id,seq,num,bowler,striker,nonstriker,bowl_type,shot_type,runs,ext,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
      const now = new Date().toISOString();
      log.forEach((b, i) => insBall.run(
        id, i, String(b.num ?? ""), b.bowler || "", b.striker || "", b.nonstr || "",
        b.bowl || "", b.shot || "", Number(b.runs) || 0, String(b.ext ?? ""), now,
      ));
    }
    const stmt = status
      ? db.prepare("UPDATE matches SET status = ?, updated_at = ? WHERE id = ?")
      : db.prepare("UPDATE matches SET updated_at = ? WHERE id = ?");
    if (status) stmt.run(status, new Date().toISOString(), id);
    else stmt.run(new Date().toISOString(), id);
  });
  tx();
  return getMatch(id);
}

function deleteMatch(id) {
  const tx = db.transaction(() => {
    const before = db.prepare("SELECT COUNT(*) c FROM matches WHERE id = ?").get(id).c;
    db.prepare("DELETE FROM matches WHERE id = ?").run(id);
    db.prepare("DELETE FROM match_squad WHERE match_id = ?").run(id);
    db.prepare("DELETE FROM match_state WHERE match_id = ?").run(id);
    db.prepare("DELETE FROM balls WHERE match_id = ?").run(id);
    return before;
  });
  return { deleted: tx() };
}

// ---- report queries (real aggregations over the balls table) --------------

function bowlingFigures(matchId) {
  // legal deliveries exclude wides / no-balls (ext text starts with WD / NB)
  return db.prepare(`
    SELECT bowler,
           SUM(CASE WHEN ext LIKE 'WD%' OR ext LIKE 'NB%' THEN 0 ELSE 1 END) AS legalBalls,
           SUM(runs) AS runs,
           SUM(CASE WHEN ext = 'RBW' THEN 1 ELSE 0 END) AS wickets,
           COUNT(*) AS deliveries
    FROM balls WHERE match_id = ? AND bowler <> '' GROUP BY bowler`).all(matchId)
    .map((r) => {
      const overs = `${Math.floor(r.legalBalls / 6)}.${r.legalBalls % 6}`;
      const econ = r.legalBalls ? (r.runs / (r.legalBalls / 6)) : 0;
      return { bowler: r.bowler, overs, balls: r.legalBalls, runs: r.runs,
        wickets: r.wickets, econ: Number(econ.toFixed(2)) };
    });
}

function battingCard(matchId) {
  return db.prepare(`
    SELECT striker AS batsman,
           SUM(runs) AS runs,
           SUM(CASE WHEN ext LIKE 'WD%' THEN 0 ELSE 1 END) AS balls,
           SUM(CASE WHEN runs = 4 THEN 1 ELSE 0 END) AS fours,
           SUM(CASE WHEN runs = 6 THEN 1 ELSE 0 END) AS sixes
    FROM balls WHERE match_id = ? AND striker <> '' GROUP BY striker`).all(matchId)
    .map((r) => ({
      batsman: r.batsman, runs: r.runs, balls: r.balls, fours: r.fours, sixes: r.sixes,
      sr: r.balls ? Number(((r.runs / r.balls) * 100).toFixed(2)) : 0,
    }));
}

module.exports = {
  init,
  currentFile,
  close,
  backupTo,
  teams,
  playersByTeam,
  allPlayers,
  ballCount,
  competitions,
  officials,
  grounds,
  matchTypes,
  masters,
  saveMaster,
  deleteMaster,
  reorderMaster,
  matches,
  getMatch,
  getMatchExpanded,
  saveTeam,
  savePlayer,
  reorderPlayers,
  deleteTeam,
  deletePlayer,
  saveOfficial,
  deleteOfficial,
  saveGround,
  deleteGround,
  bowlerSpecs,
  saveBowlerSpec,
  deleteBowlerSpec,
  coaches,
  saveCoach,
  deleteCoach,
  importFromFile,
  saveCompetition,
  deleteCompetition,
  saveMatch,
  saveMatchToss,
  saveMatchState,
  deleteMatch,
  bowlingFigures,
  battingCard,
};
