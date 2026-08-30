const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("usageBridge", {
  getUsageSnapshot: () => ipcRenderer.invoke("openai:getUsageSnapshot")
});
