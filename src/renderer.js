// Bowl types - 3 cols × 5 rows = 15 items (matches screenshot layout)
const bowlTypes = [
  "Inswinger",   "OutSwinger",   "Straight Ball",
  "Angled In",   "Angled Across", "Bouncer",
  "Nip Backer",  "Nipped Away",  "Slow Bouncer",
  "Full Toss",   "Slower Ball",  "Yorker",
  "Off Cutter",  "Leg Cutter",   "Cross Seam",
];

// Shot types - 3 cols × 5 rows = 15 items (matches screenshot layout)
const shotTypes = [
  "Cover Drive",  "Square Drive",     "Straight Drive",
  "Off Drive",    "On Drive",         "Flick",
  "Cut",          "Pull",             "Slash",
  "Sweep Shot",   "Slog Sweep",       "Slag Shot",
  "Lofted Off",   "Lofted On",        "Lofted Over Cover",
];

// Keypad keys - 3 cols × 4 rows (matches screenshot exactly)
// Row 1: 1, B4, NB
// Row 2: 2, B6, WD
// Row 3: 3, MARK FOR EDIT, LB
// Row 4: ▲, RBW, B
const keypadKeys = [
  { label: "1",            className: "" },
  { label: "B4",           className: "alt" },
  { label: "NB",           className: "alt" },
  { label: "2",            className: "" },
  { label: "B6",           className: "alt" },
  { label: "WD",           className: "alt" },
  { label: "3",            className: "" },
  { label: "MARK FOR EDIT", className: "alt narrow" },
  { label: "LB",           className: "alt" },
  { label: "▲",            className: "icon-up" },
  { label: "RBW",          className: "alt" },
  { label: "B",            className: "alt" },
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

// OTW / RTW / CD overlay button toggle
document.querySelectorAll(".pitch-overlay-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const g = btn.getAttribute("data-group");
    document.querySelectorAll(`.pitch-overlay-btn[data-group="${g}"]`).forEach((t) => t.classList.remove("active"));
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
  let cfg = {};
  try {
    cfg = (await window.cricketApp?.getConfig?.()) || {};
  } catch {
    /* ignore */
  }
  const base = { width: { ideal: 1280 }, height: { ideal: 720 } };
  const withDevice = cfg.cameraDeviceId
    ? { ...base, deviceId: { exact: cfg.cameraDeviceId } }
    : { ...base, facingMode: "user" };
  const fallback = { ...base, facingMode: "user" };

  async function tryStream(videoConstraints, audio) {
    return navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio });
  }

  try {
    return await tryStream(withDevice, true);
  } catch {
    try {
      return await tryStream(withDevice, false);
    } catch (e2) {
      if (cfg.cameraDeviceId) {
        try {
          return await tryStream(fallback, true);
        } catch {
          return await tryStream(fallback, false);
        }
      }
      throw e2;
    }
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
