// ============================================================================
// CAP prototype screens — now data-driven.
// Static reference screens keep their `body` strings; the masters, match
// registration and match details screens are built from the database exposed
// over the preload bridge (window.cricketApp.db).
// ============================================================================

const DB = window.cricketApp && window.cricketApp.db;

async function dbCall(name, ...args) {
  if (!DB || typeof DB[name] !== "function") return null;
  try {
    return await DB[name](...args);
  } catch (e) {
    console.error(`db.${name} failed`, e);
    return null;
  }
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function toast(msg, isErr) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = `toast ${isErr ? "err" : ""}`.trim();
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

// ---- generic table renderer (static + interactive) ------------------------

function buildTable(columns, rows, extraStyle = "") {
  const cols = `repeat(${columns.length}, minmax(0, 1fr))`;
  const head = columns.map((col) => `<span>${col}</span>`).join("");
  const body = rows.length
    ? rows
        .map((row) => `<div class="table-row" style="grid-template-columns:${cols};">${row
          .map((cell) => `<span>${cell}</span>`)
          .join("")}</div>`)
        .join("")
    : `<div class="table-empty-row">No records found.</div>`;
  return `
    <section class="table-shell" style="${extraStyle}">
      <div class="table-head" style="grid-template-columns:${cols};">${head}</div>
      <div class="table-rows">${body}</div>
    </section>`;
}

function optionList(items, getVal, getLabel, selected) {
  return items
    .map((it) => {
      const v = getVal(it);
      const sel = v === selected ? " selected" : "";
      return `<option value="${esc(v)}"${sel}>${esc(getLabel(it))}</option>`;
    })
    .join("");
}

// ===========================================================================
// Static screens
// ===========================================================================

const screenDefs = {
  "config-menu": {
    title: "Configuration Menu",
    back: "home.html",
    body: `
      <section class="card-grid">
        <a class="menu-card" href="config.html"><div><div class="icon">🗄️</div><div class="label">Database & Capture</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=app-config"><div><div class="icon">🗄️</div><div class="label">Application Configuration</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=shortcut-config"><div><div class="icon">🗄️</div><div class="label">Shortcut Configuration</div><div class="line"></div></div></a>
      </section>`,
  },
  "app-config": {
    title: "Application Configuration",
    back: "prototype.html?screen=config-menu",
    body: `
      <section class="action-column">
        <div class="mode-panel">
          <div class="mode-title">Operation Mode</div>
          <div class="mode-opts"><span>Offline</span><span>Online 1</span><span>Online 2</span></div>
        </div>
        <div class="dark-btn">Import Reconciled Data</div>
        <div class="dark-btn">Import Master Data</div>
      </section>
      <section class="mini-brand">
        <div class="hero-mark">
          <div class="bat-icon"></div>
          <h2 class="cap-title"><strong>C</strong>ricket <span class="tag">a</span>nalysis <strong>P</strong>ro</h2>
          <div class="cap-version">Version 4.0</div>
        </div>
      </section>`,
  },
  "shortcut-config": {
    title: "Shortcut Configuration",
    back: "prototype.html?screen=config-menu",
    body: `
      <section class="form-screen">
        <div class="form-layout" style="grid-template-columns: 1fr 1fr;">
          <div class="form-grid" style="grid-template-columns: 290px 1fr;">
            <label class="field-label">Start / End Over</label><input class="field-control" />
            <label class="field-label">Start / End Ball</label><input class="field-control" />
            <label class="field-label">Start / End Capture</label><input class="field-control" />
            <label class="field-label">Browse Video</label><input class="field-control" />
            <label class="field-label">Bowling Compute</label><input class="field-control" />
          </div>
          <div class="form-grid" style="grid-template-columns: 220px 1fr;">
            <label class="field-label">Appeals</label><input class="field-control" />
            <label class="field-label">Fielding Events</label><input class="field-control" />
            <label class="field-label">Match Events</label><input class="field-control" />
            <label class="field-label">Remarks</label><input class="field-control" />
            <label class="field-label">Wickets</label><input class="field-control" />
            <label class="field-label">Edit Mode</label><input class="field-control" />
          </div>
        </div>
        <div class="btn-row" style="margin-top: 28px;"><button class="btn-main btn-green">Save</button></div>
      </section>`,
  },
  "masters-menu": {
    title: "Masters Menu",
    back: "home.html",
    body: `
      <section class="card-grid" style="grid-template-columns: 1fr repeat(5, 1fr);">
        <a class="menu-card" href="prototype.html?screen=competition-master"><div><div class="icon">🏆</div><div class="label">Competition</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=team-master"><div><div class="icon">👥</div><div class="label">Team</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=player-master"><div><div class="icon">🧢</div><div class="label">Players</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=official-master"><div><div class="icon">☝️</div><div class="label">Officials</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=ground-master"><div><div class="icon">⭕</div><div class="label">Ground</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=shot-type"><div><div class="icon">🏏</div><div class="label">Shot Type</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=ball-type"><div><div class="icon">⚾</div><div class="label">Ball Type</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=bowl-spec"><div><div class="icon">🥎</div><div class="label">Bowl Spec</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=fielding-factors"><div><div class="icon">🕓</div><div class="label">Fielding Factors</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=user-creation"><div><div class="icon">👤</div><div class="label">User Creation</div><div class="line"></div></div></a>
      </section>`,
  },
  "shot-type": {
    title: "Shot Type",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 980px;">
        <div class="form-grid" style="grid-template-columns: 180px 1fr;">
          <label class="field-label">Shot Name</label><input class="field-control" />
          <label class="field-label">Shot Type</label><select class="field-select"><option>Aggressive</option><option>Defensive</option></select>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Order No", "Shot Name", "Shot Type"], [["1", "Cover Drive", "Aggressive"], ["2", "Square Drive", "Aggressive"], ["3", "Straight Drive", "Aggressive"], ["4", "Forward Defence", "Defensive"], ["5", "Leg Glance", "Defensive"]])}
      </section>`,
  },
  "ball-type": {
    title: "Ball Type",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 980px;">
        <div class="form-grid" style="grid-template-columns: 180px 1fr;">
          <label class="field-label">Ball Type</label><input class="field-control" />
          <label class="field-label">Bowler Type</label><select class="field-select"><option>Fast</option><option>Spin</option></select>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Order No", "Ball Type", "Bowler Type"], [["1", "Inswinger", "Fast"], ["2", "OutSwinger", "Fast"], ["3", "Off Spin", "Spin"], ["4", "Doosra", "Spin"], ["5", "Yorker", "Fast"]])}
      </section>`,
  },
  "bowl-spec": {
    title: "Bowler Specialization",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 1060px;">
        <div class="form-grid" style="grid-template-columns: 260px 1fr;">
          <label class="field-label">Bowler Specialization</label><input class="field-control" />
          <label class="field-label">Bowling Type</label><select class="field-select"><option>Fast</option><option>Spin</option></select>
          <label class="field-label">Bowling Style</label><select class="field-select"><option>Right Arm</option><option>Left Arm</option></select>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Bowler Specialization", "Bowling Style", "Bowling Type"], [["Chinaman", "Left Arm", "Spin"], ["Fast", "Both", "Fast"], ["Leg Spin", "Right Arm", "Spin"], ["Off Spin", "Right Arm", "Spin"], ["Orthodox", "Left Arm", "Spin"]])}
      </section>`,
  },
  "fielding-factors": {
    title: "Fielding Factors",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 1040px;">
        <div class="form-grid" style="grid-template-columns: 210px 1fr;">
          <label class="field-label">Fielding Factor</label><input class="field-control" />
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Order No", "Fielding Factor"], [["1", "Airborne Stop"], ["2", "Airborne Catch"], ["3", "Bad Throw"], ["4", "Caught"], ["5", "Catch Dropped"], ["6", "Direct Hit"]])}
      </section>`,
  },
  "user-creation": {
    title: "User Creation",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 1080px;">
        <div class="form-grid" style="grid-template-columns: 220px 1fr;">
          <label class="field-label">Display Name</label><input class="field-control" />
          <label class="field-label">User Role</label><select class="field-select"><option>Administrator</option><option>Scorer</option><option>Analyst</option></select>
          <label class="field-label">Machine ID</label><input class="field-control" />
          <label class="field-label">License Upto</label><input class="field-control" placeholder="DD/MM/YYYY" />
          <label class="field-label">Login ID</label><input class="field-control" />
          <label class="field-label">Password</label><input class="field-control" type="password" />
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Display Name", "User Role", "Machine id", "Login id"], [["admin", "Administrator", "LOCAL-01", "admin"]])}
      </section>`,
  },
  reports: {
    title: "CAP Reports",
    back: "home.html",
    build: buildReports,
  },

  // ---- data-driven screens ----
  "team-master": { title: "Team Master", back: "prototype.html?screen=masters-menu", build: buildTeamMaster, init: initTeamMaster },
  "player-master": { title: "Player Master", back: "prototype.html?screen=masters-menu", build: buildPlayerMaster, init: initPlayerMaster },
  "competition-master": { title: "Competition Master", back: "prototype.html?screen=masters-menu", build: buildCompetitionMaster },
  "official-master": { title: "Officials Master", back: "prototype.html?screen=masters-menu", build: buildOfficialMaster },
  "ground-master": { title: "Ground Master", back: "prototype.html?screen=masters-menu", build: buildGroundMaster },
  "match-registration": { title: "Match Registration", back: "home.html", build: buildMatchRegistration, init: initMatchRegistration },
  "match-details": { title: "Match Details", back: "home.html", build: buildMatchDetails, init: initMatchDetails },
};

// ===========================================================================
// Masters — Team
// ===========================================================================

async function buildTeamMaster() {
  const teams = (await dbCall("teams")) || [];
  const rows = teams.map((t) => [esc(t.name), esc(t.code), esc(t.type)]);
  return `
    <section class="form-screen">
      <div class="form-layout">
        <div class="form-grid" style="grid-template-columns: 200px 1fr;">
          <label class="field-label">Team Name</label><input class="field-control" id="tm-name" />
          <label class="field-label">Team Code</label><input class="field-control" id="tm-code" />
          <label class="field-label">Team Type</label>
          <select class="field-select" id="tm-type">
            <option>International</option><option>Domestic</option><option>State</option>
            <option>District</option><option>City</option><option>School</option><option>Club</option>
          </select>
        </div>
        <div><div class="panel-header">Team Logo</div><div class="photo-box">📷</div></div>
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="tm-save">Save</button>
        <button class="btn-main btn-yellow" id="tm-clear">Clear</button>
      </div>
      <div id="tm-table">${buildTable(["Team Name", "Team Code", "Team Type"], rows)}</div>
    </section>`;
}

function initTeamMaster(root) {
  const clear = () => {
    root.querySelector("#tm-name").value = "";
    root.querySelector("#tm-code").value = "";
  };
  root.querySelector("#tm-clear").addEventListener("click", clear);
  root.querySelector("#tm-save").addEventListener("click", async () => {
    const name = root.querySelector("#tm-name").value.trim();
    const code = root.querySelector("#tm-code").value.trim();
    const type = root.querySelector("#tm-type").value;
    if (!name || !code) return toast("Team name and code are required", true);
    await dbCall("saveTeam", { name, code: code.toUpperCase(), type });
    toast(`Saved team ${name}`);
    clear();
    const teams = (await dbCall("teams")) || [];
    const rows = teams.map((t) => [esc(t.name), esc(t.code), esc(t.type)]);
    root.querySelector("#tm-table").innerHTML = buildTable(["Team Name", "Team Code", "Team Type"], rows);
  });
}

// ===========================================================================
// Masters — Player
// ===========================================================================

async function buildPlayerMaster() {
  const teams = (await dbCall("teams")) || [];
  const teamOpts = optionList(teams, (t) => t.id, (t) => t.name, teams[0] && teams[0].id);
  return `
    <section class="form-screen">
      <div class="form-layout" style="grid-template-columns: 1.4fr 0.8fr;">
        <div class="form-grid" style="grid-template-columns: 200px 1fr;">
          <label class="field-label">Player Name</label><input class="field-control" id="pm-name" />
          <label class="field-label">Short Name</label><input class="field-control" id="pm-short" />
          <label class="field-label">Team Name</label><select class="field-select" id="pm-team">${teamOpts}</select>
          <label class="field-label">Player Role</label>
          <select class="field-select" id="pm-role"><option>Batsman</option><option>Bowler</option><option>All Rounder</option><option>Wicket Keeper</option></select>
          <label class="field-label">Batting Style</label>
          <select class="field-select" id="pm-bat"><option value="RHB">Right Hand Bat</option><option value="LHB">Left Hand Bat</option></select>
          <label class="field-label">Bowling Style</label>
          <select class="field-select" id="pm-bowlstyle"><option value="">None</option><option>Right Arm</option><option>Left Arm</option></select>
          <label class="field-label">Bowling Type</label>
          <select class="field-select" id="pm-bowltype"><option value="">None</option><option>Fast</option><option>Spin</option></select>
        </div>
        <div><div class="panel-header">Player Portrait</div><div class="photo-box">📷</div></div>
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="pm-save">Save</button>
        <button class="btn-main btn-yellow" id="pm-clear">Clear</button>
      </div>
      <div id="pm-table"></div>
    </section>`;
}

async function refreshPlayerTable(root) {
  const teamId = root.querySelector("#pm-team").value;
  const players = (await dbCall("players", teamId)) || [];
  const rows = players.map((p, i) => [
    String(i + 1),
    esc(p.name),
    esc(p.battingStyle),
    esc([p.bowlingStyle, p.bowlingType].filter(Boolean).join(" ")),
    esc(p.role),
  ]);
  root.querySelector("#pm-table").innerHTML = buildTable(
    ["S.No", "Player Name", "Batting Style", "Bowling Style", "Role"], rows);
}

function initPlayerMaster(root) {
  refreshPlayerTable(root);
  root.querySelector("#pm-team").addEventListener("change", () => refreshPlayerTable(root));
  root.querySelector("#pm-clear").addEventListener("click", () => {
    root.querySelector("#pm-name").value = "";
    root.querySelector("#pm-short").value = "";
  });
  root.querySelector("#pm-save").addEventListener("click", async () => {
    const name = root.querySelector("#pm-name").value.trim();
    if (!name) return toast("Player name is required", true);
    const bat = root.querySelector("#pm-bat").value;
    await dbCall("savePlayer", {
      name,
      shortName: root.querySelector("#pm-short").value.trim() || name.split(" ").slice(-1)[0],
      teamId: root.querySelector("#pm-team").value,
      role: root.querySelector("#pm-role").value,
      battingStyleCode: bat,
      battingStyle: bat === "LHB" ? "Left Hand Bat" : "Right Hand Bat",
      bowlingStyle: root.querySelector("#pm-bowlstyle").value,
      bowlingType: root.querySelector("#pm-bowltype").value,
      bowlingSpec: "",
    });
    toast(`Saved player ${name}`);
    root.querySelector("#pm-name").value = "";
    root.querySelector("#pm-short").value = "";
    refreshPlayerTable(root);
  });
}

// ===========================================================================
// Masters — Competition / Officials / Ground (read views)
// ===========================================================================

async function buildCompetitionMaster() {
  const comps = (await dbCall("competitions")) || [];
  const teams = (await dbCall("teams")) || [];
  const teamName = (id) => (teams.find((t) => t.id === id) || {}).name || "";
  const rows = comps.map((c) => [
    esc(c.name), esc(c.trophy), esc(c.matchType), esc(c.startDate), esc(c.endDate),
    esc((c.teamIds || []).map(teamName).join(", ")),
  ]);
  const teamListA = teams.map((t) => `<li>${esc(t.name)}</li>`).join("");
  return `
    <section class="form-screen">
      <div class="form-layout" style="grid-template-columns: 1.2fr 1fr;">
        <div class="form-grid" style="grid-template-columns: 240px 1fr;">
          <label class="field-label">Competition Name *</label><input class="field-control" />
          <label class="field-label">Season *</label><input class="field-control" value="2026" />
          <label class="field-label">Trophy *</label><input class="field-control" />
          <label class="field-label">Format *</label><select class="field-select"><option>League</option><option>Series</option><option>Knockout</option></select>
          <label class="field-label">Match Type *</label><select class="field-select"><option>ODI</option><option>T20I</option><option>Test</option></select>
        </div>
        <div class="option-split" style="grid-template-columns:1fr 44px 1fr;">
          <div class="list-box"><h4>List of Teams</h4><ul>${teamListA}</ul></div>
          <div class="center-stack"><div class="swapper"><div class="swap-btn swap-green">→</div><div class="swap-btn swap-red">←</div></div></div>
          <div class="list-box"><h4>Participating Teams</h4><ul></ul></div>
        </div>
      </div>
      <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
      ${buildTable(["Competition Name", "Trophy", "Match Type", "Start Date", "End Date", "Teams"], rows)}
    </section>`;
}

async function buildOfficialMaster() {
  const officials = (await dbCall("officials")) || [];
  const rows = officials.map((o) => [esc(o.name), esc(o.country), esc(o.role)]);
  return `
    <section class="form-screen">
      <div class="form-layout">
        <div class="form-grid" style="grid-template-columns: 200px 1fr;">
          <label class="field-label">Name</label><input class="field-control" />
          <label class="field-label">Role</label><select class="field-select"><option>Umpire</option><option>Match Referee</option><option>Scorer</option></select>
          <label class="field-label">Country</label><input class="field-control" />
          <label class="field-label">Category</label><select class="field-select"><option>International</option><option>Domestic</option><option>Elite</option></select>
        </div>
        <div><div class="panel-header">Officials Portrait</div><div class="photo-box">📷</div></div>
      </div>
      <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
      ${buildTable(["Officials Name", "Country", "Role"], rows)}
    </section>`;
}

async function buildGroundMaster() {
  const grounds = (await dbCall("grounds")) || [];
  const rows = grounds.map((g) => [esc(g.name), esc(g.country), esc(g.state), esc(g.city)]);
  return `
    <section class="form-screen">
      <div class="form-layout" style="grid-template-columns: 1fr 0.8fr;">
        <div class="form-grid" style="grid-template-columns: 200px 1fr;">
          <label class="field-label">Ground Name</label><input class="field-control" />
          <label class="field-label">Country</label><input class="field-control" />
          <label class="field-label">State</label><input class="field-control" />
          <label class="field-label">City</label><input class="field-control" />
        </div>
        <div><div class="panel-header">Ground Image</div><div class="photo-box">📷</div></div>
      </div>
      <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
      ${buildTable(["Ground Name", "Country", "State", "City"], rows)}
    </section>`;
}

async function buildReports() {
  const comps = (await dbCall("competitions")) || [];
  const teams = (await dbCall("teams")) || [];
  const compOpts = `<option>Select</option>` + optionList(comps, (c) => c.id, (c) => c.name);
  const teamOpts = `<option>Select</option>` + optionList(teams, (t) => t.id, (t) => t.name);
  return `
    <section class="reports-screen">
      <aside class="report-sidebar">
        <div class="report-field"><label>Match Type</label><select><option>Select</option><option>ODI</option><option>T20I</option><option>Test</option></select></div>
        <div class="report-field"><label>Competition</label><select>${compOpts}</select></div>
        <div class="report-field"><label>Batting Team</label><select>${teamOpts}</select></div>
        <div class="report-field"><label>Bowler</label><select><option>Select</option></select></div>
        <div class="report-actions">
          <button class="btn-main btn-green">Show Reports</button>
          <button class="btn-main btn-yellow">Match Report</button>
          <button class="btn-main btn-red">Export Video</button>
          <button class="btn-main btn-red">Play Video</button>
        </div>
      </aside>
      <div class="report-pane">
        <div class="tab-grid">
          <span>Bowler Vs Batsman</span><span>Report</span><span>Sector Wagon</span><span>Session Report</span><span>Shot Selection</span><span>Wagon Wheel</span>
          <span>Statistics</span><span>Appeal Report</span><span>Batsman KPI</span><span>Batsman Vs Bowler</span><span>Boundary NextBall</span><span>Bowler KPI</span>
        </div>
        <div class="table-empty"></div>
      </div>
    </section>`;
}

// ===========================================================================
// Match Registration (functional)
// ===========================================================================

const reg = {
  teams: [], competitions: [], officials: [], grounds: [], matchTypes: [],
  editingId: null,
  A: null, // { teamId, name, code, players:[], xi:[ids], captainId, keeperId }
  B: null,
  nameDirty: false,
};

function emptySide() {
  return { teamId: "", name: "", code: "", players: [], xi: [], captainId: "", keeperId: "" };
}

async function buildMatchRegistration() {
  reg.teams = (await dbCall("teams")) || [];
  reg.competitions = (await dbCall("competitions")) || [];
  reg.officials = (await dbCall("officials")) || [];
  reg.grounds = (await dbCall("grounds")) || [];
  reg.matchTypes = (await dbCall("matchTypes")) || ["ODI", "T20I", "Test"];
  reg.A = emptySide();
  reg.B = emptySide();
  reg.editingId = null;
  reg.nameDirty = false;

  const umpires = reg.officials.filter((o) => o.role === "Umpire");
  const referees = reg.officials.filter((o) => o.role === "Match Referee");
  const sel = (id, items, getV, getL, placeholder = "Select") =>
    `<select class="field-select" id="${id}"><option value="">${placeholder}</option>${optionList(items, getV, getL)}</select>`;

  return `
    <section class="form-screen" style="max-width:1520px;">
      <div class="reg-layout">
        <!-- left form -->
        <div class="reg-form">
          <label class="field-label">Competition Name</label>${sel("rg-comp", reg.competitions, (c) => c.id, (c) => c.name)}
          <label class="field-label">Match Name</label><input class="field-control" id="rg-name" />
          <label class="field-label">Match Type</label>${sel("rg-type", reg.matchTypes.map((m) => ({ v: m })), (m) => m.v, (m) => m.v)}
          <label class="field-label">Number of Overs</label><input class="field-control" id="rg-overs" value="50" />
          <label class="field-label">Match Date</label><input class="field-control" id="rg-date" type="datetime-local" />
          <label class="field-label">Venue</label>${sel("rg-venue", reg.grounds, (g) => g.id, (g) => g.name)}
          <label class="field-label">Home Team</label>${sel("rg-home", reg.teams, (t) => t.id, (t) => t.name)}
          <label class="field-label">Away Team</label>${sel("rg-away", reg.teams, (t) => t.id, (t) => t.name)}
          <label class="field-label">&nbsp;</label>
          <div class="reg-checks">
            <label><input type="checkbox" id="rg-neutral" /> Neutral Venue</label>
            <label><input type="checkbox" id="rg-daynight" checked /> Day / Night</label>
          </div>
          <label class="field-label">Umpire 1</label>${sel("rg-ump1", umpires, (o) => o.id, (o) => o.name)}
          <label class="field-label">Umpire 2</label>${sel("rg-ump2", umpires, (o) => o.id, (o) => o.name)}
          <label class="field-label">Umpire 3</label>${sel("rg-ump3", umpires, (o) => o.id, (o) => o.name)}
          <label class="field-label">Match Referee</label>${sel("rg-ref", referees, (o) => o.id, (o) => o.name)}
          <label class="field-label">Match Status</label>
          <select class="field-select" id="rg-status"><option value="RESUME">Resume (in progress)</option><option value="COMPLETED">Completed</option></select>
        </div>

        <!-- team A -->
        <div class="team-panel" id="panel-A">${renderTeamPanel("A")}</div>
        <!-- team B -->
        <div class="team-panel" id="panel-B">${renderTeamPanel("B")}</div>
      </div>

      <div class="btn-row" style="justify-content: flex-end;">
        <button class="btn-main btn-green" id="rg-save">Save Match</button>
        <button class="btn-main btn-yellow" id="rg-clear">Clear</button>
        <button class="btn-main btn-red" id="rg-delete">Delete</button>
      </div>

      <div id="rg-table"></div>
    </section>`;
}

function renderTeamPanel(which) {
  const side = reg[which];
  const inXI = new Set(side.xi);
  const squadItems = side.players
    .filter((p) => !inXI.has(p.id))
    .map((p) => pickItem(p, "", which, "squad"))
    .join("");
  const xiItems = side.xi
    .map((id, idx) => {
      const p = side.players.find((x) => x.id === id);
      return p ? pickItem(p, String(idx + 1), which, "xi") : "";
    })
    .join("");
  const xiPlayers = side.xi.map((id) => side.players.find((x) => x.id === id)).filter(Boolean);
  const capOpts = `<option value="">—</option>` + optionList(xiPlayers, (p) => p.id, (p) => p.name, side.captainId);
  const wkOpts = `<option value="">—</option>` + optionList(xiPlayers, (p) => p.id, (p) => p.name, side.keeperId);
  return `
    <div class="team-panel-head">
      <span class="tp-label">Team ${which}</span>
      <span class="tp-name">${esc(side.name || "—")}</span>
    </div>
    <div class="team-cols">
      <div>
        <div class="pick-col-head">Squad</div>
        <div class="pick-list" data-list="${which}-squad">${squadItems || ""}</div>
      </div>
      <div class="swap-col">
        <button type="button" class="swap-btn swap-green" data-move="to-xi" data-team="${which}" title="Add to Playing XI">→</button>
        <button type="button" class="swap-btn swap-red" data-move="to-squad" data-team="${which}" title="Remove from Playing XI">←</button>
        <button type="button" class="swap-btn" data-move="up" data-team="${which}" title="Move up">↑</button>
        <button type="button" class="swap-btn" data-move="down" data-team="${which}" title="Move down">↓</button>
      </div>
      <div>
        <div class="pick-col-head">Playing XI (${side.xi.length})</div>
        <div class="pick-list" data-list="${which}-xi">${xiItems || ""}</div>
      </div>
    </div>
    <div class="cap-row">
      <div><label>Captain</label><select data-cap="${which}">${capOpts}</select></div>
      <div><label>Wicket Keeper</label><select data-wk="${which}">${wkOpts}</select></div>
    </div>`;
}

function pickItem(p, num, which, list) {
  const isCap = reg[which].captainId === p.id;
  const isWk = reg[which].keeperId === p.id;
  const tag = `${isCap ? '<span class="pick-cap">C</span>' : ""}${isWk ? '<span class="pick-cap">WK</span>' : ""}`;
  return `<div class="pick-item" data-pid="${p.id}" data-team="${which}" data-list="${list}">
      <span class="pick-num">${num}</span>
      <span>${esc(p.name)}</span>${tag}
      <span class="pick-role">${esc((p.role || "").replace("Wicket Keeper", "WK").replace("All Rounder", "AR"))}</span>
    </div>`;
}

function repaintPanel(which, root) {
  root.querySelector(`#panel-${which}`).innerHTML = renderTeamPanel(which);
  wirePanel(which, root);
}

function wirePanel(which, root) {
  const panel = root.querySelector(`#panel-${which}`);
  panel.querySelectorAll(".pick-item").forEach((item) => {
    item.addEventListener("click", () => item.classList.toggle("selected"));
  });
  panel.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => moveAction(which, btn.getAttribute("data-move"), root));
  });
  panel.querySelector(`[data-cap="${which}"]`).addEventListener("change", (e) => {
    reg[which].captainId = e.target.value;
    repaintPanel(which, root);
  });
  panel.querySelector(`[data-wk="${which}"]`).addEventListener("change", (e) => {
    reg[which].keeperId = e.target.value;
    repaintPanel(which, root);
  });
}

function moveAction(which, action, root) {
  const side = reg[which];
  const panel = root.querySelector(`#panel-${which}`);
  const selectedIds = (which) =>
    [...panel.querySelectorAll(".pick-item.selected")].map((el) => el.getAttribute("data-pid"));
  const selected = selectedIds(which);

  if (action === "to-xi") {
    selected.forEach((id) => {
      const inSquadList = [...panel.querySelectorAll('.pick-item.selected[data-list="squad"]')]
        .some((el) => el.getAttribute("data-pid") === id);
      if (inSquadList && !side.xi.includes(id)) side.xi.push(id);
    });
  } else if (action === "to-squad") {
    side.xi = side.xi.filter((id) => !selected.includes(id));
    if (!side.xi.includes(side.captainId)) side.captainId = "";
    if (!side.xi.includes(side.keeperId)) side.keeperId = "";
  } else if (action === "up" || action === "down") {
    const xiSel = [...panel.querySelectorAll('.pick-item.selected[data-list="xi"]')]
      .map((el) => el.getAttribute("data-pid"));
    if (xiSel.length === 1) {
      const id = xiSel[0];
      const i = side.xi.indexOf(id);
      const j = action === "up" ? i - 1 : i + 1;
      if (i >= 0 && j >= 0 && j < side.xi.length) {
        [side.xi[i], side.xi[j]] = [side.xi[j], side.xi[i]];
      }
    }
  }
  repaintPanel(which, root);
}

function ddmmyy(dateStr) {
  // dateStr is from <input type=datetime-local> => YYYY-MM-DDTHH:mm
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}${p(d.getMonth() + 1)}${String(d.getFullYear()).slice(-2)}`;
}

function autoMatchName(root) {
  if (reg.nameDirty) return;
  const a = reg.A.code || "";
  const b = reg.B.code || "";
  const date = root.querySelector("#rg-date").value;
  if (!a || !b) return;
  const nm = `${a}VS${b}${ddmmyy(date)}`.toUpperCase().replace(/\s+/g, "");
  root.querySelector("#rg-name").value = nm;
}

async function loadSide(which, teamId, root, keepSelection) {
  const side = reg[which];
  const team = reg.teams.find((t) => t.id === teamId);
  if (!team) {
    reg[which] = emptySide();
    repaintPanel(which, root);
    return;
  }
  const players = (await dbCall("players", teamId)) || [];
  side.teamId = teamId;
  side.name = team.name;
  side.code = team.code;
  side.players = players;
  if (!keepSelection) {
    side.xi = players.slice(0, 11).map((p) => p.id);
    side.captainId = players[0] ? players[0].id : "";
    const wk = players.find((p) => p.role === "Wicket Keeper");
    side.keeperId = wk ? wk.id : "";
  }
  repaintPanel(which, root);
  autoMatchName(root);
}

async function refreshMatchesTable(root) {
  const matches = (await dbCall("matches")) || [];
  root.querySelector("#rg-table").innerHTML = renderMatchesTable(matches, true);
  wireMatchesTable(root, matches);
}

function renderMatchesTable(matches, withName) {
  const cols = ["Competition Name", "Match Name", "Match Type", "Team A", "Team B", "Status"];
  if (withName) cols.push("Delete");
  // last column is a fixed, narrow track for the delete button on registration
  const grid = withName
    ? `repeat(6, minmax(0, 1fr)) 110px`
    : `repeat(${cols.length}, minmax(0, 1fr))`;
  const head = cols.map((c) => `<span>${c}</span>`).join("");
  const body = matches.length
    ? matches
        .map((m) => {
          const statusCell =
            m.status === "COMPLETED"
              ? `<a class="status-completed" href="index.html?match=${m.id}">COMPLETED</a>`
              : `<a class="status-resume" href="index.html?match=${m.id}">RESUME</a>`;
          const nameCell = withName
            ? `<button class="row-link" data-edit="${m.id}">${esc(m.matchName)}</button>`
            : esc(m.matchName);
          const deleteCell = withName
            ? `<span><button type="button" class="row-del-btn" data-del="${m.id}" title="Delete this match">Delete</button></span>`
            : "";
          return `<div class="table-row" style="grid-template-columns:${grid};">
            <span>${esc(m.competitionName)}</span>
            <span>${nameCell}</span>
            <span>${esc(m.matchType)}</span>
            <span>${esc(m.teamA && m.teamA.name)}</span>
            <span>${esc(m.teamB && m.teamB.name)}</span>
            <span>${statusCell}</span>
            ${deleteCell}
          </div>`;
        })
        .join("")
    : `<div class="table-empty-row">No matches yet. Fill the form and press Save Match.</div>`;
  return `<section class="table-shell"><div class="table-head" style="grid-template-columns:${grid};">${head}</div><div class="table-rows">${body}</div></section>`;
}

function wireMatchesTable(root, matches) {
  root.querySelectorAll("#rg-table [data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => loadMatchIntoForm(btn.getAttribute("data-edit"), root, matches));
  });
  root.querySelectorAll("#rg-table [data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      const m = (matches || []).find((x) => x.id === id);
      const label = m ? m.matchName : "this match";
      if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
      await dbCall("deleteMatch", id);
      if (reg.editingId === id) clearRegForm(root);
      toast(`Deleted ${label}`);
      refreshMatchesTable(root);
    });
  });
}

async function loadMatchIntoForm(id, root, matches) {
  const m = (matches || []).find((x) => x.id === id) || (await dbCall("getMatch", id));
  if (!m) return;
  reg.editingId = m.id;
  reg.nameDirty = true;
  const setVal = (sel, v) => { const el = root.querySelector(sel); if (el) el.value = v == null ? "" : v; };
  setVal("#rg-comp", m.competitionId);
  setVal("#rg-name", m.matchName);
  setVal("#rg-type", m.matchType);
  setVal("#rg-overs", m.overs);
  setVal("#rg-venue", m.groundId);
  setVal("#rg-ump1", m.umpire1Id);
  setVal("#rg-ump2", m.umpire2Id);
  setVal("#rg-ump3", m.umpire3Id);
  setVal("#rg-ref", m.refereeId);
  setVal("#rg-status", m.status);
  root.querySelector("#rg-neutral").checked = !!m.neutralVenue;
  root.querySelector("#rg-daynight").checked = !!m.dayNight;
  if (m.matchDate) {
    // store provided string back into datetime-local if parseable
    const parsed = parseStoredDate(m.matchDate);
    if (parsed) setVal("#rg-date", parsed);
  }
  // teams
  setVal("#rg-home", m.teamA && m.teamA.id);
  setVal("#rg-away", m.teamB && m.teamB.id);
  await loadSide("A", m.teamA && m.teamA.id, root, true);
  await loadSide("B", m.teamB && m.teamB.id, root, true);
  reg.A.xi = (m.teamA && m.teamA.playingXI) || reg.A.xi;
  reg.A.captainId = (m.teamA && m.teamA.captainId) || "";
  reg.A.keeperId = (m.teamA && m.teamA.keeperId) || "";
  reg.B.xi = (m.teamB && m.teamB.playingXI) || reg.B.xi;
  reg.B.captainId = (m.teamB && m.teamB.captainId) || "";
  reg.B.keeperId = (m.teamB && m.teamB.keeperId) || "";
  repaintPanel("A", root);
  repaintPanel("B", root);
  toast(`Loaded ${m.matchName} for editing`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function parseStoredDate(s) {
  // accepts "DD-MM-YYYY HH:mm" or ISO; returns value for datetime-local
  if (!s) return "";
  let m = /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2})/.exec(s);
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}`;
  const d = new Date(s);
  if (!isNaN(d)) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  return "";
}

function clearRegForm(root) {
  reg.editingId = null;
  reg.nameDirty = false;
  reg.A = emptySide();
  reg.B = emptySide();
  ["#rg-comp", "#rg-name", "#rg-type", "#rg-venue", "#rg-home", "#rg-away",
   "#rg-ump1", "#rg-ump2", "#rg-ump3", "#rg-ref", "#rg-date"].forEach((s) => {
    const el = root.querySelector(s);
    if (el) el.value = "";
  });
  root.querySelector("#rg-overs").value = "50";
  root.querySelector("#rg-status").value = "RESUME";
  root.querySelector("#rg-neutral").checked = false;
  root.querySelector("#rg-daynight").checked = true;
  repaintPanel("A", root);
  repaintPanel("B", root);
}

async function initMatchRegistration(root) {
  wirePanel("A", root);
  wirePanel("B", root);

  // Home and Away can never be the same team — reject the change immediately.
  root.querySelector("#rg-home").addEventListener("change", (e) => {
    if (e.target.value && e.target.value === root.querySelector("#rg-away").value) {
      toast("Home and Away teams must be different", true);
      e.target.value = "";
      return loadSide("A", "", root, false);
    }
    loadSide("A", e.target.value, root, false);
  });
  root.querySelector("#rg-away").addEventListener("change", (e) => {
    if (e.target.value && e.target.value === root.querySelector("#rg-home").value) {
      toast("Home and Away teams must be different", true);
      e.target.value = "";
      return loadSide("B", "", root, false);
    }
    loadSide("B", e.target.value, root, false);
  });
  root.querySelector("#rg-date").addEventListener("change", () => autoMatchName(root));
  root.querySelector("#rg-name").addEventListener("input", () => { reg.nameDirty = true; });
  root.querySelector("#rg-comp").addEventListener("change", (e) => {
    const c = reg.competitions.find((x) => x.id === e.target.value);
    if (c && c.matchType) root.querySelector("#rg-type").value = c.matchType;
  });

  root.querySelector("#rg-clear").addEventListener("click", () => clearRegForm(root));

  root.querySelector("#rg-delete").addEventListener("click", async () => {
    if (!reg.editingId) return toast("Load a match first to delete", true);
    await dbCall("deleteMatch", reg.editingId);
    toast("Match deleted");
    clearRegForm(root);
    refreshMatchesTable(root);
  });

  root.querySelector("#rg-save").addEventListener("click", async () => {
    const comp = reg.competitions.find((c) => c.id === root.querySelector("#rg-comp").value);
    const ground = reg.grounds.find((g) => g.id === root.querySelector("#rg-venue").value);
    if (!reg.A.teamId || !reg.B.teamId) return toast("Select both Home and Away teams", true);
    if (reg.A.teamId === reg.B.teamId) return toast("Home and Away teams must differ", true);
    if (reg.A.xi.length < 2 || reg.B.xi.length < 2) return toast("Each team needs a Playing XI", true);

    const sideOut = (s) => ({
      id: s.teamId, name: s.name, code: s.code,
      squad: s.players.map((p) => p.id),
      playingXI: s.xi.slice(),
      captainId: s.captainId || s.xi[0] || "",
      keeperId: s.keeperId || "",
    });
    const match = {
      id: reg.editingId || undefined,
      competitionId: comp ? comp.id : "",
      competitionName: comp ? comp.name : "",
      matchName: root.querySelector("#rg-name").value.trim() || `${reg.A.code}VS${reg.B.code}`,
      matchType: root.querySelector("#rg-type").value || "ODI",
      overs: Number(root.querySelector("#rg-overs").value) || 50,
      matchDate: root.querySelector("#rg-date").value || new Date().toISOString(),
      groundId: ground ? ground.id : "",
      venueName: ground ? ground.name : "",
      neutralVenue: root.querySelector("#rg-neutral").checked,
      dayNight: root.querySelector("#rg-daynight").checked,
      umpire1Id: root.querySelector("#rg-ump1").value,
      umpire2Id: root.querySelector("#rg-ump2").value,
      umpire3Id: root.querySelector("#rg-ump3").value,
      refereeId: root.querySelector("#rg-ref").value,
      teamA: sideOut(reg.A),
      teamB: sideOut(reg.B),
      status: root.querySelector("#rg-status").value || "RESUME",
    };
    const saved = await dbCall("saveMatch", match);
    if (saved) {
      reg.editingId = saved.id;
      toast(`Saved ${saved.matchName}. Click RESUME to open the coding screen.`);
      refreshMatchesTable(root);
    } else {
      toast("Could not save match", true);
    }
  });

  refreshMatchesTable(root);
}

// ===========================================================================
// Match Details (list + create + resume)
// ===========================================================================

async function buildMatchDetails() {
  const matches = (await dbCall("matches")) || [];
  return `
    <section class="form-screen">
      <div class="btn-row" style="justify-content: flex-end; margin-top: 0;">
        <a class="btn-main btn-green" style="text-decoration:none;" href="prototype.html?screen=match-registration">+ Create Match</a>
      </div>
      <div id="md-table">${renderMatchesTable(matches, false)}</div>
    </section>`;
}

function initMatchDetails(root) {
  // status links already navigate via href; nothing extra needed.
  void root;
}

// ===========================================================================
// Boot / routing
// ===========================================================================

function abbreviateLabel(text) {
  const words = (text || "").replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CAP";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0].toUpperCase()).join("");
}

function normalizeIconBadges(root) {
  root.querySelectorAll(".menu-card").forEach((card) => {
    const icon = card.querySelector(".icon");
    const label = card.querySelector(".label");
    if (icon && label) icon.textContent = abbreviateLabel(label.textContent);
  });
}

function getScreenKey() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get("screen");
  if (!key || !screenDefs[key]) return "masters-menu";
  return key;
}

async function renderScreen() {
  const key = getScreenKey();
  const def = screenDefs[key];
  const titleEl = document.getElementById("screen-title");
  const bodyEl = document.getElementById("screen-body");
  const backEl = document.getElementById("back-link");

  titleEl.textContent = def.title;
  backEl.href = def.back || "home.html";
  bodyEl.innerHTML = `<div class="loading">Loading…</div>`;

  try {
    bodyEl.innerHTML = def.build ? await def.build() : def.body;
  } catch (e) {
    console.error(e);
    bodyEl.innerHTML = `<div class="loading">Could not load this screen.</div>`;
    return;
  }
  normalizeIconBadges(bodyEl);
  if (def.init) {
    try { await def.init(bodyEl); } catch (e) { console.error(e); }
  }
}

renderScreen();
