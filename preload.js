const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cricketApp", {
  platform: process.platform,
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (patch) => ipcRenderer.invoke("config:set", patch),
  selectDirectory: (opts) => ipcRenderer.invoke("dialog:select-directory", opts),
  selectDatabaseFile: (opts) => ipcRenderer.invoke("dialog:select-database-file", opts),
  saveRecording: (arrayBuffer, defaultName) =>
    ipcRenderer.invoke("save-recording", arrayBuffer, defaultName),
});
