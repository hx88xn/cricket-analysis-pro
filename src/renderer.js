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

function pickRecorderMime() {
  const c = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const m of c) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

async function getCaptureStream() {
  const v = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };
  try {
    return await navigator.mediaDevices.getUserMedia({ video: v, audio: true });
  } catch {
    return await navigator.mediaDevices.getUserMedia({ video: v, audio: false });
  }
}

function wireCapture() {
  const videoEl = document.getElementById("camera-preview");
  const btn = document.getElementById("btn-capture");
  if (!videoEl || !btn || !window.cricketApp?.saveRecording) return;

  let stream = null;
  let recorder = null;
  const chunks = [];
  let starting = false;

  function setCapturingUi(active) {
    btn.textContent = active ? "End Capture" : "Start Capture";
    btn.classList.toggle("teal", !active);
    btn.classList.toggle("red", active);
  }

  async function startCapture() {
    if (starting || (recorder && recorder.state === "recording")) return;
    starting = true;
    try {
      stream = await getCaptureStream();
      videoEl.srcObject = stream;
      chunks.length = 0;
      const mime = pickRecorderMime();
      const opts = mime ? { mimeType: mime } : {};
      recorder = new MediaRecorder(stream, opts);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        setCapturingUi(false);
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
        }
        videoEl.srcObject = null;
        const r = recorder;
        recorder = null;
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: r.mimeType || "video/webm" });
        chunks.length = 0;
        const buf = await blob.arrayBuffer();
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const res = await window.cricketApp.saveRecording(buf, `cricket-capture-${ts}.webm`);
        if (res && res.ok === false && !res.canceled) {
          console.error("Save failed", res);
        }
      };
      recorder.start(1000);
      setCapturingUi(true);
    } catch (err) {
      console.error(err);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      videoEl.srcObject = null;
      recorder = null;
      setCapturingUi(false);
      alert(`Could not start camera: ${err.message || err}`);
    } finally {
      starting = false;
    }
  }

  function endCapture() {
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }

  btn.addEventListener("click", () => {
    if (recorder && recorder.state === "recording") {
      endCapture();
    } else {
      startCapture();
    }
  });
}

wireCapture();
