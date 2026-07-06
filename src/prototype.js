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
function dmyToIso(dmy) {
  const m = /^(\d{2})-(\d{2})-(\d{4})/.exec(dmy || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
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
  const scale = w / 1920;
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

async function buildCompetitionMaster() {
  const teams = (await dbCall("teams")) || [];
  const teamChecks = teams.map((t) =>
    `<label class="cm-team"><input type="checkbox" value="${esc(t.id)}" /> ${esc(t.name)}</label>`).join("");
  return `
    <section class="form-screen" style="max-width: 1280px;">
      <div class="form-layout" style="grid-template-columns: 1.1fr 0.9fr;">
        <div class="form-grid" style="grid-template-columns: 200px 1fr;">
          <label class="field-label">Competition Name *</label><input class="field-control" id="cp-name" />
          <label class="field-label">Season</label><input class="field-control" id="cp-season" value="2026" />
          <label class="field-label">Trophy</label><input class="field-control" id="cp-trophy" />
          <label class="field-label">Format</label><select class="field-select" id="cp-format"><option>League</option><option>Series</option><option>Knockout</option></select>
          <label class="field-label">Match Type</label><select class="field-select" id="cp-type"><option>ODI</option><option>T20I</option><option>Test</option><option>T20D</option><option>First Class</option></select>
          <label class="field-label">Start Date</label><input type="date" class="field-control" id="cp-start" />
          <label class="field-label">End Date</label><input type="date" class="field-control" id="cp-end" />
        </div>
        <div class="list-box">
          <h4>Participating Teams</h4>
          <input type="text" class="field-control cp-list-search" id="cp-team-search" placeholder="Search teams…" />
          <div class="cm-team-list" id="cp-teams">${teamChecks || "<p class='mst-hint'>No teams yet.</p>"}</div>
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
  { key: "teamsLabel", label: "Teams" },
];

function initCompetitionMaster(root) {
  const q = (id) => root.querySelector(id);
  const f = {
    name: q("#cp-name"), season: q("#cp-season"), trophy: q("#cp-trophy"),
    format: q("#cp-format"), type: q("#cp-type"), start: q("#cp-start"), end: q("#cp-end"),
  };
  const teamsBox = q("#cp-teams"), tableEl = q("#cp-table"), saveBtn = q("#cp-save");
  const teamSearch = q("#cp-team-search"), nameSearch = q("#cp-name-search");
  let editing = null;
  let page = 0;

  const checkedTeamIds = () => [...teamsBox.querySelectorAll("input:checked")].map((c) => c.value);
  const setTeams = (ids) => teamsBox.querySelectorAll("input").forEach((c) => { c.checked = (ids || []).includes(c.value); });
  const setEditing = (id) => { editing = id; saveBtn.textContent = id ? "Update" : "Add"; saveBtn.classList.toggle("btn-blue", !!id); };
  const clear = () => {
    f.name.value = ""; f.trophy.value = ""; f.start.value = ""; f.end.value = "";
    f.season.value = "2026"; f.format.selectedIndex = 0; f.type.selectedIndex = 0;
    setTeams([]); setEditing(null);
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
    const [comps, teams] = await Promise.all([dbCall("competitions"), dbCall("teams")]);
    const nameOf = (id) => ((teams || []).find((t) => t.id === id) || {}).name || id;
    tableEl._all = (comps || []).map((c) => ({
      ...c, teamsLabel: (c.teamIds || []).map(nameOf).join(", "),
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
    f.type.value = c.matchType || f.type.options[0].value;
    f.start.value = dmyToIso(c.startDate); f.end.value = dmyToIso(c.endDate);
    setTeams(c.teamIds || []);
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
      startDate: isoToDMY(f.start.value), endDate: isoToDMY(f.end.value), teamIds: checkedTeamIds(),
    });
    toast(`${wasNew ? "Saved" : "Updated"} ${name}`);
    clear();
    // Drop any active name filter on a fresh add so the new row isn't hidden,
    // then refresh focused on it so it lands on the visible page.
    if (wasNew) nameSearch.value = "";
    refresh(wasNew ? (saved && saved.id) : null);
  });
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

// Column headers of the statistics grid (one row per ball when populated).
const REPORT_COLUMNS = [
  "Competition", "Match", "Venue", "Date", "InnsNo", "Team", "Striker", "Nonstriker",
  "Bowler", "Actual Over", "Overs", "Run", "Extras", "Four", "Six", "Bowl", "BowlType",
  "BowlingEnd", "OTWorRTW", "CD", "Line", "Length", "Shot", "ShotType", "Fielder", "IsWicket",
];

async function buildReports() {
  const [comps, teams, matches, players] = await Promise.all([
    dbCall("competitions"), dbCall("teams"), dbCall("matches"), dbCall("players"),
  ]);
  const sel = (label, items, getV, getL) =>
    `<div class="report-field"><label>${esc(label)}</label>
      <select><option>Select</option>${optionList(items || [], getV, getL)}</select></div>`;

  const tabs = REPORT_TABS.map((t) =>
    `<button class="report-tab ${t === "Statistics" ? "active" : ""}" data-report>${esc(t)}</button>`).join("");
  const cols = REPORT_COLUMNS.map((c) => `<span>${esc(c)}</span>`).join("");

  return `
    <section class="reports-screen reports-full">
      <div class="report-topbar">
        <div class="report-brand"><img class="report-brand-mark" src="assets/logo-mark.svg" alt="" />CRICPRO REPORTS</div>
        <div class="report-top-actions">
          <label class="report-check"><input type="checkbox" checked /> Trimmed Video</label>
          <button class="report-icon" title="Export">⤓</button>
          <button class="report-icon" title="Close">✕</button>
        </div>
      </div>
      <div class="reports-body">
        <aside class="report-sidebar">
          ${sel("Match Type", ["Test", "ODI", "T20I", "T20D", "First Class"].map((m) => ({ v: m })), (m) => m.v, (m) => m.v)}
          ${sel("Competition", comps, (c) => c.id, (c) => c.name)}
          ${sel("Match", matches, (m) => m.id, (m) => m.matchName || `${(m.teamA||{}).code}vs${(m.teamB||{}).code}`)}
          ${sel("Batting Team", teams, (t) => t.id, (t) => t.name)}
          ${sel("Striker", players, (p) => p.id, (p) => p.name)}
          ${sel("Bowler", players, (p) => p.id, (p) => p.name)}
          ${sel("Wicket Type", ["Bowled", "Caught", "LBW", "Run Out", "Stumped", "Hit Wicket"].map((w) => ({ v: w })), (w) => w.v, (w) => w.v)}
          ${sel("Runs", ["0", "1", "2", "3", "4", "6"].map((r) => ({ v: r })), (r) => r.v, (r) => r.v)}
          <div class="report-misc-label">Misc. Filters</div>
          <div class="report-actions">
            <button class="btn-main btn-green">Show Reports</button>
            <button class="btn-main btn-yellow">Match Report</button>
            <button class="btn-main btn-red">Export Video</button>
            <button class="btn-main btn-pink">Play Video</button>
            <button class="btn-main btn-orange wide">Player Performance</button>
          </div>
          <button class="btn-main btn-filter wide">⛃ Select Filter</button>
        </aside>
        <div class="report-pane">
          <div class="report-tabs">${tabs}</div>
          <div class="report-groupbar">Drag a column header and drop it here to group by that column</div>
          <div class="report-table-wrap">
            <div class="report-table-head">${cols}</div>
            <div class="report-watermark"><strong>CRIC</strong><span>PRO</span></div>
          </div>
          <div class="report-pager">
            <span class="pg-btn">⏮</span><span class="pg-btn">◀</span>
            <span class="pg-num">1</span>
            <span class="pg-btn">▶</span><span class="pg-btn">⏭</span>
            <span class="pg-info">Page <input class="pg-input" value="1" /> of 1</span>
          </div>
        </div>
      </div>
    </section>`;
}

function initReports(root) {
  // Tab selection (visual active state)
  root.querySelectorAll("[data-report]").forEach((b) => b.addEventListener("click", () => {
    root.querySelectorAll("[data-report]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
  }));
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
  // Constrain the team dropdowns to the match's competition before selecting teams.
  const loadedComp = reg.competitions.find((c) => c.id === m.competitionId);
  populateTeamSelects(root, loadedComp, m.teamA && m.teamA.id, m.teamB && m.teamB.id);
  setVal("#rg-name", m.matchName);
  setVal("#rg-type", m.matchType);
  setVal("#rg-overs", m.overs);
  setVal("#rg-venue", m.groundId);
  setVal("#rg-ump1", m.umpire1Id);
  setVal("#rg-ump2", m.umpire2Id);
  setVal("#rg-ump3", m.umpire3Id);
  setVal("#rg-ref", m.refereeId);
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
    if (c && c.matchType) root.querySelector("#rg-type").value = c.matchType;
    // Restrict Home/Away to this competition's participating teams.
    const homeSel = root.querySelector("#rg-home");
    const awaySel = root.querySelector("#rg-away");
    const prevA = homeSel.value, prevB = awaySel.value;
    populateTeamSelects(root, c, prevA, prevB);
    if (homeSel.value !== prevA) loadSide("A", homeSel.value, root, false);
    if (awaySel.value !== prevB) loadSide("B", awaySel.value, root, false);
    if ((prevA && homeSel.value !== prevA) || (prevB && awaySel.value !== prevB)) {
      toast("Cleared teams not participating in the selected competition", true);
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
    if (!val("#rg-ump2")) missing.push("Umpire 2");
    if (!reg.A.captainId) missing.push("Team A Captain");
    if (!reg.A.keeperId) missing.push("Team A Wicket Keeper");
    if (!reg.B.captainId) missing.push("Team B Captain");
    if (!reg.B.keeperId) missing.push("Team B Wicket Keeper");
    if (reg.A.xi.length < 7) missing.push("Minimum 7 players in Team A");
    if (reg.B.xi.length < 7) missing.push("Minimum 7 players in Team B");
    if (missing.length) return toast(`Required: ${missing.join(", ")}`, true);

    if (reg.A.teamId === reg.B.teamId) return toast("Team A and Team B must differ", true);
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
  const umpires = fx.officials.filter((o) => o.role === "Umpire");
  const referees = fx.officials.filter((o) => o.role === "Match Referee");
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
    q("#fx-ump1").value = m.umpire1Id || ""; q("#fx-ump2").value = m.umpire2Id || "";
    q("#fx-ump3").value = m.umpire3Id || ""; q("#fx-ref").value = m.refereeId || "";
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
