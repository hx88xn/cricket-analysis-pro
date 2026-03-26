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
  databaseInput.value = cfg.databasePath || "";
  await refreshCameraList(cfg.cameraDeviceId || "");
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

document.getElementById("btn-browse-database").addEventListener("click", async () => {
  if (!window.cricketApp?.selectDatabaseFile) return;
  const res = await window.cricketApp.selectDatabaseFile({
    title: "Choose database file",
    defaultPath: databaseInput.value || undefined,
  });
  if (!res.canceled && res.path) {
    databaseInput.value = res.path;
    setStatus("");
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
    await window.cricketApp.setConfig({
      recordingsPath: recordingsInput.value.trim(),
      databasePath: databaseInput.value.trim(),
      cameraDeviceId: cameraSelect.value || "",
    });
    setStatus("Settings saved.");
  } catch (err) {
    console.error(err);
    setStatus("Could not save settings.", true);
  }
});

loadForm();
