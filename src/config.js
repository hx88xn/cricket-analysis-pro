const recordingsInput = document.getElementById("recordings-path");
const databaseInput = document.getElementById("database-path");
const cameraSelect = document.getElementById("camera-select");
const statusEl = document.getElementById("config-status");
const form = document.getElementById("config-form");

function setStatus(msg, isError) {
  statusEl.hidden = !msg;
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("config-status-error", !!isError);
}

async function loadForm() {
  if (!window.cricketApp?.getConfig) return;
  const cfg = await window.cricketApp.getConfig();
  recordingsInput.value = cfg.recordingsPath || "";
  await refreshDatabasePath();
  await refreshCameraList(cfg.cameraDeviceId || "");
}

// Show the database the app currently has open (the live file, not just the
// saved config value).
async function refreshDatabasePath() {
  if (!window.cricketApp?.currentDatabase) return;
  try {
    const { path } = await window.cricketApp.currentDatabase();
    databaseInput.value = path || "";
  } catch {
    /* leave as-is */
  }
}

async function refreshCameraList(selectedId) {
  cameraSelect.innerHTML = '<option value="">Default camera</option>';
  try {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      tmp.getTracks().forEach((t) => t.stop());
    } catch {
      /* permission denied — still try enumerate */
    }
    const list = await navigator.mediaDevices.enumerateDevices();
    const videos = list.filter((d) => d.kind === "videoinput");
    for (const d of videos) {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label || `Camera ${cameraSelect.length}`;
      cameraSelect.appendChild(opt);
    }
    if (selectedId) {
      cameraSelect.value = selectedId;
      if (cameraSelect.value !== selectedId) {
        const opt = document.createElement("option");
        opt.value = selectedId;
        opt.textContent = "Previously selected (unavailable)";
        cameraSelect.appendChild(opt);
        cameraSelect.value = selectedId;
      }
    }
  } catch (e) {
    console.error(e);
    setStatus("Could not list cameras.", true);
  }
}

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

document.getElementById("btn-refresh-cameras").addEventListener("click", async () => {
  setStatus("");
  await refreshCameraList(cameraSelect.value);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.cricketApp?.setConfig) return;
  setStatus("");
  try {
    // Database changes are applied immediately via the Open/New buttons (which
    // persist databasePath themselves), so they are intentionally not saved here.
    await window.cricketApp.setConfig({
      recordingsPath: recordingsInput.value.trim(),
      cameraDeviceId: cameraSelect.value || "",
    });
    setStatus("Settings saved.");
  } catch (err) {
    console.error(err);
    setStatus("Could not save settings.", true);
  }
});

loadForm();
