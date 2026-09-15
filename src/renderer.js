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

// The scoring bar: a single horizontal row of Wicket ▾ (red) · extras Pen/W/NB/
// LB/B (teal) · runs 0/1/2/3/B4▾/B6▾/?▾ (green).
//   Wicket ▾ → the Wickets overlay
//   B4 / B6 → stage a boundary 4/6 directly; the ▾ caret or a double-click
//              opens the "Ran" alternative (runs taken along the ground)
//   ? ▾ → quick 5/7/8 plus a custom run entry (0–99, excluding the bar numbers)
// Over Throw (0–6) and RBW (−3…+3) are picked from the Events grid buttons.
function getKeypadKeys() {
  return [
    { label: "Wicket", type: "wicket", cls: "kb-wicket", caret: true, group: "wicket" },
    { label: "Pen", type: "pen", ext: "P", cls: "kb-ext", group: "ext" },
    { label: "W", type: "ext", ext: "WD", cls: "kb-ext", group: "ext" },
    { label: "NB", type: "ext", ext: "NB", cls: "kb-ext", group: "ext" },
    { label: "LB", type: "ext", ext: "LB", cls: "kb-ext", group: "ext" },
    { label: "B", type: "ext", ext: "B", cls: "kb-ext", group: "ext" },
    { label: "0", type: "run", val: 0, cls: "kb-run", group: "run" },
    { label: "1", type: "run", val: 1, cls: "kb-run", group: "run" },
    { label: "2", type: "run", val: 2, cls: "kb-run", group: "run" },
    { label: "3", type: "run", val: 3, cls: "kb-run", group: "run" },
    { label: "B4", type: "run4", val: 4, cls: "kb-run", caret: true, group: "run" },
    { label: "B6", type: "run6", val: 6, cls: "kb-run", caret: true, group: "run" },
    { label: "?", type: "other", cls: "kb-run", caret: true, group: "run" },
  ];
}

// Run values already present as their own buttons on the bar (excluded from the
// "?" custom-run entry).
const BAR_RUN_VALUES = new Set([0, 1, 2, 3, 4, 6]);

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
  "End Innings", "Match Results", "Match Info Edit", "Batsman In / Out Time",
  "Ball Change", "Video Count Validation", "Movie Organiser",
];

// ---- Match state ----------------------------------------------------------

const state = {
  battingCode: "CANA",
  teamA: "CANA",
  teamB: "OMN",
  venue: "",          // ground name, set from the loaded match (Match Info Edit)
  tossWonBy: "",      // team code that won the toss (Match Info Edit)
  tossDecision: "",   // "Bat" or "Bowl" — what the toss winner elected to do
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
  inAir: false,       // "In Air" toggle beside the wagon wheel (recorded per ball)
  pendingPlacement: null, // fielding placement chosen via left-click on the wagon wheel
  // Appeals toggle (events grid): armed/disarmed per ball, double-click opens
  // the Appeals popup. Purely a flag — adds nothing to the score.
  appeals: false,
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
  target: 0,          // runs to win in the 2nd innings (1st-innings total + 1)
  nextBatIndex: 2,    // batting-order index of the next batsman to come in
  dismissed: [],      // names of batsmen already out this innings (can't return)
  overStarted: false, // a new over must be started before any ball
  ballStarted: false, // each ball must be started before it can be entered
  // Six legal balls landed and the scorer chose to keep the over open, so the
  // "6 legal balls" prompt has had its answer and must not re-open on the 7th.
  overSixAnswered: false,
  capturing: false,   // a video capture is currently recording
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
  // Match Events records — each Save appends here and the screen's table below
  // re-renders from it.
  otherWickets: [],   // dismissals recorded without a delivery (Other Wickets)
  breaks: [],
  powerPlays: [],
  ballChanges: [],
  revisedOvers: [],
  revisedTargets: [],
  penalties: [],
  appealsLog: [],     // Appeals overlay records: over/type/against/decision etc. (feeds the Appeal Report)
  matchResult: null,  // Match Results form (single record)
  batTimes: [],       // { batsman, inTime, outTime, mins, balls, innings, opener } per batsman spell
  matchStartTime: "", // clock time the 1st innings' first ball is bowled (editable)
  matchStartTs: 0,    // matching timestamp, for openers' minutes-at-crease calc
  openersRecorded: false, // guard: the current innings' two openers are logged
  firstInningsBalls: 0, // 1st-innings legal-ball count, kept after the innings switch
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
      // Editing a saved ball: the pick rewrites that ball's stored type.
      const er = editingBallRow();
      if (er) {
        if (group === "bowl") { er.bowl = text; er.pace = state.pace; }
        else { er.shot = text; er.style = state.style; }
        renderLog(true);
        scheduleSave();
      }
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

// A toggle button's group value: its data-value when the visible label is an
// abbreviation (Agg/Def → Aggressive/Defensive), otherwise its text.
function toggleValue(btn) { return btn.dataset.value || btn.textContent.trim(); }

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
      b.classList.toggle("active", toggleValue(b) === grp));
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
      b.classList.toggle("active", toggleValue(b) === grp));
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
  // Buttons are wrapped in per-group containers so a group (e.g. the runs
  // 0/1/2/3/4/6/?) never breaks across lines — the bar wraps only between groups.
  const groups = {};
  getKeypadKeys().forEach((k) => {
    const g = groups[k.group] || (groups[k.group] = document.createElement("div"));
    g.className = `kb-group kb-group-${k.group}`;
    const b = document.createElement("button");
    b.type = "button";
    b.className = `keypad-btn ${k.cls || ""}`.trim();
    if (k.caret) b.innerHTML = `<span class="kb-label">${k.label}</span><span class="kb-caret">&#9662;</span>`;
    else b.textContent = k.label;
    // Keep the staged delivery's key highlighted until the ball is committed.
    const isRunKey = k.type === "run" || k.type === "run4" || k.type === "run6";
    if (staged && ((staged.type === "run" && isRunKey && k.val === staged.val)
        || (staged.type === "ext" && (k.type === "ext" || k.type === "pen") && k.ext === staged.ext))) {
      b.classList.add("staged");
    }
    if (k.disabled) {
      b.disabled = true;
      b.classList.add("disabled");
    } else {
      b.addEventListener("click", (e) => handleKeypad(k, b, e));
      // B4/B6: double-click offers the "Ran" alternative (same menu as the caret)
      if (k.type === "run4" || k.type === "run6") {
        b.addEventListener("dblclick", () => openRunVariantMenu(b, k.val));
      }
    }
    g.appendChild(b);
  });
  Object.values(groups).forEach((g) => el.appendChild(g));
}

// ---- Toggles --------------------------------------------------------------

function wireToggles() {
  document.querySelectorAll(".toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = btn.getAttribute("data-group");
      document.querySelectorAll(`.toggle[data-group="${g}"]`).forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      if (g === "pace") { state.pace = toggleValue(btn); state.bowlExpanded = false; renderBowlGrid(); }
      if (g === "style") { state.style = toggleValue(btn); state.shotExpanded = false; renderBatGrid(); }
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
    // Editing a saved ball: clicks rebuild that ball's pitch/height pair.
    const er = editingBallRow();
    if (er) {
      const dots = (er.pitch || []).length >= 2 ? [] : (er.pitch || []).slice();
      dots.push({ x, y, kind: dots.length === 0 ? "pitch" : "height" });
      er.pitch = dots;
      drawBallReview(er);
      scheduleSave();
      return;
    }
    clearReview();        // leave review mode when placing a live dot
    if (!editingBall) setReviewOrientation(null); // maps follow the striker again
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
  // on the mirrored (right-hander) wagon wheel the sectors swap sides
  if (state.fieldMirrored) a = (360 - a) % 360;
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

// Redraw a ball's stored wagon line + pitch dots as review elements.
function drawBallReview(r) {
  clearReview();
  // Orient the maps to the ball being shown before its line and dots go on
  // them. Rows saved before the flag existed were all coded right-handed (the
  // reports engine's ballMirrored makes the same assumption), so default to
  // mirrored. clearReview deliberately does not release the pin, so stepping
  // between two reviewed balls never flashes the striker's artwork.
  setReviewOrientation(r.mirrored === undefined ? true : r.mirrored);
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

  drawBallReview(r);
  showBallVideo(r); // load this ball's saved clip into the mini player (if any)
}

// ---- Edit a saved ball's on-screen inputs ---------------------------------
// Entered from the EDIT BALL overlay ("Edit On-Screen Inputs"): the wagon
// wheel, pitch map, bowl/shot grids and the tag bar all write into the saved
// ball instead of the live delivery, until Done Editing (the Edit Mode button).
let editingBall = null; // { log, index } while active

function editingBallRow() {
  return editingBall ? editingBall.log[editingBall.index] : null;
}

function enterBallInputEdit(log, index) {
  const r = log[index];
  if (!r) return;
  editingBall = { log, index };
  document.body.classList.add("edit-mode"); // yellow outline while editing
  const btn = document.getElementById("btn-editmode");
  if (btn) btn.textContent = "Done Editing";
  // surface the ball's saved selections on the coding controls
  state.tags = { btn: false, unc: false, wtb: false, rs: false, ...(r.tags || {}) };
  state.footwork = r.footwork || null;
  state.inAir = !!r.inAir;
  syncTagControls();
  const air = document.getElementById("in-air-btn");
  air?.classList.toggle("active", state.inAir);
  air?.setAttribute("aria-pressed", String(state.inAir));
  if (r.bowl) applyBowlType(r.bowl);
  if (r.shot) applyShotType(r.shot);
  // wipe any live-ball leftovers so only this ball's saved inputs are on the
  // maps (a stray live pitch dot would read as a phantom third input)
  clearWagonLines();
  state.pendingWagonLine = null;
  clearPitchDots();
  drawBallReview(r);
  updateInputLock(); // unlock the panels for the edit
  toast(`Editing ball ${r.num} — draw or select to update, then press Done Editing`);
}

function exitBallInputEdit() {
  if (!editingBall) return;
  editingBall = null;
  document.body.classList.remove("edit-mode");
  const btn = document.getElementById("btn-editmode");
  if (btn) btn.textContent = "Edit Mode";
  clearReview();
  setReviewOrientation(null); // maps follow the live striker again
  // back to a clean live-ball tag context
  state.tags = { btn: false, unc: false, wtb: false, rs: false };
  state.footwork = null;
  state.inAir = false;
  syncTagControls();
  const air = document.getElementById("in-air-btn");
  air?.classList.remove("active");
  air?.setAttribute("aria-pressed", "false");
  updateInputLock();
  render(); // refresh the log (bowl/shot cells may have changed) + persist
}

// The mini player (#camera-preview) doubles as a clip player: when a logged
// ball is selected, its saved recording is loaded here with playback controls.
let ballClipUrl = null;

// Path of a video loaded from disk with LS, while it is on screen. When this is
// set, Start Capture cuts a segment out of THIS file (by playback time, via
// ffmpeg) instead of recording the live camera. Cleared when the clip is closed
// or a live capture takes the player back.
let loadedVideoPath = null;

// Live camera preview kept hot in the video container. The stream from the
// device chosen in video settings is always shown; recording (Start Capture)
// just attaches a MediaRecorder to this same stream — see wireCapture().
let previewStream = null;
let previewDeviceId = null; // device the current preview stream was opened with

// Attach the live preview stream to the video element (idle, muted, no
// controls). No-op if the preview isn't running yet.
function showLivePreview(video) {
  if (!video || !previewStream || !previewStream.active) return;
  video.removeAttribute("src");
  video.srcObject = previewStream;
  video.muted = true;
  video.controls = false;
  video.play?.().catch(() => { /* autoplay may be deferred; harmless */ });
  // back on the live camera — the loaded-video ✕ no longer applies
  const x = document.getElementById("btn-video-close");
  if (x) x.hidden = true;
}

// Open (or re-open) the live preview from the configured camera device and show
// it. Safe to call repeatedly; it only re-acquires when the device changed or
// the stream died, and never interrupts an in-progress recording.
async function startPreview() {
  if (state.capturing) return; // don't disturb the stream while recording
  let cfg = {};
  try { cfg = (await window.cricketApp?.getConfig?.()) || {}; } catch { /* ignore */ }
  const wantDevice = cfg.cameraDeviceId || "";
  if (previewStream && previewStream.active && previewDeviceId === wantDevice) {
    // already previewing the right device — just make sure it's on screen
    if (!document.getElementById("camera-preview")?.src) {
      showLivePreview(document.getElementById("camera-preview"));
    }
    return;
  }
  // switching devices (or first start): drop the old stream
  previewStream?.getTracks().forEach((t) => t.stop());
  previewStream = null;
  try {
    previewStream = await getCaptureStream();
    previewDeviceId = wantDevice;
    const video = document.getElementById("camera-preview");
    if (!video?.src) showLivePreview(video); // don't clobber a clip under review
  } catch (err) {
    console.warn("live preview unavailable", err);
  }
}
async function showBallVideo(r) {
  const video = document.getElementById("camera-preview");
  if (!video || state.capturing) return; // never interrupt a live capture
  const m = /^(\d+)\.(\d+)/.exec(String(r?.num || ""));
  if (!m || !state.recordingFolder || !window.cricketApp?.getBallClip) { hideBallVideo(); return; }
  try {
    const res = await window.cricketApp.getBallClip(
      state.recordingFolder, state.innings, Number(m[1]), Number(m[2]));
    if (state.capturing) return;          // a capture may have started during await
    if (!res?.ok || !res.bytes) { hideBallVideo(); return; }
    if (ballClipUrl) URL.revokeObjectURL(ballClipUrl);
    ballClipUrl = URL.createObjectURL(new Blob([res.bytes], { type: res.mime || "video/webm" }));
    video.srcObject = null;
    video.src = ballClipUrl;
    video.muted = false;
    video.controls = true;                // show play/scrub controls only now
    video.load();
  } catch (e) {
    console.error("load ball clip failed", e);
    hideBallVideo();
  }
}

// Return the mini player to its idle (no-clip) state and hide the controls.
function hideBallVideo() {
  const video = document.getElementById("camera-preview");
  if (!video) return;
  video.controls = false;
  if (ballClipUrl) { URL.revokeObjectURL(ballClipUrl); ballClipUrl = null; }
  if (!state.capturing) {
    video.removeAttribute("src");
    video.muted = true;
    // Return to the live camera feed rather than a blank player.
    if (previewStream && previewStream.active) showLivePreview(video);
    else video.load();
  }
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

  // Hover (not drawing) updates the region label; if the cursor rests on the
  // wheel for 2 seconds, the fielding-placements menu opens for that point.
  let hoverTimer = null;
  const cancelHoverMenu = () => { clearTimeout(hoverTimer); hoverTimer = null; };
  wrap.addEventListener("mousemove", (e) => {
    if (drawing) return;
    const p = clampToField(...posArgs(toPct(e)));
    showRegion(p.x, p.y);
    cancelHoverMenu();
    if (document.getElementById("context-menu")) return; // a menu is already open
    hoverTimer = setTimeout(() => openPlacementsMenu(e.clientX, e.clientY, p), 2000);
  });
  wrap.addEventListener("mouseleave", () => { cancelHoverMenu(); hideRegionSoon(); });

  // Left button: draw with a live preview (click or press-drag).
  wrap.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    cancelHoverMenu();
    closeContextMenu();
    clearReview();        // leave review mode when drawing the live ball
    if (!editingBall) setReviewOrientation(null); // maps follow the striker again
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
    // Editing a saved ball: the new line replaces that ball's stored wagon.
    const er = editingBallRow();
    if (er) {
      er.wagon = { x: p.x, y: p.y };
      er.placement = wagonRegion(p.x, p.y);
      drawBallReview(er);
      showRegion(p.x, p.y);
      scheduleSave();
      return;
    }
    addWagonLine(p.x, p.y, runColor(state.pendingRuns || 0));
    showRegion(p.x, p.y);
    // Left click records the exact point as-is; the shot's position defaults to
    // the region the line landed in. A named placement can still be picked from
    // the hover menu (see above), which overrides this default.
    state.pendingPlacement = wagonRegion(p.x, p.y);
  });

  // Right button: fielding events (Caught / Fumble / … → fielder) for the shot,
  // using the placement chosen on the left click (or the region under cursor).
  wrap.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const p = clampToField(...posArgs(toPct(e)));
    const position = state.pendingPlacement || wagonRegion(p.x, p.y);
    openFieldingEventsMenu(e.clientX, e.clientY, p, position);
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
  document.getElementById("context-submenu2")?.remove();
  document.getElementById("context-submenu")?.remove();
  document.getElementById("context-menu")?.remove();
  document.removeEventListener("mousedown", onDocDownForMenu, true);
}

function onDocDownForMenu(e) {
  if (e.target.closest("#context-menu") || e.target.closest("#context-submenu") || e.target.closest("#context-submenu2")) return;
  closeContextMenu();
}

function recordFieldingEvent(position, event, fielder, p, netRunsSaved = "") {
  state.fieldingEvents = state.fieldingEvents || [];
  // Stamp the DELIVERY the event belongs to, matching how logBall numbers the
  // ball (state.ball + 1 while it is live). Recorded between balls, the event
  // belongs to the delivery that just ended — the last logged row. The old
  // `state.over.state.ball` stamp was one ball behind, so reports could never
  // join an event back to its ball.
  const over = state.ballStarted
    ? `${state.over}.${Math.min(state.ball + 1, 6)}`
    : (state.log.length ? state.log[state.log.length - 1].num : `${state.over}.${state.ball}`);
  state.fieldingEvents.push({ position, event, fielder, netRunsSaved,
    over, innings: state.innings || 1, x: p?.x, y: p?.y, ball: state.log.length });
  scheduleSave(); // persist fielding events to the DB
  const label = document.getElementById("wagon-region");
  if (label) {
    const nrs = netRunsSaved === "" ? "" : ` · NRS ${netRunsSaved > 0 ? `+${netRunsSaved}` : netRunsSaved}`;
    label.textContent = `${position} · ${event} · ${fielder}${nrs}`;
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

// Level 3: fielders for a chosen position + event (cascades into net runs saved).
function openFielderSubmenu(item, position, event, p) {
  document.getElementById("context-submenu2")?.remove();
  document.getElementById("context-submenu")?.remove();
  item.parentElement.querySelectorAll(".ctx-item.active").forEach((x) => x.classList.remove("active"));
  item.classList.add("active");

  const sub = document.createElement("div");
  sub.id = "context-submenu";
  sub.className = "context-menu submenu";
  FIELDERS.forEach((f) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ctx-item has-sub";
    b.innerHTML = `<span class="ctx-label">${f}</span><span class="ctx-arrow">&#8250;</span>`;
    b.addEventListener("mouseenter", () => openNetRunsSubmenu(b, position, event, f, p));
    b.addEventListener("click", () => openNetRunsSubmenu(b, position, event, f, p));
    sub.appendChild(b);
  });
  placeFlyout(sub, item);
}

// Level 4: net runs saved (−4…+4) by the fielder — picking one records the event.
function openNetRunsSubmenu(item, position, event, fielder, p) {
  document.getElementById("context-submenu2")?.remove();
  item.parentElement.querySelectorAll(".ctx-item.active").forEach((x) => x.classList.remove("active"));
  item.classList.add("active");

  const sub = document.createElement("div");
  sub.id = "context-submenu2";
  sub.className = "context-menu submenu";
  for (let n = -4; n <= 4; n += 1) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ctx-item";
    b.textContent = n > 0 ? `+${n}` : String(n);
    b.addEventListener("click", () => { recordFieldingEvent(position, event, fielder, p, n); closeContextMenu(); });
    sub.appendChild(b);
  }
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

// Left-click placements: fielding positions for the region the line landed in.
// Choosing one records it as the shot's placement (used by the right-click
// fielding-events menu and stored on the ball).
function openPlacementsMenu(clientX, clientY, p) {
  closeContextMenu();
  const region = wagonRegion(p.x, p.y);
  const positions = WAGON_POSITIONS[region] || WAGON_REGIONS.map((r) => r.replace(/\b\w/g, (c) => c.toUpperCase()));
  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.className = "context-menu fielding-menu";
  positions.forEach((pos) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "ctx-item";
    item.textContent = pos;
    item.addEventListener("click", () => { recordPlacement(pos, region); closeContextMenu(); });
    menu.appendChild(item);
  });
  positionMenu(menu, clientX, clientY);
  setTimeout(() => document.addEventListener("mousedown", onDocDownForMenu, true), 0);
}

// Approximate on-field point for a named fielding placement so the wagon line
// can be mapped to roughly where the ball was fielded. `region` fixes the base
// direction (its 45° sector centre, 0° = straight behind the batsman); the
// position name's modifiers nudge the angle toward/away from straight or square,
// and the depth keyword sets how far out the point sits.
//   depth: silly/short = close ring, normal = mid ring, deep/long/sweeper/cow = boundary
function placementPoint(position, region) {
  const sector = Math.max(0, WAGON_REGIONS.indexOf(region));
  let angle = sector * 45 + 22.5;          // region centre
  const toFront = sector < 4 ? 1 : -1;     // leg side (0-180) vs off side (180-360)
  const n = position.toLowerCase();
  if (n.includes("straight")) angle += 22 * toFront; // down the ground
  if (n.includes("forward"))  angle += 15 * toFront; // in front of square
  if (n.includes("backward")) angle -= 15 * toFront; // behind square
  if (n.includes("fine"))     angle -= 15 * toFront; // finer (behind square)
  if (n.includes("square"))   angle -=  8 * toFront; // squarer
  let r = 180;                             // normal ring
  if (n.includes("silly")) r = 70;
  else if (n.includes("short")) r = 115;
  else if (/deep|long|sweeper|cow corner/.test(n)) r = 270;
  const a = (angle * Math.PI) / 180;
  const sign = state.fieldMirrored ? -1 : 1; // mirrored field: reflect across the pitch
  return clampToField(FIELD_OX + sign * r * Math.sin(a), FIELD_OY - r * Math.cos(a));
}

function recordPlacement(position, region) {
  const pt = placementPoint(position, region);
  // Editing a saved ball: the placement + mapped point go onto that ball.
  const er = editingBallRow();
  if (er) {
    er.placement = position;
    er.wagon = { x: pt.x, y: pt.y };
    drawBallReview(er);
    scheduleSave();
    const lbl = document.getElementById("wagon-region");
    if (lbl) {
      lbl.textContent = position;
      clearTimeout(lbl._t);
      lbl._t = setTimeout(() => { lbl.textContent = ""; }, 2600);
    }
    return;
  }
  state.pendingPlacement = position;
  // Map the red line to the selected placement's direction + depth.
  addWagonLine(pt.x, pt.y, runColor(state.pendingRuns || 0));
  const label = document.getElementById("wagon-region");
  if (label) {
    label.textContent = position;
    clearTimeout(label._t);
    label._t = setTimeout(() => { label.textContent = ""; }, 2600);
  }
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

function handleKeypad(k, btn, e) {
  if (k.type === "wicket") {
    // Red Wicket ▾: open the full Wickets overlay (dismissal + fielder + …).
    closeContextMenu();
    overlayWickets();
    return;
  }
  if (k.type === "pen") {
    // Penalty runs awarded to the batting side (5 by default), recorded as an
    // extra on the current ball.
    stageDelivery({ runs: 0, ext: 5, extLabel: "P", legal: true }, { type: "ext", ext: "P" });
    flash(btn);
    return;
  }
  if (k.type === "run4" || k.type === "run6") {
    // B4 / B6 stage a boundary 4/6 directly. The ▾ caret (or a double-click,
    // wired in fillKeypad) opens the "Ran" alternative instead.
    if (e?.target?.closest(".kb-caret")) {
      openRunVariantMenu(btn, k.val);
      return;
    }
    stageRun(k.val, true);
    flash(btn);
    return;
  }
  if (k.type === "other") {
    // "?" opens the quick 5/7/8 list plus a custom run entry.
    openOtherRunsMenu(btn);
    return;
  }
  if (k.type === "run") {
    stageRun(k.val, false);
  } else if (k.type === "ext") {
    handleExtra(k.ext);
  }
  flash(btn);
}

// Stage a plain run value (boundary flag distinguishes a hit-to-the-rope 4/6
// from one run along the ground, which affects the batter's 4s/6s tally).
function stageRun(val, boundary) {
  stageDelivery({ runs: val, ext: 0, boundary, legal: true }, { type: "run", val });
  // Auto End Ball (Configuration → Coding Preferences): entering a run commits
  // the delivery immediately. Extras/wickets still stage until End Ball so runs
  // can be combined on the same ball.
  if (state.endBallMode === "auto" && state.ballStarted && state.pending) commitBall();
}

// The End Ball preference lives in config.json; re-read on focus so a change
// made on the Configuration screen applies without reopening the coding screen.
async function loadCodingPrefs() {
  try {
    const cfg = (await window.cricketApp?.getConfig?.()) || {};
    state.endBallMode = cfg.endBallMode || "manual";
  } catch { /* keep the current mode */ }
}

// B4 ▾ / B6 ▾ : the button itself stages a boundary, so the menu only offers
// the "Ran" alternative (4/6 run along the ground, no boundary credit).
function openRunVariantMenu(btn, val) {
  openKeypadMenu(btn, (menu) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "ctx-item"; b.textContent = `Ran ${val}`;
    b.addEventListener("click", () => { stageRun(val, false); closeContextMenu(); flash(btn); });
    menu.appendChild(b);
  });
}

// "?" : quick 5/7/8 plus a custom number (0–99, excluding the bar's own values).
function openOtherRunsMenu(btn) {
  openKeypadMenu(btn, (menu) => {
    [5, 7, 8].forEach((n) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ctx-item"; b.textContent = String(n);
      b.addEventListener("click", () => { stageRun(n, false); closeContextMenu(); flash(btn); });
      menu.appendChild(b);
    });
    const row = document.createElement("div");
    row.className = "ctx-input-row";
    const inp = document.createElement("input");
    inp.type = "number"; inp.min = "0"; inp.max = "99"; inp.placeholder = "Runs";
    inp.className = "ctx-input";
    const add = document.createElement("button");
    add.type = "button"; add.className = "ctx-item ctx-add"; add.textContent = "Add";
    const commit = () => {
      const v = Number(inp.value);
      if (inp.value === "" || !Number.isInteger(v) || v < 0 || v >= 100) { toast("Enter a whole number 0–99"); return; }
      if (BAR_RUN_VALUES.has(v)) { toast(`${v} already has its own button`); return; }
      stageRun(v, false); closeContextMenu(); flash(btn);
    };
    add.addEventListener("click", commit);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } });
    row.append(inp, add);
    menu.appendChild(row);
    setTimeout(() => inp.focus(), 0);
  });
}

// Build a small menu anchored above a keypad button (reusing context-menu chrome).
function openKeypadMenu(btn, build) {
  closeContextMenu();
  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.className = "context-menu keypad-menu";
  build(menu);
  const r = btn.getBoundingClientRect();
  positionMenu(menu, r.left, r.top);
  setTimeout(() => document.addEventListener("mousedown", onDocDownForMenu, true), 0);
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

function logBall({ runs = 0, ext = 0, boundary = false, legal = true, bye = false, wicket = false, extLabel = "", overthrow = 0, rbw = 0, outBatsman = null, dismissal = "" }) {
  if (!ballInputAllowed()) return; // over + ball must be started first
  // The over already holds its six legal balls — the scorer answered the
  // six-ball prompt with "Continue Over". That extra time is for illegal
  // deliveries (wide, no-ball) and for correcting balls already in the log, not
  // for a seventh legal one: refuse it and leave the delivery staged so it can
  // still be entered as an extra.
  if (legal && state.ball >= 6) {
    toast("6 legal balls are already recorded — enter a wide/no-ball, edit a logged ball, or end the over");
    flash(document.getElementById("btn-over"));
    return;
  }
  recordOpeners();                 // first ball of the innings → log the openers
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
  // Wagon/pitch coords are raw screen space, and the artwork mirrors with the
  // striker's handedness — record which orientation this ball was coded in so
  // reports can normalise (true = right-hander / flipped field artwork).
  logged.mirrored = !!state.fieldMirrored;
  // also persist the coding context so the ball can be fully reviewed later
  logged.tags = { ...state.tags };
  logged.footwork = state.footwork;
  logged.inAir = state.inAir;
  logged.placement = state.pendingPlacement;
  logged.overthrow = overthrow;
  // RBW: external data only — no wicket, no added runs. Its value (−3…+3) is
  // picked from the events-grid RBW button, otherwise 0.
  logged.rbw = rbw;
  logged.appeals = state.appeals;
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

  // over running tally — standard ball-by-ball tags: W (wicket), B4/B6 (boundary
  // four/six), the plain number for ran runs, WD/NB (+ runs off the bat) for
  // illegal balls, byes/leg-byes as e.g. 2b / 1lb.
  let tally;
  if (wicket) tally = "W";
  else if (!legal) tally = `${extLabel}${runs > 0 ? `+${runs}` : ""}`;
  else if (bye) tally = `${ext || 1}${extLabel.toLowerCase()}`;
  else if (boundary) tally = `B${runs}`;
  else tally = String(runs);
  state.thisOver.push(tally);
  logged.tally = tally; // reused by the full-innings ball-by-ball strip
  state.overRunsThisOver += runs + ext;

  if (wicket) {
    state.wkts += 1;
    state.bowl.wkts += 1;
    // Which batsman is out: the selection from the Wickets overlay (for a
    // non-striker run-out), else the striker by default.
    const end = outBatsman && outBatsman === state.nonStriker ? "nonStriker" : "striker";
    const outName = end === "nonStriker" ? state.nonStriker : state.striker;
    if (!state.dismissed.includes(outName)) state.dismissed.push(outName);
    logged.wicket = true;
    logged.dismissal = dismissal || "Wicket";
    logged.outBatsman = outName;
    markBatsmanOut(outName, state.bat[end]?.balls ?? "");
    if (state.wkts < 10) newBatsman(end); // 10th wicket = all out (no new batter)
  }

  const allOut = state.wkts >= 10;
  let oversUp = false;
  let askSixBalls = false;

  if (legal && !allOut) {
    state.ball += 1;
    if (runs % 2 === 1) swapStrike();
    // Six legal balls are in. The over is NOT closed automatically: the scorer
    // is asked whether to end it or keep it open (a mis-scored delivery still
    // to be corrected needs the over to stay open). Skipped while the End Over
    // confirmation is padding the over out with dot balls, and skipped once the
    // scorer has already answered "continue" for this over.
    if (state.ball >= 6 && !fillingOver && !state.overSixAnswered) askSixBalls = true;
    // Checked every legal ball, not just at the end of an over: a Revised Overs
    // limit like 5.4 ends the innings part-way through the 6th over.
    if (ballsBowled() >= maxBalls()) oversUp = true;
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
  setReviewOrientation(null); // the next delivery is coded for the striker on strike
  state.ballStarted = false;
  state.pending = null;
  state.staged = null;
  setBallButton("Start Ball");

  state.pendingRuns = 0;
  state.bowlType = null; state.shotType = null;
  state.tags = { btn: false, unc: false, wtb: false, rs: false };
  state.footwork = null;
  state.inAir = false;
  state.pendingPlacement = null;
  setAppeals(false); // appeals toggle disarms after the ball
  fillKeypad();
  syncTagControls(); // clear the tag bar for the next ball
  document.querySelectorAll("#bowl-grid .selected, #bat-grid .selected").forEach((x) => x.classList.remove("selected"));
  document.querySelector("#keypad .keypad-btn.marked")?.classList.remove("marked"); // new ball starts unmarked
  render();

  // 2nd innings: the chase is won the moment the target is reached — end the
  // match ahead of the wickets/overs limits.
  const targetReached = state.innings === 2 && state.runs >= chaseTarget();

  if (allOut || oversUp || targetReached) { endInnings(); return; }
  // The innings runs on, and the over has just reached six legal balls: ask.
  if (askSixBalls) confirmSixBalls();
}

// True while the End Over confirmation is padding an incomplete over out with
// dot balls — logBall must close the over silently rather than re-asking.
let fillingOver = false;

// Six legal balls have landed. Rather than closing the over behind the
// scorer's back, ask: End Over rotates strike/bowler as usual, Continue leaves
// the over open (and is remembered, so the 7th, 8th … ball does not re-ask).
function confirmSixBalls() {
  const body = `
    <div class="confirm-box">
      <p>6 legal balls have been recorded for over ${state.over + 1}.
        End the over, or continue it to add a wide / no-ball or correct a ball
        already recorded? No further legal ball can be entered either way.</p>
      <div class="btn-row-modal center">
        <button class="m-btn m-red" id="sb-end">End Over</button>
        <button class="m-btn m-green" id="sb-continue">Continue Over</button>
      </div>
    </div>`;
  openOverlay(popupShell("OVER COMPLETE", body));
  document.getElementById("sb-end")?.addEventListener("click", () => {
    closeOverlay();
    completeOver();
    render();
    openBowlerPicker();
  });
  document.getElementById("sb-continue")?.addEventListener("click", () => {
    closeOverlay();
    state.overSixAnswered = true; // don't ask again for this over
    scheduleSave();
  });
}

function swapStrike() {
  [state.striker, state.nonStriker] = [state.nonStriker, state.striker];
  [state.bat.striker, state.bat.nonStriker] = [state.bat.nonStriker, state.bat.striker];
  // an empty slot awaiting the incoming batsman moves with the swap
  if (state.pendingBatsman === "striker") state.pendingBatsman = "nonStriker";
  else if (state.pendingBatsman === "nonStriker") state.pendingBatsman = "striker";
}

// A wicket empties the fallen batsman's slot (the end that just fell), so its
// dropdown falls back to the "Select…" placeholder; scoring resumes once the
// incoming batsman is picked (see pickBatsman / renderBatsmanSlot).
function newBatsman(end = "striker") {
  if (end === "nonStriker") {
    state.nonStriker = "";
    state.bat.nonStriker = { runs: 0, balls: 0, fours: 0, sixes: 0 };
  } else {
    state.striker = "";
    state.bat.striker = { runs: 0, balls: 0, fours: 0, sixes: 0 };
  }
  state.pendingBatsman = end;
}

// Batsmen selectable at one end: the batting order minus anyone already out and
// minus whoever is at the other end (nobody can be at both). The end's own
// occupant stays in the list — it is what the dropdown shows as selected.
function battingOptions(end) {
  const other = end === "nonStriker" ? state.striker : state.nonStriker;
  return CANADA.filter((n) => n && n !== other && !state.dismissed.includes(n));
}

function pickNewBatsman(name) {
  const end = state.pendingBatsman;
  if (!end || !name) return;
  if (end === "nonStriker") state.nonStriker = name;
  else state.striker = name;
  // keep the down-the-order pointer past the chosen batsman
  const i = CANADA.indexOf(name);
  if (i >= 0 && i >= state.nextBatIndex) state.nextBatIndex = i + 1;
  state.pendingBatsman = null;
  markBatsmanIn(name);
  render();
}

// A batting end's dropdown changed. After a wicket the end is empty and this is
// the incoming batsman (stats already zeroed, walk-in recorded). Otherwise the
// scorer is correcting who is at that end mid-innings: the runs already logged
// belong to the end, so they stay put, and the open in/out timing row is
// re-labelled so it follows the corrected name rather than stranding the old one.
function pickBatsman(end, name) {
  if (!name || state.matchOver) return;
  if (state.pendingBatsman === end) { pickNewBatsman(name); return; }
  const prev = end === "nonStriker" ? state.nonStriker : state.striker;
  if (name === prev) return;
  if (end === "nonStriker") state.nonStriker = name; else state.striker = name;
  const open = (state.batTimes || []).find((r) =>
    r.batsman === prev && !r.outTime && r.innings === state.innings);
  if (open) open.batsman = name;
  const i = CANADA.indexOf(name);
  if (i >= 0 && i >= state.nextBatIndex) state.nextBatIndex = i + 1;
  scheduleSave();
  render();
}

// state.bowler carries the bowling spec ("CHRIS WOAKES -R FAST"); the pool and
// the bowler history hold plain names. Strip the suffix to compare the two.
function bowlerPlainName(b) {
  return String(b || "").split(" -")[0];
}

// Every bowler in the pool, rendered with the spec suffix (via bowlerLabel) so
// the slot reads exactly as it always has, while still matching state.bowler
// exactly for selection.
//
// Order: bowlers who have already bowled come first, most recent over first —
// so the last over's bowler sits at the top of the list, where the scorer looks
// for them — then the rest of the pool in batting-card order.
function bowlerOptions() {
  const xi = state.bowlPlayers || [];
  const label = (n) => {
    const p = xi.find((q) => (q.name || "").toUpperCase() === n);
    return p ? bowlerLabel(p) : n;
  };
  const pool = OMAN_BOWLERS.filter(Boolean).map(label);
  // bowlerHistory holds one entry per completed over, oldest first, as the
  // labels that were shown in the slot. Walk it backwards, keeping the first
  // sighting of each bowler, to get "most recently bowled" order.
  const recent = [];
  for (let i = (state.bowlerHistory || []).length - 1; i >= 0; i -= 1) {
    const b = state.bowlerHistory[i];
    if (b && pool.includes(b) && !recent.includes(b)) recent.push(b);
  }
  return [...recent, ...pool.filter((b) => !recent.includes(b))];
}

// Drop the bowler dropdown open so the next over's bowler can be picked without
// hunting for the slot. Called when an over closes (the slot is empty then) and
// when Start Over is blocked because no bowler is set. showPicker() needs a
// recent user gesture and is not in every Chromium build, so both failure modes
// fall back to focusing the select.
function openBowlerPicker() {
  const sel = document.querySelector("#name-bowler select");
  if (!sel || sel.disabled) return;
  setTimeout(() => {
    try {
      sel.focus();
      if (typeof sel.showPicker === "function") sel.showPicker();
    } catch { /* no user activation — the slot is focused, which is enough */ }
  }, 0);
}

function pickNewBowler(label) {
  if (!label || state.matchOver) return;
  state.bowler = label;
  state.pendingBowler = false;
  scheduleSave();
  render();
}

// The bowler slot is a permanent dropdown, like the two batting ends: any
// bowler in the pool can be selected at any time, not only between overs.
// Updated in place so an open dropdown survives a re-render.
function renderBowlerSlot(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const options = bowlerOptions();
  // After an over the slot is empty (completeOver clears it) and needs a
  // placeholder to sit on until the next bowler is chosen.
  const current = state.bowler || "";
  // The bowler on record may sit outside the pool — a part-timer with no
  // bowling type, or a resumed state whose bowler belongs to the other side.
  // Carry them in regardless, so the slot never displays someone it isn't.
  if (current && !options.includes(current)) options.unshift(current);
  let sel = el.querySelector("select");
  if (!sel) {
    el.textContent = "";
    sel = document.createElement("select");
    sel.className = "sg-name-select";
    sel.addEventListener("change", (e) => pickNewBowler(e.target.value));
    el.appendChild(sel);
  }
  const wanted = (current ? options : ["", ...options]).join("\n");
  if (sel._wanted !== wanted) {
    sel._wanted = wanted;
    sel.innerHTML = (current ? "" : `<option value="">Select…</option>`)
      + options.map((o) => `<option>${esc(o)}</option>`).join("");
  }
  if (sel.value !== current) sel.value = current;
  sel.disabled = !!state.matchOver;
}

// The two batting ends are always dropdowns, so the scorer can correct who is
// at an end at any time — not only when a wicket has just fallen. The <select>
// is created once and then updated in place: its options are rewritten only
// when the eligible list actually changes (a dismissal, a strike rotation), so
// an open dropdown is never torn out from under the user mid-render.
function renderBatsmanSlot(id, end) {
  const el = document.getElementById(id);
  if (!el) return;
  const name = end === "nonStriker" ? state.nonStriker : state.striker;
  const options = battingOptions(end);
  let sel = el.querySelector("select");
  if (!sel) {
    el.textContent = "";
    sel = document.createElement("select");
    sel.className = "sg-name-select";
    sel.addEventListener("change", (e) => pickBatsman(end, e.target.value));
    el.appendChild(sel);
  }
  // An empty end (a wicket just fell) needs a placeholder to sit on until the
  // incoming batsman is picked; an occupied one shows the occupant.
  const wanted = (name ? options : ["", ...options]).join("\n");
  if (sel._wanted !== wanted) {
    sel._wanted = wanted;
    sel.innerHTML = (name ? "" : `<option value="">Select…</option>`)
      + options.map((o) => `<option>${esc(o)}</option>`).join("");
  }
  if (sel.value !== (name || "")) sel.value = name || "";
  sel.disabled = !!state.matchOver;
}

// ---- Batsman in / out timing ----------------------------------------------
// A record is opened when a batsman walks in and closed (out time, minutes,
// balls) when they are dismissed. Surfaced on the Batsman In / Out Time screen.
function markBatsmanIn(name, inTime = clockNow(), inTs = Date.now(), opener = false) {
  if (!name || name === "NEW BATSMAN") return;
  state.batTimes.push({ batsman: name, inTime, inTs, outTime: "", mins: "", balls: "",
    innings: state.innings, opener });
  scheduleSave();
}

// Record both opening batsmen's walk-in at the start of an innings. The 1st
// innings establishes the (editable) match start time; the 2nd uses the live
// clock. Guarded so it runs once per innings (on the first delivery).
function recordOpeners() {
  if (state.openersRecorded) return;
  if (state.innings === 1 && !state.matchStartTime) {
    state.matchStartTime = clockNow();
    state.matchStartTs = Date.now();
  }
  const inTime = state.innings === 1 ? state.matchStartTime : clockNow();
  const inTs = state.innings === 1 ? (state.matchStartTs || Date.now()) : Date.now();
  markBatsmanIn(state.striker, inTime, inTs, true);
  markBatsmanIn(state.nonStriker, inTime, inTs, true);
  state.openersRecorded = true;
}

// Parse a "HH:MM" / "HH:MM:SS" clock string into today's timestamp (0 if bad).
function parseClock(s) {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(s).trim());
  if (!m) return 0;
  const d = new Date();
  d.setHours(+m[1], +m[2], +(m[3] || 0), 0);
  return d.getTime();
}

function markBatsmanOut(name, balls) {
  // Close the most recent still-open spell for this batsman.
  for (let i = state.batTimes.length - 1; i >= 0; i--) {
    const r = state.batTimes[i];
    if (r.batsman === name && !r.outTime) {
      r.outTime = clockNow();
      r.mins = r.inTs ? Math.max(0, Math.round((Date.now() - r.inTs) / 60000)) : "";
      r.balls = balls;
      break;
    }
  }
  scheduleSave();
}

// Record an Other-Wicket dismissal onto the current delivery: it appears in the
// ball-by-ball log for the same ball and bumps the wicket count, but the ball is
// not counted as a legal delivery (the over/ball counters are left untouched).
function logOtherWicket(batsman, dismissal) {
  pushHistory();
  const ballNum = `${state.over}.${state.ball + 1}`;
  state.log.push(row(ballNum, shortName(state.bowler), shortName(batsman),
    shortName(state.nonStriker), state.bowlType || "", "", 0, "W"));
  const logged = state.log[state.log.length - 1];
  logged.wicket = true;
  logged.otherWicket = true;
  logged.dismissal = dismissal;
  logged.outBatsman = batsman;
  state.wkts += 1;
  state.bowl.wkts += 1;
  state.ballStarted = false;
  setBallButton("Start Ball");
  const end = batsman === state.nonStriker ? "nonStriker" : "striker";
  if (!state.dismissed.includes(batsman)) state.dismissed.push(batsman);
  markBatsmanOut(batsman, state.bat[end]?.balls ?? "");
  if (state.wkts < 10) newBatsman(end); // 10th wicket = all out (no new batter)
}

// Overs are written in cricket's overs.balls notation, so a rain reduction to
// "5.4" means 5 overs and 4 balls (34 balls) — not five-and-two-fifths overs.
// Returns the ball count, or NaN when the text isn't a valid overs figure (the
// balls part must be a single digit 0–5).
function oversToBalls(v) {
  const m = /^(\d+)(?:\.(\d))?$/.exec(String(v ?? "").trim());
  if (!m) return NaN;
  const balls = m[2] ? Number(m[2]) : 0;
  if (balls > 5) return NaN;
  return Number(m[1]) * 6 + balls;
}

// Ball count back into overs.balls notation for display (34 → "5.4", 30 → "5").
function ballsToOvers(n) {
  const b = Math.max(0, Math.floor(Number(n) || 0));
  return b % 6 ? `${Math.floor(b / 6)}.${b % 6}` : String(Math.floor(b / 6));
}

// Legal balls bowled so far in the current innings.
function ballsBowled() {
  return state.over * 6 + state.ball;
}

// The innings limit as a ball count: the most recent saved Revised Overs
// (rain/DLS reduction) if any, otherwise the match format's total overs (20 for
// T20, 50 for ODI). Tracked in balls because a revised limit can be a part-over
// like 5.4, which ends the innings mid-over. The innings ends once it's reached.
function maxBalls() {
  const revO = state.revisedOvers?.[state.revisedOvers.length - 1];
  const rev = oversToBalls(revO?.value);
  // Rounded: a part-over limit leaves state.overs as a repeating fraction
  // (2.2 overs → 2.3333…), and 14.000000000000002 would cost an extra ball.
  return rev > 0 ? rev : Math.round((Number(state.overs) || 0) * 6);
}

// The same limit written as overs.balls, for display.
function maxOvers() {
  return ballsToOvers(maxBalls());
}

// The runs the batting side needs to win the current (2nd) innings: a saved
// Revised Target if any, otherwise 1st-innings total + 1 (state.target).
function chaseTarget() {
  const revT = state.revisedTargets?.[state.revisedTargets.length - 1];
  return Number(revT?.value) || state.target || 0;
}

// Swap which side is batting and rebuild the batting order / bowler pool /
// fielders / openers from the two loaded playing XIs (or the standalone demo
// pools). Shared by the innings change and the pre-match toss (Match Info Edit).
// Point the batting order, bowler pool and fielder list at whichever side
// state.battingCode says is batting, swapping battingTeam / bowlingTeam first if
// they disagree. Kept separate from swapBattingSides because it is also how a
// RESUMED match is re-oriented: applyMatch always builds these pools in the
// 1st-innings arrangement, and none of them are part of the saved state, so a
// match reopened during its 2nd innings would otherwise offer the first
// innings' batsmen and bowlers under the correct (saved) team codes.
function syncSquadPools() {
  const bat0 = state.battingTeam, bowl0 = state.bowlingTeam;
  if (!bat0 || !bowl0) return;
  if (bat0.code !== state.battingCode && bowl0.code === state.battingCode) {
    [state.battingTeam, state.bowlingTeam] = [bowl0, bat0];
  }
  const bat = state.battingTeam, bowl = state.bowlingTeam;
  state.bowlPlayers = bowl.playingXIPlayers || [];
  CANADA = namesOf(bat.playingXIPlayers);
  const pool = (bowl.playingXIPlayers || []).filter((p) => p.bowlingType);
  OMAN_BOWLERS = namesOf(pool.length ? pool : bowl.playingXIPlayers);
  FIELDERS = namesOf(bowl.playingXIPlayers);
}

function swapBattingSides() {
  if (state.battingTeam && state.bowlingTeam) {
    [state.battingTeam, state.bowlingTeam] = [state.bowlingTeam, state.battingTeam];
    const A = state.battingTeam, B = state.bowlingTeam;
    state.battingCode = A.code;
    state.teamA = A.code; state.teamB = B.code;
    syncSquadPools();
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
}

function completeOver() {
  state.over += 1;
  state.ball = 0;
  state.overRunsThisOver = 0;
  state.thisOver = [];
  swapStrike();
  state.bowlEnd = state.bowlEnd === "FAR END" ? "NEAR END" : "FAR END";
  // The over's bowler goes into the history and the slot empties, so the bowler
  // dropdown falls back to its "Select…" placeholder for the next over. Start
  // Over stays blocked until one is picked.
  state.bowlerHistory = state.bowlerHistory || [];
  state.bowlerHistory.push(state.bowler);
  state.bowler = "";
  state.pendingBowler = true;
  state.bowl = { spell: state.bowl.spell + 1, balls: 0, runs: 0, mdns: 0, wkts: 0 };
  // a fresh over must be started, and each ball within it
  state.overStarted = false;
  state.ballStarted = false;
  state.overSixAnswered = false; // the next over gets its own six-ball prompt
  setOverButton("Start Over");
  setBallButton("Start Ball");
  scheduleSave();
}

// ---- Innings change (all out at 10 wickets) -------------------------------

// "1st Innings" / "2nd Innings" — how the innings is labelled on the Match
// Events screens (Revised Overs/Target rows, the End Innings confirmation).
function inningsLabel() {
  return state.innings === 2 ? "2nd Innings" : "1st Innings";
}

function endInnings() {
  if (state.matchOver) return;
  if (state.innings >= 2) {       // second innings finished → match over
    state.matchOver = true;
    // lock the scoring controls now that no further deliveries are possible
    setOverButton("Start Over");
    setBallButton("Start Ball");
    scheduleSave(); // persist the final state with a COMPLETED status
    render();
    // Both innings are done — go straight to the Match Results screen so the
    // scorer can record the result, awards and points.
    overlayMatchEvents("Match Results");
    return;
  }

  // Target for the chase = 1st-innings total + 1 (before the score is reset
  // below). A saved Revised Target, if any, overrides it.
  state.target = state.runs + 1;
  state.firstInningsBalls = state.log.length; // keep for video-count validation
  state.prevInningsLog = state.log;           // keep 1st-innings balls editable (Edit Mode)
  state.innings = 2;

  swapBattingSides();

  // reset the scoreboard for the new innings
  state.runs = 0; state.wkts = 0; state.over = 0; state.ball = 0;
  state.nextBatIndex = 2; state.dismissed = [];
  state.bat = {
    striker: { runs: 0, balls: 0, fours: 0, sixes: 0 },
    nonStriker: { runs: 0, balls: 0, fours: 0, sixes: 0 },
  };
  state.bowl = { spell: 1, balls: 0, runs: 0, mdns: 0, wkts: 0 };
  state.log = []; state.overRunsThisOver = 0; state.thisOver = []; state.history = [];
  expandedOvers.clear(); // over numbers restart with the new innings
  state.pendingBatsman = null; state.pendingBowler = false; state.bowlerHistory = [];
  state.bowlEnd = "FAR END";
  state.openersRecorded = false; // 2nd-innings openers recorded on its first ball
  state.overStarted = false; state.ballStarted = false; state.overSixAnswered = false;
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
  // Batsmen come from the side that has just come in to bat and bowlers from
  // the side that has just taken the field — swapBattingSides() (called by
  // endInnings before this screen opens) has already repointed both pools.
  const batsmen = CANADA.filter((n) => n && !state.dismissed.includes(n));
  const bowlers = OMAN_BOWLERS.filter(Boolean);
  const sel = (id, opts, cur) =>
    `<select class="f-select" id="${id}">${["Select", ...opts].map((o) =>
      `<option ${o === cur ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`;
  const end = (v) =>
    `<label class="ck"><input type="radio" name="id-end" value="${v}"${
      state.bowlEnd === v ? " checked" : ""}/> ${v}</label>`;
  const body = `
    <div class="innings-details">
      <label class="f-row"><span class="f-label">Team</span><input class="f-input" value="${state.battingCode}" disabled/></label>
      <label class="f-row"><span class="f-label">Opening Batsman (Striker)</span>${sel("id-striker", batsmen, state.striker)}</label>
      <label class="f-row"><span class="f-label">Other Batsman (Non Striker)</span>${sel("id-nonstriker", batsmen, state.nonStriker)}</label>
      <label class="f-row"><span class="f-label">Opening Bowler</span>${sel("id-bowler", bowlers, state.bowler)}</label>
      <div class="seg-row"><span class="f-label">Bowling End</span>${end("NEAR END")}${end("FAR END")}</div>
      <div class="btn-row-modal center"><button class="m-btn m-green" id="id-start">Start Innings</button></div>
    </div>`;
  // Not dismissable: the innings must not begin until all three are chosen.
  openOverlay(popupShell(`INNINGS DETAILS — ${inningsLabel().toUpperCase()}`, body, false, false),
    { locked: true });
  document.getElementById("id-start")?.addEventListener("click", () => {
    const pick = (id) => {
      const v = document.getElementById(id)?.value;
      return v && v !== "Select" ? v : "";
    };
    const s = pick("id-striker"), ns = pick("id-nonstriker"), bw = pick("id-bowler");
    if (!s || !ns || !bw) { toast("Choose both openers and the opening bowler"); return; }
    if (s === ns) { toast("The two openers must be different players"); return; }
    state.striker = s;
    state.nonStriker = ns;
    state.bowler = bw;
    state.bowlEnd = (document.querySelector('input[name="id-end"]:checked') || {}).value || "NEAR END";
    closeOverlay({ force: true });
    scheduleSave();
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
    // batting-order tracking so undoing a wicket restores the fallen batsman
    nextBatIndex: state.nextBatIndex, dismissed: state.dismissed,
    // pending batsman/bowler dropdowns + bowler history follow the undo too
    pendingBatsman: state.pendingBatsman || null, pendingBowler: !!state.pendingBowler,
    bowlerHistory: state.bowlerHistory || [],
  }));
  if (state.history.length > 60) state.history.shift();
}

function undo() {
  const prev = state.history.pop();
  // Nothing to undo: flash the button and say why, rather than silently doing
  // nothing (which reads as "the button isn't working").
  if (!prev) {
    flash(document.getElementById("btn-undo"));
    toast("Nothing to undo — no ball has been recorded yet");
    return;
  }
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

// ---- Field orientation (striker handedness) --------------------------------
// The wagon wheel and the pitch map are drawn from OPPOSITE viewpoints: the
// wheel looks out toward the bowler (third man / fine leg sit behind the
// batsman, at the top), while the pitch map looks back down the pitch at the
// batsman. The same striker therefore mirrors them in opposite directions, so
// they cannot share one flag — doing that left one of the two inverted for
// every striker, whichever way the flag was set.
//   left-handed  → field-map.png          + pitch-map-flipped.png
//   right-handed → field-map-flipped.png  + pitch-map.png
// Either way the two agree on which screen side the off side is.
function strikerLeftHanded() {
  const xi = state.battingTeam?.playingXIPlayers || [];
  const p = xi.find((q) => (q.name || "").toUpperCase() === (state.striker || "").toUpperCase());
  return /^l/i.test(p?.battingStyleCode || p?.battingStyle || "");
}

// While a saved ball is on the maps (reviewed from the log, or open in Edit
// Mode) the artwork is pinned to the orientation THAT ball was coded in — the
// `mirrored` flag stored on its row — rather than the current striker's. Without
// this a delivery bowled to a left-hander, reviewed while a right-hander is on
// strike, drew its wagon line and pitch dots over mirrored artwork, so the shot
// pointed at the opposite side of the ground. null = follow the live striker.
let reviewMirrored = null;

// Pin the wagon wheel / pitch map to a ball's coded orientation (or pass null to
// hand them back to the striker on strike).
function setReviewOrientation(mirrored) {
  const next = mirrored === null || mirrored === undefined ? null : !!mirrored;
  if (reviewMirrored === next) return;
  reviewMirrored = next;
  updateFieldOrientation();
}

function updateFieldOrientation() {
  // state.fieldMirrored tracks the WAGON WHEEL — it also drives the wagon
  // sector maths (wagonRegion) and fielding placements (placementPoint), which
  // must follow the wheel's artwork, not the pitch map's.
  const mirrored = reviewMirrored !== null ? reviewMirrored : !strikerLeftHanded();
  const leftHanded = !mirrored;
  if (state.fieldMirrored === mirrored) return;
  state.fieldMirrored = mirrored;
  const field = document.querySelector(".field-map-img");
  if (field) field.src = mirrored ? "assets/field-map-flipped.png" : "assets/field-map.png";
  const pitch = document.querySelector(".pitch-map-img");
  if (pitch) pitch.src = leftHanded ? "assets/pitch-map-flipped.png" : "assets/pitch-map.png";
}

// Batting styles can be edited in the masters (player editor) while this
// screen is open, so re-pull them from the DB whenever the window regains
// focus and re-orient the wagon wheel / pitch map if the striker's changed.
async function refreshBattingStyles() {
  const team = state.battingTeam;
  if (!team?.playingXIPlayers?.length || !window.cricketApp?.db?.players) return;
  try {
    const teamId = team.id || team.playingXIPlayers[0].teamId;
    const fresh = new Map((await window.cricketApp.db.players(teamId) || []).map((p) => [p.id, p]));
    team.playingXIPlayers.forEach((p) => {
      const f = fresh.get(p.id);
      if (f) { p.battingStyle = f.battingStyle; p.battingStyleCode = f.battingStyleCode; }
    });
    updateFieldOrientation();
  } catch (e) {
    console.error("refresh batting styles failed", e);
  }
}
window.addEventListener("focus", refreshBattingStyles);

function render() {
  updateFieldOrientation(); // striker may have changed (swap / wicket / new over)
  // The Over button follows state.overStarted, always: it reads "End Over" from
  // the moment the over is started until the over closes — at six legal balls
  // (completeOver) or when it is ended early. Syncing it here rather than only
  // at the click sites means every path that changes the flag — a resumed
  // match, an undo across the over boundary, an innings change — lands on the
  // right label instead of leaving a stale one.
  setOverButton(state.overStarted ? "End Over" : "Start Over");
  setText("bat-team-code", state.battingCode);
  setText("team-a-label", state.teamA);
  setText("team-b-label", state.teamB);
  setText("score-main", `${state.runs}/${state.wkts}`);
  setText("overs-value", `${state.over}.${state.ball}`);
  const oversFloat = state.over + state.ball / 6;
  const rr = oversFloat > 0 ? (state.runs / oversFloat).toFixed(2) : "0.00";
  setText("runrate-value", rr);
  renderChaseRow();
  renderBatsmanSlot("name-striker", "striker");
  renderBatsmanSlot("name-nonstriker", "nonStriker");
  setText("name-bowlend", state.bowlEnd);
  renderBowlerSlot("name-bowler");

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
    to.innerHTML = state.thisOver.map((t, i) => ballChipHtml(t, i === last)).join("");
  }

  renderLog();
  updateInputLock(); // covers boot and undo/history restores
  scheduleSave();
}

// The chase panel (Target / Required Run Rate / Runs Required) is shown only in
// the 2nd innings. Target = 1st-innings total + 1, overridden by a saved Revised
// Target; the balls available follow a saved Revised Overs, else state.overs.
function renderChaseRow() {
  const row = document.getElementById("chase-row");
  if (!row) return;
  if (state.innings !== 2) { row.hidden = true; return; }
  row.hidden = false;

  const target = chaseTarget();
  const ballsRemaining = Math.max(0, maxBalls() - ballsBowled());
  const runsNeeded = Math.max(0, target - state.runs);
  const rrr = ballsRemaining > 0 ? (runsNeeded / (ballsRemaining / 6)).toFixed(2) : "0.00";

  setText("chase-target", target);
  setText("chase-rrr", rrr);
  setText("chase-need", runsNeeded);
  setText("chase-balls", ballsRemaining);
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

// Overs the scorer has clicked back open in the ball log (session-only UI state).
const expandedOvers = new Set();

// One ball-by-ball chip. Tag colours: W red, B4/4 blue, B6/6 gold, extras amber.
function ballChipHtml(t, current) {
  const s = String(t);
  const cls = s === "W" ? "chip-w"
    : s === "B6" || s === "6" ? "chip-6"
    : s === "B4" || s === "4" ? "chip-4"
    : /^(WD|NB|P)/i.test(s) || /b$/i.test(s) ? "chip-ext" : "";
  return `<span class="over-chip ${cls}${current ? " current" : ""}">${s}</span>`;
}

// Ball-by-ball tag for a logged row: the tally recorded at scoring time, else
// derived (rows saved before tallies existed): W for wickets, the extras cell,
// or the run count.
function ballTag(r) {
  if (r.tally) return r.tally;
  if (r.wicket) return "W";
  const ext = String(r.ext ?? "");
  if (ext && ext !== "0" && !/^\d+$/.test(ext)) return ext.replace(/OT\d*/gi, "") || String(r.runs);
  return String(r.runs);
}

// Total runs a logged ball put on the board (batter runs + extras). Overthrow
// annotations ("OT2") never scored, so they are stripped before reading extras.
function ballTotal(r) {
  return (Number(r.runs) || 0) + extNum(String(r.ext).replace(/OT\d*/gi, ""));
}

function renderLog(preserveScroll = false) {
  const body = document.getElementById("ball-log-body");
  if (!body) return;
  const wrap = body.closest(".table-wrap");
  const prevScroll = wrap ? wrap.scrollTop : 0;

  const ballRow = (i) => { const r = state.log[i]; return `
    <tr data-index="${i}" class="${r.marked ? "marked-ball" : ""} ${r.wicket ? "wkt-ball" : ""}" title="${r.marked ? "Marked for edit — " : ""}${r.wicket && r.dismissal ? `Wicket: ${r.dismissal} — ` : ""}Double-click to edit this ball">
      <td>${r.marked ? '<span class="mark-flag" title="Marked for edit">⚑</span>' : ""}${r.num}</td>
      <td>${r.bowler}</td><td>${r.striker}</td><td>${r.nonstr}</td>
      <td>${r.bowl}</td><td>${r.shot}</td><td>${r.runs}</td><td>${r.ext}${r.wicket && r.dismissal ? ` (${r.dismissal})` : ""}</td>
    </tr>`; };

  // Group the log into overs. Completed overs (anything before the current over
  // counter) collapse into a one-row summary — runs conceded + wickets fallen —
  // that clicking expands back into its ball rows. The over in progress always
  // shows its balls in full.
  const groups = [];
  state.log.forEach((r, i) => {
    const over = parseInt(String(r.num), 10) || 0;
    const g = groups[groups.length - 1];
    if (g && g.over === over) g.rows.push(i);
    else groups.push({ over, rows: [i] });
  });

  body.innerHTML = groups.map((g) => {
    if (g.over >= state.over) return g.rows.map(ballRow).join(""); // over in progress
    const open = expandedOvers.has(g.over);
    const runs = g.rows.reduce((t, i) => t + ballTotal(state.log[i]), 0);
    const wkts = g.rows.reduce((t, i) => t + (state.log[i].wicket ? 1 : 0), 0);
    const head = `
    <tr class="over-summary" data-over="${g.over}" title="Click to ${open ? "collapse" : "expand"} this over">
      <td colspan="8"><span class="over-caret">${open ? "▾" : "▸"}</span>Over ${g.over + 1}
        <span class="over-stats">${runs} run${runs === 1 ? "" : "s"} · <span class="${wkts ? "over-wkts" : ""}">${wkts} wicket${wkts === 1 ? "" : "s"}</span></span></td>
    </tr>`;
    return open ? head + g.rows.map(ballRow).join("") : head;
  }).join("");

  if (wrap) wrap.scrollTop = preserveScroll ? prevScroll : wrap.scrollHeight;

  // Full-innings ball-by-ball strip: every logged ball as a chip, with a divider
  // between overs; kept scrolled to the latest delivery.
  const strip = document.getElementById("innings-balls");
  if (strip) {
    let prevOver = null;
    strip.innerHTML = state.log.map((r) => {
      const over = parseInt(String(r.num), 10) || 0;
      const brk = prevOver !== null && over !== prevOver ? '<span class="over-break"></span>' : "";
      prevOver = over;
      return brk + ballChipHtml(ballTag(r), false);
    }).join("");
    strip.scrollLeft = strip.scrollWidth;
  }
}

// ---- Button state machine -------------------------------------------------

function setOverButton(label) {
  const b = document.getElementById("btn-over");
  if (!b) return;
  b.textContent = label;
  b.classList.toggle("red", label === "End Over");
  b.classList.toggle("teal", label !== "End Over");
  b.disabled = state.matchOver; // no more overs once the match is complete
  updateCaptureEnabled();
}

// Start Capture is only usable once a ball has been started (Start Ball pressed);
// it captures the delivery. An in-progress capture stays enabled so it can
// always be stopped, even after the ball is ended — but once the match is over
// (and nothing is recording) it is locked out along with Start Ball/Start Over.
function updateCaptureEnabled() {
  const cap = document.getElementById("btn-capture");
  if (!cap) return;
  cap.disabled = !state.capturing && (state.matchOver || !state.ballStarted);
}

function setBallButton(label) {
  const b = document.getElementById("btn-ball");
  if (!b) return;
  b.textContent = label;
  const ending = label.startsWith("End Ball");
  b.classList.toggle("red", ending);
  b.classList.toggle("teal", !ending);
  b.disabled = state.matchOver; // no more deliveries once the match is complete
  updateCaptureEnabled();
  updateInputLock();
}

// Until a ball is started, every per-ball input panel is locked (dimmed +
// `inert`, which blocks both mouse and keyboard): the events grid, keypad,
// pitch map, wagon wheel and the bowl/shot spec grids. The action buttons,
// reports row, Match Events and Edit Mode stay usable throughout.
const BALL_LOCKED_PANELS = [".events-grid", ".keypad-panel", ".cb-pitch", ".cb-wagon", ".cb-bowl", ".cb-bat"];
function updateInputLock() {
  // unlocked while a live ball is in progress OR a saved ball is being edited
  const locked = !state.ballStarted && !editingBall;
  BALL_LOCKED_PANELS.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
    el.inert = locked;
    el.classList.toggle("input-locked", locked);
  }));
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
    if (state.matchOver) return;                       // match complete — locked
    if (editingBall) exitBallInputEdit();              // back to live scoring
    if (!state.overStarted) {
      if (state.pendingBowler) {
        toast("Select the next bowler first");
        flash(document.getElementById("name-bowler"));
        openBowlerPicker();
        return;
      }
      state.overStarted = true;
      setOverButton("End Over");
      // Persist immediately: leaving the coding form right after Start Over
      // must bring the open over back, with the button still on End Over.
      scheduleSave();
    } else if (state.ball >= 6) {
      // Six (or more) legal balls are already in — the scorer answered the
      // six-ball prompt with "Continue" — so End Over just closes the over.
      completeOver();
      render();
      openBowlerPicker();
    } else {
      // End Over pressed before the over's six legal balls — confirm.
      confirmEndOver();
    }
  });

  // Confirm ending an incomplete over. On confirm the remaining balls are
  // recorded as dot balls (0), which advances the over naturally — strike and
  // bowler rotation happen inside completeOver when the 6th ball lands.
  function confirmEndOver() {
    const body = `
      <div class="confirm-box">
        <p>All balls for over ${state.over + 1} are not completed (${state.ball} of 6 bowled).
          Do you want to end the over? The remaining balls will be recorded as 0.</p>
        <div class="btn-row-modal center">
          <button class="m-btn m-red" id="eo-end">End Over</button>
          <button class="m-btn m-green" data-close>Continue Over</button>
        </div>
      </div>`;
    openOverlay(popupShell("END OVER", body));
    document.getElementById("eo-end")?.addEventListener("click", () => {
      closeOverlay();
      state.pending = null; // drop any half-staged delivery
      state.staged = null;
      // Pad the over out to six legal balls, then close it. `fillingOver`
      // keeps the six-ball prompt from firing on the last padded delivery —
      // the scorer has already said they want the over ended.
      fillingOver = true;
      try {
        let guard = 6; // the over holds at most 6 more legal balls
        while (state.ball < 6 && guard > 0 && !state.matchOver && state.overStarted) {
          state.ballStarted = true;
          logBall({});
          guard -= 1;
        }
      } finally {
        fillingOver = false;
      }
      // The padding may have ended the innings (a revised-overs limit, the
      // 10th wicket); only close an over that is still open.
      if (!state.matchOver && state.overStarted) {
        completeOver();
        render();
        openBowlerPicker();
      }
    });
  }

  // Striker, non-striker and bowler must all be named before a ball can start.
  // Returns false (and points at the offending slot) when one is missing.
  function bothEndsAndBowlerSet() {
    const missing = [
      ["striker", state.striker, "name-striker", "Select the striker first"],
      ["nonStriker", state.nonStriker, "name-nonstriker", "Select the non-striker first"],
      ["bowler", state.bowler, "name-bowler", "Select the bowler first"],
    ].find(([, value]) => !value);
    if (!missing) return true;
    toast(missing[3]);
    flash(document.getElementById(missing[2]));
    return false;
  }

  ball?.addEventListener("click", () => {
    if (state.matchOver) return;                       // match complete — locked
    if (editingBall) exitBallInputEdit();              // back to live scoring
    if (!state.overStarted) { flash(over); return; }   // start the over first
    // No delivery can be staged until both ends and the bowler are filled: a
    // wicket empties an end, a completed over empties the bowler, and all three
    // slots can be left on "Select…". Flag the first empty one and stop here.
    if (!state.ballStarted && !bothEndsAndBowlerSet()) return;
    if (!state.ballStarted) {
      // Start the ball — begin staging a fresh delivery.
      clearReview();
      setReviewOrientation(null); // the maps belong to the striker again
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
  wireEventPickers();
}

// Small value picker anchored to an events-grid button. Both over-throw and
// RBW are external parameters — recorded against the ball but adding no runs
// to the score. Staged onto the current ball, committed on End Ball.
function openValuePickerMenu(btn, values, onPick) {
  openKeypadMenu(btn, (menu) => {
    values.forEach((n) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ctx-item";
      b.textContent = n > 0 ? `+${n}` : String(n);
      b.addEventListener("click", () => { onPick(n); closeContextMenu(); flash(btn); });
      menu.appendChild(b);
    });
  });
}

function setAppeals(on) {
  state.appeals = on;
  const btn = document.getElementById("btn-appeals");
  if (btn) { btn.classList.toggle("active", on); btn.setAttribute("aria-pressed", String(on)); }
}

// Events-grid controls: Overthrow opens a 0–6 picker, RBW a −3…+3 picker.
// Appeals is a toggle (armed / disarmed per ball); double-clicking it opens
// the Appeals popup.
function wireEventPickers() {
  const ot = document.getElementById("btn-overthrow");
  ot?.addEventListener("click", () => {
    openValuePickerMenu(ot, [0, 1, 2, 3, 4, 5, 6], (overthrow) => stageDelivery({ overthrow }));
  });

  const rbw = document.getElementById("btn-rbw");
  rbw?.addEventListener("click", () => {
    openValuePickerMenu(rbw, [-3, -2, -1, 0, 1, 2, 3], (v) => stageDelivery({ rbw: v }));
  });

  const appeals = document.getElementById("btn-appeals");
  appeals?.addEventListener("click", () => { setAppeals(!state.appeals); flash(appeals); });
  appeals?.addEventListener("dblclick", () => overlayAppeals());
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

// `locked` marks an overlay the scorer must answer rather than dismiss (the
// 2nd-innings Innings Details screen): no click-outside here, and closeOverlay
// refuses, which also covers the global Escape handler.
let overlayLocked = false;
function openOverlay(html, { locked = false } = {}) {
  const root = overlayRoot();
  overlayLocked = locked;
  root.innerHTML = html;
  root.hidden = false;
  root.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeOverlay));
  if (!locked) {
    root.addEventListener("mousedown", (e) => { if (e.target === root) closeOverlay(); }, { once: true });
  }
}
function closeOverlay({ force = false } = {}) {
  if (overlayLocked && !force) return;
  overlayLocked = false;
  const root = overlayRoot();
  root.hidden = true;
  root.innerHTML = "";
}

// A styled, in-app alert that layers ABOVE the main overlay (which owns a single
// root), so it can warn the user without tearing down the screen underneath.
// Resolves when dismissed. Use in place of window.alert for a native-app feel.
function appDialog(message, title = "NOT ALLOWED") {
  const wrap = document.createElement("div");
  wrap.className = "overlay-root app-dialog";
  wrap.innerHTML = popupShell(title,
    `<div class="confirm-box"><p>${message}</p>
     <div class="btn-row-modal center"><button class="m-btn m-green" data-ok>OK</button></div></div>`);
  const close = () => wrap.remove();
  wrap.querySelectorAll("[data-ok], [data-close]").forEach((b) => b.addEventListener("click", close));
  wrap.addEventListener("mousedown", (e) => { if (e.target === wrap) close(); });
  document.body.appendChild(wrap);
  wrap.querySelector("[data-ok]")?.focus();
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

// closable=false drops the ✕ for a screen that must be answered (see openOverlay's
// `locked` option) rather than dismissed.
function popupShell(title, bodyHtml, wide = false, closable = true) {
  return `
    <div class="popup ${wide ? "popup-wide" : ""}">
      <div class="popup-head"><span>${title}</span>${
        closable ? `<button class="popup-x" data-close>✕</button>` : ""}</div>
      <div class="popup-body">${bodyHtml}</div>
    </div>`;
}

function selectEl(label, options, value = "Select", id = "", selected = "") {
  const opts = [value, ...options].map((o) =>
    `<option${selected && o === selected ? " selected" : ""}>${o}</option>`).join("");
  return `<label class="f-row"><span class="f-label">${label}</span><select class="f-select"${id ? ` id="${id}"` : ""}>${opts}</select></label>`;
}

// ---- Appeals --------------------------------------------------------------

function overlayAppeals() {
  const body = `
    <div class="grid-2">
      ${selectEl("Appeal Against", [state.striker, state.nonStriker], "Select", "ap-against", state.striker)}
      ${selectEl("Appeal Type", ["Caught Behind", "LBW", "Run Out", "Stumped", "Bat Pad", "Caught"], "Select", "ap-type")}
      ${selectEl("Bowler", OMAN_BOWLERS, "Select", "ap-bowler", state.bowler)}
      ${selectEl("Fielder", FIELDERS, "Select", "ap-fielder")}
    </div>
    <div class="seg-row">
      <span class="f-label">Decision</span>
      <div class="seg" id="ap-decision"><button class="seg-btn active">OUT</button><button class="seg-btn">NOT OUT</button><button class="seg-btn">UMPIRES CALL</button><button class="seg-btn">DRS</button></div>
    </div>
    <label class="f-row"><span class="f-label">Comments</span><textarea class="f-textarea" id="ap-comments" placeholder="Comments"></textarea></label>
    <div class="btn-row-modal">
      <button class="m-btn m-green" id="ap-save">Save</button>
      <button class="m-btn m-yellow" data-close>Clear</button>
    </div>`;
  openOverlay(popupShell("APPEALS", body));
  wireSeg();
  // Save records the appeal against the current delivery so the Appeal /
  // Umpire reports can show type, decision and referral — not just a flag.
  // (No data-close on the button: closeOverlay wipes the form before a
  // same-click listener could read it, so read first, close after.)
  document.getElementById("ap-save")?.addEventListener("click", () => {
    const v = (id) => { const el = document.getElementById(id); const x = el ? el.value.trim() : ""; return x === "Select" ? "" : x; };
    state.appealsLog = state.appealsLog || [];
    state.appealsLog.push({
      over: `${state.over}.${Math.min(state.ball + 1, 6)}`,
      innings: state.innings || 1,
      battingCode: state.battingCode,
      against: v("ap-against") || state.striker,
      nonStriker: state.nonStriker,
      type: v("ap-type") || "LBW",
      bowler: v("ap-bowler") || shortName(state.bowler),
      fielder: v("ap-fielder"),
      decision: document.querySelector("#ap-decision .seg-btn.active")?.textContent || "OUT",
      comments: document.getElementById("ap-comments")?.value?.trim() || "",
    });
    setAppeals(true); // flag the ball itself too (legacy per-ball marker)
    scheduleSave();
    closeOverlay();
  });
}

// ---- Fielding Events (two-column menu) ------------------------------------

// Recorded fielding-event rows for the table (from the overlay Save and from the
// wagon-wheel right-click menu — both share over/event/fielder/netRunsSaved).
function fieldingRows() {
  return state.fieldingEvents.map((f) =>
    `<tr>${cells([f.over, f.event, f.fielder, f.netRunsSaved])}</tr>`).join("");
}

function overlayFielding() {
  const v = (id) => document.getElementById(id)?.value?.trim() || "";
  const body = `
    <div class="me-form-narrow">
      ${selectEl("Fielding Event", FIELDING_EVENTS, "Select", "fe-event")}
      ${selectEl("Fielder Name", FIELDERS, "Select", "fe-fielder")}
      <label class="f-row"><span class="f-label">Net Runs Saved</span><input class="f-input" id="fe-nrs" type="number" placeholder="0"/></label>
    </div>
    ${saveDeleteRow(`<button class="m-btn m-yellow" id="fe-clear">Clear</button>`, "fe-save", "fe-del")}
    ${meTable(["Over", "Fielding Events", "Fielder Name", "Net Runs Saved"], fieldingRows())}`;
  openOverlay(popupShell("FIELDING EVENTS", body, true));

  document.getElementById("fe-save")?.addEventListener("click", () => {
    const event = v("fe-event"), fielder = v("fe-fielder");
    if (!event || event === "Select") { toast("Select a fielding event"); return; }
    if (!fielder || fielder === "Select") { toast("Select a fielder"); return; }
    state.fieldingEvents.push({
      event, fielder, netRunsSaved: v("fe-nrs"),
      over: `${state.over}.${state.ball}`, ball: state.log.length,
    });
    scheduleSave();          // persist to the DB (match_state json)
    overlayFielding();       // re-render so the new row shows in the table
    toast("Fielding event saved");
  });
  document.getElementById("fe-clear")?.addEventListener("click", overlayFielding);
  document.getElementById("fe-del")?.addEventListener("click", () => {
    if (!state.fieldingEvents.length) { closeOverlay(); return; }
    state.fieldingEvents.pop();
    scheduleSave();
    overlayFielding();
    toast("Last fielding event removed");
  });
}

// ---- Movie Organiser ------------------------------------------------------
// Browse the saved per-ball clips for an innings, pick which to keep, trim each
// (set IN/OUT while it plays), then merge + export the lot to one movie file.
const movieOrg = { innings: 1, clips: [], trims: {}, keep: {}, current: null, clipUrl: null };

function movieOrganiserBody() {
  const opt = (n) => `<option value="${n}"${movieOrg.innings === n ? " selected" : ""}>${n}</option>`;
  return `
    <div class="movie-org">
      <label class="f-row narrow-row"><span class="f-label">Innings No</span>
        <select class="f-select" id="mo-innings">${opt(1)}${opt(2)}</select></label>
      <div class="movie-layout">
        <div class="movie-table" id="mo-list"><p class="me-muted">Loading clips…</p></div>
        <div class="movie-player">
          <video id="mo-video" class="movie-screen" controls playsinline></video>
          <div class="movie-trim">
            <button class="m-btn m-green" id="mo-in">Set IN</button>
            <button class="m-btn m-green" id="mo-out">Set OUT</button>
            <button class="m-btn m-yellow" id="mo-cleartrim">Clear</button>
          </div>
          <div class="trim-label" id="mo-trimlabel">No clip selected</div>
        </div>
      </div>
      <div class="btn-row-modal center">
        <span class="mo-status" id="mo-status"></span>
        <button class="m-btn m-green" id="mo-export">Merge &amp; Export Movie</button>
      </div>
    </div>`;
}

function moFmt(s) {
  if (s == null || s === "") return "—";
  const n = Number(s), m = Math.floor(n / 60), sec = (n % 60).toFixed(1);
  return `${m}:${sec.padStart(4, "0")}`;
}

function movieClipRows() {
  if (!movieOrg.clips.length) return `<p class="me-muted">No clips found for this innings.</p>`;
  const rows = movieOrg.clips.map((c) => {
    const keep = movieOrg.keep[c.name] !== false;
    const t = movieOrg.trims[c.name];
    const trimTxt = t ? `${moFmt(t.in)}–${moFmt(t.out)}` : "full";
    const over = c.over != null ? `${c.over}.${c.ball}` : "—";
    const sel = movieOrg.current === c.name ? " selected" : "";
    return `<tr data-name="${escAttr(c.name)}" class="mo-row${sel}">
      <td><input type="checkbox" class="mo-keep" ${keep ? "checked" : ""}/></td>
      <td>${over}</td><td class="mo-trimcell">${trimTxt}</td></tr>`;
  }).join("");
  return `<table class="data-table grid-table"><thead><tr><th>Keep</th><th>Over</th><th>Trim</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function loadMovieClips() {
  const listEl = document.getElementById("mo-list");
  if (!listEl) return;
  if (!state.recordingFolder || !window.cricketApp?.listRecordings) {
    listEl.innerHTML = `<p class="me-muted">No recordings folder is set for this match.</p>`;
    return;
  }
  const res = await window.cricketApp.listRecordings(state.recordingFolder, movieOrg.innings);
  movieOrg.clips = res?.ok ? res.clips : [];
  listEl.innerHTML = movieClipRows();
  listEl.querySelectorAll(".mo-row").forEach((tr) => {
    const name = tr.getAttribute("data-name");
    tr.querySelector(".mo-keep")?.addEventListener("change", (e) => { movieOrg.keep[name] = e.target.checked; });
    tr.addEventListener("click", (e) => { if (!e.target.closest(".mo-keep")) loadMovieClip(name); });
  });
}

async function loadMovieClip(name) {
  const video = document.getElementById("mo-video");
  if (!video || !window.cricketApp?.getClipBytes) return;
  movieOrg.current = name;
  document.querySelectorAll("#mo-list .mo-row").forEach((tr) =>
    tr.classList.toggle("selected", tr.getAttribute("data-name") === name));
  moUpdateTrimLabel();
  const res = await window.cricketApp.getClipBytes(state.recordingFolder, name);
  if (!res?.ok || !res.bytes) { toast("Could not load clip"); return; }
  if (movieOrg.clipUrl) URL.revokeObjectURL(movieOrg.clipUrl);
  movieOrg.clipUrl = URL.createObjectURL(new Blob([res.bytes], { type: res.mime || "video/webm" }));
  video.src = movieOrg.clipUrl;
  video.load();
}

function moUpdateTrimLabel() {
  const el = document.getElementById("mo-trimlabel");
  if (!el) return;
  if (!movieOrg.current) { el.textContent = "No clip selected"; return; }
  const t = movieOrg.trims[movieOrg.current];
  el.textContent = t ? `IN ${moFmt(t.in)}  ·  OUT ${moFmt(t.out)}` : "Full clip (no trim set)";
}

function moRefreshRow() {
  document.querySelectorAll("#mo-list .mo-row").forEach((tr) => {
    if (tr.getAttribute("data-name") !== movieOrg.current) return;
    const t = movieOrg.trims[movieOrg.current];
    const cell = tr.querySelector(".mo-trimcell");
    if (cell) cell.textContent = t ? `${moFmt(t.in)}–${moFmt(t.out)}` : "full";
  });
}

function wireMovieOrganiser() {
  loadMovieClips();
  const vid = () => document.getElementById("mo-video");
  document.getElementById("mo-innings")?.addEventListener("change", (e) => {
    movieOrg.innings = Number(e.target.value) || 1;
    movieOrg.current = null;
    const v = vid(); if (v) { v.removeAttribute("src"); v.load(); }
    moUpdateTrimLabel();
    loadMovieClips();
  });
  document.getElementById("mo-in")?.addEventListener("click", () => {
    if (!movieOrg.current) { toast("Select a clip first"); return; }
    const t = (movieOrg.trims[movieOrg.current] ||= { in: 0, out: "" });
    t.in = Number(vid().currentTime.toFixed(2));
    if (t.out !== "" && Number(t.out) <= t.in) t.out = "";
    moRefreshRow(); moUpdateTrimLabel();
  });
  document.getElementById("mo-out")?.addEventListener("click", () => {
    if (!movieOrg.current) { toast("Select a clip first"); return; }
    const t = (movieOrg.trims[movieOrg.current] ||= { in: 0, out: "" });
    t.out = Number(vid().currentTime.toFixed(2));
    moRefreshRow(); moUpdateTrimLabel();
  });
  document.getElementById("mo-cleartrim")?.addEventListener("click", () => {
    if (!movieOrg.current) return;
    delete movieOrg.trims[movieOrg.current];
    moRefreshRow(); moUpdateTrimLabel();
  });
  document.getElementById("mo-export")?.addEventListener("click", exportMovie);
}

async function exportMovie() {
  const status = document.getElementById("mo-status");
  const btn = document.getElementById("mo-export");
  if (!window.cricketApp?.exportMovie) { toast("Export is unavailable in this build"); return; }
  // Kept clips, in over/ball order (the list order), each with its trim.
  const segments = movieOrg.clips
    .filter((c) => movieOrg.keep[c.name] !== false)
    .map((c) => ({ name: c.name, in: movieOrg.trims[c.name]?.in ?? 0, out: movieOrg.trims[c.name]?.out ?? "" }));
  if (!segments.length) { toast("Tick at least one clip to keep"); return; }
  const def = `${state.recordingPrefix || "match"}-INN${movieOrg.innings}-movie.mp4`;
  if (btn) btn.disabled = true;
  if (status) status.textContent = `Exporting ${segments.length} clip${segments.length === 1 ? "" : "s"}… this can take a while.`;
  try {
    const res = await window.cricketApp.exportMovie(state.recordingFolder, segments, def);
    if (res?.ok) { if (status) status.textContent = `✓ Saved to ${res.filePath}`; toast("Movie exported"); }
    else if (res?.canceled) { if (status) status.textContent = ""; }
    else { if (status) status.textContent = `⚠ Export failed: ${res?.error || res?.reason || "unknown error"}`; }
  } catch (e) {
    if (status) status.textContent = `⚠ Export failed: ${e.message || e}`;
  } finally {
    if (btn) btn.disabled = false;
  }
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

const PENALTY_REASONS = [
  "Player returning without permission, comes in contact with the ball while in play",
  "Fielding the ball, willfully fielding it otherwise",
  "The ball when in play strikes the helmet of fielding side kept on the ground within the field of play",
  "Changing balls condition",
  "Deliberate attempt to distract striker — Ball not count as one of the over",
  "Deliberate distraction or obstruction of batsman — Ball shall not count as one of the over",
  "Time wasting by fielding side", "Fielder damaging the pitch",
];

function overlayPenalty() {
  const body = `
    <div class="seg-row center"><div class="seg"><button class="seg-btn active" data-pen-side="Batting">Batting</button><button class="seg-btn" data-pen-side="Bowling">Bowling</button></div></div>
    <div class="penalty-list">
      ${PENALTY_REASONS.map((p, i) => `<div class="penalty-row"><label class="ck"><input type="checkbox" data-pen="${i}"/></label> ${p}</div>`).join("")}
    </div>
    <div class="btn-row-modal center"><button class="m-btn m-green" id="pen-save">Save</button><button class="m-btn m-yellow" data-close>Clear</button></div>`;
  openOverlay(popupShell("PENALTY", body));
  wireSeg();
  document.getElementById("pen-save")?.addEventListener("click", () => {
    const reasons = [...document.querySelectorAll("[data-pen]:checked")]
      .map((c) => PENALTY_REASONS[Number(c.dataset.pen)]);
    if (!reasons.length) { toast("Select at least one reason"); return; }
    const side = document.querySelector(".seg-btn.active[data-pen-side]")?.dataset.penSide || "Batting";
    state.penalties.push({ side, reasons, over: `${state.over}.${state.ball}`, innings: state.innings });
    scheduleSave();
    closeOverlay();
    toast("Penalty saved");
  });
}

// ---- Wickets --------------------------------------------------------------

function overlayWickets() {
  const dis = DISMISSALS.map((d) => `<button class="pill-btn" data-dismiss>${d}</button>`).join("");
  const batOpts = [state.striker, state.nonStriker].map((o) => `<option>${o}</option>`).join("");
  const body = `
    <div class="pill-grid">${dis}</div>
    <label class="f-row"><span class="f-label">Batsman Out</span><select class="f-select" id="wkt-batsman">${batOpts}</select></label>
    ${selectEl("Fielder", FIELDERS)}
    ${selectEl("Bowler", OMAN_BOWLERS)}
    <label class="f-row"><span class="f-label">Wicket No</span><input class="f-input" value="${state.wkts + 1}" /></label>
    <div class="btn-row-modal">
      <button class="m-btn m-green" id="wkt-save">Save Wicket</button>
      <button class="m-btn m-red" data-close>Delete</button>
    </div>`;
  openOverlay(popupShell("WICKETS", body));
  const root = overlayRoot();
  let dismissal = null;
  root.querySelectorAll("[data-dismiss]").forEach((b) => b.addEventListener("click", () => {
    root.querySelectorAll("[data-dismiss]").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    dismissal = b.textContent.trim();
  }));
  document.getElementById("wkt-save")?.addEventListener("click", () => {
    // Stage the wicket onto the current ball; it commits when End Ball is pressed
    // (so any runs on the same delivery, e.g. a run-out, can still be entered).
    if (!state.ballStarted) { flash(document.getElementById("btn-ball")); toast("Start the ball first"); return; }
    if (!dismissal) { toast("Select a dismissal type"); return; }
    const outBatsman = document.getElementById("wkt-batsman")?.value || state.striker;
    closeOverlay();
    stageDelivery({ wicket: true, outBatsman, dismissal });
    toast(`${dismissal} staged — press End Ball to confirm`);
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

// True while the scorer is editing an already-saved result (shows the form
// instead of the read-only view). Reset whenever the Match Results screen is
// opened fresh from the menu.
let editingMatchResult = false;
function overlayMatchEvents(active = "Breaks") {
  // Revised Overs applies only in the 1st innings, Revised Target only in the
  // 2nd — disable the one that doesn't apply to the current innings.
  // End Innings has nothing left to close once the match is complete.
  const navDisabled = (n) =>
    (n === "Revised Target" && state.innings === 1) ||
    (n === "Revised Overs" && state.innings === 2) ||
    (n === "End Innings" && state.matchOver);
  const nav = `<div class="me-nav">${MATCH_EVENTS_NAV.map((n) =>
    `<button class="me-nav-item ${n === active ? "active" : ""} ${navDisabled(n) ? "disabled" : ""}" data-nav="${n}" ${navDisabled(n) ? "disabled" : ""}>${n}</button>`).join("")}</div>`;
  openOverlay(moduleShell(matchEventTitle(active), nav, matchEventBody(active)));
  const root = overlayRoot();
  root.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => {
    editingMatchResult = false; // deliberate navigation resets edit mode
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
      // A dismissal here still happens on a live delivery, so the ball must be
      // started first (it is just not counted as a legal ball).
      if (!state.ballStarted) { flash(document.getElementById("btn-ball")); toast("Ball not started"); return; }
      if (state.wkts >= 10) { toast("Innings already has 10 wickets"); return; }
      const batsman = document.getElementById("ow-player")?.value;
      const wicketNo = Number(document.getElementById("ow-wktno")?.value) || state.wkts + 1;
      if (!owDismissal) { toast("Select a dismissal type"); return; }
      if (!batsman || batsman === "PLAYER NAME") { toast("Select a batsman"); return; }
      state.otherWickets.push({ dismissal: owDismissal, batsman, wicketNo, video: "" });
      logOtherWicket(batsman, owDismissal); // reflect on the current ball + bump wkts
      render();
      if (state.wkts >= 10) endInnings();               // 10th wicket → innings over
      else overlayMatchEvents("Other Wickets");         // refresh table + next wkt no
      toast("Wicket recorded");
    });
    document.getElementById("ow-delete")?.addEventListener("click", () => {
      // Remove the most recently saved Other Wicket and roll the count back.
      if (!state.otherWickets.length) { closeOverlay(); return; }
      state.otherWickets.pop();
      state.wkts = Math.max(0, state.wkts - 1);
      // drop its matching ball-by-ball wicket entry, if present
      const li = [...state.log].reverse().findIndex((r) => r.wicket && r.otherWicket);
      if (li >= 0) state.log.splice(state.log.length - 1 - li, 1);
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
      // Save the result to the match state (persisted to the DB).
      const pick = (id) => document.getElementById(id)?.value || "";
      state.matchResult = {
        resultType: result.value,
        team: pick("mr-team"),
        comments: comments.value.trim(),
        manOfMatch: pick("mr-motm"),
        manOfSeries: pick("mr-mots"),
        bestBatsman: pick("mr-best-bat"),
        bestBowler: pick("mr-best-bowl"),
        bestAllRounder: pick("mr-best-ar"),
        mvp: pick("mr-mvp"),
        // One {team, value} per real side, read from the dynamic point inputs.
        points: [...document.querySelectorAll("[id^='mr-pts-']")].map((el) => ({
          team: el.getAttribute("data-team") || "",
          value: el.value.trim(),
        })),
      };
      scheduleSave();
      toast("Match result saved");
      // Now that a result exists, re-render as the read-only view of the saved
      // values instead of the form.
      editingMatchResult = false;
      overlayMatchEvents("Match Results");
    });
    // "Edit" on the read-only view flips back to the form, pre-filled from the
    // saved result.
    document.getElementById("mr-edit")?.addEventListener("click", () => {
      editingMatchResult = true;
      overlayMatchEvents("Match Results");
    });
  }

  // Simple list-backed screens: Save appends a record and the table re-renders;
  // Delete removes the most recent one. `save` reads the form, `arr` is the store.
  const val = (id) => document.getElementById(id)?.value?.trim() || "";
  const listScreen = (arr, buildRecord, saveId, delId) => {
    // A saved (or deleted) event can move the scoreboard behind the overlay —
    // a Revised Target changes the chase panel, a Revised Overs the balls
    // remaining — so the coding screen is re-rendered, and the innings closed
    // if the (possibly reduced) limit has already been passed.
    // Returns true when the innings/match was closed by the change — endInnings
    // opens the screen that comes next (Innings Details / Match Results), which
    // must not then be covered back over by this events screen.
    const applyToMatch = () => {
      scheduleSave();   // persist the event to the DB
      render();
      if (state.matchOver) return true;
      const limitPassed = ballsBowled() >= maxBalls();
      const chased = state.innings === 2 && state.runs >= chaseTarget();
      if (!limitPassed && !chased) return false;
      endInnings();
      return true;
    };
    document.getElementById(saveId)?.addEventListener("click", () => {
      const rec = buildRecord();
      if (!rec) return; // buildRecord toasts + returns null when invalid
      arr.push(rec);
      if (!applyToMatch()) overlayMatchEvents(active);
      toast("Saved");
    });
    document.getElementById(delId)?.addEventListener("click", () => {
      if (!arr.length) { closeOverlay(); return; }
      arr.pop();
      if (!applyToMatch()) overlayMatchEvents(active);
      toast("Last entry removed");
    });
  };

  if (active === "Breaks") {
    listScreen(state.breaks, () => ({
      type: val("br-type") || "Break",
      start: `${val("br-start-d")} ${val("br-start-t")}`.trim(),
      end: `${val("br-end-d")} ${val("br-end-t")}`.trim(),
      mins: val("br-dur"),
      includeInMinutes: document.querySelector('input[name="br-include"]:checked')?.value || "No",
    }), "br-save", "br-del");
  }

  if (active === "Power Play") {
    listScreen(state.powerPlays, () => {
      const type = val("pp-type");
      if (!type || type === "Select") { toast("Select a power play"); return null; }
      return { type, from: val("pp-from"), to: val("pp-to"), runs: state.runs, wkts: state.wkts };
    }, "pp-save", "pp-del");
  }

  if (active === "Ball Change") {
    let bcType = null;
    root.querySelectorAll("[data-balltype]").forEach((b) => b.addEventListener("click", () => {
      root.querySelectorAll("[data-balltype]").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      bcType = b.textContent.trim();
    }));
    listScreen(state.ballChanges, () => {
      if (!bcType) { toast("Select a ball type"); return null; }
      return {
        dt: `${val("bc-dt-d")} ${val("bc-dt-t")}`.trim(),
        team: state.teamB, inns: state.innings,
        runs: state.runs, overs: `${state.over}.${state.ball}`, wkts: state.wkts,
        type: bcType, remarks: val("bc-remarks"),
      };
    }, "bc-save", "bc-del");
  }

  if (active === "Revised Overs" || active === "Revised Target") {
    const store = active === "Revised Overs" ? state.revisedOvers : state.revisedTargets;
    listScreen(store, () => {
      const value = val("rv-val").trim();
      if (!value) { toast(`Enter the ${active.toLowerCase()}`); return null; }
      // Revised Overs is an overs figure: whole overs (20) or a part-over in
      // overs.balls notation (5.4 = 5 overs and 4 balls). Stored normalised so
      // "5.0" and "5" become the same entry.
      if (active === "Revised Overs") {
        const balls = oversToBalls(value);
        if (!(balls > 0)) {
          toast("Revised overs must look like 20 or 5.4 (balls 0–5)");
          return null;
        }
        return { value: ballsToOvers(balls), innings: "1st Innings", reason: val("rv-reason") };
      }
      // Revised Target: runs to win, plus an optional revised overs limit for
      // the chase. A changed limit is also recorded as a Revised Overs entry,
      // because that list is what maxBalls() reads.
      const runs = Number(value);
      if (!(runs > 0)) { toast("Revised target must be a run total, e.g. 121"); return null; }
      const oversText = val("rv-overs").trim();
      let overs = "";
      if (oversText) {
        const balls = oversToBalls(oversText);
        if (!(balls > 0)) {
          toast("Revised overs must look like 20 or 5.4 (balls 0–5)");
          return null;
        }
        overs = ballsToOvers(balls);
        if (balls !== maxBalls()) {
          state.revisedOvers.push({
            value: overs, innings: "2nd Innings",
            reason: val("rv-reason") || "Revised Target",
          });
          state.overs = balls / 6; // keep the base format in sync
        }
      }
      return { value: String(runs), overs, innings: "2nd Innings", reason: val("rv-reason") };
    }, "rv-save", "rv-del");
  }

  if (active === "End Innings") {
    document.getElementById("ei-no")?.addEventListener("click", closeOverlay);
    document.getElementById("ei-yes")?.addEventListener("click", () => {
      if (state.matchOver) { closeOverlay(); toast("The match has already ended"); return; }
      // Closing the innings discards any half-entered delivery — it was never
      // committed to the log, and the innings is over as of the last legal ball.
      state.pending = null;
      state.staged = null;
      // endInnings opens the screen that comes next itself (Innings Details
      // after the 1st, Match Results once the 2nd ends the match), and that
      // replaces this overlay — so there is nothing to close here.
      endInnings();
    });
  }

  if (active === "Match Info Edit") {
    document.getElementById("mi-save")?.addEventListener("click", () => {
      const toss = val("mi-toss"), elected = val("mi-elected");
      const tossWonBy = toss && toss !== "Select" ? toss : "";
      const tossDecision = elected && elected !== "Select" ? elected : "";

      // Which side the selected toss implies should bat first (winner bats if
      // they elected to Bat, otherwise the other side does).
      let batFirst = "";
      if (tossWonBy && tossDecision) {
        const other = tossWonBy === state.teamA ? state.teamB : state.teamA;
        batFirst = tossDecision === "Bat" ? tossWonBy : other;
      }
      const matchStarted = !(state.innings === 1 && state.over === 0 && state.ball === 0);

      // Once the match is underway the toss (and therefore who bats/bowls) is
      // locked — reject a selection that would flip the batting side.
      if (matchStarted && batFirst && batFirst !== state.battingCode) {
        appDialog("Batting/bowling and toss settings cannot be edited now — the match has already started.", "MATCH IN PROGRESS");
        overlayMatchEvents("Match Info Edit"); // revert the form to the saved values
        return;
      }

      state.tossWonBy = tossWonBy;
      state.tossDecision = tossDecision;

      // Editing Number of Overs sets the new match limit. Record it as a Revised
      // Overs entry (the latest entry is what maxBalls() uses, so it becomes the
      // new default) — but only when the value actually changes. Accepts a
      // part-over ("5.4") the same way the Revised Overs screen does.
      const oversText = val("mi-overs").trim();
      const newBalls = oversToBalls(oversText);
      if (oversText && !(newBalls > 0)) {
        appDialog("Number of Overs must be a whole number of overs or overs.balls, e.g. 20 or 5.4.", "INVALID OVERS");
        return;
      }
      if (newBalls > 0 && newBalls !== maxBalls()) {
        state.revisedOvers.push({
          value: ballsToOvers(newBalls),
          innings: inningsLabel(),
          reason: "Match Info Edit",
        });
        state.overs = newBalls / 6; // keep the base format in sync
      }
      state.venue = val("mi-venue");

      // Match start time: update it and reflect it on the 1st-innings openers'
      // recorded walk-in (they share this time). Also refresh the timestamp so
      // minutes-at-crease stay accurate.
      const startTime = val("mi-start");
      if (startTime && startTime !== state.matchStartTime) {
        state.matchStartTime = startTime;
        const ts = parseClock(startTime);
        if (ts) state.matchStartTs = ts;
        state.batTimes.forEach((r) => {
          if (r.opener && r.innings === 1) { r.inTime = startTime; if (ts) r.inTs = ts; }
        });
      }

      // Before the first ball the toss can still set who bats first.
      if (!matchStarted && batFirst && batFirst !== state.battingCode) swapBattingSides();

      scheduleSave();
      closeOverlay();
      toast("Match info saved");

      // If the (possibly reduced) limit has already been reached, advance the
      // innings (1st) or end the match (2nd) now, per the latest revised overs.
      if (ballsBowled() >= maxBalls()) endInnings();
      render();          // refresh anything that reads overs/team info
    });
  }

  if (active === "Movie Organiser") wireMovieOrganiser();

  if (active === "Video Count Validation") {
    document.getElementById("vcv-btn")?.addEventListener("click", refreshVideoCount);
    refreshVideoCount();
  }
}

// Compare balls coded against the real number of video files saved in this
// match's recordings folder (counted by the main process).
async function refreshVideoCount() {
  const el = document.getElementById("vcv-result");
  if (!el) return;

  // Balls coded per innings. state.log holds only the current innings, so the
  // 1st-innings total is taken from the snapshot captured at the innings switch.
  const balls1 = state.innings === 1 ? state.log.length : state.firstInningsBalls;
  const balls2 = state.innings === 2 ? state.log.length : 0;

  if (!state.recordingFolder) {
    el.innerHTML = `<p class="warn-line">⚠ No recording folder is set for this match.</p>`;
    return;
  }
  if (!window.cricketApp?.countRecordings) {
    el.innerHTML = `<p class="warn-line">⚠ Video counting is unavailable in this build.</p>`;
    return;
  }

  // Clips are matched to an innings by the INN<n> label in each filename.
  const countFor = async (inn) => {
    const res = await window.cricketApp.countRecordings(state.recordingFolder, inn);
    return res?.ok ? res.count : null;
  };
  const [clips1, clips2] = await Promise.all([countFor(1), countFor(2)]);

  const line = (label, balls, clips) => {
    let status;
    if (clips == null) status = `<span class="warn-line">⚠ folder not found yet</span>`;
    else if (clips === balls) status = `<span class="ok-line">✓ matches</span>`;
    else status = `<span class="warn-line">⚠ mismatch</span>`;
    return `<p><strong>${label}</strong> — Balls coded: <strong>${balls}</strong> · Video clips: <strong>${clips == null ? "—" : clips}</strong> &nbsp; ${status}</p>`;
  };

  el.innerHTML = line("1st Innings", balls1, clips1) + line("2nd Innings", balls2, clips2);
}

function matchEventTitle(name) {
  return name.toUpperCase();
}

function dateField(label, val = "28-Jan-2026", time = "21:49", idBase = "") {
  const dId = idBase ? `id="${idBase}-d"` : "";
  const tId = idBase ? `id="${idBase}-t"` : "";
  return `<label class="f-row"><span class="f-label">${label}</span>
    <span class="dt-pair"><input class="f-input dt-date" ${dId} value="${val}"/><input class="f-input dt-time" ${tId} value="${time}"/></span></label>`;
}

function tableHead(cols) {
  return `<table class="data-table grid-table"><thead><tr>${cols.map((c) => `<th>${c} <span class="th-filter">▾</span></th>`).join("")}</tr></thead><tbody></tbody></table>`;
}

function saveDeleteRow(extra = "", saveId = "", deleteId = "") {
  const save = saveId ? `id="${saveId}"` : "data-close";
  const del = deleteId ? `id="${deleteId}"` : "data-close";
  return `<div class="btn-row-modal center">${extra}<button class="m-btn m-green" ${save}>Save</button><button class="m-btn m-red" ${del}>Delete</button></div>`;
}

// A Match Events data table with rows rendered from a saved-records array.
function meTable(cols, rowsHtml) {
  return `<table class="data-table grid-table"><thead><tr>${
    cols.map((c) => `<th>${c} <span class="th-filter">▾</span></th>`).join("")
  }</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}
const cells = (arr) => arr.map((v) => `<td>${v === "" || v == null ? "—" : v}</td>`).join("");

// Saved Other-Wickets rows (dismissal recorded without a delivery).
function otherWicketsRows() {
  return state.otherWickets.map((w) =>
    `<tr>${cells([w.dismissal, w.batsman, w.wicketNo, w.video])}</tr>`).join("");
}
function breaksRows() {
  return state.breaks.map((b) => `<tr>${cells([b.type, b.start, b.end, b.mins])}</tr>`).join("");
}
function powerPlaysRows() {
  return state.powerPlays.map((p) => `<tr>${cells([p.type, p.from, p.to, p.runs, p.wkts])}</tr>`).join("");
}
function ballChangesRows() {
  return state.ballChanges.map((b) =>
    `<tr>${cells([b.dt, b.team, b.inns, b.runs, b.overs, b.wkts, b.type, b.remarks])}</tr>`).join("");
}
function revisedRows(kind) {
  if (kind === "Revised Overs") {
    return state.revisedOvers.map((r) => `<tr>${cells([r.value, r.innings, r.reason])}</tr>`).join("");
  }
  return state.revisedTargets.map((r) =>
    `<tr>${cells([r.value, r.overs || "", r.innings, r.reason])}</tr>`).join("");
}
function batTimeRows() {
  return state.batTimes.map((r) =>
    `<tr>${cells([r.batsman, r.inTime, r.outTime, r.mins, r.balls])}</tr>`).join("");
}

// The two real teams for this match and their full playing XIs, taken live from
// the loaded match (state.battingTeam / state.bowlingTeam). Falls back to the
// current name pools for the standalone demo. Order-independent — both sides are
// always included, so Match Results is never tied to hardcoded OMN/CANA.
function matchResultTeams() {
  const bt = state.battingTeam, wt = state.bowlingTeam;
  const codeA = (bt && bt.code) || state.teamA || "";
  const codeB = (wt && wt.code) || state.teamB || "";
  const playersA = bt ? namesOf(bt.playingXIPlayers) : [...CANADA];
  const playersB = wt ? namesOf(wt.playingXIPlayers) : [...OMAN_BOWLERS];
  return {
    codes: [codeA, codeB].filter(Boolean),
    players: [...playersA, ...playersB],
  };
}

// Look up a saved per-team point value (points is an array of {team, value}).
function savedPoint(r, code) {
  return (r?.points || []).find((p) => p.team === code)?.value || "";
}

// The Match Results entry form. `r` (the saved result, if any) pre-fills every
// field so an edit starts from the stored values loaded from the DB.
function matchResultsForm(r = null) {
  const v = r || {};
  const { codes, players } = matchResultTeams();
  const resultOpts = ["Select","Win","Loss","Tie","No Result","Abandoned"]
    .map((o)=>`<option${v.resultType === o ? " selected" : ""}>${o}</option>`).join("");
  const pointsRows = codes.map((code, i) =>
    `<div class="points-row"><input class="f-input" value="${esc(code)}" disabled/><input class="f-input" id="mr-pts-${i}" data-team="${esc(code)}" placeholder="Point" value="${esc(savedPoint(v, code))}"/></div>`).join("");
  return `
    <div class="me-results">
      <div class="me-results-left">
        <label class="f-row"><span class="f-label">Result Type <span class="req">*</span></span><select class="f-select" id="mr-result">${resultOpts}</select></label>
        ${selectEl("Team", codes, "Select", "mr-team", v.team)}
        <label class="f-row"><span class="f-label">Comments <span class="req">*</span></span><input class="f-input" id="mr-comments" placeholder="Comments" value="${esc(v.comments || "")}"/></label>
        ${selectEl("Man Of The Match", players, "Select", "mr-motm", v.manOfMatch)}
        ${selectEl("Man Of The Series", players, "Select", "mr-mots", v.manOfSeries)}
        ${selectEl("Best Batsman", players, "Select", "mr-best-bat", v.bestBatsman)}
        ${selectEl("Best Bowler", players, "Select", "mr-best-bowl", v.bestBowler)}
        ${selectEl("Best All Rounder", players, "Select", "mr-best-ar", v.bestAllRounder)}
        ${selectEl("Most Valuable Player", players, "Select", "mr-mvp", v.mvp)}
      </div>
      <div class="me-results-right">
        <div class="points-head">POINTS</div>
        ${pointsRows}
      </div>
    </div>
    <div class="btn-row-modal center"><button class="m-btn m-green" id="mr-done">Done</button><button class="m-btn m-red" data-close>Revert</button></div>`;
}

// Read-only view of a saved result, shown after Done and whenever a completed
// match is reopened. Every field is read straight from the stored record.
function matchResultsView(r) {
  const row = (label, value) =>
    `<label class="f-row"><span class="f-label">${label}</span><span class="f-input f-static">${esc(value || "—")}</span></label>`;
  const pointsRows = (r.points || []).map((p) =>
    `<div class="points-row"><input class="f-input" value="${esc(p.team)}" disabled/><input class="f-input f-static" value="${esc(p.value || "—")}" disabled/></div>`).join("");
  return `
    <div class="me-results">
      <div class="me-results-left">
        ${row("Result Type", r.resultType)}
        ${row("Team", r.team)}
        ${row("Comments", r.comments)}
        ${row("Man Of The Match", r.manOfMatch)}
        ${row("Man Of The Series", r.manOfSeries)}
        ${row("Best Batsman", r.bestBatsman)}
        ${row("Best Bowler", r.bestBowler)}
        ${row("Best All Rounder", r.bestAllRounder)}
        ${row("Most Valuable Player", r.mvp)}
      </div>
      <div class="me-results-right">
        <div class="points-head">POINTS</div>
        ${pointsRows}
      </div>
    </div>
    <div class="btn-row-modal center"><button class="m-btn m-green" id="mr-edit">Edit</button></div>`;
}

function matchEventBody(name) {
  switch (name) {
    case "Breaks":
      return `
        <div class="me-form">
          <div class="me-form-left">
            ${dateField("Break Start Time", "28-Jan-2026", "21:49", "br-start")}
            ${dateField("Break End Time", "28-Jan-2026", "00:00", "br-end")}
            <label class="f-row"><span class="f-label">Duration</span><input class="f-input" id="br-dur"/></label>
            <label class="f-row"><span class="f-label">Comments</span><input class="f-input" id="br-type" placeholder="Break type / comments"/></label>
          </div>
          <div class="me-include-box">
            <p>Do You Want To Include This Breaks In Players Total Minutes Played</p>
            <label class="ck"><input type="radio" name="br-include" value="Yes"/> Yes</label>
            <label class="ck"><input type="radio" name="br-include" value="No" checked/> No</label>
          </div>
        </div>
        ${saveDeleteRow("", "br-save", "br-del")}
        ${meTable(["Break Type", "Started Time", "Ended Time", "Total Mins"], breaksRows())}`;
    case "Other Wickets":
      return `
        <p class="me-note">Records a dismissal without a delivery — no ball is counted.</p>
        <div class="pill-grid wide-pills">
          ${["Mankading","Absent Hurt","Timed Out","Retired Hurt","Retired Out"].map((d)=>`<button class="pill-btn" data-dismiss>${d}</button>`).join("")}
        </div>
        <div class="me-form-narrow">
          <label class="f-row"><span class="f-label">Player Name</span><select class="f-select" id="ow-player">${["PLAYER NAME", state.striker, state.nonStriker].map((o)=>`<option>${o}</option>`).join("")}</select></label>
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
        ${dateField("Ball Change Date/Time", "28-Jan-2026", "22:05", "bc-dt")}
        <div class="pill-grid wide-pills center">
          ${["New Ball","Semi New Ball","Second New Ball","Old Ball"].map((d)=>`<button class="pill-btn" data-balltype>${d}</button>`).join("")}
        </div>
        <label class="f-row"><span class="f-label">Remarks</span><textarea class="f-textarea yellow-area" id="bc-remarks" placeholder="Remarks"></textarea></label>
        ${saveDeleteRow("", "bc-save", "bc-del")}
        ${meTable(["Ball Change Date/Time","Team Name","Inns #","Runs","Overs","Wkts","Ball Type","Remarks"], ballChangesRows())}`;
    case "Match Results":
      // Once a result has been saved (in this match or loaded from the DB on a
      // resume), show it read-only; the form is only for entering/editing.
      if (state.matchResult && !editingMatchResult) return matchResultsView(state.matchResult);
      return matchResultsForm(state.matchResult);
    case "Movie Organiser":
      return movieOrganiserBody();
    case "Power Play":
      return powerPlayBody();
    case "Revised Overs":
    case "Revised Target":
      // A rain revision sets a new target AND, almost always, a new overs
      // limit — so the Revised Target screen carries an Overs field of its own
      // (the Revised Overs screen is 1st-innings only). Leaving it blank keeps
      // the current limit and revises the target alone.
      return `
        <div class="me-form-narrow">
          <label class="f-row"><span class="f-label">Innings</span><span class="f-input f-static">${name === "Revised Overs" ? "1st Innings" : "2nd Innings"}</span></label>
          <label class="f-row"><span class="f-label">${name === "Revised Overs" ? "Revised Overs" : "Revised Target"}</span><input class="f-input" id="rv-val" placeholder="${name === "Revised Overs" ? "e.g. 20 or 5.4" : "Runs"}"/></label>
          ${name === "Revised Target"
            ? `<label class="f-row"><span class="f-label">Revised Overs</span><input class="f-input" id="rv-overs" value="${escAttr(maxOvers())}" placeholder="e.g. 20 or 5.4"/></label>`
            : ""}
          <label class="f-row"><span class="f-label">Reason</span><input class="f-input" id="rv-reason" placeholder="Reason"/></label>
        </div>${saveDeleteRow("", "rv-save", "rv-del")}
        ${name === "Revised Target"
          ? meTable([name, "Overs", "Innings", "Reason"], revisedRows(name))
          : meTable([name, "Innings", "Reason"], revisedRows(name))}`;
    case "Match Info Edit":
      return `
        <div class="me-form-narrow">
          ${selectEl("Toss Won By", [state.teamA, state.teamB], "Select", "mi-toss", state.tossWonBy) }
          ${selectEl("Elected To", ["Bat","Bowl"], "Select", "mi-elected", state.tossDecision) }
          <label class="f-row"><span class="f-label">Number of Overs</span><input class="f-input" id="mi-overs" value="${maxOvers()}"/></label>
          <label class="f-row"><span class="f-label">Match Start Time</span><input class="f-input" id="mi-start" value="${escAttr(state.matchStartTime)}" placeholder="HH:MM:SS"/></label>
          <label class="f-row"><span class="f-label">Venue</span><input class="f-input" id="mi-venue" value="${escAttr(state.venue)}"/></label>
        </div>${saveDeleteRow("", "mi-save")}`;
    case "Batsman In / Out Time":
      return meTable(["Batsman","In Time","Out Time","Mins","Balls"], batTimeRows());
    // Declare the innings closed early (rain, a declaration, an abandoned
    // chase) instead of waiting for 10 wickets or the over limit.
    case "End Innings":
      return `
        <div class="confirm-box">
          <p>Do you want to End innings for ${inningsLabel()} at ${state.over}.${state.ball}?</p>
          <div class="btn-row-modal center">
            <button class="m-btn m-green" id="ei-yes">Yes</button>
            <button class="m-btn m-red" id="ei-no">No</button>
          </div>
        </div>`;
    case "Video Count Validation":
      return `
        <div class="confirm-box">
          <div id="vcv-result"><p>Counting video clips…</p></div>
          <div class="btn-row-modal center"><button class="m-btn m-green" id="vcv-btn">Re-validate</button></div>
        </div>`;
    default:
      return `<div class="confirm-box"><p>${name}</p></div>`;
  }
}

function powerPlayOptions() {
  return ["PP1", "PP2", "PP3"];
}

function powerPlayBody() {
  return `
    <div class="me-form-narrow">
      <label class="f-row"><span class="f-label">Power Play</span><select class="f-select" id="pp-type">${["Select", ...powerPlayOptions()].map((o)=>`<option>${o}</option>`).join("")}</select></label>
      <label class="f-row"><span class="f-label">From Over</span><input class="f-input" id="pp-from" value="${state.over}"/></label>
      <label class="f-row"><span class="f-label">To Over</span><input class="f-input" id="pp-to"/></label>
    </div>${saveDeleteRow("", "pp-save", "pp-del")}
    ${meTable(["Power Play","From","To","Runs","Wkts"], powerPlaysRows())}`;
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
// Full HTML escape for user-entered text placed into markup (comments etc.).
const esc = (v) => String(v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// Numeric run value carried by an extras cell ("0", "WD", "WD1", "LB", 2 …).
function extNum(ext) {
  if (typeof ext === "number") return ext;
  const m = String(ext).match(/\d+/);
  if (m) return Number(m[0]);
  return /^(NB|WD|LB|B)/i.test(String(ext).trim()) ? 1 : 0;
}

// Edit one logged ball. `log` defaults to the live innings; Edit Mode can pass
// the stored 1st-innings log instead, in which case the team score is left
// untouched (that innings' total is already fixed).
function overlayEditBall(index, log = state.log) {
  const r = log[index];
  if (!r) return;
  const live = log === state.log;
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
      <button class="m-btn m-yellow" id="eb-screen">Edit On-Screen Inputs</button>
      <button class="m-btn m-red" id="eb-delete">Delete</button>
    </div>`;
  openOverlay(popupShell(`EDIT BALL ${r.num}`, body));

  const applyFields = () => {
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
    if (live) state.runs = Math.max(0, state.runs + (newVal - oldVal)); // keep score in sync
  };
  document.getElementById("eb-save")?.addEventListener("click", () => {
    applyFields();
    closeOverlay();
    render();
  });
  // Continue on the coding surfaces: wagon wheel, pitch map, grids and tags
  // now update this ball until Done Editing is pressed.
  document.getElementById("eb-screen")?.addEventListener("click", () => {
    applyFields();
    closeOverlay();
    render();
    enterBallInputEdit(log, index);
  });
  document.getElementById("eb-delete")?.addEventListener("click", () => {
    if (live) state.runs = Math.max(0, state.runs - ((Number(r.runs) || 0) + extNum(r.ext)));
    log.splice(index, 1);
    closeOverlay();
    render();
  });
}

// Edit Mode: pick an innings + over + ball, then open that ball's saved inputs
// for editing. Over/ball use the human numbering shown on the over summaries
// (over 1 = the log's 0.x balls).
function overlayEditMode() {
  const innOpts = state.innings === 2 ? [1, 2] : [1];
  const body = `
    <label class="f-row"><span class="f-label">Innings</span><select class="f-select" id="em-inn">${
      innOpts.map((o) => `<option>${o}</option>`).join("")}</select></label>
    <label class="f-row"><span class="f-label">Over No</span><input class="f-input" id="em-over" placeholder="1 = first over" /></label>
    <label class="f-row"><span class="f-label">Ball No</span><input class="f-input" id="em-ball" placeholder="1–6" /></label>
    <div class="btn-row-modal">
      <button class="m-btn m-green" id="em-load">Load Ball</button>
      <button class="m-btn m-red" data-close>Cancel</button>
    </div>`;
  openOverlay(popupShell("EDIT MODE", body));
  document.getElementById("em-load")?.addEventListener("click", () => {
    const inn = Number(fieldVal("em-inn")) || 1;
    const overNo = Number(fieldVal("em-over"));
    const ballNo = Number(fieldVal("em-ball"));
    if (!overNo || !ballNo) { toast("Enter the over and ball number"); return; }
    const log = inn === state.innings ? state.log : (state.prevInningsLog || []);
    const num = `${overNo - 1}.${ballNo}`;
    let index = log.findIndex((r) => String(r.num) === num);
    if (index < 0) index = log.findIndex((r) => String(r.num).startsWith(`${num}+`));
    if (index < 0) { toast(`No ball ${num} recorded in innings ${inn}`); return; }
    closeOverlay();
    overlayEditBall(index, log);
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
    if (editingBall) return; // finish Done Editing before browsing other balls
    // click on a collapsed-over summary row toggles it open/closed
    const head = e.target.closest("tr.over-summary");
    if (head) {
      const over = Number(head.getAttribute("data-over"));
      if (expandedOvers.has(over)) expandedOvers.delete(over);
      else expandedOvers.add(over);
      renderLog(true); // keep the scroll position while toggling
      return;
    }
    const tr = e.target.closest("tr[data-index]");
    if (!tr) return;
    body.querySelectorAll("tr.selected").forEach((x) => x.classList.remove("selected"));
    tr.classList.add("selected");
    showBallInputs(Number(tr.getAttribute("data-index")));
  });
  // double click: edit that ball
  body.addEventListener("dblclick", (e) => {
    if (editingBall) return; // finish Done Editing before opening another edit
    const tr = e.target.closest("tr[data-index]");
    if (!tr) return;
    overlayEditBall(Number(tr.getAttribute("data-index")));
  });
}

// ---- Coding tags (BTN/UNC/WTB/RS multi-select + FF/BF/SD/CRM footwork) -----

// Wire the footer tag bar into state. BTN/UNC/WTB/RS are independent checkboxes
// (any combination); FF/BF/SD/CRM are one radio group (at most one).
// While a saved ball is being edited, tag/footwork/in-air changes rewrite it.
function mirrorToEditedBall() {
  const er = editingBallRow();
  if (!er) return;
  er.tags = { ...state.tags };
  er.footwork = state.footwork;
  er.inAir = state.inAir;
  scheduleSave();
}

function wireTags() {
  // Key Moment / Play and Miss / Bowling Variations / Edge / Free Hit on the
  // events grid are per-ball toggles, saved onto the ball with the other tags.
  document.querySelectorAll(".events-grid button[data-tag]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const on = !state.tags[btn.dataset.tag];
      state.tags[btn.dataset.tag] = on;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", String(on));
      mirrorToEditedBall();
    });
  });
  document.querySelectorAll("input[data-tag]").forEach((el) => {
    el.addEventListener("change", () => {
      state.tags[el.dataset.tag] = el.checked;
      mirrorToEditedBall();
    });
  });
  document.querySelectorAll("input[data-footwork]").forEach((el) => {
    el.addEventListener("change", () => {
      if (el.checked) state.footwork = el.dataset.footwork;
      mirrorToEditedBall();
    });
  });
  const air = document.getElementById("in-air-btn");
  air?.addEventListener("click", () => {
    state.inAir = !state.inAir;
    air.classList.toggle("active", state.inAir);
    air.setAttribute("aria-pressed", String(state.inAir));
    mirrorToEditedBall();
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
  document.querySelectorAll(".events-grid button[data-tag]").forEach((b) => {
    const on = !!state.tags[b.dataset.tag];
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  document.querySelectorAll("input[data-footwork]").forEach((el) => {
    el.checked = state.footwork === el.dataset.footwork;
  });
  const air = document.getElementById("in-air-btn");
  if (air) { air.classList.toggle("active", state.inAir); air.setAttribute("aria-pressed", String(state.inAir)); }
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
    if (editingBall) exitBallInputEdit(); // "Done Editing"
    else overlayEditMode();
  });
}

// Number keys enter runs while a ball is in progress, exactly like the keypad:
// 0–3/5/7–9 stage that many ran runs; 4 and 6 first ask Boundary or Ran (a
// boundary credits the batter's 4s/6s). The score commits on End Ball as usual.
function wireRunKeys() {
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target;
    if (t && (t.matches?.("input, textarea, select") || t.isContentEditable)) return;
    if (!/^[0-9]$/.test(e.key)) return;
    if (state.matchOver || !state.overStarted || !state.ballStarted) return;
    const root = overlayRoot();
    if (root && !root.hidden) return; // a popup is open — keys belong to it
    e.preventDefault();
    const val = Number(e.key);
    if (val === 4 || val === 6) overlayRunChoice(val);
    else stageRun(val, false);
  });
}

// 4/6 typed on the keyboard: boundary (hit to the rope) or runs ran?
function overlayRunChoice(val) {
  const body = `
    <div class="confirm-box">
      <p>Was the ${val} a boundary or runs taken?</p>
      <div class="btn-row-modal center">
        <button class="m-btn m-green" id="rc-boundary">Boundary ${val}</button>
        <button class="m-btn m-yellow" id="rc-ran">Ran ${val}</button>
      </div>
    </div>`;
  openOverlay(popupShell(`${val} RUNS`, body));
  document.getElementById("rc-boundary")?.addEventListener("click", () => { closeOverlay(); stageRun(val, true); });
  document.getElementById("rc-ran")?.addEventListener("click", () => { closeOverlay(); stageRun(val, false); });
}

// LS: load a saved video from disk (Finder / Explorer picker) and play it in
// the camera view. The live preview reattaches on the next Start Capture.
function wireLoadSavedVideo() {
  const btn = document.getElementById("btn-ls");
  const videoEl = document.getElementById("camera-preview");
  const closeBtn = document.getElementById("btn-video-close");
  if (!btn || !videoEl || !window.cricketApp?.pickVideo) return;
  btn.addEventListener("click", async () => {
    const res = await window.cricketApp.pickVideo();
    if (!res || res.canceled) return;
    if (!res.ok) { toast(`Could not load video: ${res.error || "unknown error"}`); return; }
    if (ballClipUrl) URL.revokeObjectURL(ballClipUrl);
    ballClipUrl = URL.createObjectURL(new Blob([res.bytes], { type: res.mime || "video/webm" }));
    videoEl.srcObject = null; // detach the live camera stream
    videoEl.src = ballClipUrl;
    videoEl.controls = true;
    videoEl.play?.().catch(() => {});
    if (closeBtn) closeBtn.hidden = false; // ✕ returns to the live camera
    // Remember the real file so Start Capture cuts from it rather than the camera.
    loadedVideoPath = res.path || null;
    toast(res.path
      ? `Playing ${res.name || "video"} — Start Capture will clip from it`
      : `Playing ${res.name || "video"}`);
  });
  // ✕ removes the loaded video and switches back to the realtime camera.
  closeBtn?.addEventListener("click", () => {
    if (ballClipUrl) { URL.revokeObjectURL(ballClipUrl); ballClipUrl = null; }
    loadedVideoPath = null;
    videoEl.removeAttribute("src");
    videoEl.controls = false;
    closeBtn.hidden = true;
    showLivePreview(videoEl); // reattach immediately if the stream is still hot
    startPreview();           // otherwise reacquire the configured camera
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
  appeals: () => document.getElementById("btn-appeals"),
  fieldingEvents: () => document.querySelector('[data-overlay="fielding"]'),
  matchEvents: () => document.querySelector('[data-overlay="matchevents"]'),
  remarks: () => document.querySelector('[data-overlay="remarks"]'),
  wickets: () => document.querySelector("#keypad .kb-wicket"),
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
      document.querySelector(".video-panel")?.classList.toggle("capturing", !active);
      state.capturing = !active;
      updateCaptureEnabled();
    });
    startPreview(); // still show the live camera feed even without a save bridge
    return;
  }

  let recorder = null, starting = false;
  const chunks = [];
  // Set while a capture is running over a video loaded with LS: the source file
  // and the playback position the capture started at. The clip is cut out of
  // that file when the capture ends, so it is exact to the second regardless of
  // how the on-screen playback behaved.
  let clipCut = null;
  function setUi(active) {
    btn.textContent = active ? "End Capture" : "Start Capture";
    btn.classList.toggle("teal", !active);
    btn.classList.toggle("red", active);
    // Drive the toolbar icon colours: while capturing, the record icon turns red
    // and the stop icon turns black.
    document.querySelector(".video-toolbar")?.classList.toggle("capturing", active);
    // Show the "Live Capture" badge only while a capture is running.
    document.querySelector(".video-panel")?.classList.toggle("capturing", active);
    state.capturing = active;      // keeps the button enabled while recording
    updateCaptureEnabled();
  }
  let captureLabel = "";
  // Capturing over a video loaded with LS: mark the in-point at the current
  // playback position and let it run. Nothing is recorded from the screen —
  // endClipCapture() cuts the real file between the two positions.
  function startClipCapture() {
    if (state.matchOver) return;
    captureLabel = `INN${state.innings}-OVER${state.over}-BALL${state.ball + 1}`;
    clipCut = { source: loadedVideoPath, start: videoEl.currentTime || 0 };
    videoEl.play?.().catch(() => {}); // a paused clip would capture nothing
    setUi(true);
  }

  async function endClipCapture() {
    const cut = clipCut; clipCut = null;
    setUi(false);
    if (!cut) return;
    const end = videoEl.currentTime || 0;
    if (!(end > cut.start)) { toast("Nothing captured — the video did not advance"); return; }
    const prefix = state.recordingPrefix || "";
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const name = prefix ? `${prefix}-${captureLabel}.mp4`
      : `cricket-capture-${captureLabel}-${ts}.mp4`;
    const res = await window.cricketApp.cutVideo({
      sourcePath: cut.source, start: cut.start, end,
      name, subfolder: state.recordingFolder || "",
    });
    if (res?.ok) {
      toast(`Clipped ${(end - cut.start).toFixed(1)}s from the loaded video`);
    } else if (!res?.canceled) {
      alert(`Could not clip the loaded video:\n${res?.filePath || ""}\n\n${res?.error || res?.reason || "unknown error"}`);
    }
  }

  async function start() {
    if (state.matchOver) return;   // no new captures once the match is complete
    if (starting || (recorder && recorder.state === "recording")) return;
    // A video loaded with LS is the capture source in its own right.
    if (loadedVideoPath && window.cricketApp?.cutVideo) { startClipCapture(); return; }
    starting = true;
    try {
      // Drop any clip that was loaded for review, then show the live feed.
      videoEl.controls = false; videoEl.removeAttribute("src");
      if (ballClipUrl) { URL.revokeObjectURL(ballClipUrl); ballClipUrl = null; }
      // The preview is normally already running; open it now if it isn't.
      if (!previewStream || !previewStream.active) await startPreview();
      if (!previewStream || !previewStream.active) throw new Error("No camera available");
      showLivePreview(videoEl);
      chunks.length = 0;
      // label the clip by where it begins: innings / over / ball (next ball)
      captureLabel = `INN${state.innings}-OVER${state.over}-BALL${state.ball + 1}`;
      const mime = pickRecorderMime();
      // Record the same live preview stream; leave it running when we stop so the
      // preview never goes dark between captures.
      recorder = new MediaRecorder(previewStream, mime ? { mimeType: mime } : {});
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        setUi(false);
        // Keep the preview stream alive — just re-show it (recording detached).
        showLivePreview(videoEl);
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
        // Always keep the INN<n> label in the filename so per-innings video
        // validation can tell 1st-innings clips from 2nd.
        const name = prefix
          ? `${prefix}-${captureLabel}.webm`
          : `cricket-capture-${captureLabel}-${ts}.webm`;
        const res = await window.cricketApp.saveRecording(buf, name, folder);
        // A configured recordings root failed to write (e.g. path too long or
        // no permission) — tell the user rather than losing the clip silently.
        if (res && res.ok === false && !res.canceled) {
          alert(`Could not save recording to the configured folder:\n${res.filePath || ""}\n\n${res.error || "unknown error"}`);
        }
      };
      recorder.start(1000);
      setUi(true);
    } catch (err) {
      // Leave the live preview stream intact; only the recording failed.
      recorder = null; setUi(false);
      alert(`Could not start camera: ${err.message || err}`);
    } finally { starting = false; }
  }
  btn.addEventListener("click", () => {
    if (clipCut) endClipCapture();
    else if (recorder && recorder.state === "recording") recorder.stop();
    else start();
  });
  // Running off the end of the loaded video closes the capture at its last frame.
  videoEl.addEventListener("ended", () => { if (clipCut) endClipCapture(); });

  // Kick off the always-on live preview, and re-check the configured device
  // whenever the coding window regains focus (the user may have changed it in
  // video settings). startPreview() is a no-op while a recording is running.
  startPreview();
  window.addEventListener("focus", () => { startPreview(); });
}

// Video toolbar icons: the left (□) icon snapshots the current camera frame
// into the match's screenshots folder; the right (◉) icon toggles the camera
// panel full screen (pressing it again in full screen restores the layout).
function wireVideoToolbar() {
  const videoEl = document.getElementById("camera-preview");
  const panel = document.querySelector(".video-panel");
  const shotBtn = document.querySelector(".video-toolbar .monitor-icon");
  const fsBtn = document.querySelector(".video-toolbar .camera-icon");
  if (!videoEl || !panel) return;

  shotBtn?.addEventListener("click", async () => {
    if (!videoEl.videoWidth) { toast("No camera preview to capture"); return; }
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    canvas.getContext("2d").drawImage(videoEl, 0, 0);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    if (!blob || !window.cricketApp?.saveRecording) { toast("Could not capture screenshot"); return; }
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const label = `INN${state.innings}-OVER${state.over}-BALL${state.ball + 1}`;
    const name = `${state.recordingPrefix ? `${state.recordingPrefix}-` : ""}SHOT-${label}-${ts}.png`;
    // Saved inside the match's own folder: <root>/<tournament>/<match>/screenshots/.
    // Without a loaded match there is no match folder, so group under UNGROUPED.
    const folder = `${state.recordingFolder || "UNGROUPED"}/screenshots`;
    const res = await window.cricketApp.saveRecording(await blob.arrayBuffer(), name, folder);
    if (res?.ok) toast("Screenshot saved");
    else if (!res?.canceled) toast("Could not save screenshot");
  });

  fsBtn?.addEventListener("click", () => {
    if (document.fullscreenElement === panel) document.exitFullscreen();
    else panel.requestFullscreen().catch(() => toast("Fullscreen not available"));
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

// The per-match recordings folder / filename prefix and the tournament folder
// it nests under both come from recordings.js — the Reports screen derives the
// same paths to play a ball's clip back, so the naming is shared rather than
// duplicated here.

// Create the match folder under the configured recordings root right away, so
// captures land in it without prompting (when a root is set in video settings).
function ensureRecordingFolder() {
  if (!state.recordingFolder || !window.cricketApp?.ensureRecordingFolder) return;
  window.cricketApp.ensureRecordingFolder(state.recordingFolder)
    .catch((e) => console.error("ensure recording folder failed", e));
}

function applyMatch(match) {
  state.matchId = match.id;
  state.recordingPrefix = window.recordingFolderName(match); // filename prefix (no slash)
  state.recordingFolder = window.recordingFolderPath(match); // <tournament>/<match>
  ensureRecordingFolder(); // create the match folder as soon as the match opens
  // The toss — recorded in the Toss popup on Match Details before the match is
  // ever opened here — decides who bats first: the winner if they elected to
  // Bat, otherwise the other side. Untossed matches fall back to the registered
  // home side (team A) opening the batting, as before.
  const home = match.teamA, away = match.teamB;
  const winner = !match.tossWonBy ? null
    : match.tossWonBy === away.code ? away : home;
  const batFirst = !winner ? home
    : match.tossDecision === "Bowl" ? (winner === home ? away : home)
    : winner;
  const A = batFirst === away ? away : home; // innings 1: A bats, B bowls
  const B = A === home ? away : home;
  state.tossWonBy = winner ? winner.code : "";
  state.tossDecision = match.tossDecision || "";
  state.battingTeam = A;
  state.bowlingTeam = B;
  state.bowlPlayers = B.playingXIPlayers || [];
  state.teamA = A.code;
  state.teamB = B.code;
  state.battingCode = A.code;
  state.venue = match.venueName || "";

  // batting order, bowlers and fielders come from the playing XIs
  CANADA = namesOf(A.playingXIPlayers);
  const bowlerPool = (B.playingXIPlayers || []).filter((p) => p.bowlingType);
  OMAN_BOWLERS = namesOf(bowlerPool.length ? bowlerPool : B.playingXIPlayers);
  FIELDERS = namesOf(B.playingXIPlayers);

  if (match.state) {
    // resume an in-progress innings
    Object.assign(state, match.state);
    // Matches saved before overStarted was persisted carry no flag at all, and
    // the in-memory one is whatever the last match left behind. Infer it: the
    // over is open if anything has been bowled in it and no new bowler is due.
    if (match.state.overStarted === undefined) {
      state.overStarted = !state.pendingBowler
        && (state.ball > 0 || (state.thisOver || []).length > 0);
    }
    // An open over survives the resume (overStarted comes back from the save),
    // so the button reads "End Over" and the scorer carries on where they left
    // off. A ball in progress does not: pending/staged are never saved, so the
    // delivery is re-started rather than resumed half-entered.
    state.ballStarted = false;
    state.pending = null;
    state.staged = null;
    // The squads above were built for the 1st innings; re-point them at the
    // side the saved state says is batting (a no-op on a 1st-innings resume).
    syncSquadPools();
    return;
  }

  // fresh innings — openers and the opening bowler come from the toss popup,
  // falling back to the top of the batting order / first recognised bowler.
  const xi = A.playingXIPlayers || [];
  const bxi = B.playingXIPlayers || [];
  const striker = xi.find((p) => p.id === match.openingStrikerId) || xi[0];
  const nonStriker = xi.find((p) => p.id === match.openingNonStrikerId && p !== striker)
    || xi.find((p) => p !== striker);
  state.striker = (striker && striker.name.toUpperCase()) || "BATSMAN 1";
  state.nonStriker = (nonStriker && nonStriker.name.toUpperCase()) || "BATSMAN 2";
  state.bowlEnd = "FAR END";
  const firstBowler = bxi.find((p) => p.id === match.openingBowlerId)
    || bxi.find((p) => p.bowlingType) || bxi[0];
  state.bowler = bowlerLabel(firstBowler) || "BOWLER";
  state.runs = 0; state.wkts = 0; state.over = 0; state.ball = 0;
  state.pace = "Fast"; state.style = "Aggressive";
  state.bat = {
    striker: { runs: 0, balls: 0, fours: 0, sixes: 0 },
    nonStriker: { runs: 0, balls: 0, fours: 0, sixes: 0 },
  };
  state.bowl = { spell: 1, balls: 0, runs: 0, mdns: 0, wkts: 0 };
  state.log = [];
  expandedOvers.clear();
  state.pendingBatsman = null; state.pendingBowler = false; state.bowlerHistory = [];
  state.overRunsThisOver = 0;
  state.thisOver = [];
  state.history = [];
  state.innings = 1;
  state.matchOver = false;
  state.overStarted = false;
  state.ballStarted = false;
  state.overSixAnswered = false;
  // Openers can be picked from anywhere in the order, so the next batsman in is
  // the first batting-order slot neither of them occupies (2 for the usual 0/1).
  const openerIdx = [CANADA.indexOf(state.striker), CANADA.indexOf(state.nonStriker)];
  let nextIn = 0;
  while (openerIdx.includes(nextIn)) nextIn += 1;
  state.nextBatIndex = nextIn;
  state.dismissed = [];
  // Fresh match: clear any Match Events left over from a previous one.
  state.breaks = []; state.otherWickets = []; state.powerPlays = [];
  state.ballChanges = []; state.revisedOvers = []; state.revisedTargets = [];
  state.penalties = []; state.fieldingEvents = []; state.appealsLog = [];
  state.matchResult = null;
  state.batTimes = []; state.matchStartTime = ""; state.matchStartTs = 0;
  state.openersRecorded = false;
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
    // innings/target/overs so a resumed 2nd innings still shows the chase panel
    innings: state.innings, target: state.target, overs: state.overs,
    matchOver: state.matchOver, // keep a completed match locked when reopened
    // Whether the current over is still open. Without this a match resumed
    // mid-over came back with the button on "Start Over" — pressing it would
    // have re-opened an over that was never closed. Only the over flag is kept;
    // a half-entered ball (pending/staged) is never persisted, so ballStarted is
    // deliberately reset on resume (see loadMatchIntoState).
    overStarted: state.overStarted,
    // …and whether the six-legal-balls prompt for that over has been answered
    // with "continue", so a resume mid-over does not re-ask on the next ball.
    overSixAnswered: !!state.overSixAnswered,
    // Match Info Edit — toss + venue (venue may be edited away from the ground name)
    tossWonBy: state.tossWonBy, tossDecision: state.tossDecision, venue: state.venue,
    // batting-order tracking so the right batsman comes in after a resume
    nextBatIndex: state.nextBatIndex, dismissed: state.dismissed,
    // Match Events — all persisted so they survive resume and reporting.
    breaks: state.breaks, otherWickets: state.otherWickets,
    powerPlays: state.powerPlays, ballChanges: state.ballChanges,
    revisedOvers: state.revisedOvers, revisedTargets: state.revisedTargets,
    penalties: state.penalties, fieldingEvents: state.fieldingEvents,
    appealsLog: state.appealsLog, matchResult: state.matchResult,
    // Batsman in/out timing + the (editable) match start time.
    batTimes: state.batTimes, matchStartTime: state.matchStartTime,
    matchStartTs: state.matchStartTs, openersRecorded: state.openersRecorded,
    firstInningsBalls: state.firstInningsBalls,
    prevInningsLog: state.prevInningsLog, // 1st-innings balls stay editable in Edit Mode
    // pending batsman/bowler dropdowns + bowler rotation history
    pendingBatsman: state.pendingBatsman || null, pendingBowler: !!state.pendingBowler,
    bowlerHistory: state.bowlerHistory || [],
    // Recent undo stack — without this, a resumed match shows logged balls but
    // undo refuses ("nothing to undo"). Capped to keep the debounced save light.
    history: (state.history || []).slice(-10),
  };
}
function savePayload() {
  return { id: state.matchId, state: serializeState(),
    status: state.matchOver ? "COMPLETED" : "RESUME" };
}
function scheduleSave() {
  if (!state.matchId || !window.cricketApp?.db?.saveMatchState) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    window.cricketApp.db.saveMatchState(savePayload())
      .catch((e) => console.error("save state failed", e));
  }, 600);
}

// Write the pending state NOW, synchronously. The debounced save above is an
// async IPC call that is thrown away with the renderer when the page navigates,
// so leaving the coding screen within 600ms of the last action used to lose it —
// most visibly the over flags, which made a match resumed mid-over come back on
// "Start Over" instead of "End Over".
function flushSave() {
  if (!state.matchId) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  const db = window.cricketApp?.db;
  if (!db) return;
  try {
    if (db.saveMatchStateSync) db.saveMatchStateSync(savePayload());
    else db.saveMatchState(savePayload())?.catch(() => {});
  } catch (e) {
    console.error("flush state failed", e);
  }
}
// pagehide covers both the in-app links out of the coding screen and the window
// being closed; visibilitychange catches the app being hidden mid-innings.
window.addEventListener("pagehide", flushSave);
window.addEventListener("beforeunload", flushSave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushSave();
});

// ---- Boot -----------------------------------------------------------------

function syncToggles() {
  document.querySelectorAll('.toggle[data-group="pace"]').forEach((b) =>
    b.classList.toggle("active", toggleValue(b) === state.pace));
  document.querySelectorAll('.toggle[data-group="style"]').forEach((b) =>
    b.classList.toggle("active", toggleValue(b) === state.style));
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
  wireVideoToolbar();
  wireRunKeys();
  wireLoadSavedVideo();
  loadCodingPrefs();
  window.addEventListener("focus", loadCodingPrefs);
  updateCaptureEnabled(); // Start Capture stays disabled until a ball is started
  wireShortcuts();

  // Optional deep-link: index.html?open=matchevents (or appeals, fielding, wickets,
  // remarks, scorecard, overcomp, bowlcompute) opens that overlay on load.
  const key = new URLSearchParams(location.search).get("open");
  if (key && OVERLAYS[key]) OVERLAYS[key]();
}

boot();
