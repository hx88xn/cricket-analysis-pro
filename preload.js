const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cricketApp", {
  platform: process.platform,
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (patch) => ipcRenderer.invoke("config:set", patch),
  selectDirectory: (opts) => ipcRenderer.invoke("dialog:select-directory", opts),
  selectDatabaseFile: (opts) => ipcRenderer.invoke("dialog:select-database-file", opts),
  saveRecording: (arrayBuffer, defaultName) =>
    ipcRenderer.invoke("save-recording", arrayBuffer, defaultName),
  db: {
    teams: () => ipcRenderer.invoke("db:teams"),
    players: (teamId) => ipcRenderer.invoke("db:players", teamId),
    competitions: () => ipcRenderer.invoke("db:competitions"),
    officials: (role) => ipcRenderer.invoke("db:officials", role),
    grounds: () => ipcRenderer.invoke("db:grounds"),
    matchTypes: () => ipcRenderer.invoke("db:matchTypes"),
    matches: () => ipcRenderer.invoke("db:matches"),
    getMatch: (id) => ipcRenderer.invoke("db:match:get", id),
    saveTeam: (team) => ipcRenderer.invoke("db:team:save", team),
    savePlayer: (player) => ipcRenderer.invoke("db:player:save", player),
    saveMatch: (match) => ipcRenderer.invoke("db:match:save", match),
    saveMatchState: (payload) => ipcRenderer.invoke("db:match:saveState", payload),
    deleteMatch: (id) => ipcRenderer.invoke("db:match:delete", id),
    reportBowling: (matchId) => ipcRenderer.invoke("db:report:bowling", matchId),
    reportBatting: (matchId) => ipcRenderer.invoke("db:report:batting", matchId),
  },
});
