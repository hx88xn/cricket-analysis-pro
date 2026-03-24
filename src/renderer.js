const bowlTypes = [
  "Inswinger",
  "Outswinger",
  "Leg Cutter",
  "Off Cutter",
  "Slower",
  "Bouncer",
  "Yorker",
  "Full Toss",
  "Knuckle",
  "Back Of Hand",
  "Wobble",
  "Top Spinner",
  "Googly",
  "Doosra",
  "Carrom",
];

const shotTypes = [
  "Cover Drive",
  "Straight Drive",
  "On Drive",
  "Square Cut",
  "Late Cut",
  "Pull",
  "Hook",
  "Sweep",
  "Reverse Sweep",
  "Slog Sweep",
  "Lofted On",
  "Chip",
  "Glide",
  "Steer",
  "Defend",
];

const keypadKeys = [
  { label: "1", className: "" },
  { label: "2", className: "" },
  { label: "3", className: "" },
  { label: "B4", className: "alt" },
  { label: "B6", className: "alt" },
  { label: "NB", className: "alt" },
  { label: "WD", className: "alt" },
  { label: "LB", className: "alt" },
  { label: "B", className: "alt" },
  { label: "MARK FOR EDIT", className: "alt narrow" },
  { label: "RBW", className: "alt" },
  { label: "▲", className: "icon-up" },
];

function fillGrid(containerId, labels, options = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  labels.forEach((text) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "grid-btn";
    b.textContent = text;
    b.addEventListener("click", () => {
      if (options.singleSelect) {
        el.querySelectorAll(".grid-btn").forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
      }
    });
    el.appendChild(b);
  });
}

function fillKeypad() {
  const el = document.getElementById("keypad");
  if (!el) return;
  el.innerHTML = "";
  keypadKeys.forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `keypad-btn ${k.className}`.trim();
    b.textContent = k.label;
    el.appendChild(b);
  });
}

document.querySelectorAll(".toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const g = btn.getAttribute("data-group");
    document.querySelectorAll(`.toggle[data-group="${g}"]`).forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
  });
});

fillGrid("bowl-grid", bowlTypes, { singleSelect: true });
fillGrid("bat-grid", shotTypes, { singleSelect: true });
fillKeypad();
