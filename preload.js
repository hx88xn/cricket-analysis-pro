const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("cricketApp", {
  platform: process.platform,
});
