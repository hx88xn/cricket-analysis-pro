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

// Date helpers: <input type="date"> uses ISO (YYYY-MM-DD); we store/display the
// app's DD-MM-YYYY format. Convert at the boundary.
function isoToDMY(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (iso || "");
}
const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function dmyToIso(dmy) {
  const m = /^(\d{2})-(\d{2})-(\d{4})/.exec(dmy || "");
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Also accept the "12-Jan-2026" spelling used by seeded/imported records, so
  // editing such a row doesn't blank its date field (and then save it empty).
  const n = /^(\d{2})-([A-Za-z]{3})[a-z]*-(\d{4})/.exec(dmy || "");
  if (n) {
    const mon = MONTH_ABBR.indexOf(n[2].toUpperCase());
    if (mon >= 0) return `${n[3]}-${String(mon + 1).padStart(2, "0")}-${n[1]}`;
  }
  return "";
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

// Enforce capital letters on all text entry (matches the CAP reference). CSS
// shows caps live as you type; this commits the upper-cased value when a field
// loses focus so the stored data is upper-case too. Skips selects, file inputs,
// and non-text inputs (dates, numbers). Idempotent with per-field handling.
document.addEventListener("change", (e) => {
  const el = e.target;
  if (!el || el.tagName === "SELECT") return;
  const isText = el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && /^(text|search|)$/i.test(el.type || "text"));
  if (!isText || typeof el.value !== "string") return;
  const up = el.value.toUpperCase();
  if (up !== el.value) el.value = up;
});

// Attach a live "filter rows by text" search box to a rendered table: hides any
// .table-row whose text doesn't contain the term (header/empty rows untouched).
// Rows stay in the DOM (just display:none) so reordering still sees every row.
function wireTableSearch(searchEl, tableEl) {
  if (!searchEl || !tableEl) return;
  searchEl.addEventListener("input", () => {
    const term = searchEl.value.trim().toLowerCase();
    tableEl.querySelectorAll(".table-row").forEach((row) => {
      row.style.display = (!term || row.textContent.toLowerCase().includes(term)) ? "" : "none";
    });
  });
}

const tableSearchHtml = (id) =>
  `<input type="text" class="field-control mst-search" id="${id}" placeholder="Search…" />`;

// ---- Pagination (keeps master tables to one frame, no scrollbar) ----------
const PAGE_SIZE = 8; // fallback before the frame can be measured

// How many rows fit in the visible frame below a table, given the scale-to-fit
// stage (a 1920-wide design scaled to the window). We work in design px:
//   visible design height = window.innerHeight / scale,  scale = innerWidth/1920
// then subtract the table's top offset, its header, and room for the pager/
// footer to get the space left for rows, divided by one row's height.
function fitPageSize(tableEl, reserve = 112) {
  const w = window.innerWidth || 1920;
  const h = window.innerHeight || 1080;
  const scale = typeof window.stageScale === "function"
    ? window.stageScale()
    : w / 1920;
  const designH = Math.floor(h / scale);
  const row = tableEl.querySelector(".table-row");
  if (!row) return null; // nothing rendered yet → caller keeps its fallback
  // Table's top within the design canvas (offsetTop chain up to <body>).
  let top = 0;
  for (let el = tableEl; el; el = el.offsetParent) top += el.offsetTop || 0;
  const head = tableEl.querySelector(".table-head");
  const rowH = row.offsetHeight || 44;
  const headH = head ? head.offsetHeight : 0;
  const avail = designH - top - headH - reserve;
  return Math.max(1, Math.floor(avail / Math.max(1, rowH)));
}

// After a paged table has been drawn at `currentSize`, measure the real frame
// and, if a different number of rows fits, store it and redraw once. Guarded
// against re-entry so it settles in a single correction.
function applyAutoPage(tableEl, currentSize, redraw, reserve) {
  // Remember how to redraw this table so a window resize can re-fit it.
  tableEl._rerender = redraw;
  tableEl._reserve = reserve;
  if (tableEl._fitting) return;
  const fit = fitPageSize(tableEl, reserve);
  if (fit && fit !== currentSize) {
    tableEl._fitting = true;
    tableEl._pageSize = fit;
    redraw();
    tableEl._fitting = false;
  }
}

// On window resize the visible frame changes, so recompute every paged table's
// page size. Debounced; tables that never paginated have no _rerender and are
// skipped. Re-fires after stage.js has applied the new transform.
let _autoPageResizeT = null;
function refitAllPagedTables() {
  document.querySelectorAll('[id$="-table"]').forEach((t) => {
    if (typeof t._rerender === "function") { t._pageSize = 0; t._rerender(); }
  });
}
window.addEventListener("resize", () => {
  clearTimeout(_autoPageResizeT);
  _autoPageResizeT = setTimeout(refitAllPagedTables, 160);
});
// Re-measure once after fonts/layout settle so the first fit is accurate.
window.addEventListener("load", () => setTimeout(refitAllPagedTables, 60));

// Clamp page and return the slice for the current page plus meta for the pager.
function paginate(items, page, size = PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(0, page | 0), totalPages - 1);
  const start = p * size;
  return { slice: items.slice(start, start + size), page: p, start, totalPages, total };
}

// Pager bar markup. `label` names the records (e.g. "players").
function pagerHtml(meta, label = "records") {
  const { page, totalPages, total } = meta;
  const btn = (act, sym, disabled) =>
    `<button type="button" class="pg-btn" data-pg="${act}" ${disabled ? "disabled" : ""}>${sym}</button>`;
  const atStart = page === 0, atEnd = page >= totalPages - 1;
  return `<div class="mst-pager">
      ${btn("first", "⏮", atStart)}${btn("prev", "◀", atStart)}
      <span class="pg-info">Page ${page + 1} of ${totalPages} · ${total} ${esc(label)}</span>
      ${btn("next", "▶", atEnd)}${btn("last", "⏭", atEnd)}
    </div>`;
}

// Wire the pager buttons inside `container`; calls onGo(newPage) when clicked.
function wirePager(container, meta, onGo) {
  container.querySelectorAll(".pg-btn").forEach((b) => b.addEventListener("click", () => {
    const a = b.dataset.pg;
    let p = meta.page;
    if (a === "first") p = 0;
    else if (a === "prev") p = meta.page - 1;
    else if (a === "next") p = meta.page + 1;
    else if (a === "last") p = meta.totalPages - 1;
    onGo(Math.min(Math.max(0, p), meta.totalPages - 1));
  }));
}

// Case-insensitive "row text contains term" filter over a list, using the
// given column keys (falls back to all own values when keys omitted).
function filterItems(items, term, keys) {
  const t = (term || "").trim().toLowerCase();
  if (!t) return items;
  return items.filter((it) => {
    const hay = (keys ? keys.map((k) => it[k]) : Object.values(it))
      .map((v) => (Array.isArray(v) ? v.join(" ") : v))
      .join(" ").toLowerCase();
    return hay.includes(t);
  });
}

// Inline radio group (used by Player Master for batting/bowling style + type).
// options: array of strings or {value,label}. selected matches a value.
function radioGroup(name, options, selected) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return `<div class="radio-group">${opts.map((o) =>
    `<label class="radio-pill"><input type="radio" name="${esc(name)}" value="${esc(o.value)}" ${
      o.value === selected ? "checked" : ""} /> ${esc(o.label || "—")}</label>`).join("")}</div>`;
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
          <h2 class="cap-title"><strong>CRIC</strong><span class="tag">PRO</span></h2>
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
        <a class="menu-card" href="prototype.html?screen=coach-master"><div><div class="icon">🎽</div><div class="label">Coach</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=ground-master"><div><div class="icon">⭕</div><div class="label">Ground</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=shot-type"><div><div class="icon">🏏</div><div class="label">Shot Type</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=bowl-spec"><div><div class="icon">🥎</div><div class="label">Ball Type</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=fielding-factors"><div><div class="icon">🕓</div><div class="label">Fielding Factors</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=bowler-spec"><div><div class="icon">🎯</div><div class="label">Bowler Spec</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=user-creation"><div><div class="icon">👤</div><div class="label">User Creation</div><div class="line"></div></div></a>
      </section>`,
  },
  "shot-type": {
    title: "Shot Type",
    back: "prototype.html?screen=masters-menu",
    build: () => buildMasterEditor("Shot Type", ["Aggressive", "Defensive"], "Shot Name"),
    init: (root) => initMasterEditor(root, "Shot Type", ["Aggressive", "Defensive"], "Shot Name"),
  },
  "bowl-spec": {
    title: "Ball Type",
    back: "prototype.html?screen=masters-menu",
    build: () => buildMasterEditor("Ball Type", ["Fast", "Spin"], "Ball Type", "Bowler Type"),
    init: (root) => initMasterEditor(root, "Ball Type", ["Fast", "Spin"], "Ball Type", "Bowler Type"),
  },
  "fielding-factors": {
    title: "Fielding Factors",
    back: "prototype.html?screen=masters-menu",
    build: () => buildMasterEditor("Fielding Factor", [], "Fielding Factor"),
    init: (root) => initMasterEditor(root, "Fielding Factor", [], "Fielding Factor"),
  },
  "bowler-spec": {
    title: "Bowler Specialization",
    back: "prototype.html?screen=masters-menu",
    build: () => buildCrudMaster(BOWLER_SPEC_CFG),
    init: (root) => initCrudMaster(root, BOWLER_SPEC_CFG),
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
    title: "CRICPRO Reports",
    back: "home.html",
    build: buildReports,
    init: initReports,
  },

  // ---- data-driven screens ----
  "team-master": { title: "Team Master", back: "prototype.html?screen=masters-menu", build: buildTeamMaster, init: initTeamMaster },
  "player-master": { title: "Player Master", back: "prototype.html?screen=masters-menu", build: buildPlayerMaster, init: initPlayerMaster },
  "competition-master": { title: "Competition Master", back: "prototype.html?screen=masters-menu", build: buildCompetitionMaster, init: initCompetitionMaster },
  "official-master": {
    title: "Officials Master", back: "prototype.html?screen=masters-menu",
    build: () => buildCrudMaster(OFFICIAL_CFG), init: (root) => initCrudMaster(root, OFFICIAL_CFG),
  },
  "ground-master": {
    title: "Ground Master", back: "prototype.html?screen=masters-menu",
    build: () => buildCrudMaster(GROUND_CFG), init: (root) => initCrudMaster(root, GROUND_CFG),
  },
  "coach-master": {
    title: "Coach Master", back: "prototype.html?screen=masters-menu",
    build: () => buildCrudMaster(COACH_CFG), init: (root) => initCrudMaster(root, COACH_CFG),
  },
  "match-registration": { title: "Match Registration", back: "prototype.html?screen=match-details", build: buildMatchRegistration, init: initMatchRegistration },
  "match-details": { title: "Match Details", back: "home.html", build: buildMatchDetails, init: initMatchDetails },
  "fixtures": { title: "Fixtures", back: "prototype.html?screen=competition-master", build: buildFixtures, init: initFixtures },
};

// ===========================================================================
// Masters — Team
// ===========================================================================

const TEAM_COLUMNS = [
  { key: "name", label: "Team Name" }, { key: "code", label: "Team Code" }, { key: "type", label: "Team Type" },
];

async function buildTeamMaster() {
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
        <div><div class="panel-header">Team Logo</div>${imageBoxHtml("tm-image")}</div>
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="tm-save">Add</button>
        <button class="btn-main btn-yellow" id="tm-clear">Clear</button>
      </div>
      ${tableSearchHtml("tm-search")}
      <div id="tm-table"></div>
    </section>`;
}

function initTeamMaster(root) {
  const nameEl = root.querySelector("#tm-name");
  const codeEl = root.querySelector("#tm-code");
  const typeEl = root.querySelector("#tm-type");
  const tableEl = root.querySelector("#tm-table");
  const saveBtn = root.querySelector("#tm-save");
  const logo = wireImageBox(root.querySelector('[data-key="tm-image"]'));
  const searchEl = root.querySelector("#tm-search");
  let editing = null;
  let page = 0;
  searchEl.addEventListener("input", () => { page = 0; render(); });

  const setEditing = (id) => { editing = id; saveBtn.textContent = id ? "Update" : "Add"; saveBtn.classList.toggle("btn-blue", !!id); };
  const clear = () => { nameEl.value = ""; codeEl.value = ""; typeEl.selectedIndex = 0; logo.set(""); setEditing(null); };

  function render() {
    const size = tableEl._pageSize || PAGE_SIZE;
    const filtered = filterItems(tableEl._items || [], searchEl.value, TEAM_COLUMNS.map((c) => c.key));
    const meta = paginate(filtered, page, size);
    page = meta.page;
    tableEl.innerHTML = crudRows(meta.slice, TEAM_COLUMNS) + pagerHtml(meta, "teams");
    tableEl.querySelectorAll("button.mst-btn").forEach((b) => b.addEventListener("click", onRowAction));
    wirePager(tableEl, meta, (p) => { page = p; render(); });
    applyAutoPage(tableEl, size, render);
  }
  async function refresh() {
    tableEl._items = (await dbCall("teams")) || [];
    render();
  }
  async function onRowAction() {
    const id = this.dataset.id;
    if (this.dataset.act === "del") {
      if (editing === id) clear();
      await dbCall("deleteTeam", id);
      return refresh();
    }
    const t = (tableEl._items || []).find((x) => x.id === id);
    if (!t) return;
    nameEl.value = t.name || ""; codeEl.value = t.code || ""; typeEl.value = t.type || typeEl.options[0].value;
    logo.set(t.image || "");
    setEditing(id); nameEl.focus();
  }

  root.querySelector("#tm-clear").addEventListener("click", clear);
  saveBtn.addEventListener("click", async () => {
    const name = nameEl.value.trim();
    const code = codeEl.value.trim();
    const type = typeEl.value;
    if (!name || !code) return toast("Team name and code are required", true);
    await dbCall("saveTeam", { id: editing || undefined, name, code: code.toUpperCase(), type, image: logo.get() });
    toast(`${editing ? "Updated" : "Saved"} team ${name}`);
    clear();
    refresh();
  });
  setEditing(null);
  refresh();
}

// ===========================================================================
// Masters — Player
// ===========================================================================

async function buildPlayerMaster() {
  const teams = (await dbCall("teams")) || [];
  const teamOpts = optionList(teams, (t) => t.id, (t) => t.name, teams[0] && teams[0].id);
  return `
    <section class="form-screen">
      <div class="form-layout" style="grid-template-columns: 1.7fr 0.7fr;">
        <div class="form-grid pm-grid" style="grid-template-columns: 150px 1fr 150px 1fr;">
          <label class="field-label">Player Name (ID)</label><input class="field-control" id="pm-name" />
          <label class="field-label">Short Name</label><input class="field-control" id="pm-short" />
          <label class="field-label">Team Name</label><select class="field-select" id="pm-team">${teamOpts}</select>
          <label class="field-label">Player Role</label>
          <select class="field-select" id="pm-role"><option>Batsman</option><option>Bowler</option><option>All Rounder</option><option>Wicket Keeper</option></select>
          <label class="field-label">Date of Birth</label><input type="date" class="field-control" id="pm-dob" />
          <label class="field-label">Nationality</label><input class="field-control" id="pm-nationality" />
          <label class="field-label">Batting Style</label>
          ${radioGroup("pm-bat", [{ value: "RHB", label: "Right Hand Bat" }, { value: "LHB", label: "Left Hand Bat" }], "RHB")}
          <label class="field-label">Bowling Style</label>
          ${radioGroup("pm-bowlstyle", [{ value: "", label: "None" }, { value: "Right Arm", label: "Right Arm" }, { value: "Left Arm", label: "Left Arm" }], "")}
          <label class="field-label">Bowling Type</label>
          ${radioGroup("pm-bowltype", [{ value: "", label: "None" }, { value: "Fast", label: "Fast" }, { value: "Spin", label: "Spin" }], "")}
        </div>
        <div><div class="panel-header">Player Portrait</div>${imageBoxHtml("pm-image")}</div>
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="pm-save">Add</button>
        <button class="btn-main btn-yellow" id="pm-clear">Clear</button>
      </div>
      <p class="mst-hint">Drag a row by its ⠿ handle, or use ▲ ▼, to set the player order within the team — it drives the batting/squad order elsewhere.</p>
      ${tableSearchHtml("pm-search")}
      <div id="pm-table"></div>
    </section>`;
}

// Reorderable player table (mirrors the Masters editor): an order column with a
// drag handle, ▲ ▼ nudge buttons, plus edit/delete. Order is per-team.
// players = the current page slice; startIndex = its offset in the full list;
// total = full count (for order numbers, end-of-list arrows, the count footer);
// draggable enables grip/drag (off while a search filter is active).
function playerRows(players, startIndex = 0, total = players.length, draggable = true) {
  const cols = "70px 1.4fr 1fr 1fr 1fr 132px";
  const head = `<div class="table-head" style="grid-template-columns:${cols};">
    <span>Order</span><span>Player Name</span><span>Batting Style</span><span>Bowling Style</span><span>Role</span><span>Actions</span></div>`;
  const body = players.length ? players.map((p, i) => {
    const g = startIndex + i; // global index in the full list
    return `
    <div class="table-row mst-row" ${draggable ? 'draggable="true"' : ""} data-id="${esc(p.id)}" style="grid-template-columns:${cols};">
      <span class="mst-order">${draggable ? '<span class="mst-grip" title="Drag to reorder">⠿</span>' : ""}${g + 1}</span>
      <span>${esc(p.name)}</span>
      <span>${esc(p.battingStyle || "")}</span>
      <span>${esc([p.bowlingStyle, p.bowlingType].filter(Boolean).join(" "))}</span>
      <span>${esc(p.role || "")}</span>
      <span class="mst-actions">
        <button class="mst-btn" data-act="up" data-id="${esc(p.id)}" ${g === 0 ? "disabled" : ""}>▲</button>
        <button class="mst-btn" data-act="down" data-id="${esc(p.id)}" ${g === total - 1 ? "disabled" : ""}>▼</button>
        <button class="mst-btn" data-act="edit" data-id="${esc(p.id)}" title="Edit">✎</button>
        <button class="mst-btn mst-del" data-act="del" data-id="${esc(p.id)}" title="Delete">✕</button>
      </span>
    </div>`; }).join("") : `<div class="table-empty-row">No records found.</div>`;
  const count = `<div class="mst-count">Total players: <strong>${total}</strong></div>`;
  return `<section class="table-shell">${head}<div class="table-rows">${body}</div></section>${count}`;
}

function initPlayerMaster(root) {
  const q = (id) => root.querySelector(id);
  const nameEl = q("#pm-name"), shortEl = q("#pm-short"), teamEl = q("#pm-team");
  const roleEl = q("#pm-role"), dobEl = q("#pm-dob"), natEl = q("#pm-nationality");
  const tableEl = q("#pm-table"), saveBtn = q("#pm-save");
  const portrait = wireImageBox(q('[data-key="pm-image"]'));
  const searchEl = q("#pm-search");
  let editing = null;
  let page = 0;
  searchEl.addEventListener("input", () => { page = 0; render(); });

  // Radio-group get/set helpers (batting/bowling style + type).
  const radioGet = (name) => (root.querySelector(`input[name="${name}"]:checked`) || {}).value || "";
  const radioSet = (name, val) => {
    const el = root.querySelector(`input[name="${name}"][value="${val == null ? "" : val}"]`)
      || root.querySelector(`input[name="${name}"]`);
    if (el) el.checked = true;
  };

  const setEditing = (id) => { editing = id; saveBtn.textContent = id ? "Update" : "Add"; saveBtn.classList.toggle("btn-blue", !!id); };
  const clear = () => {
    nameEl.value = ""; shortEl.value = ""; dobEl.value = ""; natEl.value = "";
    roleEl.selectedIndex = 0; radioSet("pm-bat", "RHB"); radioSet("pm-bowlstyle", ""); radioSet("pm-bowltype", "");
    portrait.set(""); setEditing(null);
  };

  // Render one page. Drag-reorder is disabled while searching (a filtered view
  // can't map back to contiguous positions in the stored order).
  function render() {
    const size = tableEl._pageSize || PAGE_SIZE;
    const all = tableEl._items || [];
    const searching = !!searchEl.value.trim();
    const filtered = filterItems(all, searchEl.value, ["name", "battingStyle", "bowlingStyle", "bowlingType", "role"]);
    const meta = paginate(filtered, page, size);
    page = meta.page;
    tableEl.innerHTML = playerRows(meta.slice, searching ? 0 : meta.start, searching ? filtered.length : all.length, !searching)
      + pagerHtml(meta, "players");
    tableEl.querySelectorAll("button.mst-btn").forEach((b) => b.addEventListener("click", onRowAction));
    if (!searching) wirePlayerDrag(meta.start);
    wirePager(tableEl, meta, (p) => { page = p; render(); });
    // Reserve extra for the "Total players" footer above the pager.
    applyAutoPage(tableEl, size, render, 120);
  }
  async function refresh() {
    tableEl._items = (await dbCall("players", teamEl.value)) || [];
    render();
  }

  // Drag-and-drop reordering within the selected team. On drop (or ▲ ▼) the new
  // order of ids is read and persisted; dragging is suppressed when the press
  // starts on an action button.
  function wirePlayerDrag(pageStart = 0) {
    let dragEl = null;
    const container = tableEl.querySelector(".table-rows");
    if (!container) return;
    const rowAfter = (y) => [...container.querySelectorAll(".mst-row:not(.dragging)")].reduce((closest, row) => {
      const box = row.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, el: row };
      return closest;
    }, { offset: -Infinity, el: null }).el;

    tableEl.querySelectorAll(".mst-row").forEach((row) => {
      row.querySelectorAll(".mst-btn").forEach((b) => {
        b.addEventListener("mousedown", (e) => e.stopPropagation());
        b.draggable = false;
      });
      row.addEventListener("dragstart", (e) => {
        dragEl = row; row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", row.dataset.id); } catch { /* ignore */ }
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        container.classList.remove("drop-active");
        dragEl = null;
      });
    });
    container.addEventListener("dragover", (e) => {
      if (!dragEl) return;
      e.preventDefault();
      container.classList.add("drop-active");
      const after = rowAfter(e.clientY);
      if (after == null) container.appendChild(dragEl);
      else container.insertBefore(dragEl, after);
    });
    container.addEventListener("dragleave", (e) => {
      if (!container.contains(e.relatedTarget)) container.classList.remove("drop-active");
    });
    container.addEventListener("drop", async (e) => {
      if (!dragEl) return;
      e.preventDefault();
      // Rebuild the FULL order: replace this page's window with its new DOM order.
      const pageIds = [...container.querySelectorAll(".mst-row")].map((r) => r.dataset.id);
      const fullIds = (tableEl._items || []).map((x) => x.id);
      fullIds.splice(pageStart, pageIds.length, ...pageIds);
      await dbCall("reorderPlayers", teamEl.value, fullIds);
      // Reflect the new order locally, then re-render the same page.
      const byId = new Map((tableEl._items || []).map((p) => [p.id, p]));
      tableEl._items = fullIds.map((id) => byId.get(id)).filter(Boolean);
      render();
    });
  }

  async function onRowAction() {
    const id = this.dataset.id, act = this.dataset.act;
    if (act === "del") {
      if (editing === id) clear();
      await dbCall("deletePlayer", id);
      return refresh();
    }
    if (act === "up" || act === "down") {
      const ids = (tableEl._items || []).map((x) => x.id);
      const idx = ids.indexOf(id);
      const swap = act === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= ids.length) return;
      [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
      await dbCall("reorderPlayers", teamEl.value, ids);
      return refresh();
    }
    const p = (tableEl._items || []).find((x) => x.id === id);
    if (!p) return;
    nameEl.value = p.name || ""; shortEl.value = p.shortName || "";
    if (p.teamId) teamEl.value = p.teamId;
    roleEl.value = p.role || roleEl.options[0].value;
    dobEl.value = dmyToIso(p.dob) || p.dob || "";
    natEl.value = p.nationality || "";
    radioSet("pm-bat", p.battingStyleCode || (p.battingStyle === "Left Hand Bat" ? "LHB" : "RHB"));
    radioSet("pm-bowlstyle", p.bowlingStyle || "");
    radioSet("pm-bowltype", p.bowlingType || "");
    portrait.set(p.image || "");
    setEditing(id); nameEl.focus();
  }

  teamEl.addEventListener("change", () => { if (!editing) { page = 0; refresh(); } });
  q("#pm-clear").addEventListener("click", clear);
  saveBtn.addEventListener("click", async () => {
    const name = nameEl.value.trim();
    if (!name) return toast("Player name is required", true);
    // Player Name doubles as the player's unique ID — reject duplicates
    // (case-insensitive, across all teams), allowing the row being edited.
    const all = (await dbCall("players")) || [];
    if (all.some((x) => x.id !== editing && (x.name || "").trim().toLowerCase() === name.toLowerCase())) {
      return toast(`A player named "${name}" already exists`, true);
    }
    const bat = radioGet("pm-bat") || "RHB";
    await dbCall("savePlayer", {
      id: editing || undefined,
      name,
      shortName: shortEl.value.trim() || name.split(" ").slice(-1)[0],
      teamId: teamEl.value,
      role: roleEl.value,
      dob: dobEl.value ? isoToDMY(dobEl.value) : "",
      nationality: natEl.value.trim(),
      battingStyleCode: bat,
      battingStyle: bat === "LHB" ? "Left Hand Bat" : "Right Hand Bat",
      bowlingStyle: radioGet("pm-bowlstyle"),
      bowlingType: radioGet("pm-bowltype"),
      bowlingSpec: "",
      image: portrait.get(),
    });
    toast(`${editing ? "Updated" : "Saved"} player ${name}`);
    clear();
    refresh();
  });
  setEditing(null);
  refresh();
}

// ===========================================================================
// Masters — option lists (Bowl Spec / Shot Type / Fielding Factor)
// Editable + reorderable; the order here drives the coding screen grids.
// ===========================================================================

function masterTableCols(hasGroups) {
  return `70px 1fr ${hasGroups ? "150px " : ""}132px`;
}

// Renders ONE table for the active group's current page. `slice` is the page's
// rows; startIndex is its offset within the group; total is the group size;
// draggable toggles grip/drag (off while searching).
function renderMasterRows(slice, hasGroups, nameLabel, groupLabel, grp, startIndex, total, draggable) {
  const cols = masterTableCols(hasGroups);
  const head = `<div class="table-head" style="grid-template-columns:${cols};">
    <span>Order</span><span>${esc(nameLabel)}</span>${hasGroups ? `<span>${esc(groupLabel)}</span>` : ""}<span>Actions</span></div>`;
  const rows = slice.length ? slice.map((it, i) => {
    const g = startIndex + i;
    return `
      <div class="table-row mst-row" ${draggable ? 'draggable="true"' : ""} data-id="${esc(it.id)}" data-grp="${esc(grp)}" style="grid-template-columns:${cols};">
        <span class="mst-order">${draggable ? '<span class="mst-grip" title="Drag to reorder">⠿</span>' : ""}${g + 1}</span>
        <span>${esc(it.name)}</span>
        ${hasGroups ? `<span>${esc(grp)}</span>` : ""}
        <span class="mst-actions">
          <button class="mst-btn" data-act="up" data-id="${esc(it.id)}" data-grp="${esc(grp)}" ${g === 0 ? "disabled" : ""}>▲</button>
          <button class="mst-btn" data-act="down" data-id="${esc(it.id)}" data-grp="${esc(grp)}" ${g === total - 1 ? "disabled" : ""}>▼</button>
          <button class="mst-btn" data-act="edit" data-id="${esc(it.id)}" data-name="${esc(it.name)}" data-grp="${esc(grp)}" title="Edit">✎</button>
          <button class="mst-btn mst-del" data-act="del" data-id="${esc(it.id)}">✕</button>
        </span>
      </div>`; }).join("") : `<div class="table-empty-row">No records found.</div>`;
  return `<section class="table-shell">${head}<div class="table-rows" data-grp="${esc(grp)}">${rows}</div></section>`;
}

async function buildMasterEditor(category, groups, nameLabel, groupLabel = "Group") {
  const hasGroups = groups && groups.length;
  const grpField = hasGroups
    ? `<label class="field-label">${esc(groupLabel)}</label><select class="field-select" id="mm-grp">${
        groups.map((g) => `<option>${esc(g)}</option>`).join("")}</select>`
    : "";
  return `
    <section class="form-screen" style="max-width: 1040px;">
      <div class="form-grid" style="grid-template-columns: 200px 1fr;">
        <label class="field-label">${esc(nameLabel)}</label><input class="field-control" id="mm-name" />
        ${grpField}
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="mm-save">Add</button>
        <button class="btn-main btn-yellow" id="mm-clear">Clear</button>
      </div>
      <p class="mst-hint">Drag a row by its ⠿ handle, or use ▲ ▼, to set the display order — it replicates on the coding screen (top-left first).</p>
      ${hasGroups ? `<div class="mm-tabs">${groups.map((g, i) =>
        `<button type="button" class="mm-tab${i === 0 ? " is-active" : ""}" data-grp="${esc(g)}">${esc(g)}</button>`).join("")}</div>` : ""}
      ${tableSearchHtml("mm-search")}
      <div id="mm-table"></div>
    </section>`;
}

function initMasterEditor(root, category, groups, nameLabel, groupLabel = "Group") {
  const hasGroups = groups && groups.length;
  const tableEl = root.querySelector("#mm-table");
  const nameEl = root.querySelector("#mm-name");
  const grpEl = root.querySelector("#mm-grp");
  const saveBtn = root.querySelector("#mm-save");
  const searchEl = root.querySelector("#mm-search");
  let activeGrp = hasGroups ? groups[0] : "";
  let editing = null; // { id, grp, ord } when editing an existing row
  let page = 0;
  let allItems = [];

  // Items belonging to the active group, in their stored (sortable) order.
  const groupItems = () => (hasGroups ? allItems.filter((it) => (it.grp || "") === activeGrp) : allItems);

  // Render the active group's current page (+ pager). Drag is off while searching.
  function render() {
    const size = tableEl._pageSize || PAGE_SIZE;
    const searching = !!searchEl.value.trim();
    const list = groupItems();
    const filtered = filterItems(list, searchEl.value, ["name"]);
    const meta = paginate(filtered, page, size);
    page = meta.page;
    tableEl.innerHTML = renderMasterRows(
      meta.slice, hasGroups, nameLabel, groupLabel, activeGrp,
      searching ? 0 : meta.start, searching ? filtered.length : list.length, !searching,
    ) + pagerHtml(meta, "entries");
    tableEl.querySelectorAll("button.mst-btn").forEach((btn) => btn.addEventListener("click", onRowAction));
    if (!searching) wireDrag(meta.start);
    wirePager(tableEl, meta, (p) => { page = p; render(); });
    applyAutoPage(tableEl, size, render);
  }

  searchEl.addEventListener("input", () => { page = 0; render(); });

  // Tab switching between groups (Aggressive/Defensive, Fast/Spin).
  root.querySelectorAll(".mm-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeGrp = tab.dataset.grp;
      page = 0;
      root.querySelectorAll(".mm-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
      if (grpEl) grpEl.value = activeGrp; // new rows land in the visible group
      render();
    });
  });

  const setEditing = (item) => {
    editing = item;
    saveBtn.textContent = item ? "Update" : "Add";
    saveBtn.classList.toggle("btn-blue", !!item);
  };

  async function refresh() {
    allItems = (await dbCall("masters", category)) || [];
    render();
  }

  async function onRowAction() {
    const act = this.dataset.act, id = this.dataset.id, grp = this.dataset.grp || "";
    if (act === "del") {
      if (editing && editing.id === id) clearForm();
      await dbCall("deleteMaster", id);
      return refresh();
    }
    if (act === "edit") {
      nameEl.value = this.dataset.name || "";
      if (grpEl) grpEl.value = grp;
      const cur = allItems.find((it) => it.id === id) || {};
      setEditing({ id, grp, ord: cur.ord });
      nameEl.focus();
      return;
    }
    // up/down: swap within the group's full ordered id list (works across pages).
    const ids = allItems.filter((it) => (it.grp || "") === grp).map((it) => it.id);
    const idx = ids.indexOf(id);
    const swap = act === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    await dbCall("reorderMaster", category, grp, ids);
    refresh();
  }

  function clearForm() { nameEl.value = ""; setEditing(null); }

  // Drag-and-drop reordering: rows can only be reordered within their own group
  // (Fast/Spin, Aggressive/Defensive). On drop we read the new DOM order of ids
  // and persist it. Dragging is suppressed when the press starts on a button.
  function wireDrag(pageStart = 0) {
    let dragEl = null;
    let dragGrp = null;

    const rowAfter = (container, y) => {
      const rows = [...container.querySelectorAll(".mst-row:not(.dragging)")];
      return rows.reduce((closest, row) => {
        const box = row.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, el: row };
        return closest;
      }, { offset: -Infinity, el: null }).el;
    };

    tableEl.querySelectorAll(".mst-row").forEach((row) => {
      // don't initiate a drag from the action buttons
      row.querySelectorAll(".mst-btn").forEach((b) => {
        b.addEventListener("mousedown", (e) => e.stopPropagation());
        b.draggable = false;
      });
      row.addEventListener("dragstart", (e) => {
        dragEl = row; dragGrp = row.dataset.grp || "";
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", row.dataset.id); } catch { /* ignore */ }
      });
      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        tableEl.querySelectorAll(".table-rows.drop-active").forEach((c) => c.classList.remove("drop-active"));
        dragEl = null; dragGrp = null;
      });
    });

    tableEl.querySelectorAll(".table-rows").forEach((container) => {
      container.addEventListener("dragover", (e) => {
        if (!dragEl || (container.dataset.grp || "") !== dragGrp) return; // same group only
        e.preventDefault();
        container.classList.add("drop-active");
        const after = rowAfter(container, e.clientY);
        if (after == null) container.appendChild(dragEl);
        else container.insertBefore(dragEl, after);
      });
      container.addEventListener("dragleave", (e) => {
        if (!container.contains(e.relatedTarget)) container.classList.remove("drop-active");
      });
      container.addEventListener("drop", async (e) => {
        if (!dragEl || (container.dataset.grp || "") !== dragGrp) return;
        e.preventDefault();
        const grp = container.dataset.grp || "";
        // Rebuild the FULL group order: replace this page's window with its new order.
        const pageIds = [...container.querySelectorAll(".mst-row")].map((r) => r.dataset.id);
        const fullIds = allItems.filter((it) => (it.grp || "") === grp).map((it) => it.id);
        fullIds.splice(pageStart, pageIds.length, ...pageIds);
        await dbCall("reorderMaster", category, grp, fullIds);
        refresh();
      });
    });
  }

  saveBtn.addEventListener("click", async () => {
    const name = nameEl.value.trim().toUpperCase();
    if (!name) return toast(`${nameLabel} is required`, true);
    const grp = grpEl ? grpEl.value : "";
    if (editing) {
      // keep the row's position unless its group changed (then append to new group)
      const payload = { id: editing.id, category, grp, name };
      if (grp === editing.grp) payload.ord = editing.ord;
      await dbCall("saveMaster", payload);
      toast(`Updated ${name}`);
    } else {
      await dbCall("saveMaster", { category, grp, name });
      toast(`Added ${name}`);
    }
    clearForm();
    refresh();
  });
  root.querySelector("#mm-clear").addEventListener("click", clearForm);

  setEditing(null);
  refresh();
}

// ===========================================================================
// Generic entity master (flat records) — Save / Edit / Delete from the DB.
// Used by Officials, Ground, Coach and Bowler Spec. Field types: text,
// textarea, select, checks (multi-checkbox, static or DB-sourced), image
// (upload → data URL), ground (ground-size diagram). image/ground render in a
// right-hand column; everything else in the left field grid.
// ===========================================================================

const isSideField = (f) => f.type === "image" || f.type === "ground";

// Turn each field's option source into a uniform [{value,label}] list. A field
// with `optionsFn` pulls its options from the DB (e.g. teams); `options` may be
// plain strings or {value,label} objects.
async function resolveCrudOptions(cfg) {
  for (const f of cfg.fields) {
    if (f.optionsFn) {
      const list = (await dbCall(f.optionsFn)) || [];
      f._options = list.map((o) => ({ value: o[f.valueKey || "id"], label: o[f.labelKey || "name"] }));
    } else if (f.options) {
      f._options = f.options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
    } else {
      f._options = [];
    }
  }
}

// ---- reusable image upload box -------------------------------------------
function imageBoxHtml(key) {
  return `<div class="cm-image" data-key="${esc(key)}">
      <input type="file" accept="image/*" class="cm-image-input" hidden />
      <div class="cm-image-drop">
        <img class="cm-image-preview" alt="" hidden />
        <div class="cm-image-ph"><span class="cm-image-icon">📷</span><span>Add image</span></div>
      </div>
    </div>`;
}

function setImageBox(box, dataUrl) {
  if (!box) return;
  box._dataUrl = dataUrl || "";
  const img = box.querySelector(".cm-image-preview");
  const ph = box.querySelector(".cm-image-ph");
  if (dataUrl) { img.src = dataUrl; img.hidden = false; ph.hidden = true; }
  else { img.removeAttribute("src"); img.hidden = true; ph.hidden = false; }
}

// Click opens the picker; choosing a file stores it as a data URL on the box
// (box._dataUrl) and shows the preview. Returns getter/setter helpers.
function wireImageBox(box) {
  if (!box) return { get: () => "", set: () => {} };
  const input = box.querySelector(".cm-image-input");
  box.querySelector(".cm-image-drop").addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageBox(box, reader.result);
    reader.readAsDataURL(file);
  });
  return { get: () => box._dataUrl || "", set: (v) => setImageBox(box, v) };
}

function groundWidgetHtml(f) {
  // 3x3 grid of boundary-distance inputs around a centre field graphic.
  // data-pos runs clockwise from top (0=N,1=NE,2=E,3=SE,4=S,5=SW,6=W,7=NW).
  const cell = (pos) => `<input type="number" min="0" class="cm-ground-input" data-pos="${pos}" placeholder="m" />`;
  return `<div class="cm-ground" data-key="${esc(f.key)}">
      <div class="cm-ground-sides"><span>OFF SIDE</span><span>ON SIDE</span></div>
      <div class="cm-ground-grid">
        ${cell(7)}${cell(0)}${cell(1)}
        ${cell(6)}<div class="cm-ground-center"></div>${cell(2)}
        ${cell(5)}${cell(4)}${cell(3)}
      </div>
    </div>`;
}

function crudControlHtml(f) {
  const opts = f._options || [];
  switch (f.type) {
    case "textarea":
      return `<textarea class="field-control cm-textarea" data-key="${esc(f.key)}" rows="5"></textarea>`;
    case "select":
      return `<select class="field-select" data-key="${esc(f.key)}">${
        opts.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select>`;
    case "checks":
      return `<div class="list-box cm-checks" data-key="${esc(f.key)}"><div class="cm-team-list">${
        opts.map((o) => `<label class="cm-team"><input type="checkbox" value="${esc(o.value)}" /> ${esc(o.label)}</label>`).join("")
        || "<p class='mst-hint'>No options.</p>"}</div></div>`;
    case "image":
      return imageBoxHtml(f.key);
    case "ground":
      return groundWidgetHtml(f);
    default:
      return `<input class="field-control" data-key="${esc(f.key)}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} />`;
  }
}

// rowActions: optional (item) => HTML, injected before the edit/delete buttons
// (used by Competition Master to add a per-row "Fixtures" link).
function crudRows(items, columns, rowActions) {
  const actionsW = rowActions ? "180px" : "120px";
  const cols = `${columns.map(() => "1fr").join(" ")} ${actionsW}`;
  const head = `<div class="table-head" style="grid-template-columns:${cols};">${
    columns.map((c) => `<span>${esc(c.label)}</span>`).join("")}<span>Actions</span></div>`;
  const fmt = (v) => (Array.isArray(v) ? v.join(", ") : (v ?? ""));
  const body = items.length ? items.map((it) => `
    <div class="table-row" style="grid-template-columns:${cols};">
      ${columns.map((c) => `<span>${esc(fmt(it[c.key]))}</span>`).join("")}
      <span class="mst-actions">
        ${rowActions ? rowActions(it) : ""}
        <button class="mst-btn" data-act="edit" data-id="${esc(it.id)}" title="Edit">✎</button>
        <button class="mst-btn mst-del" data-act="del" data-id="${esc(it.id)}" title="Delete">✕</button>
      </span>
    </div>`).join("") : `<div class="table-empty-row">No records found.</div>`;
  return `<section class="table-shell">${head}<div class="table-rows">${body}</div></section>`;
}

async function buildCrudMaster(cfg) {
  await resolveCrudOptions(cfg);
  const main = cfg.fields.filter((f) => !isSideField(f));
  const side = cfg.fields.filter(isSideField);
  const mainHtml = main.map((f) =>
    `<label class="field-label">${esc(f.label)}</label>${crudControlHtml(f)}`).join("");
  const sideHtml = side.map((f) =>
    `<div class="cm-side-field"><div class="cm-side-head">${esc(f.label)}</div>${crudControlHtml(f)}</div>`).join("");
  const layout = side.length
    ? `<div class="cm-layout">
         <div class="form-grid cm-main" style="grid-template-columns: 170px 1fr;">${mainHtml}</div>
         <div class="cm-side">${sideHtml}</div>
       </div>`
    : `<div class="form-grid" style="grid-template-columns: 200px 1fr;">${mainHtml}</div>`;
  return `
    <section class="form-screen" style="max-width: 1280px;">
      ${layout}
      <div class="btn-row">
        <button class="btn-main btn-green" id="cm-save">Save</button>
        <button class="btn-main btn-yellow" id="cm-clear">Clear</button>
        <button class="btn-main btn-red" id="cm-delete" disabled>Delete</button>
      </div>
      ${tableSearchHtml("cm-search")}
      <div id="cm-table"></div>
    </section>`;
}

function initCrudMaster(root, cfg) {
  const tableEl = root.querySelector("#cm-table");
  const saveBtn = root.querySelector("#cm-save");
  const delBtn = root.querySelector("#cm-delete");
  const searchEl = root.querySelector("#cm-search");
  let page = 0;
  const colKeys = cfg.columns.map((c) => c.key);
  searchEl.addEventListener("input", () => { page = 0; render(); });
  const ctrl = {};
  cfg.fields.forEach((f) => { ctrl[f.key] = root.querySelector(`[data-key="${f.key}"]`); });
  let editing = null;

  function readField(f) {
    const el = ctrl[f.key];
    if (!el) return "";
    switch (f.type) {
      case "checks":
        return [...el.querySelectorAll("input:checked")].map((c) => c.value);
      case "image":
        return el._dataUrl || "";
      case "ground":
        return [...el.querySelectorAll(".cm-ground-input")]
          .sort((a, b) => a.dataset.pos - b.dataset.pos)
          .map((i) => (i.value === "" ? null : Number(i.value)));
      default: {
        // Only text/textarea reach here (checks/image/ground/select handled
        // above) — store them upper-cased to match the CAP reference data.
        const v = typeof el.value === "string" ? el.value.trim() : el.value;
        return typeof v === "string" ? v.toUpperCase() : v;
      }
    }
  }

  function writeField(f, val) {
    const el = ctrl[f.key];
    if (!el) return;
    switch (f.type) {
      case "checks": {
        const set = new Set((val || []).map(String));
        el.querySelectorAll("input").forEach((c) => { c.checked = set.has(String(c.value)); });
        break;
      }
      case "image":
        setImageBox(el, val || "");
        break;
      case "ground": {
        const arr = val || [];
        el.querySelectorAll(".cm-ground-input").forEach((i) => {
          const v = arr[Number(i.dataset.pos)];
          i.value = (v == null ? "" : v);
        });
        break;
      }
      case "select":
        el.value = val || (el.options[0] && el.options[0].value) || "";
        break;
      default:
        el.value = val == null ? "" : val;
    }
  }

  function clearField(f) {
    switch (f.type) {
      case "checks": writeField(f, []); break;
      case "image": setImageBox(ctrl[f.key], ""); break;
      case "ground": writeField(f, []); break;
      case "select": if (ctrl[f.key]) ctrl[f.key].selectedIndex = 0; break;
      default: if (ctrl[f.key]) ctrl[f.key].value = "";
    }
  }

  const setEditing = (id) => { editing = id; if (delBtn) delBtn.disabled = !id; };
  const clearForm = () => { cfg.fields.forEach(clearField); setEditing(null); };

  // Wire image upload boxes (click → picker → data-URL preview).
  cfg.fields.filter((f) => f.type === "image").forEach((f) => wireImageBox(ctrl[f.key]));

  // Render the current page of the (search-filtered) list + pager.
  function render() {
    const size = tableEl._pageSize || PAGE_SIZE;
    const filtered = filterItems(tableEl._items || [], searchEl.value, colKeys);
    const meta = paginate(filtered, page, size);
    page = meta.page;
    tableEl.innerHTML = crudRows(meta.slice, cfg.columns, cfg.rowActions) + pagerHtml(meta, cfg.entity.toLowerCase() + "s");
    tableEl.querySelectorAll("button.mst-btn").forEach((b) => b.addEventListener("click", onRowAction));
    wirePager(tableEl, meta, (p) => { page = p; render(); });
    applyAutoPage(tableEl, size, render);
  }

  async function refresh() {
    tableEl._items = (await dbCall(cfg.listFn)) || [];
    render();
  }

  async function onRowAction() {
    const id = this.dataset.id;
    if (this.dataset.act === "del") {
      if (editing === id) clearForm();
      await dbCall(cfg.deleteFn, id);
      return refresh();
    }
    const item = (tableEl._items || []).find((it) => it.id === id);
    if (!item) return;
    cfg.fields.forEach((f) => writeField(f, item[f.key]));
    setEditing(id);
    const first = ctrl[cfg.fields[0].key];
    if (first && first.focus) first.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  saveBtn.addEventListener("click", async () => {
    const rec = {};
    cfg.fields.forEach((f) => { rec[f.key] = readField(f); });
    const req = cfg.required || [cfg.fields[0].key];
    const missing = req.some((k) => !rec[k] || (Array.isArray(rec[k]) && !rec[k].length));
    if (missing) return toast(`${cfg.entity} needs ${req.join(", ")}`, true);
    if (editing) rec.id = editing;
    await dbCall(cfg.saveFn, rec);
    toast(`${editing ? "Updated" : "Saved"} ${rec[cfg.fields[0].key]}`);
    clearForm();
    refresh();
  });
  root.querySelector("#cm-clear").addEventListener("click", clearForm);
  if (delBtn) delBtn.addEventListener("click", async () => {
    if (!editing) return;
    const item = (tableEl._items || []).find((it) => it.id === editing);
    const label = item ? item[cfg.fields[0].key] : "this record";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    await dbCall(cfg.deleteFn, editing);
    clearForm();
    refresh();
  });

  setEditing(null);
  refresh();
}

// ===========================================================================
// Masters — Competition / Officials / Ground
// ===========================================================================

// Officials of one role, tolerant of case differences in stored role values.
function officialsByRole(list, role) {
  const want = String(role || "").toUpperCase();
  return (list || []).filter((o) => String(o.role || "").toUpperCase() === want);
}

// Umpire master list backing the Competition Master's umpire dropdown.
const cp = { umpires: [] };

async function buildCompetitionMaster() {
  const [teams, officials, types] = await Promise.all([
    dbCall("teams"), dbCall("officials"), dbCall("matchTypes"),
  ]);
  const check = (v, label) =>
    `<label class="cm-team"><input type="checkbox" value="${esc(v)}" /> ${esc(label)}</label>`;
  const teamChecks = (teams || []).map((t) => check(t.id, t.name)).join("");
  // Umpires come straight from the Officials master, so a competition can only
  // be allocated umpires that actually exist there.
  cp.umpires = officialsByRole(officials, "Umpire");
  // Match Type options are the Match Type master list from the database.
  const typeOpts = ((types && types.length) ? types : ["ODI", "T20I", "Test"])
    .map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  return `
    <section class="form-screen">
      <div class="form-layout cp-layout">
        <div class="form-grid" style="grid-template-columns: 200px 1fr;">
          <label class="field-label">Competition Name *</label><input class="field-control" id="cp-name" />
          <label class="field-label">Season</label><input class="field-control" id="cp-season" value="2026" />
          <label class="field-label">Trophy</label><input class="field-control" id="cp-trophy" />
          <label class="field-label">Format</label><select class="field-select" id="cp-format"><option>League</option><option>Series</option><option>Knockout</option></select>
          <label class="field-label">Match Type</label><select class="field-select" id="cp-type"><option value="">Select</option>${typeOpts}</select>
          <label class="field-label">Start Date</label><input type="date" class="field-control" id="cp-start" />
          <label class="field-label">End Date</label><input type="date" class="field-control" id="cp-end" />
        </div>
        <div class="list-box">
          <h4>Participating Teams</h4>
          <input type="text" class="field-control cp-list-search" id="cp-team-search" placeholder="Search teams…" />
          <div class="cm-team-list" id="cp-teams">${teamChecks || "<p class='mst-hint'>No teams yet.</p>"}</div>
        </div>
        <div class="list-box">
          <h4>Umpires</h4>
          <select class="field-select cp-list-search" id="cp-umpire-pick" ${cp.umpires.length ? "" : "disabled"}>
            <option value="">${cp.umpires.length ? "Add umpire…" : "No umpires in Officials master"}</option>
          </select>
          <div class="cm-chip-list" id="cp-umpires"></div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="cp-save">Add</button>
        <button class="btn-main btn-yellow" id="cp-clear">Clear</button>
      </div>
      <input type="text" class="field-control cp-list-search" id="cp-name-search" placeholder="Search competition name…" />
      <div id="cp-table"></div>
    </section>`;
}

const COMPETITION_COLUMNS = [
  { key: "name", label: "Competition Name" }, { key: "trophy", label: "Trophy" },
  { key: "matchType", label: "Match Type" }, { key: "season", label: "Season" },
  { key: "startDate", label: "Start Date" }, { key: "endDate", label: "End Date" },
  { key: "teamsLabel", label: "Teams" }, { key: "umpiresLabel", label: "Umpires" },
];

function initCompetitionMaster(root) {
  const q = (id) => root.querySelector(id);
  const f = {
    name: q("#cp-name"), season: q("#cp-season"), trophy: q("#cp-trophy"),
    format: q("#cp-format"), type: q("#cp-type"), start: q("#cp-start"), end: q("#cp-end"),
  };
  const teamsBox = q("#cp-teams"), umpsBox = q("#cp-umpires"), tableEl = q("#cp-table"), saveBtn = q("#cp-save");
  const teamSearch = q("#cp-team-search"), umpPick = q("#cp-umpire-pick"), nameSearch = q("#cp-name-search");
  let editing = null;
  let page = 0;
  let umpireIds = []; // umpires allocated to the competition being edited

  const checkedIn = (box) => [...box.querySelectorAll("input:checked")].map((c) => c.value);
  const setChecked = (box, ids) =>
    box.querySelectorAll("input").forEach((c) => { c.checked = (ids || []).includes(c.value); });

  // Umpires are picked one at a time from the dropdown; each pick moves out of
  // the dropdown and into the allocated list below it, removable from there.
  const umpireLabel = (o) => (o.country ? `${o.name} (${o.country})` : o.name);
  function renderUmpires() {
    const chosen = umpireIds
      .map((id) => cp.umpires.find((o) => o.id === id))
      .filter(Boolean);
    umpsBox.innerHTML = chosen.length
      ? chosen.map((o) => `<span class="cm-chip">${esc(umpireLabel(o))}
          <button type="button" class="cm-chip-x" data-id="${esc(o.id)}" title="Remove">✕</button></span>`).join("")
      : `<p class="mst-hint">No umpires allocated — all umpires will be available.</p>`;
    umpsBox.querySelectorAll(".cm-chip-x").forEach((b) => b.addEventListener("click", () => {
      umpireIds = umpireIds.filter((id) => id !== b.dataset.id);
      renderUmpires();
    }));
    const remaining = cp.umpires.filter((o) => !umpireIds.includes(o.id));
    umpPick.innerHTML = `<option value="">${cp.umpires.length
      ? (remaining.length ? "Add umpire…" : "All umpires added")
      : "No umpires in Officials master"}</option>`
      + optionList(remaining, (o) => o.id, umpireLabel);
    umpPick.disabled = !remaining.length;
  }
  umpPick.addEventListener("change", () => {
    if (!umpPick.value) return;
    umpireIds.push(umpPick.value);
    renderUmpires();
  });

  const setEditing = (id) => { editing = id; saveBtn.textContent = id ? "Update" : "Add"; saveBtn.classList.toggle("btn-blue", !!id); };
  const clear = () => {
    f.name.value = ""; f.trophy.value = ""; f.start.value = ""; f.end.value = "";
    f.season.value = "2026"; f.format.selectedIndex = 0; f.type.selectedIndex = 0;
    setChecked(teamsBox, []); umpireIds = []; renderUmpires(); setEditing(null);
  };

  // Live filter for the participating-team checkbox list.
  teamSearch.addEventListener("input", () => {
    const term = teamSearch.value.trim().toLowerCase();
    teamsBox.querySelectorAll(".cm-team").forEach((lbl) => {
      lbl.style.display = lbl.textContent.toLowerCase().includes(term) ? "" : "none";
    });
  });

  // Competitions matching the current name-search box (full, unpaged set).
  const filteredRows = () => {
    const term = (nameSearch.value || "").trim().toLowerCase();
    return (tableEl._all || []).filter((r) => !term || (r.name || "").toLowerCase().includes(term));
  };

  // Render one page of the competitions table, filtered by the name search box.
  function renderTable() {
    const size = tableEl._pageSize || PAGE_SIZE;
    const rows = filteredRows();
    tableEl._items = rows; // full filtered set, so onRowAction can find any row by id
    const meta = paginate(rows, page, size);
    page = meta.page;
    tableEl.innerHTML = crudRows(meta.slice, COMPETITION_COLUMNS, (it) =>
      `<a class="mst-btn mst-fixtures" href="prototype.html?screen=fixtures&comp=${encodeURIComponent(it.id)}" title="Add / view fixtures">Fixtures</a>`)
      + pagerHtml(meta, "competitions");
    // The Fixtures link is a plain anchor; only wire the edit/delete buttons.
    tableEl.querySelectorAll("button.mst-btn").forEach((b) => b.addEventListener("click", onRowAction));
    wirePager(tableEl, meta, (p) => { page = p; renderTable(); });
    applyAutoPage(tableEl, size, renderTable);
  }
  nameSearch.addEventListener("input", () => { page = 0; renderTable(); });

  async function refresh(focusId) {
    const [comps, teams, officials] = await Promise.all([
      dbCall("competitions"), dbCall("teams"), dbCall("officials"),
    ]);
    const nameOf = (id) => ((teams || []).find((t) => t.id === id) || {}).name || id;
    const officialName = (id) => ((officials || []).find((o) => o.id === id) || {}).name || id;
    tableEl._all = (comps || []).map((c) => ({
      ...c, teamsLabel: (c.teamIds || []).map(nameOf).join(", "),
      umpiresLabel: (c.officialIds || []).map(officialName).join(", "),
    }));
    // After adding a competition, jump to the page that actually contains it so
    // it's visible right away instead of hiding on a later page.
    if (focusId) {
      const idx = filteredRows().findIndex((r) => r.id === focusId);
      if (idx >= 0) page = Math.floor(idx / (tableEl._pageSize || PAGE_SIZE));
    }
    renderTable();
  }
  async function onRowAction() {
    const id = this.dataset.id;
    if (this.dataset.act === "del") {
      if (editing === id) clear();
      await dbCall("deleteCompetition", id);
      return refresh();
    }
    const c = (tableEl._items || []).find((x) => x.id === id);
    if (!c) return;
    f.name.value = c.name || ""; f.season.value = c.season || "";
    f.trophy.value = c.trophy || ""; f.format.value = c.format || f.format.options[0].value;
    // Keep a stored match type visible even if it is no longer in the master.
    f.type.value = "";
    setSelectValue(root, "#cp-type", c.matchType);
    f.start.value = dmyToIso(c.startDate); f.end.value = dmyToIso(c.endDate);
    setChecked(teamsBox, c.teamIds || []);
    umpireIds = (c.officialIds || []).filter((oid) => cp.umpires.some((o) => o.id === oid));
    renderUmpires();
    setEditing(id); f.name.focus();
  }

  q("#cp-clear").addEventListener("click", clear);
  saveBtn.addEventListener("click", async () => {
    const name = f.name.value.trim();
    if (!name) return toast("Competition name is required", true);
    const wasNew = !editing;
    const saved = await dbCall("saveCompetition", {
      id: editing || undefined, name, season: f.season.value.trim(), trophy: f.trophy.value.trim(),
      format: f.format.value, matchType: f.type.value,
      startDate: isoToDMY(f.start.value), endDate: isoToDMY(f.end.value),
      teamIds: checkedIn(teamsBox), officialIds: umpireIds.slice(),
    });
    toast(`${wasNew ? "Saved" : "Updated"} ${name}`);
    clear();
    // Drop any active name filter on a fresh add so the new row isn't hidden,
    // then refresh focused on it so it lands on the visible page.
    if (wasNew) nameSearch.value = "";
    refresh(wasNew ? (saved && saved.id) : null);
  });
  renderUmpires();
  setEditing(null);
  refresh();
}

const OFFICIAL_CFG = {
  entity: "Official",
  listFn: "officials", saveFn: "saveOfficial", deleteFn: "deleteOfficial",
  fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "role", label: "Role", type: "select", options: ["Umpire", "Match Referee", "Scorer"] },
    { key: "state", label: "State", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "category", label: "Officials Category", type: "checks", options: ["International", "Domestic", "Elite", "Plate"] },
    { key: "image", label: "Officials Portrait", type: "image" },
  ],
  columns: [
    { key: "name", label: "Officials Name" }, { key: "country", label: "Country" },
    { key: "role", label: "Role" },
  ],
  required: ["name"],
};

const COACH_CFG = {
  entity: "Coach",
  listFn: "coaches", saveFn: "saveCoach", deleteFn: "deleteCoach",
  fields: [
    { key: "name", label: "Coach Name", type: "text" },
    { key: "teams", label: "Team", type: "checks", optionsFn: "teams" },
    { key: "specializations", label: "Specialization", type: "checks",
      options: ["Assistance", "Batting", "Bowling", "Fielding", "Fitness", "Head Coach", "Wicket Keeping"] },
    { key: "image", label: "Coach Portrait", type: "image" },
  ],
  columns: [
    { key: "name", label: "Coach Name" },
    { key: "specializations", label: "Coach Specialization" },
  ],
  required: ["name"],
};

const BOWLER_SPEC_CFG = {
  entity: "Bowler Specialization",
  listFn: "bowlerSpecs", saveFn: "saveBowlerSpec", deleteFn: "deleteBowlerSpec",
  fields: [
    { key: "name", label: "Bowler Specialization", type: "text" },
    { key: "bowlingType", label: "Bowling Type", type: "select", options: ["Fast", "Spin"] },
    { key: "bowlingStyle", label: "Bowling Style", type: "select", options: ["Left Arm", "Right Arm", "Both"] },
  ],
  columns: [
    { key: "name", label: "Bowler Specialization" },
    { key: "bowlingStyle", label: "Bowling Style" },
    { key: "bowlingType", label: "Bowling Type" },
  ],
  required: ["name"],
};

const GROUND_CFG = {
  entity: "Ground",
  listFn: "grounds", saveFn: "saveGround", deleteFn: "deleteGround",
  fields: [
    { key: "name", label: "Ground Name", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "state", label: "State", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "profile", label: "Ground Profile", type: "textarea" },
    { key: "image", label: "Ground Image", type: "image" },
    { key: "size", label: "Ground Size in Meters", type: "ground" },
  ],
  columns: [
    { key: "name", label: "Ground Name" }, { key: "country", label: "Country" },
    { key: "state", label: "State" }, { key: "city", label: "City" },
  ],
  required: ["name"],
};

// The full report catalogue shown as a wrapping grid of tabs (matches the
// reference CAP Reports screen). "Statistics" is the default active tab.
const REPORT_TABS = [
  "Bowler Vs Batsman", "Bowler Vs Batsman - Bowl & Shot", "Bulk Video Export",
  "Bulk Video Export - RSA", "Commentary", "Day Fast VS Spin Report",
  "Day Wise Bowler Session Report", "Extras", "Fielder Report", "KPI Report",
  "Manhattan", "MatchOverSlab", "Over Comparison", "Partnership Chart",
  "Pitch Map", "Pitch Map Impact", "Pitchmap Comparison", "PitchMap & ImpactPitch",
  "Player Comparison Report", "Players Worm Chart", "Recent Performance",
  "Scorecard", "Sector Wagon", "Session Report", "Shot Selection - Batsman",
  "Shot Selection - Match", "Spell Report", "Spider&Sector Combined", "Spider Wagon",
  "TenBall Summary", "Video Playlist", "Wickets", "Worm", "Wagon Wheel Comparison",
  "Umpire Report", "Statistics", "Appeal Report", "Batsman KPI", "Batsman Vs Bowler",
  "Batsman Vs Bowler - Bowl & Shot", "Boundary NextBall", "Bowler KPI",
];

// ===========================================================================
// Reports engine — reads the saved per-ball log (match_state.json) and turns it
// into the CAP report family. The scorer records every delivery on the coding
// screen; each ball is stored as a log row: { num, bowler, striker, nonstr,
// bowl, shot, runs, ext, wagon, pitch, tags, wicket, dismissal, outBatsman … }.
// Everything below is derived from that log — no separate report tables needed.
// ===========================================================================

// Live report state: the loaded match, its innings, the sidebar filters and the
// currently-selected tab / sub-view toggles.
const rep = {
  matches: [], match: null, innings: [],
  activeTab: "Statistics",
  teamView: "both",   // Manhattan / Worm / Extras / Wickets team toggle
  wagonSide: "all",   // Spider / Sector on-side / off-side / all
  filters: { battingCode: "", striker: "", bowler: "", wicket: "", runs: "", fromOver: "", toOver: "" },
};

// ---- scoring helpers (mirror the coding screen's ball semantics) ----------

// Decode a stored `ext` value. Legal deliveries advance the over; WD/NB do not.
// B/LB are byes (not credited to the batter). Penalty defaults to 5.
function parseExt(ext) {
  const s = String(ext == null ? "" : ext).trim();
  if (!s || s === "0") return { type: "", runs: 0, legal: true, bye: false };
  const m = /^([A-Za-z]+)(\d*)/.exec(s);
  const type = (m ? m[1] : "").toUpperCase();
  let n = m && m[2] ? parseInt(m[2], 10) : 1;
  if (type === "P") n = m && m[2] ? parseInt(m[2], 10) : 5;
  return { type, runs: n, legal: !(type === "WD" || type === "NB"), bye: (type === "B" || type === "LB") };
}
const overIndexOf = (num) => parseInt(String(num).split(".")[0], 10) || 0; // 0-based
const ballBat = (b) => { const e = parseExt(b.ext); return e.bye ? 0 : Math.max(0, +b.runs || 0); };
const ballExtra = (b) => parseExt(b.ext).runs;
const ballTeam = (b) => ballBat(b) + ballExtra(b);
const isLegal = (b) => parseExt(b.ext).legal;
const isWicket = (b) => !!b.wicket || b.tally === "W";
// Wickets credited to the bowler (run-outs / retired / obstruction are not).
const bowlerWicket = (b) => isWicket(b) && !/run\s*out|retired|obstruct|timed|handled/i.test(b.dismissal || "");

// ---- innings assembly -----------------------------------------------------

// Split the saved state into innings. A completed 2nd-innings state stashes the
// 1st-innings deliveries in `prevInningsLog`; a live 1st innings is just `log`.
function assembleInnings(match) {
  const st = match && match.state;
  if (!st || !Array.isArray(st.log)) return [];
  const codeName = (code) => {
    if (match.teamA && match.teamA.code === code) return match.teamA.name || code;
    if (match.teamB && match.teamB.code === code) return match.teamB.name || code;
    return code || "";
  };
  const other = (code) => (code === st.teamA ? st.teamB : st.teamA);
  const out = [];
  const prev = st.prevInningsLog;
  if (Array.isArray(prev) && prev.length) {
    const firstBat = other(st.battingCode); // after the swap, battingCode is the 2nd side
    out.push({ log: prev, batCode: firstBat, bowlCode: st.battingCode, innings: 1 });
    out.push({ log: st.log, batCode: st.battingCode, bowlCode: firstBat, innings: 2 });
  } else {
    const bat = st.battingCode || st.teamA;
    out.push({ log: st.log, batCode: bat, bowlCode: other(bat), innings: st.innings || 1 });
  }
  return out.map((i) => ({ ...i, batName: codeName(i.batCode), bowlName: codeName(i.bowlCode) }));
}

// Apply the sidebar filters to a single innings' ball list.
function filterBalls(log) {
  const f = rep.filters;
  const from = f.fromOver ? +f.fromOver - 1 : null;
  const to = f.toOver ? +f.toOver - 1 : null;
  return (log || []).filter((b) => {
    if (f.striker && b.striker !== f.striker) return false;
    if (f.bowler && b.bowler !== f.bowler) return false;
    if (f.wicket && (b.dismissal || "") !== f.wicket) return false;
    if (f.runs !== "" && ballBat(b) !== +f.runs) return false;
    const oi = overIndexOf(b.num);
    if (from != null && oi < from) return false;
    if (to != null && oi > to) return false;
    return true;
  });
}

// The innings the current filters select, each with its filtered log.
function filteredInnings() {
  return rep.innings
    .filter((i) => !rep.filters.battingCode || i.batCode === rep.filters.battingCode)
    .map((i) => ({ ...i, balls: filterBalls(i.log) }));
}
// Flatten to a single ball pool (for match-wide summaries).
const allBalls = (inns) => inns.reduce((a, i) => a.concat(i.balls), []);

// ---- aggregates -----------------------------------------------------------

const num = (v, d = 2) => (Number.isFinite(v) ? v : 0).toFixed(d);
const pct = (n, d) => (d ? (n / d) * 100 : 0);

// Batting card: one row per striker, in order of first appearance.
function battingCard(balls) {
  const order = [], m = new Map();
  for (const b of balls) {
    if (!b.striker) continue;
    if (!m.has(b.striker)) { m.set(b.striker, { name: b.striker, runs: 0, balls: 0, dots: 0, ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0, out: null }); order.push(b.striker); }
    const r = m.get(b.striker), e = parseExt(b.ext);
    if (e.legal && !e.bye && e.type !== "WD") { // a ball faced (wides aren't faced)
      r.balls += 1;
      const bat = ballBat(b);
      if (bat === 0) r.dots += 1;
      else if (bat === 1) r.ones += 1;
      else if (bat === 2) r.twos += 1;
      else if (bat === 3) r.threes += 1;
      else if (bat === 4) r.fours += 1;
      else if (bat === 6) r.sixes += 1;
      r.runs += bat;
    } else if (e.type === "NB") { r.runs += ballBat(b); }
  }
  // dismissals
  for (const b of balls) {
    if (isWicket(b) && b.outBatsman && m.has(b.outBatsman)) {
      m.get(b.outBatsman).out = { how: b.dismissal || "Out", bowler: b.bowler };
    }
  }
  return order.map((n) => {
    const r = m.get(n), scoring = r.balls - r.dots;
    return { ...r, sr: pct(r.runs, r.balls), rss: scoring ? r.runs / scoring : 0, dbPct: pct(r.dots, r.balls) };
  });
}

// Bowling card: one row per bowler.
function bowlingCard(balls) {
  const order = [], m = new Map();
  for (const b of balls) {
    if (!b.bowler) continue;
    if (!m.has(b.bowler)) { m.set(b.bowler, { name: b.bowler, balls: 0, runs: 0, wkts: 0, dots: 0, wides: 0, noballs: 0, fours: 0, sixes: 0, maidenRuns: {}, }); order.push(b.bowler); }
    const r = m.get(b.bowler), e = parseExt(b.ext);
    if (e.legal) r.balls += 1;
    if (e.type === "WD") r.wides += e.runs;
    if (e.type === "NB") r.noballs += 1;
    // runs conceded: everything except byes/leg-byes
    r.runs += e.bye ? 0 : (ballBat(b) + (e.type === "WD" || e.type === "NB" ? e.runs : (e.type === "P" ? e.runs : 0)));
    if (ballTeam(b) === 0 && e.legal) r.dots += 1;
    if (ballBat(b) === 4) r.fours += 1;
    if (ballBat(b) === 6) r.sixes += 1;
    if (bowlerWicket(b)) r.wkts += 1;
  }
  return order.map((n) => {
    const r = m.get(n), oversBalls = r.balls, ov = `${Math.floor(oversBalls / 6)}.${oversBalls % 6}`;
    return { ...r, oversBalls, overs: ov, econ: oversBalls ? r.runs / (oversBalls / 6) : 0, avg: r.wkts ? r.runs / r.wkts : 0, srate: r.wkts ? oversBalls / r.wkts : 0, dbPct: pct(r.dots, oversBalls) };
  });
}

// Per-over totals for Manhattan / Worm / Over Comparison.
function overAgg(balls) {
  const overs = new Map();
  for (const b of balls) {
    const oi = overIndexOf(b.num);
    if (!overs.has(oi)) overs.set(oi, { over: oi, runs: 0, wkts: 0, balls: 0, bowler: b.bowler });
    const o = overs.get(oi);
    o.runs += ballTeam(b);
    if (isWicket(b)) o.wkts += 1;
    if (isLegal(b)) o.balls += 1;
  }
  return [...overs.values()].sort((a, b) => a.over - b.over);
}

// Team total from a ball list: { runs, wkts, balls, extras }.
function totals(balls) {
  let runs = 0, wkts = 0, ballsLegal = 0, extras = 0;
  for (const b of balls) { runs += ballTeam(b); if (isWicket(b)) wkts += 1; if (isLegal(b)) ballsLegal += 1; extras += ballExtra(b); }
  return { runs, wkts, balls: ballsLegal, extras };
}

// Partnerships: segments of consecutive balls between wickets.
function partnerships(balls) {
  const list = []; let seg = null, wkt = 0;
  for (const b of balls) {
    if (!seg) seg = { p1: b.striker, p2: b.nonstr, runs: 0, balls: 0, start: b.num, end: b.num };
    seg.runs += ballTeam(b); if (isLegal(b)) seg.balls += 1; seg.end = b.num;
    if (isWicket(b)) { wkt += 1; list.push({ wkt, ...seg }); seg = null; }
  }
  if (seg) { wkt += 1; list.push({ wkt, ...seg }); }
  return list.map((p) => ({ ...p, rr: p.balls ? (p.runs / p.balls) * 6 : 0 }));
}

// Extras breakdown across a ball list.
function extraBreakdown(balls) {
  const o = { WD: 0, NB: 0, B: 0, LB: 0, P: 0 };
  for (const b of balls) { const e = parseExt(b.ext); if (e.type in o) o[e.type] += e.runs; }
  return o;
}

// Wicket-type breakdown.
function wicketBreakdown(balls) {
  const o = {};
  for (const b of balls) { if (isWicket(b)) { const k = b.dismissal || "Unknown"; o[k] = (o[k] || 0) + 1; } }
  return o;
}

// Shot/scoring summary for the wagon & pitch panels.
function scoringSummary(balls) {
  const t = totals(balls);
  let dots = 0, scoring = 0, ones = 0, twos = 0, threes = 0, fours = 0, sixes = 0;
  for (const b of balls) {
    const bat = ballBat(b), e = parseExt(b.ext);
    if (e.legal && ballTeam(b) === 0) dots += 1;
    if (bat > 0) scoring += 1;
    if (bat === 1) ones += 1; else if (bat === 2) twos += 1; else if (bat === 3) threes += 1;
    else if (bat === 4) fours += 1; else if (bat === 6) sixes += 1;
  }
  return { ...t, dots, scoring, ones, twos, threes, fours, sixes, ...extraBreakdown(balls) };
}

// ---- chart primitives (inline SVG — CSP-safe, no external libs) -----------

const REP_COLORS = { 0: "#e8edf3", 1: "#e0903a", 2: "#3f7fd0", 3: "#e7d14f", 4: "#d9534f", 6: "#c750c7", ext: "#39c0c8" };
const runColor = (r) => REP_COLORS[r] || (r >= 6 ? REP_COLORS[6] : r >= 4 ? REP_COLORS[4] : "#9fb3c8");

// Grouped bar chart (Manhattan). series = [{ label, color, overs:[{over,runs,wkts}] }]
function barChart(series, maxOver) {
  const W = 1000, H = 340, padL = 40, padB = 34, padT = 16;
  const overs = Math.max(maxOver, 1);
  const maxRuns = Math.max(6, ...series.flatMap((s) => s.overs.map((o) => o.runs)));
  const bw = (W - padL - 10) / overs;
  const y = (v) => padT + (H - padT - padB) * (1 - v / maxRuns);
  let bars = "", axis = "";
  for (let g = 1; g <= 4; g++) { const v = Math.round((maxRuns / 4) * g); axis += `<line x1="${padL}" y1="${y(v)}" x2="${W}" y2="${y(v)}" stroke="rgba(140,170,200,.12)"/><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" fill="#8ea3bc" font-size="11">${v}</text>`; }
  for (let o = 0; o < overs; o++) {
    axis += `<text x="${padL + o * bw + bw / 2}" y="${H - 12}" text-anchor="middle" fill="#8ea3bc" font-size="11">${o + 1}</text>`;
    const n = series.length, iw = Math.min(bw - 6, (bw - 6) / Math.max(1, n));
    series.forEach((s, si) => {
      const ov = s.overs.find((x) => x.over === o); if (!ov) return;
      const x = padL + o * bw + 3 + si * iw, h = (H - padT - padB) - (y(ov.runs) - padT);
      bars += `<rect x="${x}" y="${y(ov.runs)}" width="${Math.max(3, iw - 2)}" height="${Math.max(0, h)}" fill="${s.color}" rx="1"/>`;
      if (ov.wkts) bars += `<circle cx="${x + iw / 2}" cy="${y(ov.runs) - 8}" r="7" fill="#d9534f"/><text x="${x + iw / 2}" y="${y(ov.runs) - 5}" text-anchor="middle" fill="#fff" font-size="9">${ov.wkts}</text>`;
    });
  }
  return `<svg class="rep-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="rgba(140,170,200,.25)"/><line x1="${padL}" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="rgba(140,170,200,.25)"/>${axis}${bars}</svg>`;
}

// Cumulative line chart (Worm). series = [{ label, color, overs:[{over,runs,wkts}] }]
function lineChart(series, maxOver) {
  const W = 1000, H = 340, padL = 44, padB = 34, padT = 16;
  const overs = Math.max(maxOver, 1);
  const cum = series.map((s) => { let run = 0; return s.overs.slice().sort((a, b) => a.over - b.over).map((o) => ({ over: o.over, runs: (run += o.runs), wkts: o.wkts })); });
  const maxRuns = Math.max(20, ...cum.flat().map((o) => o.runs));
  const x = (o) => padL + (W - padL - 10) * (o / overs);
  const y = (v) => padT + (H - padT - padB) * (1 - v / maxRuns);
  let axis = "", lines = "";
  for (let g = 1; g <= 5; g++) { const v = Math.round((maxRuns / 5) * g); axis += `<line x1="${padL}" y1="${y(v)}" x2="${W}" y2="${y(v)}" stroke="rgba(140,170,200,.12)"/><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" fill="#8ea3bc" font-size="11">${v}</text>`; }
  for (let o = 1; o <= overs; o++) if (o % 2 === 1 || overs <= 20) axis += `<text x="${x(o)}" y="${H - 12}" text-anchor="middle" fill="#8ea3bc" font-size="11">${o}</text>`;
  series.forEach((s, si) => {
    const pts = cum[si]; if (!pts.length) return;
    const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.over + 1)},${y(p.runs)}`).join(" ");
    lines += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5"/>`;
    pts.forEach((p) => { if (p.wkts) lines += `<circle cx="${x(p.over + 1)}" cy="${y(p.runs)}" r="6" fill="#d9534f" stroke="#fff"/>`; });
  });
  return `<svg class="rep-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="rgba(140,170,200,.25)"/><line x1="${padL}" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="rgba(140,170,200,.25)"/>${axis}${lines}</svg>`;
}

// Pie / donut chart. slices = [{ label, value, color }]
function pieChart(slices) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const R = 150, cx = 170, cy = 170; let ang = -Math.PI / 2, paths = "";
  if (!total) return `<svg class="rep-svg-pie" viewBox="0 0 340 340"><circle cx="${cx}" cy="${cy}" r="${R}" fill="rgba(120,150,190,.12)"/><text x="${cx}" y="${cy}" text-anchor="middle" fill="#8ea3bc" font-size="14">No data</text></svg>`;
  slices.filter((s) => s.value > 0).forEach((s) => {
    const a2 = ang + (s.value / total) * Math.PI * 2;
    const large = a2 - ang > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang), x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    paths += `<path d="M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z" fill="${s.color}" stroke="#0a1523" stroke-width="1.5"/>`;
    ang = a2;
  });
  return `<svg class="rep-svg-pie" viewBox="0 0 340 340">${paths}</svg>`;
}

// ---- report renderers ------------------------------------------------------

const teamViewToggle = (inns) => {
  if (inns.length < 2) return "";
  const opt = (v, l) => `<label class="rep-radio"><input type="radio" name="tv" value="${v}" ${rep.teamView === v ? "checked" : ""} data-teamview="${v}"/> ${esc(l)}</label>`;
  return `<div class="rep-toggle">${opt(inns[0].batCode, inns[0].batName)}${opt(inns[1].batCode, inns[1].batName)}${opt("both", "Both Combined")}</div>`;
};
// Which innings the team toggle selects.
function toggledInnings(inns) {
  if (rep.teamView === "both") return inns;
  return inns.filter((i) => i.batCode === rep.teamView);
}

function repTitle(t) { return `<h2 class="rep-title">${esc(t)}</h2>`; }

// Statistics — the ball-by-ball grid (default tab).
function reportStatistics(inns) {
  const cols = ["InnsNo", "Team", "Over", "Striker", "Nonstriker", "Bowler", "Bowl", "Shot", "Run", "Extras", "Wkt", "Dismissal"];
  const rows = [];
  inns.forEach((i) => i.balls.forEach((b) => {
    const e = parseExt(b.ext);
    rows.push(`<tr><td>${i.innings}</td><td>${esc(i.batCode)}</td><td>${esc(b.num)}</td><td>${esc(b.striker)}</td><td>${esc(b.nonstr)}</td><td>${esc(b.bowler)}</td><td>${esc(b.bowl || "")}</td><td>${esc(b.shot || "")}</td><td>${ballBat(b)}</td><td>${e.type ? esc(e.type + (e.runs > 1 ? e.runs : "")) : ""}</td><td>${isWicket(b) ? "W" : ""}</td><td>${esc(b.dismissal || "")}</td></tr>`);
  }));
  return `${repTitle("Statistics — Ball by Ball")}<div class="rep-scroll"><table class="rep-table"><thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${cols.length}" class="rep-none">No deliveries recorded.</td></tr>`}</tbody></table></div><div class="rep-foot">${rows.length} deliveries</div>`;
}

// Scorecard — batting table per innings. Each batsman row expands (click) into
// that player's Spider Wagon + Sector Wagon + Pitch Map (matches the reference).
function reportScorecard(inns) {
  const expanded = rep.scExpanded || (rep.scExpanded = new Set());
  return inns.map((i) => {
    const bc = battingCard(i.balls), t = totals(i.balls), ex = extraBreakdown(i.balls);
    const rows = bc.map((r) => {
      const isEx = expanded.has(i.innings + "|" + r.name);
      const pb = strikerBalls([i], r.name);
      const main = `<tr class="rep-sc-row" data-sc-expand="${esc(i.innings + "|" + r.name)}"><td class="rep-l"><span class="rep-exp">${isEx ? "−" : "+"}</span> ${esc(r.name)}</td><td class="rep-l rep-muted">${r.out ? esc(r.out.how + (r.out.bowler && /caught|bowled|lbw|stump/i.test(r.out.how) ? " b " + r.out.bowler : "")) : "not out"}</td><td>${r.runs}</td><td>${r.balls}</td><td>${num(r.sr)}</td><td>${r.ones}</td><td>${r.twos}</td><td>${r.threes}</td><td>${r.fours}</td><td>${r.sixes}</td><td>${r.dots}</td><td>${num(r.rss)}</td><td>${num(r.dbPct)}</td></tr>`;
      const detail = isEx ? `<tr class="rep-sc-detail"><td colspan="13"><div class="rep-sc-panels"><div><div class="rep-sub">Spider Wagon</div>${wagonFieldSvg(pb, false)}</div><div><div class="rep-sub">Sector Wagon</div>${wagonFieldSvg(pb, true)}</div><div><div class="rep-sub">Pitch Map</div>${pitchGrid(pb)}</div></div>${tallyChips(pb)}</td></tr>` : "";
      return main + detail;
    }).join("");
    return `<div class="rep-inns-head">${esc(i.batName)} — Batting &nbsp; <span class="rep-score">${t.runs}/${t.wkts}</span> <span class="rep-muted">(${Math.floor(t.balls / 6)}.${t.balls % 6} ov)</span></div>
      <div class="rep-scroll"><table class="rep-table"><thead><tr><th class="rep-l">Batsman</th><th class="rep-l">How Out</th><th>Runs</th><th>Balls</th><th>S/R</th><th>1s</th><th>2s</th><th>3s</th><th>4s</th><th>6s</th><th>DB</th><th>RSS</th><th>DB%</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="13" class="rep-none">No batting data.</td></tr>`}</tbody>
      <tfoot><tr><td class="rep-l" colspan="2">Extras (b ${ex.B}, lb ${ex.LB}, wd ${ex.WD}, nb ${ex.NB}, p ${ex.P})</td><td>${t.extras}</td><td colspan="10"></td></tr>
      <tr class="rep-total"><td class="rep-l" colspan="2">Total</td><td>${t.runs}</td><td colspan="10">${t.wkts} wkts, ${Math.floor(t.balls / 6)}.${t.balls % 6} overs</td></tr></tfoot></table></div>`;
  }).join("");
}

// Manhattan — runs per over.
function reportManhattan(inns) {
  const view = toggledInnings(inns);
  const series = view.map((i, idx) => ({ label: i.batName, color: idx === 0 ? "#e0607f" : "#3f8fd6", overs: overAgg(i.balls) }));
  const maxOver = Math.max(1, ...series.flatMap((s) => s.overs.map((o) => o.over + 1)));
  return `${repTitle("Manhattan Chart")}${teamViewToggle(inns)}<div class="rep-legend">${series.map((s) => `<span class="rep-key"><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join("")}<span class="rep-key"><i style="background:#d9534f;border-radius:50%"></i>Wicket</span></div>${barChart(series, maxOver)}<div class="rep-axis-label">Overs</div>`;
}

// Worm — cumulative runs.
function reportWorm(inns) {
  const view = toggledInnings(inns);
  const series = view.map((i, idx) => ({ label: i.batName, color: idx === 0 ? "#4db3ff" : "#e8edf3", overs: overAgg(i.balls) }));
  const maxOver = Math.max(1, ...series.flatMap((s) => s.overs.map((o) => o.over + 1)));
  return `${repTitle("Worm Chart")}${teamViewToggle(inns)}<div class="rep-legend">${series.map((s) => `<span class="rep-key"><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join("")}</div>${lineChart(series, maxOver)}<div class="rep-axis-label">Overs</div>`;
}

// Partnership chart — horizontal bars + table.
function reportPartnership(inns) {
  return inns.map((i) => {
    const ps = partnerships(i.balls); if (!ps.length) return "";
    const maxR = Math.max(1, ...ps.map((p) => p.runs));
    const bars = ps.map((p) => `<div class="rep-pt-row"><span class="rep-pt-name">${esc(p.p1)} &amp; ${esc(p.p2)}</span><span class="rep-pt-bar"><i style="width:${pct(p.runs, maxR)}%"></i></span><span class="rep-pt-val">${p.runs} (${p.balls})</span></div>`).join("");
    const rows = ps.map((p) => `<tr><td>${p.wkt}</td><td>${p.runs}</td><td>${p.balls}</td><td>${num(p.rr)}</td><td class="rep-l">${esc(p.p1)}</td><td class="rep-l">${esc(p.p2)}</td><td>${esc(p.start)}</td><td>${esc(p.end)}</td></tr>`).join("");
    return `<div class="rep-inns-head">${esc(i.batName)} — Partnerships</div><div class="rep-pt-list">${bars}</div>
      <div class="rep-scroll"><table class="rep-table"><thead><tr><th>Wkt</th><th>Runs</th><th>Balls</th><th>RR</th><th class="rep-l">Player 1</th><th class="rep-l">Player 2</th><th>Start</th><th>End</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }).join("") || `${repTitle("Partnership Chart")}<div class="rep-none">No partnership data.</div>`;
}

// Extras — pie of extra types.
function reportExtras(inns) {
  const balls = allBalls(toggledInnings(inns)), e = extraBreakdown(balls);
  const slices = [{ label: "Leg Byes", value: e.LB, color: "#39c0c8" }, { label: "Byes", value: e.B, color: "#e0903a" }, { label: "Wides", value: e.WD, color: "#e7c53a" }, { label: "No Balls", value: e.NB, color: "#c750c7" }, { label: "Penalty", value: e.P, color: "#5ac85a" }];
  return `${repTitle("Extras Chart")}${teamViewToggle(inns)}<div class="rep-pie-wrap">${pieChart(slices)}<div class="rep-legend rep-legend-col">${slices.map((s) => `<span class="rep-key"><i style="background:${s.color}"></i>${esc(s.label)} : ${s.value}</span>`).join("")}</div></div>`;
}

// Wickets — pie of dismissal types.
function reportWickets(inns) {
  const balls = allBalls(toggledInnings(inns)), w = wicketBreakdown(balls);
  const palette = { Caught: "#39c0c8", Bowled: "#c750c7", "Run Out": "#e0903a", LBW: "#e7c53a", Stumped: "#e0a53a", "Caught & Bowled": "#5ac85a", "Hit Wicket": "#3f7fd0" };
  const kinds = ["Caught", "Bowled", "Run Out", "LBW", "Stumped", "Caught & Bowled", "Hit Wicket"];
  const slices = kinds.map((k) => ({ label: k, value: w[k] || 0, color: palette[k] || "#9fb3c8" }));
  Object.keys(w).forEach((k) => { if (!kinds.includes(k)) slices.push({ label: k, value: w[k], color: "#9fb3c8" }); });
  return `${repTitle("Wickets Chart")}${teamViewToggle(inns)}<div class="rep-pie-wrap">${pieChart(slices)}<div class="rep-legend rep-legend-col">${slices.map((s) => `<span class="rep-key"><i style="background:${s.color}"></i>${esc(s.label)} : ${s.value}</span>`).join("")}</div></div>`;
}

// Wagon field SVG (viewBox 0 0 642 640, centre 324.5,312.5, r 290 — matches the
// coding-screen overlay coordinate space so saved wagon points map 1:1).
function wagonFieldSvg(balls, sectors) {
  const CX = 321, CY = 320, R = 300;
  let sect = "";
  if (sectors) { for (let s = 0; s < 8; s++) { const a = (Math.PI / 4) * s - Math.PI / 2; sect += `<line x1="${CX}" y1="${CY}" x2="${CX + R * Math.cos(a)}" y2="${CY + R * Math.sin(a)}" stroke="rgba(255,255,255,.25)"/>`; } }
  let lines = "";
  for (const b of balls) {
    if (!b.wagon || typeof b.wagon.x !== "number") continue;
    // rebase from the 642x640 overlay space onto our field circle
    const x = CX + (b.wagon.x - 324.5) * (R / 290), y = CY + (b.wagon.y - 312.5) * (R / 290);
    const c = runColor(ballBat(b));
    lines += `<line x1="${CX}" y1="${CY}" x2="${x}" y2="${y}" stroke="${c}" stroke-width="2.5" opacity="0.9"/>`;
  }
  return `<svg class="rep-field" viewBox="0 0 642 640" preserveAspectRatio="xMidYMid meet">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="#2f8f43" stroke="#e7d14f" stroke-width="4"/>
    <circle cx="${CX}" cy="${CY}" r="${R * 0.55}" fill="none" stroke="rgba(255,255,255,.18)"/>
    <rect x="${CX - 14}" y="${CY - 46}" width="28" height="92" fill="#caa96b" opacity="0.55"/>
    ${sect}${lines}<circle cx="${CX}" cy="${CY}" r="4" fill="#fff"/></svg>`;
}

// Summary side-panel shared by Spider / Sector / Pitch Map.
function scoringPanel(balls) {
  const s = scoringSummary(balls);
  const row = (label, val, den, cls) => `<div class="rep-sp-row"><span class="rep-sp-l ${cls || ""}">${label}</span><span class="rep-sp-v">${val}</span><span class="rep-sp-bar"><i style="width:${Math.min(100, pct(val, den))}%"></i></span><span class="rep-sp-p">${num(pct(val, den), 1)}%</span></div>`;
  const rowN = (label, val) => `<div class="rep-sp-row"><span class="rep-sp-l">${label}</span><span class="rep-sp-v">${val}</span><span class="rep-sp-bar"></span><span class="rep-sp-p"></span></div>`;
  const totalEx = s.WD + s.NB + s.B + s.LB + s.P;
  return `<div class="rep-panel"><div class="rep-panel-h">Summary <span class="rep-muted">( Extras included )</span></div>
    ${rowN("Runs", s.runs)}${rowN("Balls", s.balls)}${rowN("Wickets", s.wkts)}
    ${row("Dot Balls", s.dots, s.balls)}${row("Scoring Balls", s.scoring, s.balls)}
    ${row("Boundary 4's", s.fours, s.scoring)}${row("Boundary 6's", s.sixes, s.scoring)}
    ${row("1's", s.ones, s.scoring)}${row("2's", s.twos, s.scoring)}${row("3's", s.threes, s.scoring)}</div>
    <div class="rep-panel"><div class="rep-panel-h">Extras</div>
    ${rowN("Total Extra", totalEx)}${row("No Balls", s.NB, totalEx)}${row("Wide", s.WD, totalEx)}${row("Byes", s.B, totalEx)}${row("Leg Byes", s.LB, totalEx)}${row("Penalty", s.P, totalEx)}</div>`;
}

// Run-tally chips under the wagon.
function tallyChips(balls) {
  const s = scoringSummary(balls);
  const chip = (l, v, c) => `<span class="rep-chip" style="background:${c}">${l} ${v}</span>`;
  return `<div class="rep-chips">${chip("Ext", s.WD + s.NB + s.B + s.LB + s.P, REP_COLORS.ext)}${chip("0s", s.dots, "#5b6b7d")}${chip("1s", s.ones, REP_COLORS[1])}${chip("2s", s.twos, REP_COLORS[2])}${chip("3s", s.threes, REP_COLORS[3])}${chip("4s", s.fours, REP_COLORS[4])}${chip("6s", s.sixes, REP_COLORS[6])}${chip("Wkts", s.wkts, "#8a99ab")}</div>`;
}

function reportSpiderWagon(inns) {
  const balls = allBalls(inns);
  return `${repTitle("Spider Wagon Wheel Report")}<div class="rep-wagon-grid"><div class="rep-wagon-main">${wagonFieldSvg(balls, false)}${tallyChips(balls)}</div><div class="rep-panels">${scoringPanel(balls)}</div></div>`;
}
function reportSectorWagon(inns) {
  const balls = allBalls(inns);
  return `${repTitle("Sector Wagon Wheel Report")}<div class="rep-wagon-grid"><div class="rep-wagon-main">${wagonFieldSvg(balls, true)}${tallyChips(balls)}</div><div class="rep-panels">${scoringPanel(balls)}</div></div>`;
}

// Pitch map grid — 6 length rows × 5 line columns coloured by ball count.
function pitchGrid(balls) {
  const lengths = ["Full Toss", "Yorker", "Full", "Good", "Short", "Bouncer"];
  const lines = ["WIDE O.O", "OUTSIDE OFF", "MIDDLE", "OUTSIDE LEG", "WIDE D.L"];
  const grid = Array.from({ length: 6 }, () => Array(5).fill(0));
  for (const b of balls) {
    const p = (b.pitch || [])[0]; if (!p) continue;
    const row = Math.min(5, Math.max(0, Math.floor((p.y / 100) * 6)));
    const col = Math.min(4, Math.max(0, Math.floor((p.x / 100) * 5)));
    grid[row][col] += 1;
  }
  const maxCell = Math.max(1, ...grid.flat());
  const cells = grid.map((r, ri) => `<div class="rep-pm-rowlabel">${lengths[ri]}</div>` + r.map((c) => `<div class="rep-pm-cell" style="background:rgba(77,179,255,${0.12 + 0.6 * (c / maxCell)})">${c || ""}</div>`).join("")).join("");
  return `<div class="rep-pitchmap">${cells}</div><div class="rep-pm-cols">${lines.map((l) => `<span>${l}</span>`).join("")}</div>`;
}
function reportPitchMap(inns) {
  const balls = allBalls(inns);
  return `${repTitle("Pitch Map Report")}<div class="rep-wagon-grid"><div>${pitchGrid(balls)}</div><div class="rep-panels">${scoringPanel(balls)}</div></div>`;
}

// Balls faced by one striker across the given innings.
const strikerBalls = (inns, name) => allBalls(inns).filter((b) => b.striker === name);

// Batsman KPI stat block (two columns) used by the Player Comparison report.
function playerKpiBlock(inns, name) {
  const r = battingCard(strikerBalls(inns, name))[0] || { runs: 0, balls: 0, dots: 0, ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0, sr: 0, dbPct: 0 };
  const cell = (l, v) => `<div class="rep-cmp-cell"><span>${l}</span><b>${v}</b></div>`;
  return `<div class="rep-cmp-kpi"><div class="rep-cmp-col">${cell("Runs", r.runs)}${cell("Balls", r.balls)}${cell("S/R", num(r.sr))}${cell("DB", r.dots)}${cell("DB %", num(r.dbPct))}</div>
    <div class="rep-cmp-col">${cell("1's", r.ones)}${cell("2's", r.twos)}${cell("3's", r.threes)}${cell("B4", r.fours)}${cell("B6", r.sixes)}</div></div>`;
}

// Player Comparison — two batsmen side by side (KPI + Spider Wagon).
function reportPlayerComparison(inns) {
  const names = [...new Set(allBalls(inns).map((b) => b.striker).filter(Boolean))];
  if (!names.length) return `${repTitle("Player Comparison Report")}<div class="rep-none">No batting data.</div>`;
  if (!names.includes(rep.cmpA)) rep.cmpA = names[0];
  if (!names.includes(rep.cmpB)) rep.cmpB = names[1] || names[0];
  const picker = (id, cur) => `<select class="rep-cmp-pick" data-cmp="${id}">${names.map((n) => `<option ${n === cur ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  const side = (id, name) => `<div class="rep-cmp-side"><div class="rep-cmp-head">${picker(id, name)}</div>
    <div class="rep-cmp-sub">Batsman KPI</div>${playerKpiBlock(inns, name)}
    <div class="rep-cmp-sub">Spider Wagon Wheel</div>${wagonFieldSvg(strikerBalls(inns, name), false)}${tallyChips(strikerBalls(inns, name))}</div>`;
  return `${repTitle("Player Comparison Report")}<div class="rep-cmp-grid">${side("A", rep.cmpA)}${side("B", rep.cmpB)}</div>`;
}

// Batsman KPI — one aggregate row per batsman.
function reportBatsmanKPI(inns) {
  const balls = allBalls(inns), agg = new Map();
  for (const i of inns) {
    for (const r of battingCard(i.balls)) {
      if (!agg.has(r.name)) agg.set(r.name, { name: r.name, inns: 0, notouts: 0, runs: 0, balls: 0, dots: 0, ones: 0, twos: 0, fours: 0, sixes: 0, outs: 0 });
      const a = agg.get(r.name);
      a.inns += 1; a.runs += r.runs; a.balls += r.balls; a.dots += r.dots; a.ones += r.ones; a.twos += r.twos; a.fours += r.fours; a.sixes += r.sixes;
      if (r.out) a.outs += 1; else a.notouts += 1;
    }
  }
  const rows = [...agg.values()].sort((a, b) => b.runs - a.runs).map((a) => {
    const avg = a.outs ? a.runs / a.outs : a.runs, sr = pct(a.runs, a.balls), sb = a.balls - a.dots, bdry = a.runs ? pct(a.fours * 4 + a.sixes * 6, a.runs) : 0;
    return `<tr><td class="rep-l">${esc(a.name)}</td><td>${a.inns}</td><td>${a.notouts}</td><td>${num(avg)}</td><td>${a.runs}</td><td>${a.balls}</td><td>${a.dots}</td><td>${num(pct(a.dots, a.balls))}</td><td>${num(sr)}</td><td>${sb}</td><td>${num(pct(sb, a.balls))}</td><td>${a.ones}</td><td>${a.twos}</td><td>${a.fours}</td><td>${a.sixes}</td><td>${num(bdry)}</td></tr>`;
  }).join("");
  return `${repTitle("Batsman KPI")}<div class="rep-scroll"><table class="rep-table"><thead><tr><th class="rep-l">Batsman</th><th>Inns</th><th>NO</th><th>Avg</th><th>Runs</th><th>Balls</th><th>DB</th><th>DB%</th><th>S/R</th><th>SB</th><th>SB%</th><th>1s</th><th>2s</th><th>4s</th><th>6s</th><th>Bdry%</th></tr></thead><tbody>${rows || `<tr><td colspan="16" class="rep-none">No data.</td></tr>`}</tbody></table></div>`;
}

// Bowler KPI — one aggregate row per bowler.
function reportBowlerKPI(inns) {
  const agg = new Map();
  for (const i of inns) for (const r of bowlingCard(i.balls)) {
    if (!agg.has(r.name)) agg.set(r.name, { name: r.name, inns: 0, balls: 0, runs: 0, wkts: 0, dots: 0, ones: 0, twos: 0, fours: 0, sixes: 0, wides: 0, noballs: 0 });
    const a = agg.get(r.name);
    a.inns += 1; a.balls += r.oversBalls; a.runs += r.runs; a.wkts += r.wkts; a.dots += r.dots; a.fours += r.fours; a.sixes += r.sixes; a.wides += r.wides; a.noballs += r.noballs;
  }
  const rows = [...agg.values()].sort((a, b) => b.wkts - a.wkts || a.runs - b.runs).map((a) => {
    const ov = `${Math.floor(a.balls / 6)}.${a.balls % 6}`, eco = a.balls ? a.runs / (a.balls / 6) : 0, avg = a.wkts ? a.runs / a.wkts : 0, sr = a.wkts ? a.balls / a.wkts : 0, sb = a.balls - a.dots;
    return `<tr><td class="rep-l">${esc(a.name)}</td><td>${a.inns}</td><td>${ov}</td><td>${a.runs}</td><td>${a.wkts}</td><td>${num(sr)}</td><td>${num(eco)}</td><td>${num(avg)}</td><td>${a.dots}</td><td>${num(pct(a.dots, a.balls))}</td><td>${sb}</td><td>${a.fours}</td><td>${a.sixes}</td><td>${a.wides}</td><td>${a.noballs}</td></tr>`;
  }).join("");
  return `${repTitle("Bowler KPI")}<div class="rep-scroll"><table class="rep-table"><thead><tr><th class="rep-l">Bowler</th><th>Inns</th><th>Overs</th><th>Runs</th><th>Wkts</th><th>S/R</th><th>Eco</th><th>Avg</th><th>DB</th><th>DB%</th><th>SB</th><th>4s</th><th>6s</th><th>Wd</th><th>NB</th></tr></thead><tbody>${rows || `<tr><td colspan="15" class="rep-none">No data.</td></tr>`}</tbody></table></div>`;
}

// Over comparison — side-by-side over table for both innings.
function reportOverComparison(inns) {
  const cards = inns.map((i) => ({ i, ov: overAgg(i.balls), bc: i.balls }));
  const maxOver = Math.max(1, ...cards.flatMap((c) => c.ov.map((o) => o.over + 1)));
  let cum = inns.map(() => 0);
  const rows = [];
  for (let o = 0; o < maxOver; o++) {
    const cells = cards.map((c, ci) => {
      const ov = c.ov.find((x) => x.over === o);
      if (!ov) return `<td></td><td></td><td></td><td></td>`;
      cum[ci] += ov.runs;
      const rr = ((cum[ci]) / (o + 1)).toFixed(2);
      const w = inns[ci].balls.filter((b) => overIndexOf(b.num) <= o && isWicket(b)).length;
      return `<td class="rep-l">${esc(ov.bowler || "")}</td><td>${cum[ci]}/${w}</td><td>${ov.runs}</td><td>${rr}</td>`;
    }).join("");
    rows.push(`<tr><td>${o + 1}</td>${cells}</tr>`);
  }
  const heads = inns.map((i) => `<th class="rep-l">Bowler</th><th>Score</th><th>Runs</th><th>RR</th>`).join("");
  return `${repTitle("Over Comparison")}<div class="rep-scroll"><table class="rep-table"><thead><tr><th>Over</th>${heads}</tr><tr class="rep-subhead"><th></th>${inns.map((i) => `<th colspan="4">${esc(i.batName)} — Inns ${i.innings}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

// Commentary — over-grouped ball-by-ball narrative.
function reportCommentary(inns) {
  return inns.map((i) => {
    const overs = new Map();
    i.balls.forEach((b) => { const oi = overIndexOf(b.num); if (!overs.has(oi)) overs.set(oi, []); overs.get(oi).push(b); });
    const blocks = [...overs.entries()].sort((a, b) => b[0] - a[0]).map(([oi, bs]) => {
      const runs = bs.reduce((a, b) => a + ballTeam(b), 0), wk = bs.filter(isWicket).length;
      const lines = bs.slice().reverse().map((b) => {
        const bat = ballBat(b), e = parseExt(b.ext), badge = isWicket(b) ? "W" : (e.type ? e.type : bat);
        const cls = isWicket(b) ? "wk" : bat >= 4 ? "bd" : "";
        const desc = isWicket(b) ? `OUT! ${esc(b.dismissal || "")}, ${esc(b.outBatsman || b.striker)}` : `${bat} run${bat === 1 ? "" : "s"}${e.type ? ", " + e.type : ""}${b.shot ? ", " + esc(b.shot) : ""}`;
        return `<div class="rep-cm-ball"><span class="rep-cm-badge ${cls}">${badge}</span><span class="rep-cm-num">${esc(b.num)}</span><span class="rep-cm-txt"><b>${esc(b.bowler)} to ${esc(b.striker)}</b><br>${desc}</span></div>`;
      }).join("");
      return `<div class="rep-cm-over"><div class="rep-cm-overhead">Over ${oi + 1} — ${runs} run${runs === 1 ? "" : "s"}${wk ? `, ${wk} wkt` : ""}</div>${lines}</div>`;
    }).join("");
    return `<div class="rep-inns-head">${esc(i.batName)} — Innings ${i.innings}</div>${blocks || `<div class="rep-none">No deliveries.</div>`}`;
  }).join("");
}

// Simple batsman × bowler runs matrix (used for the "vs" reports).
function reportVsMatrix(inns, title) {
  const balls = allBalls(inns), bats = [], bowls = [], grid = new Map();
  for (const b of balls) {
    if (!b.striker || !b.bowler) continue;
    if (!bats.includes(b.striker)) bats.push(b.striker);
    if (!bowls.includes(b.bowler)) bowls.push(b.bowler);
    const k = b.striker + "|" + b.bowler;
    if (!grid.has(k)) grid.set(k, { runs: 0, balls: 0, w: 0 });
    const c = grid.get(k); c.runs += ballBat(b); if (isLegal(b)) c.balls += 1; if (bowlerWicket(b) && b.outBatsman === b.striker) c.w += 1;
  }
  const head = `<th class="rep-l">Batsman \\ Bowler</th>${bowls.map((bo) => `<th>${esc(bo)}</th>`).join("")}`;
  const rows = bats.map((ba) => `<tr><td class="rep-l">${esc(ba)}</td>${bowls.map((bo) => { const c = grid.get(ba + "|" + bo); return `<td>${c ? `${c.runs}<span class="rep-muted">(${c.balls})${c.w ? " ✗" : ""}</span>` : ""}</td>`; }).join("")}</tr>`).join("");
  return `${repTitle(title)}<div class="rep-scroll"><table class="rep-table rep-matrix"><thead><tr>${head}</tr></thead><tbody>${rows || `<tr><td class="rep-none">No data.</td></tr>`}</tbody></table></div>`;
}

// TenBall summary — group deliveries into blocks of ten.
function reportTenBall(inns) {
  return inns.map((i) => {
    const legal = i.balls.filter(() => true); const blocks = [];
    for (let s = 0; s < legal.length; s += 10) { const bs = legal.slice(s, s + 10); blocks.push({ from: s + 1, to: s + bs.length, runs: bs.reduce((a, b) => a + ballTeam(b), 0), w: bs.filter(isWicket).length, fours: bs.filter((b) => ballBat(b) === 4).length, sixes: bs.filter((b) => ballBat(b) === 6).length }); }
    const rows = blocks.map((b) => `<tr><td>${b.from}–${b.to}</td><td>${b.runs}</td><td>${b.w}</td><td>${b.fours}</td><td>${b.sixes}</td></tr>`).join("");
    return `<div class="rep-inns-head">${esc(i.batName)} — Ten Ball Summary</div><div class="rep-scroll"><table class="rep-table"><thead><tr><th>Balls</th><th>Runs</th><th>Wkts</th><th>4s</th><th>6s</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="rep-none">No data.</td></tr>`}</tbody></table></div>`;
  }).join("");
}

// Map each report tab to its renderer. Tabs without a bespoke renderer fall back
// to a graceful "not available for this data" panel.
const REPORT_RENDERERS = {
  "Statistics": reportStatistics,
  "Scorecard": reportScorecard,
  "Manhattan": reportManhattan,
  "Worm": reportWorm,
  "Players Worm Chart": reportWorm,
  "Partnership Chart": reportPartnership,
  "Extras": reportExtras,
  "Wickets": reportWickets,
  "Spider Wagon": reportSpiderWagon,
  "Sector Wagon": reportSectorWagon,
  "Pitch Map": reportPitchMap,
  "Pitch Map Impact": reportPitchMap,
  "Batsman KPI": reportBatsmanKPI,
  "Bowler KPI": reportBowlerKPI,
  "KPI Report": reportBatsmanKPI,
  "Recent Performance": reportBatsmanKPI,
  "Over Comparison": reportOverComparison,
  "Commentary": reportCommentary,
  "TenBall Summary": reportTenBall,
  "Batsman Vs Bowler": (i) => reportVsMatrix(i, "Batsman vs Bowler"),
  "Bowler Vs Batsman": (i) => reportVsMatrix(i, "Bowler vs Batsman"),
  "Player Comparison Report": reportPlayerComparison,
};

function renderActiveReport() {
  const host = document.getElementById("report-content"); if (!host) return;
  if (!rep.match || !rep.innings.length) { host.innerHTML = `<div class="rep-empty"><strong>CRIC</strong><span>PRO</span><p>Select a match and press <b>Show Reports</b>.</p></div>`; return; }
  const inns = filteredInnings();
  const fn = REPORT_RENDERERS[rep.activeTab];
  if (!fn) { host.innerHTML = `${repTitle(rep.activeTab)}<div class="rep-empty rep-soft"><p>This report isn't wired to saved data yet.</p><p class="rep-muted">Available: Statistics, Scorecard, Manhattan, Worm, Partnership, Extras, Wickets, Spider/Sector Wagon, Pitch Map, Batsman/Bowler KPI, Over Comparison, Commentary, Ten Ball, Batsman/Bowler Vs.</p></div>`; return; }
  try { host.innerHTML = fn(inns); } catch (e) { console.error("report render", e); host.innerHTML = `<div class="rep-empty rep-soft"><p>Could not render this report.</p></div>`; }
}

async function loadReportMatch(matchId) {
  rep.match = matchId ? await dbCall("getMatch", matchId) : null;
  rep.innings = rep.match ? assembleInnings(rep.match) : [];
  // Refresh the striker / bowler pickers from the loaded squads.
  const names = new Set();
  rep.innings.forEach((i) => i.log.forEach((b) => { if (b.striker) names.add(b.striker); if (b.nonstr) names.add(b.nonstr); if (b.bowler) names.add(b.bowler); }));
  const list = [...names].sort();
  const fill = (id, ph) => { const el = document.getElementById(id); if (el) el.innerHTML = `<option value="">${ph}</option>` + list.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join(""); };
  fill("rp-striker", "All"); fill("rp-bowler", "All");
  const bt = document.getElementById("rp-batteam");
  if (bt && rep.match) bt.innerHTML = `<option value="">All</option>` + [rep.match.teamA, rep.match.teamB].filter(Boolean).map((t) => `<option value="${esc(t.code)}">${esc(t.name)}</option>`).join("");
}

async function buildReports() {
  const [comps, matches] = await Promise.all([dbCall("competitions"), dbCall("matches")]);
  rep.matches = matches || [];
  rep.match = null; rep.innings = []; rep.activeTab = "Statistics"; rep.teamView = "both";
  rep.cmpA = ""; rep.cmpB = ""; rep.scExpanded = new Set();
  rep.filters = { battingCode: "", striker: "", bowler: "", wicket: "", runs: "", fromOver: "", toOver: "" };

  const field = (label, inner) => `<div class="report-field"><label>${esc(label)}</label>${inner}</div>`;
  const selOpts = (id, items, getV, getL, ph) => `<select id="${id}"><option value="">${ph}</option>${optionList(items || [], getV, getL)}</select>`;
  const tabs = REPORT_TABS.map((t) => `<button class="report-tab ${t === "Statistics" ? "active" : ""}" data-tab="${esc(t)}">${esc(t)}</button>`).join("");
  const overOpts = `<option value="">Over</option>` + Array.from({ length: 50 }, (_, k) => `<option value="${k + 1}">${k + 1}</option>`).join("");

  return `
    <section class="reports-screen reports-full">
      <div class="report-topbar">
        <div class="report-brand"><img class="report-brand-mark" src="assets/logo-mark.svg" alt="" />CRICPRO REPORTS</div>
        <div class="report-top-actions">
          <label class="report-check"><input type="checkbox" checked /> Trimmed Video</label>
          <button class="report-icon" title="Export">⤓</button>
          <a class="report-icon" href="home.html" title="Close" style="text-decoration:none;display:grid;place-items:center">✕</a>
        </div>
      </div>
      <div class="reports-body">
        <aside class="report-sidebar">
          ${field("Match Type", selOpts("rp-type", ["Test", "ODI", "T20I", "T20D", "First Class"].map((m) => ({ v: m })), (m) => m.v, (m) => m.v, "All"))}
          ${field("Competition", selOpts("rp-comp", comps, (c) => c.id, (c) => c.name, "All"))}
          ${field("Match", selOpts("rp-match", rep.matches, (m) => m.id, (m) => m.matchName || `${(m.teamA || {}).code || "?"} v ${(m.teamB || {}).code || "?"}`, "Select"))}
          ${field("Batting Team", `<select id="rp-batteam"><option value="">All</option></select>`)}
          ${field("Striker", `<select id="rp-striker"><option value="">All</option></select>`)}
          ${field("Bowler", `<select id="rp-bowler"><option value="">All</option></select>`)}
          ${field("Wicket Type", selOpts("rp-wkt", ["Bowled", "Caught", "Caught & Bowled", "LBW", "Run Out", "Stumped", "Hit Wicket"].map((w) => ({ v: w })), (w) => w.v, (w) => w.v, "All"))}
          ${field("Runs", selOpts("rp-runs", ["0", "1", "2", "3", "4", "6"].map((r) => ({ v: r })), (r) => r.v, (r) => r.v, "All"))}
          <div class="report-misc-label">Overs Range</div>
          <div class="report-field" style="flex-direction:row;gap:6px"><select id="rp-from">${overOpts}</select><select id="rp-to">${overOpts}</select></div>
          <div class="report-actions">
            <button class="btn-main btn-green" id="rp-show">Show Reports</button>
            <button class="btn-main btn-yellow" id="rp-reset">Reset Filters</button>
          </div>
        </aside>
        <div class="report-pane">
          <div class="report-tabs" id="rp-tabs">${tabs}</div>
          <div class="report-content" id="report-content"></div>
        </div>
      </div>
    </section>`;
}

function initReports(root) {
  const readFilters = () => {
    const g = (id) => { const el = root.querySelector("#" + id); return el ? el.value : ""; };
    rep.filters = { battingCode: g("rp-batteam"), striker: g("rp-striker"), bowler: g("rp-bowler"), wicket: g("rp-wkt"), runs: g("rp-runs"), fromOver: g("rp-from"), toOver: g("rp-to") };
  };

  root.querySelector("#rp-match").addEventListener("change", async (e) => {
    await loadReportMatch(e.target.value);
    renderActiveReport();
  });

  root.querySelector("#rp-show").addEventListener("click", () => { readFilters(); renderActiveReport(); });
  root.querySelector("#rp-reset").addEventListener("click", () => {
    ["rp-batteam", "rp-striker", "rp-bowler", "rp-wkt", "rp-runs", "rp-from", "rp-to"].forEach((id) => { const el = root.querySelector("#" + id); if (el) el.value = ""; });
    readFilters(); renderActiveReport();
  });

  // Tab selection.
  root.querySelector("#rp-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]"); if (!b) return;
    root.querySelectorAll("[data-tab]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    rep.activeTab = b.dataset.tab; rep.teamView = "both";
    renderActiveReport();
  });

  // Sub-view toggles inside a report (team radios + comparison pickers).
  const content = root.querySelector("#report-content");
  content.addEventListener("change", (e) => {
    const tv = e.target.closest("[data-teamview]");
    if (tv) { rep.teamView = tv.dataset.teamview; renderActiveReport(); return; }
    const cmp = e.target.closest("[data-cmp]");
    if (cmp) { rep[cmp.dataset.cmp === "A" ? "cmpA" : "cmpB"] = cmp.value; renderActiveReport(); }
  });
  // Scorecard row expansion.
  content.addEventListener("click", (e) => {
    const row = e.target.closest("[data-sc-expand]");
    if (!row) return;
    const key = row.dataset.scExpand;
    rep.scExpanded.has(key) ? rep.scExpanded.delete(key) : rep.scExpanded.add(key);
    renderActiveReport();
  });

  renderActiveReport();
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
      <!-- Full-width form: three label+field pairs per row so the whole screen
           fits one frame without scrolling. -->
      <div class="reg-form-grid">
        <label class="field-label">Competition Name</label>${sel("rg-comp", reg.competitions, (c) => c.id, (c) => c.name)}
        <label class="field-label">Match Name</label><input class="field-control" id="rg-name" />
        <label class="field-label">Match Type</label>${sel("rg-type", reg.matchTypes.map((m) => ({ v: m })), (m) => m.v, (m) => m.v)}
        <label class="field-label">Number of Overs</label><input class="field-control" id="rg-overs" value="50" />
        <label class="field-label">Match Date</label><input class="field-control" id="rg-date" type="datetime-local" />
        <label class="field-label">Venue</label>${sel("rg-venue", reg.grounds, (g) => g.id, (g) => g.name)}
        <label class="field-label">Home Team</label>${sel("rg-home", reg.teams, (t) => t.id, (t) => t.name)}
        <label class="field-label">Away Team</label>${sel("rg-away", reg.teams, (t) => t.id, (t) => t.name)}
        <label class="field-label">Match Status</label>
        <select class="field-select" id="rg-status"><option value="RESUME">Resume (in progress)</option><option value="COMPLETED">Completed</option></select>
        <label class="field-label">Umpire 1</label>${sel("rg-ump1", umpires, (o) => o.id, (o) => o.name)}
        <label class="field-label">Umpire 2</label>${sel("rg-ump2", umpires, (o) => o.id, (o) => o.name)}
        <label class="field-label">Umpire 3</label>${sel("rg-ump3", umpires, (o) => o.id, (o) => o.name)}
        <label class="field-label">Match Referee</label>${sel("rg-ref", referees, (o) => o.id, (o) => o.name)}
        <label class="field-label">Phase</label><input class="field-control" id="rg-phase" placeholder="Group / Super 8 / Final" />
        <label class="field-label">Team / Ref ID</label><input class="field-control" id="rg-refid" />
        <label class="field-label">Match Result</label><input class="field-control" id="rg-result" />
        <label class="field-label">Points A</label><input class="field-control" id="rg-points-a" type="number" />
        <label class="field-label">Points B</label><input class="field-control" id="rg-points-b" type="number" />
        <label class="field-label">Options</label>
        <div class="reg-checks">
          <label><input type="checkbox" id="rg-neutral" /> Neutral Venue</label>
          <label><input type="checkbox" id="rg-daynight" checked /> Day / Night</label>
        </div>
      </div>

      <div class="reg-teams">
        <div class="team-panel" id="panel-A">${renderTeamPanel("A")}</div>
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
  const tableEl = root.querySelector("#rg-table");
  if (!tableEl) return;
  tableEl._matches = (await dbCall("matches")) || [];
  renderRegMatches(root);
}

// Render one page of the registration matches list (paginated so the screen
// doesn't grow unbounded as matches accumulate).
function renderRegMatches(root) {
  const tableEl = root.querySelector("#rg-table");
  if (!tableEl) return;
  const matches = tableEl._matches || [];
  const size = tableEl._pageSize || 5;
  const meta = paginate(matches, tableEl._page || 0, size);
  tableEl._page = meta.page;
  tableEl.innerHTML = renderMatchesTable(meta.slice, true) + pagerHtml(meta, "matches");
  wireMatchesTable(root, matches);
  wirePager(tableEl, meta, (p) => { tableEl._page = p; renderRegMatches(root); });
  applyAutoPage(tableEl, size, () => renderRegMatches(root));
}

// withName turns the Match Name into a clickable link that loads the row into
// the registration form (registration only). withDelete adds a Delete column;
// it defaults to withName so registration keeps both, but Match Details passes
// withDelete=true on its own to get delete without the edit-into-form link.
function renderMatchesTable(matches, withName, withDelete = withName) {
  const cols = ["Competition Name", "Match Name", "Match Type", "Team A", "Team B", "Status"];
  if (withDelete) cols.push("Delete");
  // last column is a fixed, narrow track for the delete button
  const grid = withDelete
    ? `repeat(6, minmax(0, 1fr)) 110px`
    : `repeat(${cols.length}, minmax(0, 1fr))`;
  const head = cols.map((c) => `<span>${c}</span>`).join("");
  const body = matches.length
    ? matches
        .map((m) => {
          let statusCell;
          if (m.status === "COMPLETED") {
            statusCell = `<a class="status-completed" href="index.html?match=${m.id}">COMPLETED</a>`;
          } else if (m.status === "TEAM SELECTION") {
            // Fixtures await team selection — open Match Registration to finish them.
            statusCell = `<a class="status-team" href="prototype.html?screen=match-registration&edit=${m.id}">TEAM SELECTION</a>`;
          } else {
            statusCell = `<a class="status-resume" href="index.html?match=${m.id}">RESUME</a>`;
          }
          const nameCell = withName
            ? `<button class="row-link" data-edit="${m.id}">${esc(m.matchName)}</button>`
            : esc(m.matchName);
          const deleteCell = withDelete
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
  // Constrain the team and official dropdowns to the match's competition before
  // selecting into them. The saved match keeps its own officials even if they
  // were later de-allocated from the competition, so they are restored as-is.
  const loadedComp = reg.competitions.find((c) => c.id === m.competitionId);
  populateTeamSelects(root, loadedComp, m.teamA && m.teamA.id, m.teamB && m.teamB.id);
  populateOfficialSelects(root, loadedComp, {
    ump1: m.umpire1Id, ump2: m.umpire2Id, ump3: m.umpire3Id, ref: m.refereeId,
  });
  setSelectValue(root, "#rg-ump1", m.umpire1Id, officialName(m.umpire1Id));
  setSelectValue(root, "#rg-ump2", m.umpire2Id, officialName(m.umpire2Id));
  setSelectValue(root, "#rg-ump3", m.umpire3Id, officialName(m.umpire3Id));
  setSelectValue(root, "#rg-ref", m.refereeId, officialName(m.refereeId));
  setVal("#rg-name", m.matchName);
  setSelectValue(root, "#rg-type", m.matchType);
  setVal("#rg-overs", m.overs);
  setVal("#rg-venue", m.groundId);
  setVal("#rg-status", m.status);
  setVal("#rg-phase", m.phase);
  setVal("#rg-refid", m.refId);
  setVal("#rg-result", m.matchResult);
  setVal("#rg-points-a", m.pointsA);
  setVal("#rg-points-b", m.pointsB);
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
   "#rg-ump1", "#rg-ump2", "#rg-ump3", "#rg-ref", "#rg-date",
   "#rg-phase", "#rg-refid", "#rg-result", "#rg-points-a", "#rg-points-b"].forEach((s) => {
    const el = root.querySelector(s);
    if (el) el.value = "";
  });
  // No competition selected any more: officials and teams fall back to the full
  // masters, and any option appended for a de-allocated official goes with them.
  populateOfficialSelects(root, null, null);
  populateTeamSelects(root, null, "", "");
  root.querySelector("#rg-overs").value = "50";
  root.querySelector("#rg-status").value = "RESUME";
  root.querySelector("#rg-neutral").checked = false;
  root.querySelector("#rg-daynight").checked = true;
  repaintPanel("A", root);
  repaintPanel("B", root);
}

// Participating-teams guard: a match may only use teams that participate in the
// selected competition. Returns the allowed team list — falls back to all teams
// when no competition is selected or it has no participating-teams list (e.g. an
// ungrouped friendly).
function teamsForCompetition(comp) {
  if (comp && Array.isArray(comp.teamIds) && comp.teamIds.length) {
    const allowed = new Set(comp.teamIds);
    return reg.teams.filter((t) => allowed.has(t.id));
  }
  return reg.teams;
}

// Officials of one role available to a competition: the umpires (or referees)
// allocated to it in Competition Master. Falls back to every official of that
// role in the master when the competition has no allocation yet.
function officialsForCompetition(list, comp, role) {
  const all = officialsByRole(list, role);
  const allowed = new Set((comp && comp.officialIds) || []);
  const picked = all.filter((o) => allowed.has(o.id));
  return picked.length ? picked : all;
}

// Repopulate the Umpire 1/2/3 and Match Referee dropdowns from the officials
// allocated to the competition, keeping current selections that are still valid.
function populateOfficialSelects(root, comp, keep) {
  const fill = (sel, list, current) => {
    const el = root.querySelector(sel);
    if (!el) return;
    const valid = new Set(list.map((o) => o.id));
    el.innerHTML = `<option value="">Select</option>` + optionList(list, (o) => o.id, (o) => o.name);
    el.value = current && valid.has(current) ? current : "";
  };
  const k = keep || {};
  const umpires = officialsForCompetition(reg.officials, comp, "Umpire");
  fill("#rg-ump1", umpires, k.ump1);
  fill("#rg-ump2", umpires, k.ump2);
  fill("#rg-ump3", umpires, k.ump3);
  fill("#rg-ref", officialsForCompetition(reg.officials, comp, "Match Referee"), k.ref);
}

// Current official selections, so a repopulate can preserve them.
function currentOfficialSelections(root) {
  const v = (sel) => (root.querySelector(sel) || {}).value || "";
  return { ump1: v("#rg-ump1"), ump2: v("#rg-ump2"), ump3: v("#rg-ump3"), ref: v("#rg-ref") };
}

const officialName = (id) => ((reg.officials || []).find((o) => o.id === id) || {}).name || id || "";

// Force a <select> to a stored value even when that value is no longer among
// its options — an official since de-allocated from the competition, a match
// type dropped from the master. The option is appended so saved data stays
// visible instead of silently resetting to "Select".
function setSelectValue(root, sel, value, label) {
  const el = root.querySelector(sel);
  if (!el) return;
  // Drop any option appended by an earlier call so stale entries don't pile up.
  el.querySelectorAll("option.opt-extra").forEach((o) => o.remove());
  if (!value) return;
  if (![...el.options].some((o) => o.value === value)) {
    el.insertAdjacentHTML("beforeend",
      `<option class="opt-extra" value="${esc(value)}">${esc(label || value)}</option>`);
  }
  el.value = value;
}

// Match Type is a property of the competition, so mirror the competition's
// stored type into the Match Type dropdown whenever a competition is picked.
function applyCompetitionMatchType(root, comp) {
  setSelectValue(root, "#rg-type", (comp && comp.matchType) || "");
}

// Repopulate the Home/Away dropdowns with only the competition's participating
// teams, preserving the current selections when they are still valid.
function populateTeamSelects(root, comp, keepA, keepB) {
  const list = teamsForCompetition(comp);
  const validIds = new Set(list.map((t) => t.id));
  const opts = `<option value="">Select</option>` + optionList(list, (t) => t.id, (t) => t.name);
  const homeSel = root.querySelector("#rg-home");
  const awaySel = root.querySelector("#rg-away");
  homeSel.innerHTML = opts;
  awaySel.innerHTML = opts;
  homeSel.value = keepA && validIds.has(keepA) ? keepA : "";
  awaySel.value = keepB && validIds.has(keepB) ? keepB : "";
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
    // Match type, umpires and referee all come from the competition record.
    applyCompetitionMatchType(root, c);
    const prevOff = currentOfficialSelections(root);
    populateOfficialSelects(root, c, prevOff);
    const nowOff = currentOfficialSelections(root);
    const droppedOfficial = Object.keys(prevOff).some((k) => prevOff[k] && prevOff[k] !== nowOff[k]);
    // Restrict Home/Away to this competition's participating teams.
    const homeSel = root.querySelector("#rg-home");
    const awaySel = root.querySelector("#rg-away");
    const prevA = homeSel.value, prevB = awaySel.value;
    populateTeamSelects(root, c, prevA, prevB);
    if (homeSel.value !== prevA) loadSide("A", homeSel.value, root, false);
    if (awaySel.value !== prevB) loadSide("B", awaySel.value, root, false);
    const droppedTeam = (prevA && homeSel.value !== prevA) || (prevB && awaySel.value !== prevB);
    if (droppedTeam || droppedOfficial) {
      const what = [droppedTeam && "teams", droppedOfficial && "officials"].filter(Boolean).join(" and ");
      toast(`Cleared ${what} not allocated to the selected competition`, true);
    }
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
    const val = (id) => (root.querySelector(id).value || "").trim();

    // Compulsory fields (video location intentionally excluded). Collected in
    // display order so the first missing one is reported.
    const missing = [];
    if (!val("#rg-comp")) missing.push("Competition Name");
    if (!val("#rg-name")) missing.push("Match Name");
    if (!val("#rg-type")) missing.push("Match Type");
    if (!val("#rg-overs") || Number(val("#rg-overs")) <= 0) missing.push("Number of Overs");
    if (!val("#rg-date")) missing.push("Match Date and Time");
    if (!reg.A.teamId) missing.push("Team A");
    if (!reg.B.teamId) missing.push("Team B");
    if (!val("#rg-ump1")) missing.push("Umpire 1");
    // Umpire 2 and 3 are optional.
    if (!reg.A.captainId) missing.push("Team A Captain");
    if (!reg.A.keeperId) missing.push("Team A Wicket Keeper");
    if (!reg.B.captainId) missing.push("Team B Captain");
    if (!reg.B.keeperId) missing.push("Team B Wicket Keeper");
    if (reg.A.xi.length < 7) missing.push("Minimum 7 players in Team A");
    if (reg.B.xi.length < 7) missing.push("Minimum 7 players in Team B");
    if (missing.length) return toast(`Required: ${missing.join(", ")}`, true);

    if (reg.A.teamId === reg.B.teamId) return toast("Team A and Team B must differ", true);
    // The same official can't stand as more than one umpire.
    const rgUmps = [val("#rg-ump1"), val("#rg-ump2"), val("#rg-ump3")].filter(Boolean);
    if (new Set(rgUmps).size !== rgUmps.length) return toast("Each umpire must be a different person", true);
    // A match may only be created for teams participating in the selected competition.
    if (comp && Array.isArray(comp.teamIds) && comp.teamIds.length) {
      const allowed = new Set(comp.teamIds);
      if (!allowed.has(reg.A.teamId) || !allowed.has(reg.B.teamId)) {
        return toast(`Both teams must be participating teams of ${comp.name}`, true);
      }
    }

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
      phase: root.querySelector("#rg-phase").value.trim(),
      refId: root.querySelector("#rg-refid").value.trim(),
      matchResult: root.querySelector("#rg-result").value.trim(),
      pointsA: root.querySelector("#rg-points-a").value.trim(),
      pointsB: root.querySelector("#rg-points-b").value.trim(),
    };
    try {
      const saved = await dbCall("saveMatch", match);
      if (saved) {
        reg.editingId = saved.id;
        toast(`Saved ${saved.matchName}. Click RESUME to open the coding screen.`);
        refreshMatchesTable(root);
      } else {
        toast("Could not save match", true);
      }
    } catch (err) {
      toast((err && err.message) || "Could not save match", true);
    }
  });

  await refreshMatchesTable(root);

  // Deep-link from a fixture (?edit=<id>) → load it for team selection.
  const editId = new URLSearchParams(window.location.search).get("edit");
  if (editId) {
    const all = (await dbCall("matches")) || [];
    await loadMatchIntoForm(editId, root, all);
  }
}

// ===========================================================================
// Match Details (list + create + resume)
// ===========================================================================

async function buildMatchDetails() {
  return `
    <section class="form-screen">
      <div class="btn-row" style="justify-content: flex-end; margin-top: 0;">
        <a class="btn-main btn-green" style="text-decoration:none;" href="prototype.html?screen=match-registration">+ Create Match</a>
      </div>
      <input type="text" class="field-control mst-search" id="md-search" placeholder="Search…" />
      <div id="md-table"></div>
    </section>`;
}

function initMatchDetails(root) {
  const tableEl = root.querySelector("#md-table");
  const searchEl = root.querySelector("#md-search");
  let page = 0;
  searchEl.addEventListener("input", () => { page = 0; render(); });

  function render() {
    const size = tableEl._pageSize || PAGE_SIZE;
    const all = tableEl._matches || [];
    const filtered = filterItems(all.map((m) => ({
      ...m, teamAName: m.teamA && m.teamA.name, teamBName: m.teamB && m.teamB.name,
    })), searchEl.value, ["competitionName", "matchName", "matchType", "teamAName", "teamBName", "status"]);
    const meta = paginate(filtered, page, size);
    page = meta.page;
    tableEl.innerHTML = renderMatchesTable(meta.slice, false, true) + pagerHtml(meta, "matches");
    wireMatchDetailsDelete(tableEl, render);
    wirePager(tableEl, meta, (p) => { page = p; render(); });
    applyAutoPage(tableEl, size, render);
  }

  (async () => { tableEl._matches = (await dbCall("matches")) || []; render(); })();
}

// Wire the Delete buttons on the Match Details list. Unlike the registration
// table this refreshes #md-table (via the passed render) after re-fetching, and
// clears the registration form only if it happened to be editing the deleted match.
function wireMatchDetailsDelete(tableEl, render) {
  tableEl.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      const m = (tableEl._matches || []).find((x) => x.id === id);
      const label = m ? m.matchName : "this match";
      if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
      await dbCall("deleteMatch", id);
      if (reg.editingId === id) reg.editingId = null;
      toast(`Deleted ${label}`);
      tableEl._matches = (await dbCall("matches")) || [];
      render();
    });
  });
}

// ===========================================================================
// Fixtures — schedule matches under a competition (initial details only).
// A fixture is saved as a match with status "TEAM SELECTION"; it then appears
// in Match Details where opening it completes registration (XI, captains, etc).
// ===========================================================================

const fx = { teams: [], competitions: [], officials: [], grounds: [], matchTypes: [], editingId: null };

async function buildFixtures() {
  fx.competitions = (await dbCall("competitions")) || [];
  fx.teams = (await dbCall("teams")) || [];
  fx.officials = (await dbCall("officials")) || [];
  fx.grounds = (await dbCall("grounds")) || [];
  fx.editingId = null;
  // Fixtures are scoped to one competition (passed from Competition Master).
  fx.compId = new URLSearchParams(window.location.search).get("comp") || "";
  fx.comp = fx.competitions.find((c) => c.id === fx.compId) || null;
  const comp = fx.comp;
  // Officials offered here are the ones allocated to this competition in
  // Competition Master (all officials of the role when it has no allocation).
  const umpires = officialsForCompetition(fx.officials, comp, "Umpire");
  const referees = officialsForCompetition(fx.officials, comp, "Match Referee");
  const compTeams = comp && comp.teamIds && comp.teamIds.length
    ? fx.teams.filter((t) => comp.teamIds.includes(t.id)) : fx.teams;
  const sel = (id, items, getV, getL, ph = "Select") =>
    `<select class="field-select" id="${id}"><option value="">${ph}</option>${optionList(items, getV, getL)}</select>`;
  return `
    <section class="form-screen" style="max-width:1180px;">
      <div class="form-layout" style="grid-template-columns: 1fr 1fr;">
        <div class="form-grid fx-grid" style="grid-template-columns: 180px 1fr;">
          <label class="field-label">Competition Name</label>
          <div class="field-readonly" id="fx-comp-name">${esc(comp ? comp.name : "—")}</div>
          <label class="field-label">Match Date *</label>
          <div class="fx-datetime">
            <input type="date" class="field-control" id="fx-date" />
            <input type="time" class="field-control" id="fx-time" value="00:00" />
          </div>
          <label class="field-label">Match Name</label><input class="field-control" id="fx-name" />
          <label class="fx-check fx-span"><input type="checkbox" id="fx-neutral" /> <span>Neutral Venue</span></label>
          <label class="field-label">Home Team *</label>${sel("fx-home", compTeams, (t) => t.id, (t) => t.name)}
          <label class="field-label">Umpire 1</label>${sel("fx-ump1", umpires, (o) => o.id, (o) => o.name)}
          <label class="field-label">Umpire 3</label>${sel("fx-ump3", umpires, (o) => o.id, (o) => o.name)}
        </div>
        <div class="form-grid fx-grid" style="grid-template-columns: 180px 1fr;">
          <label class="field-label">Match Type</label>
          <div class="field-readonly" id="fx-type">${esc((comp && comp.matchType) || "—")}</div>
          <label class="fx-check fx-span"><input type="checkbox" id="fx-daynight" checked /> <span>Day Night</span></label>
          <label class="field-label">Number of Overs *</label><input class="field-control" id="fx-overs" type="number" value="20" />
          <label class="field-label">Venue</label>${sel("fx-venue", fx.grounds, (g) => g.id, (g) => g.name)}
          <label class="field-label">Away Team *</label>${sel("fx-away", compTeams, (t) => t.id, (t) => t.name)}
          <label class="field-label">Umpire 2</label>${sel("fx-ump2", umpires, (o) => o.id, (o) => o.name)}
          <label class="field-label">Match Referee</label>${sel("fx-ref", referees, (o) => o.id, (o) => o.name)}
        </div>
      </div>
      <div class="btn-row" style="justify-content:center;">
        <button class="btn-main btn-green" id="fx-save">Save</button>
        <button class="btn-main btn-yellow" id="fx-clear">Clear</button>
        <button class="btn-main btn-red" id="fx-delete" disabled>Delete</button>
      </div>
      <div id="fx-table"></div>
    </section>`;
}

// "09-02-2026 14:30" / ISO → "09-Feb-2026" for the fixtures list.
function fxDateLabel(stored) {
  const iso = parseStoredDate(stored);
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return stored || "";
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getMonth()];
  return `${String(d.getDate()).padStart(2, "0")}-${mon}-${d.getFullYear()}`;
}

function fixtureRows(matches, scorers) {
  const cols = "1.1fr 1.8fr 1fr 1fr 1.7fr 1.4fr";
  const head = `<div class="table-head" style="grid-template-columns:${cols};">
    <span>Match Date</span><span>Match Name</span><span>Team A</span><span>Team B</span><span>Ground Name and City</span><span>Scorer</span></div>`;
  const scorerOpts = (selId) => `<option value="">Allocate Scorer…</option>${
    scorers.map((s) => `<option value="${esc(s.id)}" ${s.id === selId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}`;
  const body = matches.length ? matches.map((m) => {
    const g = fx.grounds.find((x) => x.id === m.groundId);
    const groundLabel = g ? [g.name, g.city].filter(Boolean).join(", ") : (m.venueName || "");
    const scorerCell = scorers.length
      ? `<select class="field-select fx-scorer" data-id="${esc(m.id)}">${scorerOpts(m.scorerId)}</select>`
      : `<span class="mst-hint">Add scorers in Officials</span>`;
    return `
    <div class="table-row fx-row" data-id="${esc(m.id)}" style="grid-template-columns:${cols};" title="Click to edit">
      <span>${esc(fxDateLabel(m.matchDate))}</span>
      <span>${esc(m.matchName)}</span>
      <span>${esc(m.teamA && m.teamA.name)}</span>
      <span>${esc(m.teamB && m.teamB.name)}</span>
      <span>${esc(groundLabel)}</span>
      <span class="fx-scorer-cell">${scorerCell}</span>
    </div>`; }).join("") : `<div class="table-empty-row">No fixtures yet for this competition.</div>`;
  return `<section class="table-shell">${head}<div class="table-rows">${body}</div></section>`;
}

async function initFixtures(root) {
  const q = (id) => root.querySelector(id);
  const tableEl = q("#fx-table"), delBtn = q("#fx-delete");
  const scorers = fx.officials.filter((o) => o.role === "Scorer");

  const setEditing = (id) => { fx.editingId = id; q("#fx-save").textContent = id ? "Update" : "Save"; delBtn.disabled = !id; };

  const clear = () => {
    ["#fx-name", "#fx-date", "#fx-home", "#fx-away", "#fx-ump1", "#fx-ump2", "#fx-ump3", "#fx-ref", "#fx-venue"].forEach((s) => { q(s).value = ""; });
    q("#fx-time").value = "00:00"; q("#fx-overs").value = "20";
    q("#fx-neutral").checked = false; q("#fx-daynight").checked = true;
    setEditing(null);
  };

  let page = 0;
  function render() {
    const size = tableEl._pageSize || PAGE_SIZE;
    const all = tableEl._items || [];
    const list = all.filter((m) => m.status === "TEAM SELECTION" && (!fx.compId || m.competitionId === fx.compId));
    const meta = paginate(list, page, size);
    page = meta.page;
    tableEl.innerHTML = fixtureRows(meta.slice, scorers) + pagerHtml(meta, "fixtures");
    // Clicking a fixture row loads it into the form (but not when using the scorer select).
    tableEl.querySelectorAll(".fx-row").forEach((rowEl) => {
      rowEl.addEventListener("click", (e) => { if (!e.target.closest(".fx-scorer")) loadFixture(rowEl.dataset.id); });
    });
    tableEl.querySelectorAll(".fx-scorer").forEach((selEl) => {
      selEl.addEventListener("change", () => allocateScorer(selEl.dataset.id, selEl.value));
    });
    wirePager(tableEl, meta, (p) => { page = p; render(); });
    applyAutoPage(tableEl, size, render);
  }
  async function refresh() {
    tableEl._items = (await dbCall("matches")) || [];
    page = 0;
    render();
  }

  function loadFixture(id) {
    const m = (tableEl._items || []).find((x) => x.id === id);
    if (!m) return;
    q("#fx-name").value = m.matchName || "";
    const iso = parseStoredDate(m.matchDate);
    if (iso) { const [d, t] = iso.split("T"); q("#fx-date").value = d; q("#fx-time").value = t || "00:00"; }
    q("#fx-overs").value = m.overs || 20;
    q("#fx-venue").value = m.groundId || "";
    q("#fx-home").value = (m.teamA && m.teamA.id) || "";
    q("#fx-away").value = (m.teamB && m.teamB.id) || "";
    // Officials saved on the fixture are restored even if they have since been
    // de-allocated from the competition, so editing can't silently drop them.
    const offName = (id) => ((fx.officials || []).find((o) => o.id === id) || {}).name || id || "";
    [["#fx-ump1", m.umpire1Id], ["#fx-ump2", m.umpire2Id], ["#fx-ump3", m.umpire3Id],
     ["#fx-ref", m.refereeId]].forEach(([sel, id]) => {
      q(sel).value = "";
      setSelectValue(root, sel, id, offName(id));
    });
    q("#fx-neutral").checked = !!m.neutralVenue; q("#fx-daynight").checked = !!m.dayNight;
    setEditing(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Allocate (or clear) a scorer on a fixture without disturbing its other data.
  async function allocateScorer(matchId, scorerId) {
    const m = (tableEl._items || []).find((x) => x.id === matchId);
    if (!m) return;
    const scorer = scorers.find((s) => s.id === scorerId);
    await dbCall("saveMatch", { ...m, scorerId, scorerName: scorer ? scorer.name : "" });
    m.scorerId = scorerId; m.scorerName = scorer ? scorer.name : "";
    toast(scorer ? `Allocated ${scorer.name}` : "Scorer cleared");
  }

  q("#fx-clear").addEventListener("click", clear);
  delBtn.addEventListener("click", async () => {
    if (!fx.editingId) return;
    if (!window.confirm("Delete this fixture? This cannot be undone.")) return;
    await dbCall("deleteMatch", fx.editingId);
    clear(); refresh();
  });

  q("#fx-save").addEventListener("click", async () => {
    const comp = fx.comp;
    const ground = fx.grounds.find((g) => g.id === q("#fx-venue").value);
    const homeId = q("#fx-home").value, awayId = q("#fx-away").value;
    const home = fx.teams.find((t) => t.id === homeId), away = fx.teams.find((t) => t.id === awayId);
    const dateVal = q("#fx-date").value, timeVal = q("#fx-time").value || "00:00";
    const missing = [];
    if (!comp) missing.push("Competition");
    if (!dateVal) missing.push("Match Date");
    if (!q("#fx-overs").value || Number(q("#fx-overs").value) <= 0) missing.push("Number of Overs");
    if (!homeId) missing.push("Home Team");
    if (!awayId) missing.push("Away Team");
    if (missing.length) return toast(`Required: ${missing.join(", ")}`, true);
    if (homeId === awayId) return toast("Home and Away teams must differ", true);
    // The same official can't stand as more than one umpire.
    const fxUmps = [q("#fx-ump1").value, q("#fx-ump2").value, q("#fx-ump3").value].filter(Boolean);
    if (new Set(fxUmps).size !== fxUmps.length) return toast("Each umpire must be a different person", true);

    const matchDate = `${isoToDMY(dateVal)} ${timeVal}`;
    const name = q("#fx-name").value.trim()
      || `${(home && home.code) || ""}VS${(away && away.code) || ""}${ddmmyy(dateVal)}`.toUpperCase();
    // Preserve an already-allocated scorer when updating an existing fixture.
    const prev = (tableEl._items || []).find((x) => x.id === fx.editingId);
    const match = {
      id: fx.editingId || undefined,
      competitionId: comp.id, competitionName: comp.name,
      matchName: name, matchType: comp.matchType || "", overs: Number(q("#fx-overs").value) || 20,
      matchDate, groundId: ground ? ground.id : "", venueName: ground ? ground.name : "",
      neutralVenue: q("#fx-neutral").checked, dayNight: q("#fx-daynight").checked,
      umpire1Id: q("#fx-ump1").value, umpire2Id: q("#fx-ump2").value, umpire3Id: q("#fx-ump3").value,
      refereeId: q("#fx-ref").value,
      scorerId: prev ? prev.scorerId : "", scorerName: prev ? prev.scorerName : "",
      // Initial details only — no XI yet. Status drives the TEAM SELECTION flow.
      teamA: { id: homeId, name: home ? home.name : "", code: home ? home.code : "" },
      teamB: { id: awayId, name: away ? away.name : "", code: away ? away.code : "" },
      status: "TEAM SELECTION",
    };
    try {
      const saved = await dbCall("saveMatch", match);
      if (saved) { toast(`Saved fixture ${saved.matchName}`); clear(); refresh(); }
      else toast("Could not save fixture", true);
    } catch (err) { toast((err && err.message) || "Could not save fixture", true); }
  });

  setEditing(null);
  refresh();
}

// ===========================================================================
// Boot / routing
// ===========================================================================

function abbreviateLabel(text) {
  const words = (text || "").replace(/[^a-z0-9\s]/gi, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CP";
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
