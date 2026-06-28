const recordingsInput = document.getElementById("recordings-path");
const databaseInput = document.getElementById("database-path");
const statusEl = document.getElementById("config-status");
const form = document.getElementById("config-form");

const shortcutInputs = Array.from(document.querySelectorAll("[data-shortcut]"));

// ---- Shortcut key recorder -------------------------------------------------
// Each shortcut field captures the actual key combination pressed (e.g.
// "Ctrl+X", "Ctrl+Shift+W", "Space") instead of letting the user type text —
// otherwise browser combos like Ctrl+X (cut) never reach the field. The field
// is read-only and listens for keydown so ANY key, with any modifiers, can be
// assigned. Press Esc (or Backspace/Delete with no modifiers) to clear it.

function isModifierKey(key) {
  return key === "Control" || key === "Shift" || key === "Alt" || key === "Meta";
}

// Human-readable name for the non-modifier key (matches the parser in renderer.js,
// which lowercases everything, so casing here is purely cosmetic).
function shortcutKeyName(e) {
  const k = e.key;
  if (k === " ") return "Space";
  if (k.length === 1) return k.toUpperCase();
  return k; // Enter, Tab, ArrowUp, Escape, F1, Delete, Backspace, …
}

function comboDisplayFromEvent(e) {
  const mods = [];
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  if (e.metaKey) mods.push("Cmd");
  return [...mods, shortcutKeyName(e)].join("+");
}

function setupShortcutRecorders() {
  shortcutInputs.forEach((input) => {
    input.readOnly = true;
    input.setAttribute("placeholder", "Click, then press keys");
    input.setAttribute("title", "Click and press a key combination. Esc to clear.");
    input.addEventListener("keydown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Clear: Esc, or bare Backspace/Delete (no modifiers held).
      if (e.key === "Escape" ||
          ((e.key === "Backspace" || e.key === "Delete") && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey)) {
        input.value = "";
        return;
      }
      // While only modifiers are held, show progress without finalizing.
      if (isModifierKey(e.key)) {
        const mods = [];
        if (e.ctrlKey) mods.push("Ctrl");
        if (e.altKey) mods.push("Alt");
        if (e.shiftKey) mods.push("Shift");
        if (e.metaKey) mods.push("Cmd");
        input.value = mods.length ? mods.join("+") + "+…" : "";
        return;
      }
      input.value = comboDisplayFromEvent(e);
    });
    // If the user releases everything having only pressed modifiers, drop the
    // unfinished "Ctrl+…" hint.
    input.addEventListener("keyup", () => {
      if (input.value.endsWith("…")) input.value = "";
    });
  });
}

function setStatus(msg, isError) {
  statusEl.hidden = !msg;
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("config-status-error", !!isError);
}

// Tab switching: show only the panel matching the clicked tab.
function activateTab(name) {
  document.querySelectorAll(".config-tab").forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".config-panel").forEach((panel) => {
    const active = panel.dataset.panel === name;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
  const play = document.getElementById("vid-play");
  if (name === "video") {
    // Entering the Video tab: show the chosen camera's feed straight away.
    if (typeof vidStartPreview === "function" && !vidStream) {
      vidStartPreview(false);
      if (play) play.textContent = "Stop";
    }
  } else if (typeof vidStopStream === "function" && !vidRecorder) {
    // Leaving (and not mid-recording): stop the preview so the camera LED goes off.
    vidStopStream();
    const ph = document.getElementById("vid-ph");
    if (ph) ph.hidden = false;
    if (play) play.textContent = "Play";
  }
}

document.querySelectorAll(".config-tab").forEach((tab) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
});

async function loadForm() {
  if (!window.cricketApp?.getConfig) return;
  const cfg = await window.cricketApp.getConfig();
  recordingsInput.value = cfg.recordingsPath || "";
  setRadio("op-mode", cfg.operationMode || "Offline");
  const shortcuts = cfg.shortcuts || {};
  shortcutInputs.forEach((input) => {
    input.value = shortcuts[input.dataset.shortcut] || "";
  });
  await refreshDatabasePath();
  await initVideoTab(cfg);
}

// Show the database the app is ACTUALLY using right now — whether that's a file
// the user explicitly opened/created, or the default file the app falls back to
// on launch. Surfacing the real path avoids the confusing "No database open"
// state while masters/teams clearly contain data.
async function refreshDatabasePath() {
  if (!window.cricketApp?.currentDatabase) return;
  try {
    const { path } = await window.cricketApp.currentDatabase();
    databaseInput.value = path || "";
  } catch {
    /* leave as-is */
  }
}

// ===========================================================================
// Video tab — live preview, device/resolution selection, overlay + capture.
// ===========================================================================
const VIDEO_RESOLUTIONS = ["640x480", "1024x768", "1280x720", "1920x1080"];
const VIDEO_BITRATES = { High: 8_000_000, Medium: 4_000_000, Low: 1_500_000 };

let vidStream = null;     // current preview stream
let vidRecorder = null;   // active MediaRecorder while capturing
let vidChunks = [];

function vidEl(id) { return document.getElementById(id); }

function vidSelectedResolution() {
  const v = (vidEl("vid-resolution").value || "1280x720").split("x").map(Number);
  return { w: v[0] || 1280, h: v[1] || 720 };
}

function vidConstraints(withAudio) {
  const { w, h } = vidSelectedResolution();
  const device = vidEl("vid-device").value;
  const video = { width: { ideal: w }, height: { ideal: h } };
  if (device) video.deviceId = { exact: device };
  else video.facingMode = "user";
  return { video, audio: !!withAudio };
}

function vidStopStream() {
  if (vidStream) { vidStream.getTracks().forEach((t) => t.stop()); vidStream = null; }
  vidEl("vid-preview").srcObject = null;
}

// Start the live preview using the chosen device + resolution. Returns the
// stream so capture can reuse it.
async function vidStartPreview(withAudio) {
  vidStopStream();
  try {
    vidStream = await navigator.mediaDevices.getUserMedia(vidConstraints(withAudio));
    const preview = vidEl("vid-preview");
    preview.srcObject = vidStream;
    await preview.play().catch(() => {});
    vidEl("vid-ph").hidden = true;
    return vidStream;
  } catch (e) {
    console.error(e);
    const ph = vidEl("vid-ph");
    ph.hidden = false;
    ph.textContent = "Could not start camera — check it is connected and permitted.";
    return null;
  }
}

// Populate the device dropdown (asks permission once so labels resolve).
async function vidRefreshDevices(selectedId) {
  const select = vidEl("vid-device");
  select.innerHTML = '<option value="">Default camera</option>';
  try {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      tmp.getTracks().forEach((t) => t.stop());
    } catch { /* permission denied — still try enumerate */ }
    const list = await navigator.mediaDevices.enumerateDevices();
    list.filter((d) => d.kind === "videoinput").forEach((d, i) => {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${i + 1}`;
      select.appendChild(opt);
    });
    if (selectedId) select.value = selectedId;
  } catch (e) {
    console.error(e);
    setVidNote("Could not list cameras.", true);
  }
}

function setVidNote(msg, isError) {
  const note = vidEl("vid-note");
  note.textContent = msg || "";
  note.style.color = isError ? "var(--danger)" : "";
}

function vidPickMime() {
  const c = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const m of c) if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  return "";
}

async function vidStartCapture() {
  if (!vidEl("vid-local").checked) {
    setVidNote("Enable “Local video capturing” to record.", true);
    return;
  }
  const withAudio = vidEl("vid-audio").checked;
  const stream = await vidStartPreview(withAudio);
  if (!stream) return;
  const bitrate = (document.querySelector('input[name="vid-bitrate"]:checked') || {}).value || "Medium";
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: vidPickMime(), videoBitsPerSecond: VIDEO_BITRATES[bitrate] });
  } catch (e) {
    console.error(e);
    setVidNote("Recording is not supported in this build.", true);
    return;
  }
  vidChunks = [];
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) vidChunks.push(e.data); };
  recorder.onstop = async () => {
    const blob = new Blob(vidChunks, { type: "video/webm" });
    if (window.cricketApp?.saveRecording) {
      const buf = await blob.arrayBuffer();
      const name = `capture-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
      try { await window.cricketApp.saveRecording(buf, name); setVidNote(`Saved ${name}.`); }
      catch (err) { console.error(err); setVidNote("Could not save recording.", true); }
    }
  };
  recorder.start();
  vidRecorder = recorder;
  vidEl("vid-capture").textContent = "End Capture";
  setVidNote("Recording…");
}

function vidStopCapture() {
  if (vidRecorder && vidRecorder.state !== "inactive") vidRecorder.stop();
  vidRecorder = null;
  vidEl("vid-capture").textContent = "Start Capture";
}

function setRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}

// Load saved video settings + wire all the controls. Called once from loadForm.
async function initVideoTab(cfg) {
  const resSelect = vidEl("vid-resolution");
  if (resSelect && !resSelect.options.length) {
    VIDEO_RESOLUTIONS.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r; opt.textContent = `${r} RGB`;
      resSelect.appendChild(opt);
    });
  }
  await vidRefreshDevices(cfg.cameraDeviceId || "");
  resSelect.value = cfg.videoResolution || "1280x720";
  setRadio("vid-bitrate", cfg.videoBitrate || "Medium");
  vidEl("vid-audio").checked = !!cfg.recordAudio;
  vidEl("vid-local").checked = !!cfg.localCapture;
  vidEl("vid-deinterlace").checked = !!cfg.deinterlace;

  // Restart the preview when the device or resolution changes (only if running).
  const restartIfLive = () => { if (vidStream) vidStartPreview(vidEl("vid-audio").checked); };
  vidEl("vid-device").addEventListener("change", restartIfLive);
  resSelect.addEventListener("change", restartIfLive);

  vidEl("vid-play").addEventListener("click", () => {
    if (vidStream) { vidStopStream(); vidEl("vid-ph").hidden = false; vidEl("vid-play").textContent = "Play"; }
    else { vidStartPreview(vidEl("vid-audio").checked); vidEl("vid-play").textContent = "Stop"; }
  });
  vidEl("vid-overlay").addEventListener("click", () => {
    const line = vidEl("vid-line");
    line.hidden = !line.hidden;
  });
  vidEl("vid-capture").addEventListener("click", () => {
    if (vidRecorder) vidStopCapture(); else vidStartCapture();
  });

  vidEl("vid-save").addEventListener("click", saveVideoSettings);
}

async function saveVideoSettings() {
  if (!window.cricketApp?.setConfig) return;
  const bitrate = (document.querySelector('input[name="vid-bitrate"]:checked') || {}).value || "Medium";
  try {
    await window.cricketApp.setConfig({
      recordingsPath: recordingsInput.value.trim(),
      cameraDeviceId: vidEl("vid-device").value || "",
      videoResolution: vidEl("vid-resolution").value || "1280x720",
      videoBitrate: bitrate,
      recordAudio: vidEl("vid-audio").checked,
      localCapture: vidEl("vid-local").checked,
      deinterlace: vidEl("vid-deinterlace").checked,
    });
    setVidNote("Video settings saved.");
  } catch (e) {
    console.error(e);
    setVidNote("Could not save video settings.", true);
  }
}

// Stop the camera when leaving the page so the device LED turns off.
window.addEventListener("beforeunload", () => { vidStopCapture(); vidStopStream(); });

document.getElementById("btn-browse-recordings").addEventListener("click", async () => {
  if (!window.cricketApp?.selectDirectory) return;
  const res = await window.cricketApp.selectDirectory({
    title: "Choose recordings folder",
    defaultPath: recordingsInput.value || undefined,
  });
  if (!res.canceled && res.path) {
    recordingsInput.value = res.path;
    setStatus("");
  }
});

// Open an existing database file and switch the app to it (auto-reloads on
// success so every screen reflects the new data).
document.getElementById("btn-browse-database").addEventListener("click", async () => {
  if (!window.cricketApp?.selectDatabaseFile || !window.cricketApp?.switchDatabase) return;
  const picked = await window.cricketApp.selectDatabaseFile({
    title: "Open database file",
    defaultPath: databaseInput.value || undefined,
  });
  if (picked.canceled || !picked.path) return;
  setStatus("Opening database…");
  const res = await window.cricketApp.switchDatabase(picked.path);
  if (res.ok) {
    setStatus("Database opened. Reloading…");
    window.location.reload();
  } else {
    await refreshDatabasePath();
    setStatus(res.error ? `Could not open database: ${res.error}` : "Could not open database.", true);
  }
});

// Create a fresh, blank database and switch to it (auto-reloads on success).
document.getElementById("btn-new-database").addEventListener("click", async () => {
  if (!window.cricketApp?.newDatabase) return;
  setStatus("");
  const res = await window.cricketApp.newDatabase();
  if (res.canceled) return;
  if (res.ok) {
    setStatus("New database created. Reloading…");
    window.location.reload();
  } else {
    setStatus(res.error ? `Could not create database: ${res.error}` : "Could not create database.", true);
  }
});

// Empty the current database in place — wipes all teams/players/matches/etc.
// (keeps the option lists) and reloads. Useful to clear data seeded by an older
// build. Guarded by a confirm since it is destructive and irreversible.
document.getElementById("btn-reset-database").addEventListener("click", async () => {
  if (!window.cricketApp?.resetDatabase) return;
  const ok = window.confirm(
    "Clear ALL data from the current database?\n\n" +
    "This permanently removes every team, player, match and report. " +
    "The option lists (Ball Type, Shot Type, etc.) are kept. This cannot be undone.\n\n" +
    "Tip: use “Export / Backup…” first if you want a copy."
  );
  if (!ok) return;
  setStatus("Clearing database…");
  const res = await window.cricketApp.resetDatabase();
  if (res.ok) {
    setStatus("Database cleared. Reloading…");
    window.location.reload();
  } else {
    setStatus(res.error ? `Could not clear database: ${res.error}` : "Could not clear database.", true);
  }
});

// Export a safe copy of the current database for hand-off (does not switch).
document.getElementById("btn-export-database").addEventListener("click", async () => {
  if (!window.cricketApp?.exportDatabase) return;
  setStatus("");
  const res = await window.cricketApp.exportDatabase();
  if (res.canceled) return;
  if (res.ok) {
    setStatus(`Backed up to ${res.path}`);
  } else {
    setStatus(res.error ? `Could not export database: ${res.error}` : "Could not export database.", true);
  }
});

// Import master/reconciled data from another CAP .sqlite file (main process
// shows the file picker, copies the rows, then we reload to reflect them).
async function doImport(mode) {
  if (!window.cricketApp?.importData) return;
  setStatus("Importing…");
  const res = await window.cricketApp.importData(mode);
  if (res.canceled) { setStatus(""); return; }
  if (res.ok) {
    setStatus("Import complete. Reloading…");
    window.location.reload();
  } else {
    setStatus(res.error ? `Import failed: ${res.error}` : "Import failed.", true);
  }
}
document.getElementById("btn-import-master").addEventListener("click", () => doImport("master"));
document.getElementById("btn-import-reconciled").addEventListener("click", () => doImport("reconciled"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.cricketApp?.setConfig) return;
  setStatus("");
  try {
    // Database changes are applied immediately via the Open/New buttons (which
    // persist databasePath themselves), so they are intentionally not saved here.
    const shortcuts = {};
    shortcutInputs.forEach((input) => {
      const val = input.value.trim();
      // Skip blanks and any half-recorded "Ctrl+…" hint left in the field.
      if (val && !val.endsWith("…")) shortcuts[input.dataset.shortcut] = val;
    });
    const operationMode = (document.querySelector('input[name="op-mode"]:checked') || {}).value || "Offline";
    await window.cricketApp.setConfig({ shortcuts, operationMode });
    setStatus("Settings saved.");
  } catch (err) {
    console.error(err);
    setStatus("Could not save settings.", true);
  }
});

setupShortcutRecorders();
loadForm();
