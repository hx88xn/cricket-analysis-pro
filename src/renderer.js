// ============================================================================
// CRICPRO — scoring engine + overlays
// Recreated to match the look, feel and functionality of the reference
// recordings (Canada vs Oman live coding session).
// ============================================================================

// ---- Reference data -------------------------------------------------------

// Bowl + shot type lists and the fielding-factor list are loaded from the
// "Ball Type", "Shot Type" and "Fielding Factor" masters in the database at
// boot (see loadMasters), and their order is whatever the Masters menu sets.
// The hardcoded values below are only a fallback when the DB bridge is absent.
// Each group is one ordered list; the coding screen shows the first 15 on the
// default grid page and the remainder on the expand-arrow page.
let BOWL_TYPES = {
  Fast: [
    "Inswinger", "OutSwinger", "Straight Ball", "Angled In", "Angled Across",
    "Bouncer", "Nip Backer", "Nipped Away", "Slow Bouncer", "Full Toss", "Slower Ball",
    "Yorker", "Off Cutter", "Leg Cutter", "Cross Seam", "Reverse Swing",
    "Reverse Swinging Yorker", "InSwinging Yorker", "Slow Yorker", "Knuckle Ball",
    "Split Finger", "Back Hand Slower Ball", "Wide Yorker",
  ],
  Spin: [
    "Off Spin", "Doosra", "Faster One", "Leg Spin", "Googly", "Flipper",
    "Orthodox", "Chinaman", "Arm Ball", "Straighter One", "Full Toss", "No turn",
    "Wrong One", "Top Spin", "Carrom Ball", "Drifter", "Under Spin", "Slider",
    "Yorker", "Back Spin", "W Yorker",
  ],
};

let SHOT_TYPES = {
  Aggressive: [
    "Cover Drive", "Square Drive", "Straight Drive", "Off Drive", "On Drive",
    "Flick", "Cut", "Pull", "Slash", "Sweep Shot", "Slog Sweep", "Slog Shot",
    "Lofted Off", "Lofted On", "Lofted Over Cover", "Hook", "Inside Out",
    "Lofted Straight", "Chip Shot", "Upper Cut", "Punch", "Scoop", "Paddle Sweep",
    "Reverse Sweep", "Switch Hit", "Reverse Scoop", "Pick Up", "Helicopter Shot",
    "Shot Arm Pull", "Slap", "Lap Shot", "Ramp", "Reverse Lap", "Lofted Square",
  ],
  Defensive: [
    "Forward Defence", "Backfoot Defence", "Glide", "Left Alone", "Push", "No Shot",
    "Late Cut", "Ducked", "Leg Glance", "Soft Hand Defence", "Steer", "Worked",
  ],
};

// The ▲ key is a "shift" toggle: the default page exposes 1/2/3 + boundary
// B4/B6, while the shifted page swaps the first two columns to plain run values
// 4/5/6/7/8 (so big run totals can be entered without the boundary flag). The
// ▲ cell highlights red while shifted.
function getKeypadKeys() {
  // ▲ toggles the 4-8 "shifted" run values in the first two cols. RBW is an
  // external-parameter toggle (no runs) — it highlights while armed and is
  // recorded against the next ball logged.
  const s = state.keypadShifted;
  return [
    { label: s ? "4" : "1", type: "run", val: s ? 4 : 1 },
    s ? { label: "7", type: "run", val: 7 } : { label: "B4", type: "run", val: 4, cls: "alt", boundary: true },
    { label: "NB", type: "ext", ext: "NB", cls: "alt" },
    { label: s ? "5" : "2", type: "run", val: s ? 5 : 2 },
    s ? { label: "8", type: "run", val: 8 } : { label: "B6", type: "run", val: 6, cls: "alt", boundary: true },
    { label: "WD", type: "ext", ext: "WD", cls: "alt" },
    { label: s ? "6" : "3", type: "run", val: s ? 6 : 3 },
    { label: "MARK FOR EDIT", type: "mark", cls: "alt narrow" },
    { label: "LB", type: "ext", ext: "LB", cls: "alt" },
    { label: "▲", type: "shift", cls: `icon-up${s ? " shifted" : ""}` },
    { label: "RBW", type: "rbw", cls: `alt${state.rbw ? " active-mode" : ""}` },
    { label: "B", type: "ext", ext: "B", cls: "alt" },
  ];
}

// Squads. Default to the recorded Canada-vs-Oman session so the screen still
// works when opened standalone; replaced at boot when a ?match=<id> is loaded
// from the database (see applyMatch).
let CANADA = [
  "SAAD BIN ZAFAR", "RAVINDERPAL SINGH", "KANWARPAL TATHGUR", "NICHOLAS KIRTON",
  "NAVNEET DHALIWAL", "MANJOT BUTTAR", "KALEEM SANA", "HARSH THAKER",
  "DILPREET BAJWA", "DILLON HEYLIGER", "ANSH PATEL", "AJAYVEER HUNDAL",
  "YUVRAJ SAMRA", "SHIVAM SHARMA CAN", "SHREYAS MOVVA",
];

let OMAN_BOWLERS = [
  "SHAH FAISAL", "NADEEM KHAN", "HASSNAIN ALI SHAH",
  "JITEN RAMANANDI", "JAY ODEDRA", "MOHAMMAD NADEEM",
];

let FIELDERS = [
  "ASHISH ODEDARA", "HAMMAD MIRZA", "HASSNAIN ALI SHAH", "JATINDER SINGH",
  "JAY ODEDRA", "JITEN RAMANANDI", "KARAN SONAVALE", "MOHAMMAD NADEEM",
  "NADEEM KHAN", "SHAFIQ JAN", "SHAH FAISAL", "SHAKEEL AHMED",
  "WASIM ALI", "SUFYAN MEHMOOD", "VINAYAK SHUKLA",
];

let FIELDING_EVENTS = [
  "Airborne Stop", "Airborne Catch", "Bad Throw", "Caught", "Catch Dropped",
  "Chase and Stop", "Chase and Miss", "Direct Hit", "Dive and Stop",
  "Dive and Miss", "Catch Taken", "Fumble", "Good Throw", "Missfield",
  "One Hand Pick and Throw", "Pick and Throw", "Run Out Made", "Run Out Missed",
  "Relay Throw", "Slide and Stop", "Slide and Miss", "Stumping", "Stumping Made",
  "Stumping Missed", "Slow to the Ball", "Thrown at Stumps", "Well Kept",
  "Well Fielded", "BACK UP", "GREAT EFFORT",
];

const DISMISSALS = [
  "Bowled", "Caught", "LBW", "Run Out", "Stumped", "Hit Wicket",
  "Caught & Bowled", "Handled Ball", "Obstructing Field",
];

const MATCH_EVENTS_NAV = [
  "Breaks", "Other Wickets", "Power Play", "Revised Overs", "Revised Target",
  "Match Results", "Match Info Edit", "Batsman In / Out Time",
  "Ball Change", "Video Count Validation", "Movie Organiser",
];

// ---- Match state ----------------------------------------------------------

const state = {
  battingCode: "CANA",
  teamA: "CANA",
  teamB: "OMN",
  runs: 49,
  wkts: 0,
  over: 4,
  ball: 3,            // legal balls bowled in the current over
  overs: 20,          // total overs per innings — drives match format (≤20 → T20)
  pace: "Fast",
  style: "Aggressive",
  keypadShifted: false,
  bowlType: null,
  shotType: null,
  // Per-ball coding tags. `tags` is a multi-select set (btn/unc/wtb/rs — any
  // combination), `footwork` is a single-select group (ff/bf/sd/crm — at most
  // one). Both are recorded onto the ball when it is logged, then reset.
  tags: { btn: false, unc: false, wtb: false, rs: false },
  footwork: null,
  // RBW is an external parameter (generic flag, default 0). Like over-throw it
  // is recorded against the ball but adds no runs to the score.
  rbw: false,
  striker: "RAVINDERPAL SINGH",
  nonStriker: "SAAD BIN ZAFAR",
  bowler: "JITEN RAMANANDI -L FAST",
  bowlEnd: "FAR END",
  bat: {
    striker:   { runs: 31, balls: 14, fours: 3, sixes: 1 },
    nonStriker:{ runs: 18, balls: 10, fours: 0, sixes: 0 },
  },
  bowl: { spell: 1, balls: 3, runs: 5, mdns: 0, wkts: 0 },
  log: [
    row("4.1", "JITEN RAMANANDI", "RAVINDERPAL", "SAAD BIN ZAFAR", "OutSwinger", "On Drive", 1, 0),
    row("4.2", "JITEN RAMANANDI", "RAVINDERPAL", "SAAD BIN ZAFAR", "OutSwinger", "On Drive", 1, 0),
    row("4.3", "JITEN RAMANANDI", "RAVINDERPAL", "SAAD BIN ZAFAR", "OutSwinger", "Flick", 3, 0),
  ],
  overRunsThisOver: 5,
  thisOver: ["1", "1", "3"],
  history: [],        // for undo
  innings: 1,
  matchOver: false,
  overStarted: false, // a new over must be started before any ball
  ballStarted: false, // each ball must be started before it can be entered
  // The current ball is staged here as it is entered (runs/extras/wicket/etc.)
  // and only committed to the log when "End Ball" is pressed. `staged` mirrors
  // the highlighted keypad key so it survives keypad re-renders.
  pending: null,
  staged: null,
  bowlExpanded: false, // extended bowl-type page shown
  shotExpanded: false, // extended shot-type page shown
  wagonLines: [],
  pendingWagonLine: null,
  pitchInputs: [],    // current ball's pitch-map dots (saved + cleared per ball)
  fieldingEvents: [],
  otherWickets: [],   // dismissals recorded without a delivery (Other Wickets)
};

function row(num, bowler, striker, nonstr, bowl, shot, runs, ext) {
  return { num, bowler, striker, nonstr, bowl, shot, runs, ext, marked: false };
}

// ---- Grid rendering -------------------------------------------------------

function fillGrid(containerId, labels, group) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  labels.forEach((text) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grid-btn";
    b.textContent = text;
    b.addEventListener("click", () => {
      el.querySelectorAll(".grid-btn").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      if (group === "bowl") state.bowlType = text;
      if (group === "bat") state.shotType = text;
    });
    el.appendChild(b);
  });
}

// Each group is one ordered list; the first 15 fill the default grid page and
// the rest appear on the expand-arrow page.
const GRID_PAGE = 15;

function renderBowlGrid() {
  const full = BOWL_TYPES[state.pace] || [];
  const more = full.slice(GRID_PAGE);
  const list = state.bowlExpanded && more.length ? more : full.slice(0, GRID_PAGE);
  fillGrid("bowl-grid", list, "bowl");
  state.bowlType = null;
  syncExpandArrow("bowl-expand", more.length > 0, state.bowlExpanded);
}
function renderBatGrid() {
  const full = SHOT_TYPES[state.style] || [];
  const more = full.slice(GRID_PAGE);
  const list = state.shotExpanded && more.length ? more : full.slice(0, GRID_PAGE);
  fillGrid("bat-grid", list, "bat");
  state.shotType = null;
  syncExpandArrow("bat-expand", more.length > 0, state.shotExpanded);
}

// Programmatically select a value in a bowl/shot grid: switch the Fast/Spin or
// Aggressive/Defensive group, flip to the extended page if the value lives there,
// re-render, then highlight the matching cell. Used by the LI "copy last" toggle.
function selectGridButton(containerId, name) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.querySelectorAll(".grid-btn").forEach((b) => b.classList.toggle("selected", b.textContent === name));
}

function applyBowlType(name) {
  if (!name) return false;
  for (const grp of Object.keys(BOWL_TYPES)) {
    const idx = (BOWL_TYPES[grp] || []).indexOf(name);
    if (idx < 0) continue;
    state.pace = grp;
    state.bowlExpanded = idx >= GRID_PAGE;
    document.querySelectorAll('.toggle[data-group="pace"]').forEach((b) =>
      b.classList.toggle("active", b.textContent.trim() === grp));
    renderBowlGrid();
    selectGridButton("bowl-grid", name);
    state.bowlType = name;
    return true;
  }
  return false;
}

function applyShotType(name) {
  if (!name) return false;
  for (const grp of Object.keys(SHOT_TYPES)) {
    const idx = (SHOT_TYPES[grp] || []).indexOf(name);
    if (idx < 0) continue;
    state.style = grp;
    state.shotExpanded = idx >= GRID_PAGE;
    document.querySelectorAll('.toggle[data-group="style"]').forEach((b) =>
      b.classList.toggle("active", b.textContent.trim() === grp));
    renderBatGrid();
    selectGridButton("bat-grid", name);
    state.shotType = name;
    return true;
  }
  return false;
}

// LI toggle: copy the previous ball's bowl type + shot type into the current
// selection (handy when consecutive balls are the same delivery/shot).
function copyLastBallTypes() {
  const last = state.log[state.log.length - 1];
  if (!last) { toast("No previous ball to copy from"); return; }
  applyBowlType(last.bowl);
  applyShotType(last.shot);
  toast(`Copied last ball: ${last.bowl || "—"} / ${last.shot || "—"}`);
}

// Show/point the panel expand arrow (hidden when the category has no extra page)
function syncExpandArrow(id, hasMore, expanded) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.hidden = !hasMore;
  btn.classList.toggle("expanded", expanded);
  btn.textContent = expanded ? "◂" : "▸"; // ◂ when open, ▸ when closed
  btn.title = expanded ? "Show common" : "Show more";
}

function fillKeypad() {
  const el = document.getElementById("keypad");
  if (!el) return;
  el.innerHTML = "";
  const staged = state.staged;
  getKeypadKeys().forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `keypad-btn ${k.cls || ""}`.trim();
    b.textContent = k.label;
    // Keep the staged delivery's key highlighted until the ball is committed.
    if (staged && ((staged.type === "run" && k.type === "run" && k.val === staged.val)
        || (staged.type === "ext" && k.type === "ext" && k.ext === staged.ext))) {
      b.classList.add("staged");
    }
    if (k.disabled) {
      b.disabled = true;
      b.classList.add("disabled");
    } else {
      b.addEventListener("click", () => handleKeypad(k, b));
    }
    el.appendChild(b);
  });
}

// ---- Toggles --------------------------------------------------------------

function wireToggles() {
  document.querySelectorAll(".toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = btn.getAttribute("data-group");
      document.querySelectorAll(`.toggle[data-group="${g}"]`).forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      if (g === "pace") { state.pace = btn.textContent.trim(); state.bowlExpanded = false; renderBowlGrid(); }
      if (g === "style") { state.style = btn.textContent.trim(); state.shotExpanded = false; renderBatGrid(); }
    });
  });

  // Expand arrows reveal the extended bowl / shot pages
  document.getElementById("bowl-expand")?.addEventListener("click", () => {
    state.bowlExpanded = !state.bowlExpanded; renderBowlGrid();
  });
  document.getElementById("bat-expand")?.addEventListener("click", () => {
    state.shotExpanded = !state.shotExpanded; renderBatGrid();
  });

  // LI radio: copy the last ball's bowl + shot type into the current selection
  document.getElementById("radio-li")?.addEventListener("click", copyLastBallTypes);

  document.querySelectorAll(".pitch-overlay-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = btn.getAttribute("data-group");
      document.querySelectorAll(`.pitch-overlay-btn[data-group="${g}"]`).forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

// ---- Pitch map (ball-landing dots) ---------------------------------------

const NS = "http://www.w3.org/2000/svg";

// Draw one pitch-map marker. Each ball records TWO points: the "pitch" point
// (where the ball bounced) and the "height" point (where it passes the stumps),
// matching the reference's two red balls. `kind` selects the marker style.
function addPitchDot(svg, x, y, kind, review = false) {
  const d = document.createElementNS(NS, "circle");
  d.setAttribute("cx", Number(x).toFixed(2));
  d.setAttribute("cy", Number(y).toFixed(2));
  d.setAttribute("r", kind === "height" ? "1.3" : "1.1");
  d.setAttribute("class", `pitch-dot pitch-${kind}${review ? " review" : ""}`);
  svg.appendChild(d);
  return d;
}

function wirePitchMap() {
  const wrap = document.getElementById("pitch-wrap");
  const svg = document.getElementById("pitch-overlay-svg");
  if (!wrap || !svg) return;
  wrap.addEventListener("click", (e) => {
    if (e.target.closest(".pitch-overlay-btn")) return;
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    clearReview();        // leave review mode when placing a live dot
    state.pitchInputs ||= [];
    // First click = pitch (bounce) point; second = height (stump-passing) point;
    // a third click starts a fresh pair.
    if (state.pitchInputs.length >= 2) clearPitchDots();
    const kind = state.pitchInputs.length === 0 ? "pitch" : "height";
    addPitchDot(svg, x, y, kind);
    state.pitchInputs.push({ x, y, kind });
    state.lastPitch = { x, y };
  });
}

// Remove the current ball's pitch-map dots from the display + tracking.
function clearPitchDots() {
  const svg = document.getElementById("pitch-overlay-svg");
  if (svg) svg.querySelectorAll(".pitch-dot").forEach((d) => d.remove());
  state.pitchInputs = [];
  state.lastPitch = null;
}

// ---- Field map (wagon wheel) ---------------------------------------------
//
// The shot line is drawn from the batsman at the centre of the field out to
// where the ball travelled. You can either click a spot or press-and-drag to
// aim the line with a live preview; the fielding region under the cursor is
// shown as a label below the wheel (matching the reference). Lines are colour
// coded by runs (red = 1-3, blue = boundary 4, gold = 6). One line per ball: it
// is saved onto the ball's row and cleared from the wheel when the ball is
// logged. The line is clamped to the edge of the circular field.

// Fielding regions for a right-hand batsman as printed on field-map.png
// (keeper/slips at the top, off side on the left). Indexed by the 45° sector,
// clockwise, starting at straight-up (12 o'clock) which splits third man / fine leg.
const WAGON_REGIONS = [
  "FINE LEG", "SQUARE LEG", "MID WICKET", "LONG ON",
  "LONG OFF", "COVERS", "POINT", "THIRD MAN",
];

// Specific fielding positions offered for each region when you right-click that
// part of the wheel (the first menu level, before Fielding Events → Fielder).
const WAGON_POSITIONS = {
  "THIRD MAN": ["Short Third Man", "Third Man", "Deep Third Man", "Backward Point", "Deep Backward Point", "Fly Slip", "Fine Gully"],
  "FINE LEG": ["Short Fine Leg", "Fine Leg", "Deep Fine Leg", "Long Leg", "Backward Square Leg", "Leg Gully", "Leg Slip"],
  "POINT": ["Silly Point", "Point", "Deep Point", "Backward Point", "Deep Backward Point", "Gully", "Cover Point"],
  "SQUARE LEG": ["Short Leg", "Square Leg", "Deep Square Leg", "Backward Square Leg", "Deep Backward Square Leg", "Forward Square Leg", "Deep Forward Square Leg"],
  "COVERS": ["Short Cover", "Cover", "Deep Cover", "Extra Cover", "Deep Extra Cover (Sweeper)", "Backward Cover", "Cover Point"],
  "MID WICKET": ["Short Mid Wicket", "Mid Wicket", "Deep Mid Wicket", "Forward Square Leg", "Deep Forward Square Leg", "Cow Corner", "Wide Mid Wicket"],
  "LONG OFF": ["Mid Off", "Long Off", "Wide Long Off", "Straight Long Off", "Deep Mid Off", "Sweeper Cover", "Extra Cover"],
  "LONG ON": ["Mid On", "Long On", "Wide Long On", "Straight Long On", "Deep Mid On", "Cow Corner", "Long On Sweeper"],
};
// The overlay uses the field image's native pixel space (viewBox 0 0 642 640,
// preserveAspectRatio xMidYMid meet) so SVG units line up with the picture.
// The image already has the batsman origin dot + orange bat baked in at
// (325, 267) — lines must start from THAT dot. The green circle itself is
// centred lower at (324.5, 312.5) (the OFF/ON SIDE labels sit below it), so the
// circle is only used to clamp endpoints inside the green rim.
const FIELD_OX = 325, FIELD_OY = 267;                 // batsman origin (the dot)
const FIELD_CX = 324.5, FIELD_CY = 312.5, FIELD_R = 290; // field circle (clamp)

function wagonRegion(x, y) {
  const dx = x - FIELD_OX, dy = y - FIELD_OY;
  if (Math.hypot(dx, dy) < 32) return "";      // too close to the batsman
  let a = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = straight up, clockwise
  if (a < 0) a += 360;
  return WAGON_REGIONS[Math.floor(a / 45) % 8];
}

function clampToField(x, y) {
  const dx = x - FIELD_CX, dy = y - FIELD_CY;
  const d = Math.hypot(dx, dy);
  if (d <= FIELD_R) return { x, y };
  return { x: FIELD_CX + (dx / d) * FIELD_R, y: FIELD_CY + (dy / d) * FIELD_R };
}

function runColor(runs) {
  return runs >= 6 ? "#e8b84b" : runs >= 4 ? "#4db3ff" : "#e0524a";
}

// Draw the current ball's shot line from the origin. There is only ONE line
// per ball: drawing again before the ball is logged replaces the previous one.
// On ball commit logBall() saves the endpoint onto the ball's row and wipes the
// wheel (via clearWagonLines), so only the current ball's line is ever shown.
function addWagonLine(x, y, color) {
  const svg = document.getElementById("wagon-overlay");
  if (!svg) return;
  if (state.pendingWagonLine) removeWagonLine(state.pendingWagonLine);
  const line = document.createElementNS(NS, "line");
  line.setAttribute("x1", FIELD_OX); line.setAttribute("y1", FIELD_OY);
  line.setAttribute("x2", x.toFixed(1)); line.setAttribute("y2", y.toFixed(1));
  line.setAttribute("class", "wagon-line");
  line.setAttribute("stroke", color);
  const dot = document.createElementNS(NS, "circle");
  dot.setAttribute("cx", x.toFixed(1)); dot.setAttribute("cy", y.toFixed(1));
  dot.setAttribute("r", "7"); dot.setAttribute("fill", color);
  svg.appendChild(line); svg.appendChild(dot);
  const entry = { x, y, color, line, dot };
  state.wagonLines.push(entry);
  state.pendingWagonLine = entry;
  state.lastWagon = { x, y };
}

function removeWagonLine(entry) {
  if (!entry) return;
  entry.line.remove(); entry.dot.remove();
  state.wagonLines = state.wagonLines.filter((l) => l !== entry);
}

function clearWagonLines() {
  state.wagonLines.forEach((l) => { l.line.remove(); l.dot.remove(); });
  state.wagonLines = [];
}

// ---- Review a past ball's saved inputs -----------------------------------
// Clicking a ball in the log re-draws that ball's stored wagon line + pitch
// dots on the maps for review. These are separate "review" elements that do
// NOT touch the live current-ball tracking, and are wiped as soon as a new ball
// is drawn/placed or logged.
function clearReview() {
  document.querySelectorAll("#wagon-overlay .review, #pitch-overlay-svg .review")
    .forEach((el) => el.remove());
}

function showBallInputs(index) {
  clearReview();
  const r = state.log[index];
  if (!r) return;

  // Restore the full coding context that was selected for this ball: bowl/shot
  // type (which also restores pace/style and the correct grid page), and the
  // BTN/UNC/WTB/RS + footwork tags. The wagon line and pitch dots are redrawn
  // below as review elements.
  if (r.bowl) applyBowlType(r.bowl); else { document.querySelectorAll("#bowl-grid .selected").forEach((x) => x.classList.remove("selected")); }
  if (r.shot) applyShotType(r.shot); else { document.querySelectorAll("#bat-grid .selected").forEach((x) => x.classList.remove("selected")); }
  state.tags = { btn: false, unc: false, wtb: false, rs: false, ...(r.tags || {}) };
  state.footwork = r.footwork || null;
  syncTagControls();

  const wsvg = document.getElementById("wagon-overlay");
  if (wsvg && r.wagon) {
    const color = runColor(Number(r.runs) || 0);
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", FIELD_OX); line.setAttribute("y1", FIELD_OY);
    line.setAttribute("x2", r.wagon.x); line.setAttribute("y2", r.wagon.y);
    line.setAttribute("class", "wagon-line review");
    line.setAttribute("stroke", color);
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", r.wagon.x); dot.setAttribute("cy", r.wagon.y);
    dot.setAttribute("r", "7"); dot.setAttribute("fill", color);
    dot.setAttribute("class", "wagon-dot review");
    wsvg.append(line, dot);
  }
  const psvg = document.getElementById("pitch-overlay-svg");
  if (psvg) (r.pitch || []).forEach((p) => addPitchDot(psvg, p.x, p.y, p.kind || "pitch", true));
}

function nearestWagonLine(x, y) {
  let best = null, bestD = Infinity;
  state.wagonLines.forEach((l) => {
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < bestD) { bestD = d; best = l; }
  });
  return bestD <= 12 ? best : null; // only if reasonably close to an endpoint
}

function wireFieldMap() {
  const wrap = document.getElementById("field-map-wrap");
  const svg = document.getElementById("wagon-overlay");
  const label = document.getElementById("wagon-region");
  if (!wrap || !svg) return;
  state.wagonLines = state.wagonLines || [];

  // Convert a screen point to the SVG's user space (native field pixels),
  // which correctly accounts for the meet-scaling / letterboxing of the image.
  const toPct = (e) => {
    const m = svg.getScreenCTM();
    if (!m) { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 642, y: (e.clientY - r.top) / r.height * 640 }; }
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const u = pt.matrixTransform(m.inverse());
    return { x: u.x, y: u.y };
  };
  const showRegion = (x, y) => { if (label) label.textContent = wagonRegion(x, y); };
  const hideRegionSoon = () => {
    if (!label) return;
    clearTimeout(label._t);
    label._t = setTimeout(() => { if (!drawing) label.textContent = ""; }, 1500);
  };

  let drawing = false;
  let preview = null; // { line, dot }
  let moved = false;

  function ensurePreview(color) {
    if (preview) return;
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", FIELD_OX); line.setAttribute("y1", FIELD_OY);
    line.setAttribute("class", "wagon-line preview");
    line.setAttribute("stroke", color);
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("r", "7"); dot.setAttribute("fill", color);
    dot.setAttribute("class", "wagon-dot preview");
    svg.appendChild(line); svg.appendChild(dot);
    preview = { line, dot };
  }
  function movePreview(x, y) {
    if (!preview) return;
    preview.line.setAttribute("x2", x.toFixed(1));
    preview.line.setAttribute("y2", y.toFixed(1));
    preview.dot.setAttribute("cx", x.toFixed(1));
    preview.dot.setAttribute("cy", y.toFixed(1));
  }
  function removePreview() {
    if (!preview) return;
    preview.line.remove(); preview.dot.remove(); preview = null;
  }

  // Hover (not drawing) just updates the region label.
  wrap.addEventListener("mousemove", (e) => {
    if (drawing) return;
    const p = clampToField(...posArgs(toPct(e)));
    showRegion(p.x, p.y);
  });
  wrap.addEventListener("mouseleave", hideRegionSoon);

  // Left button: draw with a live preview (click or press-drag).
  wrap.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    closeContextMenu();
    clearReview();        // leave review mode when drawing the live ball
    drawing = true; moved = false;
    const p = clampToField(...posArgs(toPct(e)));
    ensurePreview(runColor(state.pendingRuns || 0));
    movePreview(p.x, p.y);
    showRegion(p.x, p.y);
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    moved = true;
    const p = clampToField(...posArgs(toPct(e)));
    movePreview(p.x, p.y);
    showRegion(p.x, p.y);
  });
  window.addEventListener("mouseup", (e) => {
    if (!drawing) return;
    drawing = false;
    const p = clampToField(...posArgs(toPct(e)));
    removePreview();
    addWagonLine(p.x, p.y, runColor(state.pendingRuns || 0));
    showRegion(p.x, p.y);
    hideRegionSoon();
  });

  // Right button: context menu for managing the lines.
  wrap.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const p = clampToField(...posArgs(toPct(e)));
    openWagonMenu(e.clientX, e.clientY, p);
  });
}

// Small helper so clampToField(...) reads cleanly from a {x,y} object.
function posArgs(p) { return [p.x, p.y]; }

// ---- Wagon wheel context menu (right-click) -------------------------------
//
// Right-click cascades three levels (matching the reference):
//   1. Fielding POSITION for the region you clicked (e.g. Square Leg → Short
//      Leg / Square Leg / Deep Square Leg / Backward Square Leg / …)
//   2. Fielding EVENT (Caught, Fumble, Run Out Made, …)
//   3. FIELDER who made it.
// Picking a fielder records position + event + fielder for the shot.

function closeContextMenu() {
  document.getElementById("context-submenu")?.remove();
  document.getElementById("context-menu")?.remove();
  document.removeEventListener("mousedown", onDocDownForMenu, true);
}

function onDocDownForMenu(e) {
  if (e.target.closest("#context-menu") || e.target.closest("#context-submenu")) return;
  closeContextMenu();
}

function recordFieldingEvent(position, event, fielder, p) {
  state.fieldingEvents = state.fieldingEvents || [];
  state.fieldingEvents.push({ position, event, fielder, x: p?.x, y: p?.y, ball: state.log.length });
  const label = document.getElementById("wagon-region");
  if (label) {
    label.textContent = `${position} · ${event} · ${fielder}`;
    clearTimeout(label._t);
    label._t = setTimeout(() => { label.textContent = ""; }, 2600);
  }
}

// Generic flyout positioned beside its parent item (opens left near the edge).
function placeFlyout(sub, item) {
  document.body.appendChild(sub);
  const ir = item.getBoundingClientRect();
  const sr = sub.getBoundingClientRect();
  let x = ir.right - 2;
  if (x + sr.width > window.innerWidth - 8) x = ir.left - sr.width + 2;
  const y = Math.min(ir.top, window.innerHeight - sr.height - 8);
  // x/y are window-space; the menu lives inside the scaled <body>, so map them
  // into design space (no-op when the scale-to-fit stage isn't active).
  const d = window.stageFromWindow
    ? window.stageFromWindow(Math.max(8, x), Math.max(8, y))
    : { x: Math.max(8, x), y: Math.max(8, y) };
  sub.style.left = `${d.x}px`;
  sub.style.top = `${d.y}px`;
}

// Level 3: fielders for a chosen position + event.
function openFielderSubmenu(item, position, event, p) {
  document.getElementById("context-submenu")?.remove();
  item.parentElement.querySelectorAll(".ctx-item.active").forEach((x) => x.classList.remove("active"));
  item.classList.add("active");

  const sub = document.createElement("div");
  sub.id = "context-submenu";
  sub.className = "context-menu submenu";
  FIELDERS.forEach((f) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ctx-item";
    b.textContent = f;
    b.addEventListener("click", () => { recordFieldingEvent(position, event, f, p); closeContextMenu(); });
    sub.appendChild(b);
  });
  placeFlyout(sub, item);
}

// Level 2: fielding events (the menu cascades into the fielder submenu).
function openFieldingEventsMenu(clientX, clientY, p, position) {
  closeContextMenu();
  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.className = "context-menu fielding-menu";
  FIELDING_EVENTS.forEach((ev) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ctx-item has-sub";
    item.innerHTML = `<span class="ctx-label">${ev}</span><span class="ctx-arrow">&#8250;</span>`;
    item.addEventListener("mouseenter", () => openFielderSubmenu(item, position, ev, p));
    item.addEventListener("click", () => openFielderSubmenu(item, position, ev, p));
    menu.appendChild(item);
  });
  positionMenu(menu, clientX, clientY);
  setTimeout(() => document.addEventListener("mousedown", onDocDownForMenu, true), 0);
}

// Level 1: fielding positions for the clicked region.
function openWagonMenu(clientX, clientY, p) {
  closeContextMenu();
  const region = wagonRegion(p.x, p.y);
  const positions = WAGON_POSITIONS[region] || WAGON_REGIONS.map((r) => r.replace(/\b\w/g, (c) => c.toUpperCase()));
  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.className = "context-menu fielding-menu";
  positions.forEach((pos) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ctx-item has-sub";
    item.innerHTML = `<span class="ctx-label">${pos}</span><span class="ctx-arrow">&#8250;</span>`;
    item.addEventListener("click", () => openFieldingEventsMenu(clientX, clientY, p, pos));
    menu.appendChild(item);
  });
  positionMenu(menu, clientX, clientY);
  setTimeout(() => document.addEventListener("mousedown", onDocDownForMenu, true), 0);
}

// Place a freshly-built root menu on screen, flipping up/left near the edges.
function positionMenu(menu, clientX, clientY) {
  document.body.appendChild(menu);
  const r = menu.getBoundingClientRect();
  let x = clientX, y = clientY;
  if (x + r.width > window.innerWidth - 8) x = clientX - r.width;
  if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
  // Map window-space coords into the scaled <body>'s design space.
  const d = window.stageFromWindow
    ? window.stageFromWindow(Math.max(8, x), Math.max(8, y))
    : { x: Math.max(8, x), y: Math.max(8, y) };
  menu.style.left = `${d.x}px`;
  menu.style.top = `${d.y}px`;
}

// ---- Keypad / scoring -----------------------------------------------------

function handleKeypad(k, btn) {
  if (k.type === "shift") {
    // ▲ shifts the run values (4-8) in the first two columns
    state.keypadShifted = !state.keypadShifted;
    fillKeypad();
    return;
  }
  if (k.type === "rbw") {
    // RBW is an external parameter: arm/disarm the flag for the next ball. It
    // adds no runs — it is just recorded against the ball when logged.
    state.rbw = !state.rbw;
    fillKeypad();
    flash(btn);
    return;
  }
  if (k.type === "mark") {
    // Flag the most recently entered ball for later editing (toggles), and
    // persist it on the ball entry so marked balls can be reviewed afterwards.
    const last = state.log[state.log.length - 1];
    if (!last) { toast("No ball to mark yet"); return; }
    last.marked = !last.marked;
    btn.classList.toggle("marked", last.marked);
    toast(last.marked ? `Ball ${last.num} marked for edit` : `Ball ${last.num} unmarked`);
    render();
    return;
  }
  if (k.type === "run") {
    // When RBW is armed, the dialpad number is captured as RBW external data
    // (no wicket, no extra runs — the runs still score as a normal delivery).
    stageDelivery({ runs: k.val, ext: 0, boundary: k.boundary, legal: true, rbw: state.rbw ? k.val : 0 },
      { type: "run", val: k.val });
  } else if (k.type === "ext") {
    handleExtra(k.ext);
  }
  flash(btn);
}

function handleExtra(ext) {
  // NB / WD = 1 extra run (default, editable via the ball-edit overlay; a no-ball
  //           may also go for a boundary), ball is NOT legal (re-bowled).
  // LB / B  = bye runs (default 1, editable), ball IS legal and counts.
  if (ext === "NB" || ext === "WD") {
    stageDelivery({ runs: 0, ext: 1, extLabel: ext, legal: false }, { type: "ext", ext });
  } else if (ext === "LB" || ext === "B") {
    stageDelivery({ runs: 0, ext: 1, extLabel: ext, legal: true, bye: true }, { type: "ext", ext });
  }
}

// Stage (queue) the current ball's data without committing. The ball is only
// written to the log when "End Ball" is pressed (see commitBall). `params` are
// merged so runs, extras, overthrow, wicket etc. accumulate for the one ball;
// `keyMark` (optional) highlights the matching keypad key until commit.
function stageDelivery(params, keyMark) {
  if (!ballInputAllowed()) return; // over + ball must be started first
  state.pending = { ...(state.pending || { runs: 0, ext: 0, legal: true }), ...params };
  // keep the wagon-line colour in sync with the staged run value
  if (typeof params.runs === "number") state.pendingRuns = params.runs;
  if (keyMark) { state.staged = keyMark; fillKeypad(); }
  setBallButton("End Ball ✓"); // signal a delivery is queued for this ball
}

// Commit the staged delivery (or a dot ball if nothing was entered) to the log.
function commitBall() {
  const p = state.pending || { runs: 0, ext: 0, legal: true };
  logBall(p); // logBall resets ballStarted, pending, staged and the button label
}

function shortName(name) {
  return (name || "").split(" ").slice(0, 2).join(" ");
}

function logBall({ runs = 0, ext = 0, boundary = false, legal = true, bye = false, wicket = false, extLabel = "", overthrow = 0, rbw = 0 }) {
  if (!ballInputAllowed()) return; // over + ball must be started first
  pushHistory();

  const ballNum = legal ? `${state.over}.${state.ball + 1}` : `${state.over}.${state.ball + 1}+`;
  // Over-throw is an external parameter: it is recorded against the ball for
  // analysis but does NOT add to the score (see below), so it only annotates
  // the extras column.
  const otLabel = overthrow ? `OT${overthrow}` : "";
  const extCol = extLabel ? `${extLabel}${ext > 1 ? ext : ""}${otLabel}` : (otLabel || ext);
  state.log.push(row(
    ballNum,
    shortName(state.bowler),
    shortName(state.striker),
    shortName(state.nonStriker),
    state.bowlType || "",
    state.shotType || "",
    runs,
    extCol,
  ));

  // record this ball's wagon-wheel + pitch-map inputs onto its row (the drawings
  // are wiped from the display below, but the data persists with the ball)
  const logged = state.log[state.log.length - 1];
  logged.wagon = state.lastWagon ? { ...state.lastWagon } : null;
  logged.pitch = (state.pitchInputs || []).slice();
  // also persist the coding context so the ball can be fully reviewed later
  logged.tags = { ...state.tags };
  logged.footwork = state.footwork;
  logged.overthrow = overthrow;
  // RBW: external data only — no wicket, no added runs. Its value is the dialpad
  // number entered for this ball (when armed), otherwise 0.
  logged.rbw = rbw;
  logged.pace = state.pace;
  logged.style = state.style;

  // team score (never let a negative run-out adjustment push the total below 0)
  state.runs = Math.max(0, state.runs + runs + ext);

  // batter credit (byes/extras don't credit the batter; never credit negatives)
  if (!bye && legal) {
    const s = state.bat.striker;
    s.runs += Math.max(0, runs);
    s.balls += 1;
    if (boundary && runs === 4) s.fours += 1;
    if (boundary && runs === 6) s.sixes += 1;
  } else if (legal) {
    state.bat.striker.balls += 1; // legal bye still a ball faced
  }

  // bowler figures (concedes everything except byes/leg-byes; run-outs not negative)
  state.bowl.runs += Math.max(0, runs) + (bye ? 0 : ext);
  if (legal) state.bowl.balls += 1;

  // over running tally
  const tally = legal ? (bye ? `${runs || 1}b` : String(runs)) : `${extLabel}`;
  state.thisOver.push(tally);
  state.overRunsThisOver += runs + ext;

  if (wicket) {
    state.wkts += 1;
    state.bowl.wkts += 1;
    if (state.wkts < 10) newBatsman(); // 10th wicket = all out (no new batter)
  }

  const allOut = state.wkts >= 10;

  if (legal && !allOut) {
    state.ball += 1;
    if (runs % 2 === 1) swapStrike();
    if (state.ball >= 6) completeOver();
  } else if (!allOut) {
    // no-ball / wide: same striker, odd runs off the bat still rotate
    if (runs % 2 === 1) swapStrike();
  }

  // ball ended: wipe this ball's wagon line + pitch dots (already saved above),
  // then require Start Ball for the next delivery
  clearWagonLines();
  state.pendingWagonLine = null;
  state.lastWagon = null;
  clearPitchDots();
  clearReview();
  state.ballStarted = false;
  state.pending = null;
  state.staged = null;
  setBallButton("Start Ball");

  state.pendingRuns = 0;
  state.bowlType = null; state.shotType = null;
  state.tags = { btn: false, unc: false, wtb: false, rs: false };
  state.footwork = null;
  state.rbw = false; // external param disarms after the ball
  fillKeypad();      // refresh the RBW highlight
  syncTagControls(); // clear the tag bar for the next ball
  document.querySelectorAll("#bowl-grid .selected, #bat-grid .selected").forEach((x) => x.classList.remove("selected"));
  document.querySelector("#keypad .keypad-btn.marked")?.classList.remove("marked"); // new ball starts unmarked
  render();

  if (allOut) endInnings();
}

function swapStrike() {
  [state.striker, state.nonStriker] = [state.nonStriker, state.striker];
  [state.bat.striker, state.bat.nonStriker] = [state.bat.nonStriker, state.bat.striker];
}

function newBatsman() {
  const used = new Set([state.striker, state.nonStriker]);
  const next = CANADA.find((p) => !used.has(p)) || "NEW BATSMAN";
  state.striker = next;
  state.bat.striker = { runs: 0, balls: 0, fours: 0, sixes: 0 };
}

function completeOver() {
  state.over += 1;
  state.ball = 0;
  state.overRunsThisOver = 0;
  state.thisOver = [];
  swapStrike();
  state.bowlEnd = state.bowlEnd === "FAR END" ? "NEAR END" : "FAR END";
  // rotate bowler
  const idx = OMAN_BOWLERS.indexOf(state.bowler.split(" -")[0]);
  const nb = OMAN_BOWLERS[(idx + 1) % OMAN_BOWLERS.length] || state.bowler;
  state.bowler = `${nb} -OS`;
  state.bowl = { spell: state.bowl.spell + 1, balls: 0, runs: 0, mdns: 0, wkts: 0 };
  // a fresh over must be started, and each ball within it
  state.overStarted = false;
  state.ballStarted = false;
  setOverButton("Start Over");
  setBallButton("Start Ball");
}

// ---- Innings change (all out at 10 wickets) -------------------------------

function endInnings() {
  if (state.matchOver) return;
  if (state.innings >= 2) {       // second innings finished → match over
    state.matchOver = true;
    openOverlay(popupShell("MATCH COMPLETE",
      `<div class="confirm-box"><p>Both innings complete.</p>
       <div class="btn-row-modal center"><button class="m-btn m-green" data-close>OK</button></div></div>`));
    return;
  }

  state.innings = 2;

  if (state.battingTeam && state.bowlingTeam) {
    // proper swap using the loaded playing XIs
    [state.battingTeam, state.bowlingTeam] = [state.bowlingTeam, state.battingTeam];
    const A = state.battingTeam, B = state.bowlingTeam;
    state.battingCode = A.code;
    state.teamA = A.code; state.teamB = B.code;
    CANADA = namesOf(A.playingXIPlayers);
    const pool = (B.playingXIPlayers || []).filter((p) => p.bowlingType);
    OMAN_BOWLERS = namesOf(pool.length ? pool : B.playingXIPlayers);
    FIELDERS = namesOf(B.playingXIPlayers);
    const xi = A.playingXIPlayers || [];
    state.striker = (xi[0] && xi[0].name.toUpperCase()) || "BATSMAN 1";
    state.nonStriker = (xi[1] && xi[1].name.toUpperCase()) || "BATSMAN 2";
    const fb = (B.playingXIPlayers || []).find((p) => p.bowlingType) || (B.playingXIPlayers || [])[0];
    state.bowler = bowlerLabel(fb) || "BOWLER";
  } else {
    // standalone demo fallback: swap roles/codes and the player pools
    [state.teamA, state.teamB] = [state.teamB, state.teamA];
    [CANADA, OMAN_BOWLERS] = [OMAN_BOWLERS, CANADA];
    FIELDERS = OMAN_BOWLERS;
    state.battingCode = state.teamA;
    state.striker = CANADA[0] || "BATSMAN 1";
    state.nonStriker = CANADA[1] || "BATSMAN 2";
    state.bowler = `${OMAN_BOWLERS[0] || "BOWLER"} -OS`;
  }

  // reset the scoreboard for the new innings
  state.runs = 0; state.wkts = 0; state.over = 0; state.ball = 0;
  state.bat = {
    striker: { runs: 0, balls: 0, fours: 0, sixes: 0 },
    nonStriker: { runs: 0, balls: 0, fours: 0, sixes: 0 },
  };
  state.bowl = { spell: 1, balls: 0, runs: 0, mdns: 0, wkts: 0 };
  state.log = []; state.overRunsThisOver = 0; state.thisOver = []; state.history = [];
  state.bowlEnd = "FAR END";
  state.overStarted = false; state.ballStarted = false;
  setOverButton("Start Over"); setBallButton("Start Ball");
  clearWagonLines(); state.pendingWagonLine = null; state.lastWagon = null;
  clearPitchDots();
  renderBowlGrid(); renderBatGrid();
  render();

  // Before the 2nd innings begins, collect the opening striker / non-striker /
  // bowler and the bowling end for the newly-batting side.
  overlayInningsDetails();
}

// The "Innings Details" screen shown at the start of the 2nd innings. Defaults
// are pre-filled from the swapped playing XIs (set in endInnings); the scorer
// can adjust before pressing Start Innings.
function overlayInningsDetails() {
  const sel = (id, opts, cur) =>
    `<select class="f-select" id="${id}">${["Select", ...opts].map((o) =>
      `<option ${o === cur ? "selected" : ""}>${o}</option>`).join("")}</select>`;
  const body = `
    <div class="innings-details">
      <label class="f-row"><span class="f-label">Team</span><input class="f-input" value="${state.battingCode}" disabled/></label>
      <label class="f-row"><span class="f-label">Striker</span>${sel("id-striker", CANADA, state.striker)}</label>
      <label class="f-row"><span class="f-label">Non Striker</span>${sel("id-nonstriker", CANADA, state.nonStriker)}</label>
      <label class="f-row"><span class="f-label">Bowler</span>${sel("id-bowler", OMAN_BOWLERS, state.bowler)}</label>
      <div class="seg-row"><span class="f-label">Bowling End</span>
        <label class="ck"><input type="radio" name="id-end" value="NEAR END" checked/> NEAR END</label>
        <label class="ck"><input type="radio" name="id-end" value="FAR END"/> FAR END</label>
      </div>
      <div class="btn-row-modal center"><button class="m-btn m-green" id="id-start">Start Innings</button></div>
    </div>`;
  openOverlay(popupShell("INNINGS DETAILS", body));
  document.getElementById("id-start")?.addEventListener("click", () => {
    const pick = (id) => document.getElementById(id)?.value;
    const s = pick("id-striker"), ns = pick("id-nonstriker"), bw = pick("id-bowler");
    if (s && s !== "Select") state.striker = s;
    if (ns && ns !== "Select") state.nonStriker = ns;
    if (bw && bw !== "Select") state.bowler = bw;
    state.bowlEnd = (document.querySelector('input[name="id-end"]:checked') || {}).value || "NEAR END";
    closeOverlay();
    render();
  });
}

// ---- Undo -----------------------------------------------------------------

function pushHistory() {
  state.history.push(JSON.stringify({
    runs: state.runs, wkts: state.wkts, over: state.over, ball: state.ball,
    striker: state.striker, nonStriker: state.nonStriker, bowler: state.bowler,
    bowlEnd: state.bowlEnd, bat: state.bat, bowl: state.bowl, log: state.log,
    overRunsThisOver: state.overRunsThisOver, thisOver: state.thisOver,
    // capture the over/ball gate flags too, so undoing across an over boundary
    // restores the button state instead of leaving it stale (see undo()).
    overStarted: state.overStarted, ballStarted: state.ballStarted,
  }));
  if (state.history.length > 60) state.history.shift();
}

function undo() {
  const prev = state.history.pop();
  // Nothing to undo: flash the button so the click always gives feedback rather
  // than silently doing nothing (which reads as "the button isn't working").
  if (!prev) { flash(document.getElementById("btn-undo")); return; }
  Object.assign(state, JSON.parse(prev));
  // Undo discards any half-staged delivery for the restored ball.
  state.pending = null;
  state.staged = null;
  // Re-sync the Over/Ball buttons to the restored flags; undo can cross an over
  // boundary (a completed 6th ball reset them) so the labels must follow.
  setOverButton(state.overStarted ? "End Over" : "Start Over");
  setBallButton(state.ballStarted ? "End Ball" : "Start Ball");
  fillKeypad();
  render();
}

// ---- Render ---------------------------------------------------------------

function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }

function render() {
  setText("bat-team-code", state.battingCode);
  setText("team-a-label", state.teamA);
  setText("team-b-label", state.teamB);
  setText("score-main", `${state.runs}/${state.wkts}`);
  setText("overs-value", `${state.over}.${state.ball}`);
  const oversFloat = state.over + state.ball / 6;
  const rr = oversFloat > 0 ? (state.runs / oversFloat).toFixed(2) : "0.00";
  setText("runrate-value", rr);
  setText("name-striker", state.striker);
  setText("name-nonstriker", state.nonStriker);
  setText("name-bowlend", state.bowlEnd);
  setText("name-bowler", state.bowler);

  // batting stats
  const sb = state.bat.striker, nb = state.bat.nonStriker;
  applyBat("striker", sb);
  applyBat("nonstriker", nb);

  // bowler figures
  setBowl("spell", state.bowl.spell);
  setBowl("overs", `${Math.floor(state.bowl.balls / 6)}.${state.bowl.balls % 6}`);
  setBowl("runs", state.bowl.runs);
  setBowl("mdns", state.bowl.mdns);
  setBowl("wkts", state.bowl.wkts);
  const bo = state.bowl.balls / 6;
  setBowl("eco", bo > 0 ? (state.bowl.runs / bo).toFixed(2) : "0.00");

  // this-over chips: one circle per ball of the current over, latest highlighted
  const to = document.getElementById("this-over");
  if (to) {
    const last = state.thisOver.length - 1;
    to.innerHTML = state.thisOver.map((t, i) => {
      const w = t === "W"; const four = t === "4"; const six = t === "6";
      const cls = w ? "chip-w" : six ? "chip-6" : four ? "chip-4" : "";
      const cur = i === last ? " current" : "";
      return `<span class="over-chip ${cls}${cur}">${t}</span>`;
    }).join("");
  }

  renderLog();
  scheduleSave();
}

function applyBat(who, s) {
  const sr = s.balls > 0 ? ((s.runs / s.balls) * 100).toFixed(2) : "0.0";
  document.querySelectorAll(`[data-bat="${who}"]`).forEach((cell) => {
    const k = cell.getAttribute("data-k");
    if (k === "runs") cell.textContent = s.runs;
    else if (k === "balls") cell.textContent = s.balls;
    else if (k === "fours") cell.textContent = s.fours;
    else if (k === "sixes") cell.textContent = s.sixes;
    else if (k === "sr") cell.textContent = sr;
    else if (k === "ps") cell.textContent = who === "nonstriker" ? `(${s.runs})` : (state.bat.striker.runs + state.bat.nonStriker.runs);
  });
}

function setBowl(k, v) {
  const el = document.querySelector(`[data-bowl="${k}"]`);
  if (el) el.textContent = v;
}

function renderLog() {
  const body = document.getElementById("ball-log-body");
  if (!body) return;
  const start = Math.max(0, state.log.length - 30);
  body.innerHTML = state.log.slice(start).map((r, i) => `
    <tr data-index="${start + i}" class="${r.marked ? "marked-ball" : ""}" title="${r.marked ? "Marked for edit — " : ""}Double-click to edit this ball">
      <td>${r.marked ? '<span class="mark-flag" title="Marked for edit">⚑</span>' : ""}${r.num}</td>
      <td>${r.bowler}</td><td>${r.striker}</td><td>${r.nonstr}</td>
      <td>${r.bowl}</td><td>${r.shot}</td><td>${r.runs}</td><td>${r.ext}</td>
    </tr>`).join("");
  const wrap = body.closest(".table-wrap");
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
}

// ---- Button state machine -------------------------------------------------

function setOverButton(label) {
  const b = document.getElementById("btn-over");
  if (!b) return;
  b.textContent = label;
  b.classList.toggle("red", label === "End Over");
  b.classList.toggle("teal", label !== "End Over");
}

function setBallButton(label) {
  const b = document.getElementById("btn-ball");
  if (!b) return;
  b.textContent = label;
  const ending = label.startsWith("End Ball");
  b.classList.toggle("red", ending);
  b.classList.toggle("teal", !ending);
}

// A ball may only be entered once its over and the ball itself are started.
// Flashes the button that still needs pressing, and returns false to block.
function ballInputAllowed() {
  if (state.matchOver) return false;
  if (!state.overStarted) { flash(document.getElementById("btn-over")); return false; }
  if (!state.ballStarted) { flash(document.getElementById("btn-ball")); return false; }
  return true;
}

function wireActionButtons() {
  const over = document.getElementById("btn-over");
  const ball = document.getElementById("btn-ball");
  const undoBtn = document.getElementById("btn-undo");

  over?.addEventListener("click", () => {
    if (!state.overStarted) {
      state.overStarted = true;
      setOverButton("End Over");
    } else {
      // End Over is just a marker — it must NOT skip the over or reset the ball
      // count. The over advances on its own when the 6th legal ball is bowled
      // (see logBall). Toggling here simply closes the marker so the over can be
      // continued from where the ball left off (re-click Start Over to resume).
      state.overStarted = false;
      state.ballStarted = false;
      state.pending = null;
      state.staged = null;
      setOverButton("Start Over");
      setBallButton("Start Ball");
      fillKeypad();
    }
  });

  ball?.addEventListener("click", () => {
    if (!state.overStarted) { flash(over); return; }   // start the over first
    if (!state.ballStarted) {
      // Start the ball — begin staging a fresh delivery.
      state.ballStarted = true;
      state.pending = null;
      state.staged = null;
      setBallButton("End Ball");
      fillKeypad();
    } else {
      // End Ball — commit whatever was staged (a dot ball if nothing entered).
      commitBall();
    }
  });

  undoBtn?.addEventListener("click", undo);
  document.getElementById("swap-bat")?.addEventListener("click", () => { swapStrike(); render(); });
  wireOverthrow();
}

// Over-throw: the button toggles a 1–12 run picker. Numbers are laid out
// column-major (1-4 / 5-8 / 9-12) to match the reference keypad, so the grid
// is filled row by row as 1,5,9 · 2,6,10 · 3,7,11 · 4,8,12.
function wireOverthrow() {
  const btn = document.getElementById("overthrow-btn");
  const grid = document.getElementById("overthrow-grid");
  if (!btn || !grid) return;

  const order = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) order.push(col * 4 + row + 1);
  }
  grid.innerHTML = order
    .map((n) => `<button type="button" class="overthrow-btn" data-ot="${n}">${n}</button>`)
    .join("");

  const keypad = document.getElementById("keypad");
  const setOpen = (open) => {
    grid.hidden = !open;
    if (keypad) keypad.hidden = open; // overthrow picker takes the keypad's place
    btn.classList.toggle("active", open);
    btn.setAttribute("aria-expanded", String(open));
  };

  btn.addEventListener("click", () => setOpen(grid.hidden));

  grid.querySelectorAll("[data-ot]").forEach((b) => {
    b.addEventListener("click", () => {
      // Over-throw is an external parameter — it is recorded against the ball
      // but does NOT add runs to the score (the delivery's runs are entered on
      // the keypad as usual). Staged onto the current ball, committed on End Ball.
      const overthrow = Number(b.getAttribute("data-ot")) || 0;
      stageDelivery({ overthrow });
      flash(b);
      setOpen(false);
    });
  });
}

function flash(el) {
  if (!el) return;
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 160);
}

// Brief bottom-center notification (self-contained; no dependency on prototype.js)
function toast(msg) {
  document.querySelector(".cap-toast")?.remove();
  const el = document.createElement("div");
  el.className = "cap-toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

// ===========================================================================
// Overlay / modal system
// ===========================================================================

const overlayRoot = () => document.getElementById("overlay-root");

function openOverlay(html) {
  const root = overlayRoot();
  root.innerHTML = html;
  root.hidden = false;
  root.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeOverlay));
  root.addEventListener("mousedown", (e) => { if (e.target === root) closeOverlay(); }, { once: true });
}
function closeOverlay() {
  const root = overlayRoot();
  root.hidden = true;
  root.innerHTML = "";
}

function clockNow() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function moduleShell(title, navHtml, bodyHtml) {
  return `
    <div class="me-screen">
      <div class="me-topbar">
        <button class="me-back" data-close>&larr;</button>
        <div class="me-title">${title}</div>
        <div class="me-clock">${clockNow()}<button class="me-x" data-close>✕</button></div>
      </div>
      <div class="me-layout">
        ${navHtml}
        <div class="me-content">${bodyHtml}</div>
      </div>
    </div>`;
}

function popupShell(title, bodyHtml, wide = false) {
  return `
    <div class="popup ${wide ? "popup-wide" : ""}">
      <div class="popup-head"><span>${title}</span><button class="popup-x" data-close>✕</button></div>
      <div class="popup-body">${bodyHtml}</div>
    </div>`;
}

function selectEl(label, options, value = "Select") {
  const opts = [value, ...options].map((o) => `<option>${o}</option>`).join("");
  return `<label class="f-row"><span class="f-label">${label}</span><select class="f-select">${opts}</select></label>`;
}

// ---- Appeals --------------------------------------------------------------

function overlayAppeals() {
  const body = `
    <div class="grid-2">
      ${selectEl("Appeal Against", [state.striker, state.nonStriker])}
      ${selectEl("Appeal Type", ["Caught Behind", "LBW", "Run Out", "Stumped", "Bat Pad", "Caught"]) }
      ${selectEl("Bowler", OMAN_BOWLERS)}
      ${selectEl("Fielder", FIELDERS)}
    </div>
    <div class="seg-row">
      <span class="f-label">Decision</span>
      <div class="seg"><button class="seg-btn active">OUT</button><button class="seg-btn">NOT OUT</button><button class="seg-btn">UMPIRES CALL</button><button class="seg-btn">DRS</button></div>
    </div>
    <label class="f-row"><span class="f-label">Comments</span><textarea class="f-textarea" placeholder="Comments"></textarea></label>
    <div class="btn-row-modal">
      <button class="m-btn m-green" data-close>Save</button>
      <button class="m-btn m-yellow" data-close>Clear</button>
    </div>`;
  openOverlay(popupShell("APPEALS", body));
  wireSeg();
}

// ---- Fielding Events (two-column menu) ------------------------------------

function overlayFielding() {
  const fielders = FIELDERS.map((f) => `<button class="menu-item" data-fielder>${f}</button>`).join("");
  const events = FIELDING_EVENTS.map((e) => `<button class="menu-item" data-event>${e} <span class="menu-arrow">›</span></button>`).join("");
  const body = `
    <div class="fielding-cols">
      <div class="menu-col"><div class="menu-col-head">Fielder</div>${fielders}</div>
      <div class="menu-col"><div class="menu-col-head">Event</div>${events}</div>
    </div>
    <div class="fielding-picked" id="fielding-picked">Select a fielder and an event…</div>
    <div class="btn-row-modal"><button class="m-btn m-green" data-close>Save</button></div>`;
  openOverlay(popupShell("FIELDING EVENTS", body, true));
  const root = overlayRoot();
  let picked = { fielder: null, event: null };
  const update = () => {
    document.getElementById("fielding-picked").textContent =
      `${picked.fielder || "—"}  ·  ${picked.event || "—"}`;
  };
  root.querySelectorAll("[data-fielder]").forEach((b) => b.addEventListener("click", () => {
    root.querySelectorAll("[data-fielder]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active"); picked.fielder = b.textContent.trim(); update();
  }));
  root.querySelectorAll("[data-event]").forEach((b) => b.addEventListener("click", () => {
    root.querySelectorAll("[data-event]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active"); picked.event = b.textContent.replace("›", "").trim(); update();
  }));
}

// ---- Remarks --------------------------------------------------------------

function overlayRemarks() {
  const body = `
    ${selectEl("Remark Type", ["Tactical", "Coaching Point", "Injury", "Pitch", "Weather", "DRS", "General"]) }
    <label class="f-row"><span class="f-label">Remarks</span><textarea class="f-textarea tall" placeholder="Type remark for this ball / over…"></textarea></label>
    <div class="btn-row-modal"><button class="m-btn m-green" data-close>Save</button><button class="m-btn m-yellow" data-close>Clear</button></div>`;
  openOverlay(popupShell("REMARKS", body));
}

// ---- Penalty --------------------------------------------------------------

function overlayPenalty() {
  const body = `
    <div class="seg-row center"><div class="seg"><button class="seg-btn active">Batting</button><button class="seg-btn">Bowling</button></div></div>
    <div class="penalty-list">
      ${["Player returning without permission, comes in contact with the ball while in play",
         "Fielding the ball, willfully fielding it otherwise",
         "The ball when in play strikes the helmet of fielding side kept on the ground within the field of play",
         "Changing balls condition",
         "Deliberate attempt to distract striker — Ball not count as one of the over",
         "Deliberate distraction or obstruction of batsman — Ball shall not count as one of the over",
         "Time wasting by fielding side","Fielder damaging the pitch"].map((p)=>`<div class="penalty-row"><label class="ck"><input type="checkbox"/></label> ${p}</div>`).join("")}
    </div>
    <div class="btn-row-modal center"><button class="m-btn m-green" data-close>Save</button><button class="m-btn m-yellow" data-close>Clear</button></div>`;
  openOverlay(popupShell("PENALTY", body));
  wireSeg();
}

// ---- Wickets --------------------------------------------------------------

function overlayWickets() {
  const dis = DISMISSALS.map((d) => `<button class="pill-btn" data-dismiss>${d}</button>`).join("");
  const body = `
    <div class="pill-grid">${dis}</div>
    ${selectEl("Batsman Out", [state.striker, state.nonStriker])}
    ${selectEl("Fielder", FIELDERS)}
    ${selectEl("Bowler", OMAN_BOWLERS)}
    <label class="f-row"><span class="f-label">Wicket No</span><input class="f-input" value="${state.wkts + 1}" /></label>
    <div class="btn-row-modal">
      <button class="m-btn m-green" id="wkt-save">Save Wicket</button>
      <button class="m-btn m-red" data-close>Delete</button>
    </div>`;
  openOverlay(popupShell("WICKETS", body));
  const root = overlayRoot();
  root.querySelectorAll("[data-dismiss]").forEach((b) => b.addEventListener("click", () => {
    root.querySelectorAll("[data-dismiss]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
  }));
  document.getElementById("wkt-save")?.addEventListener("click", () => {
    closeOverlay();
    // Stage the wicket onto the current ball; it commits when End Ball is pressed
    // (so any runs on the same delivery, e.g. a run-out, can still be entered).
    if (!state.ballStarted) { flash(document.getElementById("btn-ball")); toast("Start the ball first"); return; }
    stageDelivery({ wicket: true });
    toast("Wicket staged — press End Ball to confirm");
  });
}

// ---- Umpire / Bowling Compute ---------------------------------------------

function overlayUmpire(name) {
  const body = `
    <div class="umpire-card">
      <div class="umpire-avatar">${(name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
      <div class="umpire-name">${name}</div>
      <div class="umpire-meta">On-field Umpire</div>
    </div>
    <div class="grid-2">
      ${selectEl("Decision", ["OUT", "NOT OUT", "Wide", "No Ball", "Bye", "Leg Bye"]) }
      ${selectEl("Signal", ["Boundary 4", "Boundary 6", "Dead Ball", "Free Hit", "Short Run"]) }
    </div>
    <div class="btn-row-modal"><button class="m-btn m-green" data-close>Confirm</button></div>`;
  openOverlay(popupShell("UMPIRE DECISION", body));
}

function overlayBowlCompute() {
  const rows = OMAN_BOWLERS.map((b, i) => {
    const ov = (Math.random() * 4 + 0.2).toFixed(1);
    const rn = Math.floor(Math.random() * 30 + 4);
    const wk = Math.floor(Math.random() * 3);
    const eco = (rn / (parseFloat(ov) || 1)).toFixed(2);
    return `<tr><td>${b}</td><td>${ov}</td><td>${rn}</td><td>${wk}</td><td>${eco}</td><td>${(Math.random()*140+110).toFixed(0)} kph</td></tr>`;
  }).join("");
  const body = `
    <table class="data-table">
      <thead><tr><th>Bowler</th><th>Overs</th><th>Runs</th><th>Wkts</th><th>Econ</th><th>Avg Speed</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  openOverlay(popupShell("BOWLING COMPUTE", body, true));
}

// ---- Over Comparison ------------------------------------------------------

function overlayOverComp() {
  let r1 = 0;
  const rows = [];
  for (let o = 1; o <= Math.max(state.over, 6); o++) {
    const got = Math.floor(Math.random() * 14 + 2);
    r1 += got;
    const bowler = OMAN_BOWLERS[(o - 1) % OMAN_BOWLERS.length];
    rows.push(`<tr>
      <td>${o}</td><td>${bowler}</td><td>${r1}/${Math.floor(o/4)}</td><td>${got}</td>
      <td>${(r1 / o).toFixed(2)}</td><td>${(r1 / Math.min(o,5) ).toFixed(2)}</td>
      <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`);
  }
  const body = `
    <table class="data-table over-comp">
      <thead><tr>
        <th>Over</th><th>1st Inns Bowler</th><th>1st Inns Score</th><th>1st Inns Runs</th>
        <th>1st Inns RR</th><th>1st RR/5</th><th>2nd Inns Bowler</th><th>2nd Inns Score</th>
        <th>2nd Inns Runs</th><th>2nd Inns RR</th><th>2nd RR/5</th>
        <th>Rate Req.</th><th>Runs Req.</th><th>Balls Rem.</th>
      </tr></thead>
      <tbody>${rows.join("")}</tbody>
    </table>`;
  openOverlay(popupShell("OVER COMPARISION", body, true));
}

// ---- Scorecard / Match Report ---------------------------------------------

function overlayScorecard() {
  const bat = [
    ["SAAD BIN ZAFAR", "NOT OUT", 24, 12, "200.00", 7, 1, 3, 0, 0, 1, "2.18", "8.33"],
    ["RAVINDERPAL SINGH", "C MOHAMMAD NADEEM B JITEN RAMANANDI", 33, 17, "194.12", 5, 3, 0, 3, 1, 4, "2.54", "23.53"],
    ["KANWARPAL TATHGUR", "NOT OUT", 5, 2, "250.00", 1, 0, 0, 1, 0, 0, "2.50", "0.00"],
  ];
  const batRows = bat.map((b) => `<tr>
      <td class="ta-l">${b[0]}</td><td class="ta-l muted">${b[1]}</td>
      <td>${b[2]}</td><td>${b[3]}</td><td>${b[4]}</td><td>${b[5]}</td><td>${b[6]}</td>
      <td>${b[7]}</td><td>${b[8]}</td><td>${b[9]}</td><td>${b[10]}</td><td>${b[11]}</td><td>${b[12]}</td>
    </tr>`).join("");

  const bowl = [
    ["SHAH FAISAL", 2, 21, 0, 2, 0, 0, 0, 2, 1, "10.50"],
    ["NADEEM KHAN", 1, 11, 0, 0, 0, 0, 1, 0, 0, "11.00"],
    ["HASSNAIN ALI SHAH", 1, 12, 0, 0, 0, 0, 0, 0, 0, "12.00"],
    ["JITEN RAMANANDI", 1, 7, 0, 2, 1, 0, 0, 0, 0, "7.00"],
    ["JAY ODEDRA", "0.4", 11, 0, 0, 0, 0, 1, 0, 0, "16.50"],
  ];
  const bowlRows = bowl.map((b) => `<tr>
      <td class="ta-l">${b[0]}</td><td>${b[1]}</td><td>${b[2]}</td><td>${b[3]}</td><td>${b[4]}</td>
      <td>${b[5]}</td><td>${b[6]}</td><td>${b[7]}</td><td>${b[8]}</td><td>${b[9]}</td><td>${b[10]}</td>
    </tr>`).join("");

  const body = `
    <div class="sc-toolbar">
      <span class="sc-chip">Match Info</span>
      <label class="sc-check"><input type="checkbox"/> Show Player Duration</label>
      <span class="sc-title">🏃 SCORECARD</span>
      <span class="sc-icons">⤓ ⎙ ⤴ <label class="sc-check"><input type="checkbox" checked/> Trimmed Video</label></span>
    </div>
    <div class="sc-section-head">Canada - Batting</div>
    <table class="data-table sc-table">
      <thead><tr><th class="ta-l">Player Name</th><th class="ta-l">How Out</th><th>Runs</th><th>Balls</th><th>S/R</th><th>1's</th><th>2's</th><th>3's</th><th>B 4's</th><th>B 6's</th><th>DB</th><th>RSS</th><th>DB %</th></tr></thead>
      <tbody>${batRows}</tbody>
    </table>
    <div class="sc-extras">Extras (B: 0, LB: 0, NB: 0, WD: 0, P: 10) <strong>10</strong> &nbsp;&nbsp; <strong>${state.runs} / ${state.wkts} ( ${state.over}.${state.ball} ) RR: ${(state.runs/(state.over+state.ball/6||1)).toFixed(2)}</strong></div>
    <div class="sc-dnb"><strong>DID NOT BAT:</strong> NICHOLAS KIRTON *+, NAVNEET DHALIWAL, MANJOT BUTTAR, KALEEM SANA, HARSH THAKER, DILPREET BAJWA, DILLON HEYLIGER, ANSH PATEL, AJAYVEER HUNDAL, YUVRAJ SAMRA, SHIVAM SHARMA CAN, SHREYAS MOVVA</div>
    <div class="sc-section-head">Fall of Wickets</div>
    <div class="sc-fow">1 - 61 (RAVINDERPAL SINGH 4.6 ov)</div>
    <div class="sc-section-head">Oman - Bowling</div>
    <table class="data-table sc-table">
      <thead><tr><th class="ta-l">Player Name</th><th>Over</th><th>Runs</th><th>Mdn</th><th>DB</th><th>Wkts</th><th>Wd</th><th>Nb</th><th>B 4's</th><th>B 6's</th><th>Econ</th></tr></thead>
      <tbody>${bowlRows}</tbody>
    </table>`;
  openOverlay(popupShell("MATCH REPORT", body, true));
}

// ---- Match Events module (full screen, left nav) --------------------------

function overlayMatchEvents(active = "Breaks") {
  // Revised Overs applies only in the 1st innings, Revised Target only in the
  // 2nd — disable the one that doesn't apply to the current innings.
  const navDisabled = (n) =>
    (n === "Revised Target" && state.innings === 1) ||
    (n === "Revised Overs" && state.innings === 2);
  const nav = `<div class="me-nav">${MATCH_EVENTS_NAV.map((n) =>
    `<button class="me-nav-item ${n === active ? "active" : ""} ${navDisabled(n) ? "disabled" : ""}" data-nav="${n}" ${navDisabled(n) ? "disabled" : ""}>${n}</button>`).join("")}</div>`;
  openOverlay(moduleShell(matchEventTitle(active), nav, matchEventBody(active)));
  const root = overlayRoot();
  root.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => {
    overlayMatchEvents(b.getAttribute("data-nav"));
  }));
  wireSeg();

  if (active === "Other Wickets") {
    let owDismissal = null;
    root.querySelectorAll("[data-dismiss]").forEach((b) => b.addEventListener("click", () => {
      root.querySelectorAll("[data-dismiss]").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      owDismissal = b.textContent.trim();
    }));
    document.getElementById("ow-save")?.addEventListener("click", () => {
      const batsman = document.getElementById("ow-player")?.value;
      const wicketNo = Number(document.getElementById("ow-wktno")?.value) || state.wkts + 1;
      if (!owDismissal) { toast("Select a dismissal type"); return; }
      if (!batsman || batsman === "PLAYER NAME") { toast("Select a batsman"); return; }
      // A wicket recorded here is not tied to a delivery: log the dismissal and
      // bump the wicket count, leaving the over/ball counters and ball log alone.
      state.otherWickets.push({ dismissal: owDismissal, batsman, wicketNo, video: "" });
      state.wkts += 1;
      render();
      overlayMatchEvents("Other Wickets"); // refresh the table + next wicket no
      toast("Wicket recorded (no ball)");
    });
    document.getElementById("ow-delete")?.addEventListener("click", () => {
      // Remove the most recently saved Other Wicket and roll the count back.
      if (!state.otherWickets.length) { closeOverlay(); return; }
      state.otherWickets.pop();
      state.wkts = Math.max(0, state.wkts - 1);
      render();
      overlayMatchEvents("Other Wickets");
      toast("Last Other Wicket removed");
    });
  }

  if (active === "Match Results") {
    document.getElementById("mr-done")?.addEventListener("click", () => {
      const result = document.getElementById("mr-result");
      const comments = document.getElementById("mr-comments");
      if (!result.value || result.value === "Select") { flash(result); toast("Select a result type"); return; }
      if (!comments.value.trim()) { flash(comments); toast("Comments are required"); return; }
      closeOverlay();
    });
  }
}

function matchEventTitle(name) {
  return name.toUpperCase();
}

function dateField(label, val = "28-Jan-2026", time = "21:49") {
  return `<label class="f-row"><span class="f-label">${label}</span>
    <span class="dt-pair"><input class="f-input dt-date" value="${val}"/><input class="f-input dt-time" value="${time}"/></span></label>`;
}

function tableHead(cols) {
  return `<table class="data-table grid-table"><thead><tr>${cols.map((c) => `<th>${c} <span class="th-filter">▾</span></th>`).join("")}</tr></thead><tbody></tbody></table>`;
}

function saveDeleteRow(extra = "") {
  return `<div class="btn-row-modal center">${extra}<button class="m-btn m-green" data-close>Save</button><button class="m-btn m-red" data-close>Delete</button></div>`;
}

// Saved Other-Wickets rows (dismissal recorded without a delivery).
function otherWicketsRows() {
  return state.otherWickets.map((w) =>
    `<tr><td>${w.dismissal}</td><td>${w.batsman}</td><td>${w.wicketNo}</td><td>${w.video || "—"}</td></tr>`).join("");
}

function matchEventBody(name) {
  switch (name) {
    case "Breaks":
      return `
        <div class="me-form">
          <div class="me-form-left">
            ${dateField("Break Start Time")}
            ${dateField("Break End Time", "28-Jan-2026", "00:00")}
            <label class="f-row"><span class="f-label">Duration</span><input class="f-input"/></label>
            <label class="f-row"><span class="f-label">Comments</span><input class="f-input" placeholder="Comments"/></label>
          </div>
          <div class="me-include-box">
            <p>Do You Want To Include This Breaks In Players Total Minutes Played</p>
            <label class="ck"><input type="checkbox"/> Yes</label>
            <label class="ck"><input type="checkbox" checked/> No</label>
          </div>
        </div>
        ${saveDeleteRow()}
        ${tableHead(["Break Type", "Started Time", "Ended Time", "Total Mins"])}`;
    case "Other Wickets":
      return `
        <p class="me-note">Records a dismissal without a delivery — no ball is counted.</p>
        <div class="pill-grid wide-pills">
          ${["Mankading","Absent Hurt","Timed Out","Retired Hurt","Retired Out"].map((d)=>`<button class="pill-btn" data-dismiss>${d}</button>`).join("")}
        </div>
        <div class="me-form-narrow">
          <label class="f-row"><span class="f-label">Player Name</span><select class="f-select" id="ow-player">${["PLAYER NAME", ...CANADA].map((o)=>`<option>${o}</option>`).join("")}</select></label>
          <label class="f-row"><span class="f-label">Wicket No</span><input class="f-input" id="ow-wktno" value="${state.wkts + 1}"/></label>
          <button class="m-btn m-dark wide" >Browse Video</button>
        </div>
        <div class="btn-row-modal center"><button class="m-btn m-green" id="ow-save">Save</button><button class="m-btn m-red" id="ow-delete">Delete</button></div>
        <table class="data-table grid-table">
          <thead><tr>${["Dismissal Type","Batsman Name","Wicket No","Video"].map((c)=>`<th>${c} <span class="th-filter">▾</span></th>`).join("")}</tr></thead>
          <tbody>${otherWicketsRows()}</tbody>
        </table>`;
    case "Ball Change":
      return `
        ${dateField("Ball Change Date/Time", "28-Jan-2026", "22:05")}
        <div class="pill-grid wide-pills center">
          ${["New Ball","Semi New Ball","Second New Ball","Old Ball"].map((d)=>`<button class="pill-btn">${d}</button>`).join("")}
        </div>
        <label class="f-row"><span class="f-label">Remarks</span><textarea class="f-textarea yellow-area" placeholder="Remarks"></textarea></label>
        ${saveDeleteRow()}
        ${tableHead(["Ball Change Date/Time","Team Name","Inns #","Runs","Overs","Wkts","Ball Type","Remarks"])}`;
    case "Match Results":
      return `
        <div class="me-results">
          <div class="me-results-left">
            <label class="f-row"><span class="f-label">Result Type <span class="req">*</span></span><select class="f-select" id="mr-result">${["Select","Win","Loss","Tie","No Result","Abandoned"].map((o)=>`<option>${o}</option>`).join("")}</select></label>
            ${selectEl("Team", ["OMN","CANA"]) }
            <label class="f-row"><span class="f-label">Comments <span class="req">*</span></span><input class="f-input" id="mr-comments" placeholder="Comments"/></label>
            ${selectEl("Man Of The Match", [...CANADA, ...OMAN_BOWLERS])}
            ${selectEl("Man Of The Series", [...CANADA, ...OMAN_BOWLERS])}
            ${selectEl("Best Batsman", CANADA)}
            ${selectEl("Best Bowler", OMAN_BOWLERS)}
            ${selectEl("Best All Rounder", CANADA)}
            ${selectEl("Most Valuable Player", CANADA)}
          </div>
          <div class="me-results-right">
            <div class="points-head">POINTS</div>
            <div class="points-row"><input class="f-input" value="OMN"/><input class="f-input" placeholder="Point"/></div>
            <div class="points-row"><input class="f-input" value="CANA"/><input class="f-input" placeholder="Point"/></div>
          </div>
        </div>
        <div class="btn-row-modal center"><button class="m-btn m-green" id="mr-done">Done</button><button class="m-btn m-red" data-close>Revert</button></div>`;
    case "Movie Organiser":
      return `
        <label class="f-row narrow-row"><span class="f-label">Innings No</span><select class="f-select"><option>1</option><option>2</option></select></label>
        <div class="movie-layout">
          <div class="movie-table">${tableHead(["Over","Bowler","Striker","Non-St","Bowl Ty","Shot Ty","Runs","Ext","IsWkt"])}</div>
          <div class="movie-player">
            <div class="movie-screen">▶</div>
            <div class="movie-controls">▶ ◼ ◀◀ ▶▶</div>
            <div class="movie-trim"><button class="m-btn m-green">Trim IN</button><button class="m-btn m-green">Trim OUT</button></div>
          </div>
        </div>`;
    case "Power Play":
      return powerPlayBody();
    case "Revised Overs":
    case "Revised Target":
      return `
        <div class="me-form-narrow">
          <label class="f-row"><span class="f-label">Innings</span><span class="f-input f-static">${name === "Revised Overs" ? "1st Innings" : "2nd Innings"}</span></label>
          <label class="f-row"><span class="f-label">${name === "Revised Overs" ? "Revised Overs" : "Revised Target"}</span><input class="f-input"/></label>
          <label class="f-row"><span class="f-label">Reason</span><input class="f-input" placeholder="Reason"/></label>
        </div>${saveDeleteRow()}`;
    case "Match Info Edit":
      return `
        <div class="me-form-narrow">
          ${selectEl("Toss Won By", ["CANA","OMN"]) }
          ${selectEl("Elected To", ["Bat","Bowl"]) }
          <label class="f-row"><span class="f-label">Number of Overs</span><input class="f-input" value="${state.overs}"/></label>
          <label class="f-row"><span class="f-label">Venue</span><input class="f-input" value="Al Amerat Cricket Ground"/></label>
        </div>${saveDeleteRow()}`;
    case "Batsman In / Out Time":
      return `${tableHead(["Batsman","In Time","Out Time","Mins","Balls"])}`;
    case "Video Count Validation":
      return `
        <div class="confirm-box">
          <p>Total balls coded: <strong>${state.log.length}</strong> · Video clips: <strong>${state.log.length}</strong></p>
          <p class="ok-line">✓ Video count matches the ball-by-ball log.</p>
          <div class="btn-row-modal center"><button class="m-btn m-green" data-close>Re-validate</button></div>
        </div>`;
    default:
      return `<div class="confirm-box"><p>${name}</p></div>`;
  }
}

function powerPlayOptions() {
  // ≤20 overs → T20 has a single powerplay; otherwise ODI has three.
  return state.overs <= 20
    ? ["PP1 (1-6)", "Batting PP", "Bowling PP"]
    : ["PP1 (1-10)", "PP2 (11-40)", "PP3 (41-50)", "Batting PP", "Bowling PP"];
}

function powerPlayBody() {
  return `
    <div class="me-form-narrow">
      ${selectEl("Power Play", powerPlayOptions()) }
      <label class="f-row"><span class="f-label">From Over</span><input class="f-input" value="${state.over}"/></label>
      <label class="f-row"><span class="f-label">To Over</span><input class="f-input"/></label>
    </div>${saveDeleteRow()}
    ${tableHead(["Power Play","From","To","Runs","Wkts"])}`;
}

// ---- Segmented control helper ---------------------------------------------

function wireSeg() {
  overlayRoot().querySelectorAll(".seg").forEach((seg) => {
    seg.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => {
      seg.querySelectorAll(".seg-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
    }));
  });
}

// ---- Edit a logged ball (double-click a row) ------------------------------

const fieldVal = (id) => document.getElementById(id)?.value ?? "";
const escAttr = (v) => String(v).replace(/"/g, "&quot;");

// Numeric run value carried by an extras cell ("0", "WD", "WD1", "LB", 2 …).
function extNum(ext) {
  if (typeof ext === "number") return ext;
  const m = String(ext).match(/\d+/);
  if (m) return Number(m[0]);
  return /^(NB|WD|LB|B)/i.test(String(ext).trim()) ? 1 : 0;
}

function overlayEditBall(index) {
  const r = state.log[index];
  if (!r) return;
  const inp = (id, label, v) =>
    `<label class="f-row"><span class="f-label">${label}</span><input class="f-input" id="${id}" value="${escAttr(v)}" /></label>`;
  const sel = (id, label, opts) =>
    `<label class="f-row"><span class="f-label">${label}</span><select class="f-select" id="${id}">${
      opts.map((o) => `<option>${o}</option>`).join("")}</select></label>`;
  const bowlOpts = [...new Set([r.bowl || "", ...BOWL_TYPES.Fast, ...BOWL_TYPES.Spin])];
  const shotOpts = [...new Set([r.shot || "", ...SHOT_TYPES.Aggressive, ...SHOT_TYPES.Defensive])];

  const body = `
    <label class="f-row"><span class="f-label">Ball</span><input class="f-input" value="${escAttr(r.num)}" disabled /></label>
    ${inp("eb-bowler", "Bowler", r.bowler)}
    ${inp("eb-striker", "Striker", r.striker)}
    ${inp("eb-nonstr", "Non-Striker", r.nonstr)}
    ${sel("eb-bowl", "Bowl Type", bowlOpts)}
    ${sel("eb-shot", "Shot Type", shotOpts)}
    ${inp("eb-runs", "Runs", r.runs)}
    ${inp("eb-ext", "Extras", r.ext)}
    <label class="f-row"><span class="f-label">Mark for Edit</span>
      <input type="checkbox" id="eb-marked" class="f-check" ${r.marked ? "checked" : ""} /></label>
    <div class="btn-row-modal">
      <button class="m-btn m-green" id="eb-save">Save</button>
      <button class="m-btn m-red" id="eb-delete">Delete</button>
    </div>`;
  openOverlay(popupShell(`EDIT BALL ${r.num}`, body));

  document.getElementById("eb-save")?.addEventListener("click", () => {
    const oldVal = (Number(r.runs) || 0) + extNum(r.ext);
    r.bowler = fieldVal("eb-bowler");
    r.striker = fieldVal("eb-striker");
    r.nonstr = fieldVal("eb-nonstr");
    r.bowl = fieldVal("eb-bowl");
    r.shot = fieldVal("eb-shot");
    r.runs = Number(fieldVal("eb-runs")) || 0;
    r.ext = fieldVal("eb-ext");
    r.marked = !!document.getElementById("eb-marked")?.checked;
    const newVal = (Number(r.runs) || 0) + extNum(r.ext);
    state.runs = Math.max(0, state.runs + (newVal - oldVal)); // keep score in sync
    closeOverlay();
    render();
  });
  document.getElementById("eb-delete")?.addEventListener("click", () => {
    state.runs = Math.max(0, state.runs - ((Number(r.runs) || 0) + extNum(r.ext)));
    state.log.splice(index, 1);
    closeOverlay();
    render();
  });
}

// Speed-unit toggle: KPH and MPH are two buttons, but only the active one is
// shown — clicking it switches the unit and reveals the other (the active one
// hides). The input placeholder follows the active unit.
function wireSpeedUnit() {
  const btns = [...document.querySelectorAll(".unit-btn")];
  const input = document.getElementById("kph-input");
  if (!btns.length) return;
  const apply = (unit) => {
    btns.forEach((b) => {
      const on = b.dataset.unit === unit;
      b.classList.toggle("active", on);
      b.hidden = !on;
    });
    state.speedUnit = unit;
    if (input) input.placeholder = unit;
  };
  btns.forEach((b) => b.addEventListener("click", () => {
    apply(b.dataset.unit === "KPH" ? "MPH" : "KPH"); // visible button toggles unit
  }));
  apply(state.speedUnit || "KPH");
}

function wireBallLogEditing() {
  const body = document.getElementById("ball-log-body");
  if (!body) return;
  // single click: review that ball's saved wagon + pitch inputs
  body.addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-index]");
    if (!tr) return;
    body.querySelectorAll("tr.selected").forEach((x) => x.classList.remove("selected"));
    tr.classList.add("selected");
    showBallInputs(Number(tr.getAttribute("data-index")));
  });
  // double click: edit that ball
  body.addEventListener("dblclick", (e) => {
    const tr = e.target.closest("tr[data-index]");
    if (!tr) return;
    overlayEditBall(Number(tr.getAttribute("data-index")));
  });
}

// ---- Coding tags (BTN/UNC/WTB/RS multi-select + FF/BF/SD/CRM footwork) -----

// Wire the footer tag bar into state. BTN/UNC/WTB/RS are independent checkboxes
// (any combination); FF/BF/SD/CRM are one radio group (at most one).
function wireTags() {
  document.querySelectorAll("input[data-tag]").forEach((el) => {
    el.addEventListener("change", () => { state.tags[el.dataset.tag] = el.checked; });
  });
  document.querySelectorAll("input[data-footwork]").forEach((el) => {
    el.addEventListener("change", () => { if (el.checked) state.footwork = el.dataset.footwork; });
  });
}

// ---- Quick "+" spec adders ------------------------------------------------

// The "+" on each panel is a fast inline way to add an option to that spec:
// the bowl panel adds a Ball Type, the bat panel adds a Shot Type. The new
// entry lands in the currently selected group (Fast/Spin or Aggressive/
// Defensive), is persisted to the masters DB, then re-rendered + selected.
function wireSpecAdders() {
  document.querySelector(".bowl-panel .plus-btn")?.addEventListener("click", () => openAddSpec("bowl"));
  document.querySelector(".bat-panel .plus-btn")?.addEventListener("click", () => openAddSpec("shot"));
}

function openAddSpec(kind) {
  const isBowl = kind === "bowl";
  const category = isBowl ? "Ball Type" : "Shot Type";
  const grp = isBowl ? state.pace : state.style; // add to the active toggle group
  const eg = isBowl ? "Slower Bouncer" : "Late Cut";
  const body = `
    <label class="f-row"><span class="f-label">Name</span>
      <input class="f-input" id="as-name" placeholder="e.g. ${eg}" autocomplete="off" /></label>
    <div class="btn-row-modal">
      <button class="m-btn m-green" id="as-save">Add</button>
      <button class="m-btn" data-close>Cancel</button>
    </div>`;
  openOverlay(popupShell(`ADD ${category.toUpperCase()} — ${grp}`, body));
  const input = document.getElementById("as-name");
  input?.focus();
  const submit = async () => {
    const name = (input?.value || "").trim();
    if (!name) { input?.focus(); return; }
    closeOverlay();
    await addSpecEntry(category, grp, name, kind);
  };
  document.getElementById("as-save")?.addEventListener("click", submit);
  input?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
}

async function addSpecEntry(category, grp, name, kind) {
  const target = kind === "bowl" ? BOWL_TYPES : SHOT_TYPES;
  if ((target[grp] || []).some((n) => n.toLowerCase() === name.toLowerCase())) {
    toast(`"${name}" already in ${grp}`);
  } else {
    try {
      if (window.cricketApp?.db?.saveMaster) {
        await window.cricketApp.db.saveMaster({ category, grp, name });
        await loadMasters(); // reload so order/ids match the DB
      } else {
        (target[grp] ||= []).push(name); // standalone (no DB bridge)
      }
    } catch (e) {
      console.error("add spec failed", e);
      if (!(target[grp] || []).some((n) => n.toLowerCase() === name.toLowerCase())) (target[grp] ||= []).push(name);
    }
    toast(`Added "${name}" to ${category} (${grp})`);
  }
  // re-render the grid (switching to the right page) and select the entry
  if (kind === "bowl") applyBowlType(name); else applyShotType(name);
}

// Push state.tags / state.footwork back onto the controls (used to reset the
// bar after a ball is logged, and to restore a reviewed ball's selections).
function syncTagControls() {
  document.querySelectorAll("input[data-tag]").forEach((el) => {
    el.checked = !!state.tags[el.dataset.tag];
  });
  document.querySelectorAll("input[data-footwork]").forEach((el) => {
    el.checked = state.footwork === el.dataset.footwork;
  });
}

// ---- Overlay routing ------------------------------------------------------

const OVERLAYS = {
  appeals: overlayAppeals,
  fielding: overlayFielding,
  remarks: overlayRemarks,
  penalty: overlayPenalty,
  wickets: overlayWickets,
  matchevents: () => overlayMatchEvents(),
  scorecard: overlayScorecard,
  overcomp: overlayOverComp,
  bowlcompute: overlayBowlCompute,
  umpire: (arg) => overlayUmpire(arg),
};

function wireOverlayButtons() {
  document.querySelectorAll("[data-overlay]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fn = OVERLAYS[btn.getAttribute("data-overlay")];
      if (fn) fn(btn.getAttribute("data-arg"));
    });
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeOverlay(); closeContextMenu(); } });
  document.getElementById("btn-editmode")?.addEventListener("click", () => {
    document.body.classList.toggle("edit-mode");
  });
}

// ---- Configurable keyboard shortcuts --------------------------------------
// Each shortcut name (set on the Configuration → Shortcut tab) resolves to the
// on-screen control it should trigger; firing the key simply clicks that
// control so the existing handlers run unchanged.
const SHORTCUT_TARGETS = {
  startOver: () => document.getElementById("btn-over"),
  startBall: () => document.getElementById("btn-ball"),
  startCapture: () => document.getElementById("btn-capture"),
  bowlingCompute: () => document.querySelector('[data-overlay="bowlcompute"]'),
  appeals: () => document.querySelector('[data-overlay="appeals"]'),
  fieldingEvents: () => document.querySelector('[data-overlay="fielding"]'),
  matchEvents: () => document.querySelector('[data-overlay="matchevents"]'),
  remarks: () => document.querySelector('[data-overlay="remarks"]'),
  wickets: () => document.querySelector('[data-overlay="wickets"]'),
  editMode: () => document.getElementById("btn-editmode"),
  // Browse Video only exists inside the capture overlay, so resolve it by label
  // among the currently visible buttons.
  browseVideo: () => findVisibleButtonByText("Browse Video"),
};

function findVisibleButtonByText(text) {
  const target = text.toLowerCase();
  return Array.from(document.querySelectorAll("button")).find(
    (b) => b.offsetParent !== null && b.textContent.trim().toLowerCase() === target
  ) || null;
}

function canonKeyName(k) {
  if (k === " " || k === "space" || k === "spacebar") return "space";
  if (k === "esc") return "escape";
  if (k === "del") return "delete";
  if (k === "ins") return "insert";
  return k;
}

function comboString(mod, key) {
  if (!key) return "";
  const parts = [];
  if (mod.ctrl) parts.push("ctrl");
  if (mod.alt) parts.push("alt");
  if (mod.shift) parts.push("shift");
  if (mod.meta) parts.push("meta");
  parts.push(key);
  return parts.join("+");
}

// Parse a user-typed shortcut like "Ctrl+Shift+O" / "Space" / "A" into a
// canonical form ("ctrl+shift+o") for matching against key events.
function normalizeComboString(str) {
  if (!str) return "";
  const tokens = String(str).split("+").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const mod = { ctrl: false, shift: false, alt: false, meta: false };
  let key = "";
  for (const t of tokens) {
    if (t === "ctrl" || t === "control") mod.ctrl = true;
    else if (t === "shift") mod.shift = true;
    else if (t === "alt" || t === "option") mod.alt = true;
    else if (t === "meta" || t === "cmd" || t === "command" || t === "win") mod.meta = true;
    else key = canonKeyName(t);
  }
  return comboString(mod, key);
}

function comboFromEvent(e) {
  const key = e.key.toLowerCase();
  if (["control", "shift", "alt", "meta"].includes(key)) return "";
  return comboString(
    { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey },
    canonKeyName(key)
  );
}

async function wireShortcuts() {
  let cfg = {};
  try { cfg = (await window.cricketApp?.getConfig?.()) || {}; } catch { /* ignore */ }
  const shortcuts = cfg.shortcuts || {};
  const comboMap = {};
  for (const [name, combo] of Object.entries(shortcuts)) {
    const canon = normalizeComboString(combo);
    if (canon && SHORTCUT_TARGETS[name]) comboMap[canon] = name;
  }
  if (!Object.keys(comboMap).length) return;

  document.addEventListener("keydown", (e) => {
    // Don't hijack typing in form fields or the ball-log editor.
    const t = e.target;
    if (t && (t.matches?.("input, textarea, select") || t.isContentEditable)) return;
    const name = comboMap[comboFromEvent(e)];
    if (!name) return;
    const el = SHORTCUT_TARGETS[name]?.();
    if (!el) return;
    e.preventDefault();
    el.click();
  });
}

// ===========================================================================
// Camera capture (unchanged behaviour)
// ===========================================================================

function pickRecorderMime() {
  const c = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const m of c) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

async function getCaptureStream() {
  let cfg = {};
  try { cfg = (await window.cricketApp?.getConfig?.()) || {}; } catch { /* ignore */ }
  const base = { width: { ideal: 1280 }, height: { ideal: 720 } };
  const withDevice = cfg.cameraDeviceId ? { ...base, deviceId: { exact: cfg.cameraDeviceId } } : { ...base, facingMode: "user" };
  const fallback = { ...base, facingMode: "user" };
  async function tryStream(v, a) { return navigator.mediaDevices.getUserMedia({ video: v, audio: a }); }
  try { return await tryStream(withDevice, true); }
  catch {
    try { return await tryStream(withDevice, false); }
    catch (e2) {
      if (cfg.cameraDeviceId) {
        try { return await tryStream(fallback, true); } catch { return await tryStream(fallback, false); }
      }
      throw e2;
    }
  }
}

function wireCapture() {
  const videoEl = document.getElementById("camera-preview");
  const btn = document.getElementById("btn-capture");
  if (!videoEl || !btn) return;
  if (!window.cricketApp?.saveRecording) {
    // No electron bridge — keep button as a visual toggle only
    btn.addEventListener("click", () => {
      const active = btn.textContent.startsWith("End");
      btn.textContent = active ? "Start Capture" : "End Capture";
      btn.classList.toggle("teal", active);
      btn.classList.toggle("red", !active);
    });
    return;
  }

  let stream = null, recorder = null, starting = false;
  const chunks = [];
  function setUi(active) {
    btn.textContent = active ? "End Capture" : "Start Capture";
    btn.classList.toggle("teal", !active);
    btn.classList.toggle("red", active);
  }
  let captureLabel = "";
  async function start() {
    if (starting || (recorder && recorder.state === "recording")) return;
    starting = true;
    try {
      stream = await getCaptureStream();
      videoEl.srcObject = stream;
      chunks.length = 0;
      // label the clip by where it begins: innings / over / ball (next ball)
      captureLabel = `INN${state.innings}-OVER${state.over}-BALL${state.ball + 1}`;
      const mime = pickRecorderMime();
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        setUi(false);
        stream?.getTracks().forEach((t) => t.stop()); stream = null;
        videoEl.srcObject = null;
        const r = recorder; recorder = null;
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: r.mimeType || "video/webm" });
        chunks.length = 0;
        const buf = await blob.arrayBuffer();
        // Per-match folder + per-inning filename. With a recordings root set in
        // video settings this saves silently into <root>/<matchFolder>/.
        const folder = state.recordingFolder || "";
        const prefix = state.recordingPrefix || "";
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const name = prefix
          ? `${prefix}-${captureLabel}.webm`
          : `cricket-capture-${ts}.webm`;
        await window.cricketApp.saveRecording(buf, name, folder);
      };
      recorder.start(1000);
      setUi(true);
    } catch (err) {
      stream?.getTracks().forEach((t) => t.stop()); stream = null;
      videoEl.srcObject = null; recorder = null; setUi(false);
      alert(`Could not start camera: ${err.message || err}`);
    } finally { starting = false; }
  }
  btn.addEventListener("click", () => {
    if (recorder && recorder.state === "recording") recorder.stop();
    else start();
  });
}

// ===========================================================================
// Match context (loaded from the database via ?match=<id>)
// ===========================================================================

function namesOf(players) {
  return (players || []).map((p) => (p.name || "").toUpperCase());
}

function bowlerLabel(player) {
  if (!player) return "";
  const arm = player.bowlingStyle === "Left Arm" ? "L" : player.bowlingStyle === "Right Arm" ? "R" : "";
  const type = (player.bowlingType || "").toUpperCase();
  const suffix = [arm, type].filter(Boolean).join(" ");
  return suffix ? `${player.name.toUpperCase()} -${suffix}` : player.name.toUpperCase();
}

async function loadMatchContext() {
  const id = new URLSearchParams(location.search).get("match");
  if (!id || !window.cricketApp?.db?.getMatch) return null;
  try {
    return await window.cricketApp.db.getMatch(id);
  } catch (e) {
    console.error("load match failed", e);
    return null;
  }
}

// Load the bowl-type / shot-type / fielding-factor option lists (and their
// order) from the masters in the database. Falls back to the hardcoded defaults
// when the DB bridge is unavailable or a category is empty.
function groupMaster(rows) {
  const out = {};
  (rows || []).forEach((r) => { (out[r.grp || ""] ||= []).push(r.name); });
  return out;
}

async function loadMasters() {
  if (!window.cricketApp?.db?.masters) return;
  try {
    const [bowl, shot, field] = await Promise.all([
      window.cricketApp.db.masters("Ball Type"),
      window.cricketApp.db.masters("Shot Type"),
      window.cricketApp.db.masters("Fielding Factor"),
    ]);
    const b = groupMaster(bowl);
    if (b.Fast?.length || b.Spin?.length) BOWL_TYPES = { Fast: b.Fast || [], Spin: b.Spin || [] };
    const s = groupMaster(shot);
    if (s.Aggressive?.length || s.Defensive?.length) SHOT_TYPES = { Aggressive: s.Aggressive || [], Defensive: s.Defensive || [] };
    if (field?.length) FIELDING_EVENTS = field.map((f) => f.name);
  } catch (e) {
    console.error("load masters failed", e);
  }
}

// Build the per-match recordings folder name from home (teamA) vs away (teamB)
// and the match date, e.g. "M1NAMIBIAVSOMAN040426" (date = DDMMYY). Sanitised to
// safe filename characters; the main process also re-sanitises before use.
function recordingFolderName(match) {
  const A = match.teamA || {}, B = match.teamB || {};
  const clean = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const home = clean(A.name || A.code) || "HOME";
  const away = clean(B.name || B.code) || "AWAY";
  const d = new Date(match.matchDate);
  const date = isNaN(d) ? "" :
    `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}`;
  const num = String(match.matchNo || (match.id || "").match(/\d+/)?.[0] || "").replace(/^0+/, "");
  const prefix = num ? `M${num}` : "";
  return `${prefix}${home}VS${away}${date}`;
}

// Tournament (competition) folder name that the match folder lives under, so
// recordings nest as <root>/<tournament>/<match>/. Falls back to UNGROUPED when
// the match has no competition. Sanitised; the main process re-sanitises too.
function tournamentFolderName(match) {
  const clean = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean(match.competitionName) || "UNGROUPED";
}

// Create the match folder under the configured recordings root right away, so
// captures land in it without prompting (when a root is set in video settings).
function ensureRecordingFolder() {
  if (!state.recordingFolder || !window.cricketApp?.ensureRecordingFolder) return;
  window.cricketApp.ensureRecordingFolder(state.recordingFolder)
    .catch((e) => console.error("ensure recording folder failed", e));
}

function applyMatch(match) {
  state.matchId = match.id;
  state.recordingPrefix = recordingFolderName(match); // filename prefix (no slash)
  state.recordingFolder = `${tournamentFolderName(match)}/${state.recordingPrefix}`; // <tournament>/<match>
  ensureRecordingFolder(); // create the match folder as soon as the match opens
  const A = match.teamA, B = match.teamB; // innings 1: A bats, B bowls
  state.battingTeam = A;
  state.bowlingTeam = B;
  state.bowlPlayers = B.playingXIPlayers || [];
  state.teamA = A.code;
  state.teamB = B.code;
  state.battingCode = A.code;

  // batting order, bowlers and fielders come from the playing XIs
  CANADA = namesOf(A.playingXIPlayers);
  const bowlerPool = (B.playingXIPlayers || []).filter((p) => p.bowlingType);
  OMAN_BOWLERS = namesOf(bowlerPool.length ? bowlerPool : B.playingXIPlayers);
  FIELDERS = namesOf(B.playingXIPlayers);

  if (match.state) {
    // resume an in-progress innings
    Object.assign(state, match.state);
    return;
  }

  // fresh innings
  const xi = A.playingXIPlayers || [];
  state.striker = (xi[0] && xi[0].name.toUpperCase()) || "BATSMAN 1";
  state.nonStriker = (xi[1] && xi[1].name.toUpperCase()) || "BATSMAN 2";
  state.bowlEnd = "FAR END";
  const firstBowler = (B.playingXIPlayers || []).find((p) => p.bowlingType) || (B.playingXIPlayers || [])[0];
  state.bowler = bowlerLabel(firstBowler) || "BOWLER";
  state.runs = 0; state.wkts = 0; state.over = 0; state.ball = 0;
  state.pace = "Fast"; state.style = "Aggressive";
  state.bat = {
    striker: { runs: 0, balls: 0, fours: 0, sixes: 0 },
    nonStriker: { runs: 0, balls: 0, fours: 0, sixes: 0 },
  };
  state.bowl = { spell: 1, balls: 0, runs: 0, mdns: 0, wkts: 0 };
  state.log = [];
  state.overRunsThisOver = 0;
  state.thisOver = [];
  state.history = [];
  state.innings = 1;
  state.matchOver = false;
  state.overStarted = false;
  state.ballStarted = false;
}

// ---- persistence (debounced) ----------------------------------------------

let saveTimer = null;
function serializeState() {
  return {
    battingCode: state.battingCode, teamA: state.teamA, teamB: state.teamB,
    runs: state.runs, wkts: state.wkts, over: state.over, ball: state.ball,
    pace: state.pace, style: state.style,
    striker: state.striker, nonStriker: state.nonStriker,
    bowler: state.bowler, bowlEnd: state.bowlEnd,
    bat: state.bat, bowl: state.bowl, log: state.log,
    overRunsThisOver: state.overRunsThisOver, thisOver: state.thisOver,
  };
}
function scheduleSave() {
  if (!state.matchId || !window.cricketApp?.db?.saveMatchState) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    window.cricketApp.db
      .saveMatchState({ id: state.matchId, state: serializeState(), status: "RESUME" })
      .catch((e) => console.error("save state failed", e));
  }, 600);
}

// ---- Boot -----------------------------------------------------------------

function syncToggles() {
  document.querySelectorAll('.toggle[data-group="pace"]').forEach((b) =>
    b.classList.toggle("active", b.textContent.trim() === state.pace));
  document.querySelectorAll('.toggle[data-group="style"]').forEach((b) =>
    b.classList.toggle("active", b.textContent.trim() === state.style));
}

async function boot() {
  await loadMasters();
  const match = await loadMatchContext();
  if (match) applyMatch(match);

  renderBowlGrid();
  renderBatGrid();
  fillKeypad();
  wireToggles();
  wirePitchMap();
  wireFieldMap();
  wireActionButtons();
  wireOverlayButtons();
  wireBallLogEditing();
  wireSpeedUnit();
  wireTags();
  wireSpecAdders();
  syncToggles();
  render();
  wireCapture();
  wireShortcuts();

  // Optional deep-link: index.html?open=matchevents (or appeals, fielding, wickets,
  // remarks, scorecard, overcomp, bowlcompute) opens that overlay on load.
  const key = new URLSearchParams(location.search).get("open");
  if (key && OVERLAYS[key]) OVERLAYS[key]();
}

boot();
