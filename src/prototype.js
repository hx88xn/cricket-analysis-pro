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
        <a class="menu-card" href="prototype.html?screen=ground-master"><div><div class="icon">⭕</div><div class="label">Ground</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=shot-type"><div><div class="icon">🏏</div><div class="label">Shot Type</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=bowl-spec"><div><div class="icon">🥎</div><div class="label">Bowl Spec</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=fielding-factors"><div><div class="icon">🕓</div><div class="label">Fielding Factors</div><div class="line"></div></div></a>
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
    title: "Bowl Spec",
    back: "prototype.html?screen=masters-menu",
    build: () => buildMasterEditor("Bowl Spec", ["Fast", "Spin"], "Bowl Spec"),
    init: (root) => initMasterEditor(root, "Bowl Spec", ["Fast", "Spin"], "Bowl Spec"),
  },
  "fielding-factors": {
    title: "Fielding Factors",
    back: "prototype.html?screen=masters-menu",
    build: () => buildMasterEditor("Fielding Factor", [], "Fielding Factor"),
    init: (root) => initMasterEditor(root, "Fielding Factor", [], "Fielding Factor"),
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
  "match-registration": { title: "Match Registration", back: "home.html", build: buildMatchRegistration, init: initMatchRegistration },
  "match-details": { title: "Match Details", back: "home.html", build: buildMatchDetails, init: initMatchDetails },
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
        <div><div class="panel-header">Team Logo</div><div class="photo-box">📷</div></div>
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="tm-save">Add</button>
        <button class="btn-main btn-yellow" id="tm-clear">Clear</button>
      </div>
      <div id="tm-table"></div>
    </section>`;
}

function initTeamMaster(root) {
  const nameEl = root.querySelector("#tm-name");
  const codeEl = root.querySelector("#tm-code");
  const typeEl = root.querySelector("#tm-type");
  const tableEl = root.querySelector("#tm-table");
  const saveBtn = root.querySelector("#tm-save");
  let editing = null;

  const setEditing = (id) => { editing = id; saveBtn.textContent = id ? "Update" : "Add"; saveBtn.classList.toggle("btn-blue", !!id); };
  const clear = () => { nameEl.value = ""; codeEl.value = ""; typeEl.selectedIndex = 0; setEditing(null); };

  async function refresh() {
    const teams = (await dbCall("teams")) || [];
    tableEl._items = teams;
    tableEl.innerHTML = crudRows(teams, TEAM_COLUMNS);
    tableEl.querySelectorAll(".mst-btn").forEach((b) => b.addEventListener("click", onRowAction));
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
    setEditing(id); nameEl.focus();
  }

  root.querySelector("#tm-clear").addEventListener("click", clear);
  saveBtn.addEventListener("click", async () => {
    const name = nameEl.value.trim();
    const code = codeEl.value.trim();
    const type = typeEl.value;
    if (!name || !code) return toast("Team name and code are required", true);
    await dbCall("saveTeam", { id: editing || undefined, name, code: code.toUpperCase(), type });
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
        <button class="btn-main btn-green" id="pm-save">Add</button>
        <button class="btn-main btn-yellow" id="pm-clear">Clear</button>
      </div>
      <div id="pm-table"></div>
    </section>`;
}

const PLAYER_COLUMNS = [
  { key: "sno", label: "S.No" }, { key: "name", label: "Player Name" },
  { key: "battingStyle", label: "Batting Style" }, { key: "bowling", label: "Bowling Style" },
  { key: "role", label: "Role" },
];

function initPlayerMaster(root) {
  const q = (id) => root.querySelector(id);
  const nameEl = q("#pm-name"), shortEl = q("#pm-short"), teamEl = q("#pm-team");
  const roleEl = q("#pm-role"), batEl = q("#pm-bat"), bowlStyleEl = q("#pm-bowlstyle"), bowlTypeEl = q("#pm-bowltype");
  const tableEl = q("#pm-table"), saveBtn = q("#pm-save");
  let editing = null;

  const setEditing = (id) => { editing = id; saveBtn.textContent = id ? "Update" : "Add"; saveBtn.classList.toggle("btn-blue", !!id); };
  const clear = () => { nameEl.value = ""; shortEl.value = ""; setEditing(null); };

  async function refresh() {
    const players = (await dbCall("players", teamEl.value)) || [];
    const rows = players.map((p, i) => ({
      ...p, sno: i + 1, bowling: [p.bowlingStyle, p.bowlingType].filter(Boolean).join(" "),
    }));
    tableEl._items = rows;
    tableEl.innerHTML = crudRows(rows, PLAYER_COLUMNS);
    tableEl.querySelectorAll(".mst-btn").forEach((b) => b.addEventListener("click", onRowAction));
  }
  async function onRowAction() {
    const id = this.dataset.id;
    if (this.dataset.act === "del") {
      if (editing === id) clear();
      await dbCall("deletePlayer", id);
      return refresh();
    }
    const p = (tableEl._items || []).find((x) => x.id === id);
    if (!p) return;
    nameEl.value = p.name || ""; shortEl.value = p.shortName || "";
    if (p.teamId) teamEl.value = p.teamId;
    roleEl.value = p.role || roleEl.options[0].value;
    batEl.value = p.battingStyleCode || (p.battingStyle === "Left Hand Bat" ? "LHB" : "RHB");
    bowlStyleEl.value = p.bowlingStyle || "";
    bowlTypeEl.value = p.bowlingType || "";
    setEditing(id); nameEl.focus();
  }

  teamEl.addEventListener("change", () => { if (!editing) refresh(); });
  q("#pm-clear").addEventListener("click", clear);
  saveBtn.addEventListener("click", async () => {
    const name = nameEl.value.trim();
    if (!name) return toast("Player name is required", true);
    const bat = batEl.value;
    await dbCall("savePlayer", {
      id: editing || undefined,
      name,
      shortName: shortEl.value.trim() || name.split(" ").slice(-1)[0],
      teamId: teamEl.value,
      role: roleEl.value,
      battingStyleCode: bat,
      battingStyle: bat === "LHB" ? "Left Hand Bat" : "Right Hand Bat",
      bowlingStyle: bowlStyleEl.value,
      bowlingType: bowlTypeEl.value,
      bowlingSpec: "",
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

function renderMasterRows(items, groups, nameLabel) {
  const hasGroups = groups && groups.length;
  const cols = masterTableCols(hasGroups);
  const sections = (hasGroups ? groups : [""]).map((grp) => {
    const list = items.filter((it) => (it.grp || "") === grp);
    const head = `<div class="table-head" style="grid-template-columns:${cols};">
      <span>Order</span><span>${esc(nameLabel)}</span>${hasGroups ? "<span>Group</span>" : ""}<span>Actions</span></div>`;
    const rows = list.length ? list.map((it, i) => `
      <div class="table-row mst-row" draggable="true" data-id="${esc(it.id)}" data-grp="${esc(grp)}" style="grid-template-columns:${cols};">
        <span class="mst-order"><span class="mst-grip" title="Drag to reorder">⠿</span>${i + 1}</span>
        <span>${esc(it.name)}</span>
        ${hasGroups ? `<span>${esc(grp)}</span>` : ""}
        <span class="mst-actions">
          <button class="mst-btn" data-act="up" data-id="${esc(it.id)}" data-grp="${esc(grp)}" ${i === 0 ? "disabled" : ""}>▲</button>
          <button class="mst-btn" data-act="down" data-id="${esc(it.id)}" data-grp="${esc(grp)}" ${i === list.length - 1 ? "disabled" : ""}>▼</button>
          <button class="mst-btn" data-act="edit" data-id="${esc(it.id)}" data-name="${esc(it.name)}" data-grp="${esc(grp)}" title="Edit">✎</button>
          <button class="mst-btn mst-del" data-act="del" data-id="${esc(it.id)}">✕</button>
        </span>
      </div>`).join("") : `<div class="table-empty-row">No records found.</div>`;
    return `${hasGroups ? `<h4 class="mst-grp-title">${esc(grp)}</h4>` : ""}
      <section class="table-shell">${head}<div class="table-rows" data-grp="${esc(grp)}">${rows}</div></section>`;
  }).join("");
  return sections;
}

async function buildMasterEditor(category, groups, nameLabel) {
  const hasGroups = groups && groups.length;
  const grpField = hasGroups
    ? `<label class="field-label">Group</label><select class="field-select" id="mm-grp">${
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
      <div id="mm-table"></div>
    </section>`;
}

function initMasterEditor(root, category, groups, nameLabel) {
  const tableEl = root.querySelector("#mm-table");
  const nameEl = root.querySelector("#mm-name");
  const grpEl = root.querySelector("#mm-grp");
  const saveBtn = root.querySelector("#mm-save");
  let editing = null; // { id, grp, ord } when editing an existing row

  const setEditing = (item) => {
    editing = item;
    saveBtn.textContent = item ? "Update" : "Add";
    saveBtn.classList.toggle("btn-blue", !!item);
  };

  async function refresh() {
    const items = (await dbCall("masters", category)) || [];
    tableEl.innerHTML = renderMasterRows(items, groups, nameLabel);
    tableEl.querySelectorAll(".mst-btn").forEach((btn) => btn.addEventListener("click", onRowAction));
    wireDrag();
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
      const items = (await dbCall("masters", category)) || [];
      const cur = items.find((it) => it.id === id) || {};
      setEditing({ id, grp, ord: cur.ord });
      nameEl.focus();
      return;
    }
    const items = (await dbCall("masters", category)) || [];
    const ids = items.filter((it) => (it.grp || "") === grp).map((it) => it.id);
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
  function wireDrag() {
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
        const ids = [...container.querySelectorAll(".mst-row")].map((r) => r.dataset.id);
        await dbCall("reorderMaster", category, grp, ids);
        refresh(); // re-render so the order numbers + arrow disabled-states update
      });
    });
  }

  saveBtn.addEventListener("click", async () => {
    const name = nameEl.value.trim();
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
// Generic entity master (flat records) — Add / Edit / Delete from the DB.
// Used by Officials and Ground; configured with fields + columns + db verbs.
// ===========================================================================

function crudFieldHtml(f) {
  if (f.type === "select") {
    return `<label class="field-label">${esc(f.label)}</label>
      <select class="field-select" data-key="${esc(f.key)}">${
        (f.options || []).map((o) => `<option>${esc(o)}</option>`).join("")}</select>`;
  }
  return `<label class="field-label">${esc(f.label)}</label>
    <input class="field-control" data-key="${esc(f.key)}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} />`;
}

function crudRows(items, columns) {
  const cols = `${columns.map(() => "1fr").join(" ")} 120px`;
  const head = `<div class="table-head" style="grid-template-columns:${cols};">${
    columns.map((c) => `<span>${esc(c.label)}</span>`).join("")}<span>Actions</span></div>`;
  const body = items.length ? items.map((it) => `
    <div class="table-row" style="grid-template-columns:${cols};">
      ${columns.map((c) => `<span>${esc(it[c.key] ?? "")}</span>`).join("")}
      <span class="mst-actions">
        <button class="mst-btn" data-act="edit" data-id="${esc(it.id)}" title="Edit">✎</button>
        <button class="mst-btn mst-del" data-act="del" data-id="${esc(it.id)}" title="Delete">✕</button>
      </span>
    </div>`).join("") : `<div class="table-empty-row">No records found.</div>`;
  return `<section class="table-shell">${head}<div class="table-rows">${body}</div></section>`;
}

async function buildCrudMaster(cfg) {
  return `
    <section class="form-screen" style="max-width: 1040px;">
      <div class="form-grid" style="grid-template-columns: 200px 1fr;" id="cm-form">
        ${cfg.fields.map(crudFieldHtml).join("")}
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="cm-save">Add</button>
        <button class="btn-main btn-yellow" id="cm-clear">Clear</button>
      </div>
      <div id="cm-table"></div>
    </section>`;
}

function initCrudMaster(root, cfg) {
  const tableEl = root.querySelector("#cm-table");
  const saveBtn = root.querySelector("#cm-save");
  const fieldEls = {};
  cfg.fields.forEach((f) => { fieldEls[f.key] = root.querySelector(`[data-key="${f.key}"]`); });
  let editing = null;

  const setEditing = (id) => {
    editing = id;
    saveBtn.textContent = id ? "Update" : "Add";
    saveBtn.classList.toggle("btn-blue", !!id);
  };
  const clearForm = () => {
    cfg.fields.forEach((f) => {
      const el = fieldEls[f.key];
      if (el.tagName === "SELECT") el.selectedIndex = 0; else el.value = "";
    });
    setEditing(null);
  };

  async function refresh() {
    const items = (await dbCall(cfg.listFn)) || [];
    tableEl.innerHTML = crudRows(items, cfg.columns);
    tableEl._items = items;
    tableEl.querySelectorAll(".mst-btn").forEach((b) => b.addEventListener("click", onRowAction));
  }

  async function onRowAction() {
    const id = this.dataset.id;
    if (this.dataset.act === "del") {
      if (editing === id) clearForm();
      await dbCall(cfg.deleteFn, id);
      return refresh();
    }
    // edit: load the record into the form
    const item = (tableEl._items || []).find((it) => it.id === id);
    if (!item) return;
    cfg.fields.forEach((f) => {
      const el = fieldEls[f.key];
      if (el.tagName === "SELECT") el.value = item[f.key] || el.options[0].value;
      else el.value = item[f.key] || "";
    });
    setEditing(id);
    fieldEls[cfg.fields[0].key].focus();
  }

  saveBtn.addEventListener("click", async () => {
    const rec = {};
    cfg.fields.forEach((f) => { rec[f.key] = fieldEls[f.key].value.trim ? fieldEls[f.key].value.trim() : fieldEls[f.key].value; });
    const req = cfg.required || [cfg.fields[0].key];
    if (req.some((k) => !rec[k])) return toast(`${cfg.entity} needs ${req.join(", ")}`, true);
    if (editing) rec.id = editing;
    await dbCall(cfg.saveFn, rec);
    toast(`${editing ? "Updated" : "Added"} ${rec[cfg.fields[0].key]}`);
    clearForm();
    refresh();
  });
  root.querySelector("#cm-clear").addEventListener("click", clearForm);

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
          <label class="field-label">Start Date</label><input class="field-control" id="cp-start" placeholder="DD-MM-YYYY" />
          <label class="field-label">End Date</label><input class="field-control" id="cp-end" placeholder="DD-MM-YYYY" />
        </div>
        <div class="list-box"><h4>Participating Teams</h4><div class="cm-team-list" id="cp-teams">${teamChecks || "<p class='mst-hint'>No teams yet.</p>"}</div></div>
      </div>
      <div class="btn-row">
        <button class="btn-main btn-green" id="cp-save">Add</button>
        <button class="btn-main btn-yellow" id="cp-clear">Clear</button>
      </div>
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
  let editing = null;

  const checkedTeamIds = () => [...teamsBox.querySelectorAll("input:checked")].map((c) => c.value);
  const setTeams = (ids) => teamsBox.querySelectorAll("input").forEach((c) => { c.checked = (ids || []).includes(c.value); });
  const setEditing = (id) => { editing = id; saveBtn.textContent = id ? "Update" : "Add"; saveBtn.classList.toggle("btn-blue", !!id); };
  const clear = () => {
    f.name.value = ""; f.trophy.value = ""; f.start.value = ""; f.end.value = "";
    f.season.value = "2026"; f.format.selectedIndex = 0; f.type.selectedIndex = 0;
    setTeams([]); setEditing(null);
  };

  async function refresh() {
    const [comps, teams] = await Promise.all([dbCall("competitions"), dbCall("teams")]);
    const nameOf = (id) => ((teams || []).find((t) => t.id === id) || {}).name || id;
    const rows = (comps || []).map((c) => ({
      ...c, teamsLabel: (c.teamIds || []).map(nameOf).join(", "),
    }));
    tableEl._items = rows;
    tableEl.innerHTML = crudRows(rows, COMPETITION_COLUMNS);
    tableEl.querySelectorAll(".mst-btn").forEach((b) => b.addEventListener("click", onRowAction));
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
    f.start.value = c.startDate || ""; f.end.value = c.endDate || "";
    setTeams(c.teamIds || []);
    setEditing(id); f.name.focus();
  }

  q("#cp-clear").addEventListener("click", clear);
  saveBtn.addEventListener("click", async () => {
    const name = f.name.value.trim();
    if (!name) return toast("Competition name is required", true);
    await dbCall("saveCompetition", {
      id: editing || undefined, name, season: f.season.value.trim(), trophy: f.trophy.value.trim(),
      format: f.format.value, matchType: f.type.value,
      startDate: f.start.value.trim(), endDate: f.end.value.trim(), teamIds: checkedTeamIds(),
    });
    toast(`${editing ? "Updated" : "Saved"} ${name}`);
    clear();
    refresh();
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
    { key: "country", label: "Country", type: "text" },
    { key: "category", label: "Category", type: "select", options: ["International", "Domestic", "Elite"] },
  ],
  columns: [
    { key: "name", label: "Officials Name" }, { key: "country", label: "Country" },
    { key: "role", label: "Role" }, { key: "category", label: "Category" },
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
        <div class="report-brand">🏃 CAP REPORTS</div>
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
