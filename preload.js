const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cricketApp", {
  platform: process.platform,
  saveRecording: (arrayBuffer, defaultName) =>
    ipcRenderer.invoke("save-recording", arrayBuffer, defaultName),
});
