// ============================================================================
// Cricket Analysis Pro — scoring engine + overlays
// Recreated to match the look, feel and functionality of the reference
// recordings (Canada vs Oman live coding session).
// ============================================================================

// ---- Reference data -------------------------------------------------------

// Bowl types swap with the Fast / Spin toggle (3 cols × 5 rows)
const BOWL_TYPES = {
  Fast: [
    "Inswinger", "OutSwinger", "Straight Ball",
    "Angled In", "Angled Across", "Bouncer",
    "Nip Backer", "Nipped Away", "Slow Bouncer",
    "Full Toss", "Slower Ball", "Yorker",
    "Off Cutter", "Leg Cutter", "Cross Seam",
  ],
  Spin: [
    "Off Spin", "Doosra", "Faster One",
    "Leg Spin", "Googly", "Flipper",
    "Orthodox", "Chinaman", "Arm Ball",
    "Straighter One", "Full Toss", "No turn",
    "Wrong One", "Top Spin", "Carrom Ball",
  ],
};

// Shot types swap with the Aggressive / Defensive toggle
const SHOT_TYPES = {
  Aggressive: [
    "Cover Drive", "Square Drive", "Straight Drive",
    "Off Drive", "On Drive", "Flick",
    "Cut", "Pull", "Slash",
    "Sweep Shot", "Slog Sweep", "Slog Shot",
    "Lofted Off", "Lofted On", "Lofted Over Cover",
  ],
  Defensive: [
    "Forward Defence", "Backfoot Defence", "Glide",
    "Left Alone", "Push", "No Shot",
    "Late Cut", "Ducked", "Leg Glance",
    "Soft Hand Defence", "Steer", "Worked",
  ],
};

// The ▲ key is a "shift" toggle: the default page exposes 1/2/3 + boundary
// B4/B6, while the shifted page swaps the first two columns to plain run values
// 4/5/6/7/8 (so big run totals can be entered without the boundary flag). The
// ▲ cell highlights red while shifted.
function getKeypadKeys() {
  // RBW (run-out) page: record runs completed before the run out. The right
  // column (NB/WD/LB/B) is shown but disabled — extras don't apply on a run out.
  if (state.keypadMode === "rbw") {
    const dis = (label, ext) => ({ label, type: "ext", ext, cls: "alt", disabled: true });
    return [
      { label: "-1", type: "runout", val: -1 },
      { label: "1", type: "runout", val: 1 },
      dis("NB", "NB"),
      { label: "-2", type: "runout", val: -2 },
      { label: "2", type: "runout", val: 2 },
      dis("WD", "WD"),
      { label: "-3", type: "runout", val: -3 },
      { label: "3", type: "runout", val: 3 },
      dis("LB", "LB"),
      { label: "▲", type: "shift", cls: "icon-up" },
      { label: "RBW", type: "rbw", cls: "alt active-mode" },
      dis("B", "B"),
    ];
  }

  // Normal page; ▲ toggles the 4-8 "shifted" run values in the first two cols.
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
    { label: "RBW", type: "rbw", cls: "alt" },
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

const FIELDING_EVENTS = [
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
  "Penalty", "End Session", "End Innings", "End Day", "Declare Innings",
  "Follow On", "Match Results", "Match Info Edit", "Batsman In / Out Time",
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
  pace: "Fast",
  style: "Aggressive",
  keypadShifted: false,
  keypadMode: "normal", // "normal" | "rbw"
  bowlType: null,
  shotType: null,
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
};

function row(num, bowler, striker, nonstr, bowl, shot, runs, ext) {
  return { num, bowler, striker, nonstr, bowl, shot, runs, ext };
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

function renderBowlGrid() {
  fillGrid("bowl-grid", BOWL_TYPES[state.pace], "bowl");
  state.bowlType = null;
}
function renderBatGrid() {
  fillGrid("bat-grid", SHOT_TYPES[state.style], "bat");
  state.shotType = null;
}

function fillKeypad() {
  const el = document.getElementById("keypad");
  if (!el) return;
  el.innerHTML = "";
  getKeypadKeys().forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `keypad-btn ${k.cls || ""}`.trim();
    b.textContent = k.label;
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
      if (g === "pace") { state.pace = btn.textContent.trim(); renderBowlGrid(); }
      if (g === "style") { state.style = btn.textContent.trim(); renderBatGrid(); }
    });
  });

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
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", x.toFixed(2));
    dot.setAttribute("cy", y.toFixed(2));
    dot.setAttribute("r", "1.1");
    dot.setAttribute("class", "pitch-dot");
    svg.appendChild(dot);
    state.lastPitch = { x, y };
  });
}

// ---- Field map (wagon wheel) ---------------------------------------------

function wireFieldMap() {
  const wrap = document.getElementById("field-map-wrap");
  const svg = document.getElementById("wagon-overlay");
  if (!wrap || !svg) return;
  wrap.addEventListener("click", (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    const runs = state.pendingRuns || 0;
    const stroke = runs >= 6 ? "#e8b84b" : runs >= 4 ? "#4db3ff" : "#e0524a";
    const line = document.createElementNS(NS, "line");
    line.setAttribute("x1", "50"); line.setAttribute("y1", "50");
    line.setAttribute("x2", x.toFixed(2)); line.setAttribute("y2", y.toFixed(2));
    line.setAttribute("class", "wagon-line");
    line.setAttribute("stroke", stroke);
    svg.appendChild(line);
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", x.toFixed(2)); dot.setAttribute("cy", y.toFixed(2));
    dot.setAttribute("r", "1.2"); dot.setAttribute("fill", stroke);
    svg.appendChild(dot);
    state.lastWagon = { x, y };
  });
}

// ---- Keypad / scoring -----------------------------------------------------

function handleKeypad(k, btn) {
  if (k.type === "shift") {
    // ▲ only shifts run values on the normal page
    if (state.keypadMode !== "rbw") { state.keypadShifted = !state.keypadShifted; fillKeypad(); }
    return;
  }
  if (k.type === "rbw") {
    // toggle the run-out page on / off
    state.keypadMode = state.keypadMode === "rbw" ? "normal" : "rbw";
    fillKeypad();
    return;
  }
  if (k.type === "runout") {
    // runs completed before the run out, then a wicket; back to the normal page
    logBall({ runs: k.val, ext: 0, legal: true, wicket: true });
    state.keypadMode = "normal";
    fillKeypad();
    flash(btn);
    return;
  }
  if (k.type === "mark") {
    document.querySelectorAll("#keypad .keypad-btn").forEach((x) => x.classList.remove("marked"));
    btn.classList.add("marked");
    return;
  }
  if (k.type === "run") {
    state.pendingRuns = k.val;
    logBall({ runs: k.val, ext: 0, boundary: k.boundary, legal: true });
  } else if (k.type === "ext") {
    handleExtra(k.ext);
  }
  flash(btn);
}

function handleExtra(ext) {
  // NB / WD = 1 extra run, ball is NOT legal (re-bowled)
  // LB / B  = bye runs, ball IS legal
  // RBW     = run + wicket marker (simplified)
  if (ext === "NB" || ext === "WD") {
    logBall({ runs: 0, ext: 1, extLabel: ext, legal: false });
  } else if (ext === "LB" || ext === "B") {
    logBall({ runs: 0, ext: 1, extLabel: ext, legal: true, bye: true });
  } else if (ext === "RBW") {
    logBall({ runs: 0, ext: 0, legal: true, wicket: true });
  }
}

function shortName(name) {
  return (name || "").split(" ").slice(0, 2).join(" ");
}

function logBall({ runs = 0, ext = 0, boundary = false, legal = true, bye = false, wicket = false, extLabel = "" }) {
  pushHistory();

  const ballNum = legal ? `${state.over}.${state.ball + 1}` : `${state.over}.${state.ball + 1}+`;
  const extCol = extLabel ? `${extLabel}${ext > 1 ? ext : ""}` : ext;
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
    newBatsman();
  }

  if (legal) {
    state.ball += 1;
    if (runs % 2 === 1) swapStrike();
    if (state.ball >= 6) completeOver();
  } else {
    // no-ball / wide: same striker, odd runs off the bat still rotate
    if (runs % 2 === 1) swapStrike();
  }

  state.pendingRuns = 0;
  state.bowlType = null; state.shotType = null;
  document.querySelectorAll("#bowl-grid .selected, #bat-grid .selected").forEach((x) => x.classList.remove("selected"));
  render();
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
  setOverButton("Start Over");
}

// ---- Undo -----------------------------------------------------------------

function pushHistory() {
  state.history.push(JSON.stringify({
    runs: state.runs, wkts: state.wkts, over: state.over, ball: state.ball,
    striker: state.striker, nonStriker: state.nonStriker, bowler: state.bowler,
    bowlEnd: state.bowlEnd, bat: state.bat, bowl: state.bowl, log: state.log,
    overRunsThisOver: state.overRunsThisOver, thisOver: state.thisOver,
  }));
  if (state.history.length > 60) state.history.shift();
}

function undo() {
  const prev = state.history.pop();
  if (!prev) return;
  Object.assign(state, JSON.parse(prev));
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

  // over tally badge + chips
  setText("over-runs-badge", state.overRunsThisOver);
  const to = document.getElementById("this-over");
  if (to) {
    to.innerHTML = state.thisOver.map((t) => {
      const w = t === "W"; const four = t === "4"; const six = t === "6";
      const cls = w ? "chip-w" : six ? "chip-6" : four ? "chip-4" : "";
      return `<span class="over-chip ${cls}">${t}</span>`;
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
  body.innerHTML = state.log.slice(-30).map((r) => `
    <tr>
      <td>${r.num}</td><td>${r.bowler}</td><td>${r.striker}</td><td>${r.nonstr}</td>
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

function wireActionButtons() {
  const over = document.getElementById("btn-over");
  const ball = document.getElementById("btn-ball");
  const undoBtn = document.getElementById("btn-undo");

  over?.addEventListener("click", () => {
    if (over.textContent.startsWith("Start")) setOverButton("End Over");
    else { completeOver(); render(); }
  });

  ball?.addEventListener("click", () => {
    const started = ball.textContent.startsWith("End");
    ball.textContent = started ? "Start Ball" : "End Ball";
    ball.classList.toggle("red", !started);
    ball.classList.toggle("teal", started);
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
      const runs = Number(b.getAttribute("data-ot")) || 0;
      logBall({ runs, ext: 0, boundary: runs === 4 || runs === 6, legal: true });
      flash(b);
      setOpen(false);
    });
  });
}

function flash(el) {
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 160);
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
    logBall({ runs: 0, ext: 0, legal: true, wicket: true });
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
  const nav = `<div class="me-nav">${MATCH_EVENTS_NAV.map((n) =>
    `<button class="me-nav-item ${n === active ? "active" : ""}" data-nav="${n}">${n}</button>`).join("")}</div>`;
  openOverlay(moduleShell(matchEventTitle(active), nav, matchEventBody(active)));
  const root = overlayRoot();
  root.querySelectorAll("[data-nav]").forEach((b) => b.addEventListener("click", () => {
    overlayMatchEvents(b.getAttribute("data-nav"));
  }));
  wireSeg();
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
        <div class="pill-grid wide-pills">
          ${["Mankading","Absent Hurt","Timed Out","Retired Hurt","Retired Out"].map((d)=>`<button class="pill-btn">${d}</button>`).join("")}
        </div>
        <div class="me-form-narrow">
          ${selectEl("Player Name", CANADA, "PLAYER NAME")}
          <label class="f-row"><span class="f-label">Wicket No</span><input class="f-input" value="1"/></label>
          <button class="m-btn m-dark wide" >Browse Video</button>
        </div>
        ${saveDeleteRow()}
        ${tableHead(["Dismissal Type", "Batsman Name", "Wicket No", "Video"])}`;
    case "Penalty":
      return `
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
    case "Ball Change":
      return `
        ${dateField("Ball Change Date/Time", "28-Jan-2026", "22:05")}
        <div class="pill-grid wide-pills center">
          ${["New Ball","Semi New Ball","Second New Ball","Old Ball"].map((d)=>`<button class="pill-btn">${d}</button>`).join("")}
        </div>
        <label class="f-row"><span class="f-label">Remarks</span><textarea class="f-textarea yellow-area">b/c of fade color</textarea></label>
        ${saveDeleteRow()}
        ${tableHead(["Ball Change Date/Time","Team Name","Inns #","Runs","Overs","Wkts","Ball Type","Remarks"])}`;
    case "Match Results":
      return `
        <div class="me-results">
          <div class="me-results-left">
            ${selectEl("Result Type", ["Win","Loss","Tie","No Result","Abandoned"]) }
            ${selectEl("Team", ["OMN","CANA"]) }
            <label class="f-row"><span class="f-label">Comments</span><input class="f-input" placeholder="Comments"/></label>
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
        <div class="btn-row-modal center"><button class="m-btn m-green" data-close>Done</button><button class="m-btn m-red" data-close>Revert</button></div>`;
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
          ${selectEl("Innings", ["1st Innings","2nd Innings"]) }
          <label class="f-row"><span class="f-label">${name === "Revised Overs" ? "Revised Overs" : "Revised Target"}</span><input class="f-input"/></label>
          <label class="f-row"><span class="f-label">Reason</span><input class="f-input" placeholder="Reason"/></label>
        </div>${saveDeleteRow()}`;
    case "Declare Innings":
    case "End Innings":
    case "End Session":
    case "End Day":
    case "Follow On":
      return `
        <div class="confirm-box">
          <p>Confirm <strong>${name}</strong> at ${state.runs}/${state.wkts} (${state.over}.${state.ball})?</p>
          <div class="btn-row-modal center"><button class="m-btn m-green" data-close>Confirm</button><button class="m-btn m-red" data-close>Cancel</button></div>
        </div>`;
    case "Match Info Edit":
      return `
        <div class="me-form-narrow">
          ${selectEl("Toss Won By", ["CANA","OMN"]) }
          ${selectEl("Elected To", ["Bat","Bowl"]) }
          <label class="f-row"><span class="f-label">Number of Overs</span><input class="f-input" value="20"/></label>
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

function powerPlayBody() {
  return `
    <div class="me-form-narrow">
      ${selectEl("Power Play", ["PP1 (1-6)","PP2 (7-15)","PP3 (16-20)","Batting PP","Bowling PP"]) }
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

// ---- Overlay routing ------------------------------------------------------

const OVERLAYS = {
  appeals: overlayAppeals,
  fielding: overlayFielding,
  remarks: overlayRemarks,
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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeOverlay(); });
  document.getElementById("btn-editmode")?.addEventListener("click", () => {
    document.body.classList.toggle("edit-mode");
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
  async function start() {
    if (starting || (recorder && recorder.state === "recording")) return;
    starting = true;
    try {
      stream = await getCaptureStream();
      videoEl.srcObject = stream;
      chunks.length = 0;
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
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        await window.cricketApp.saveRecording(buf, `cricket-capture-${ts}.webm`);
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

function applyMatch(match) {
  state.matchId = match.id;
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
  syncToggles();
  render();
  wireCapture();

  // Optional deep-link: index.html?open=matchevents (or appeals, fielding, wickets,
  // remarks, scorecard, overcomp, bowlcompute) opens that overlay on load.
  const key = new URLSearchParams(location.search).get("open");
  if (key && OVERLAYS[key]) OVERLAYS[key]();
}

boot();
