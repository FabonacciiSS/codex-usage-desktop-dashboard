const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("usageBridge", {
  getUsageSnapshot: () => ipcRenderer.invoke("openai:getUsageSnapshot"),
  getCodexUsageSnapshot: (payload) => ipcRenderer.invoke("codex:getUsageSnapshot", payload),
  getCar360UsageSnapshot: (payload) => ipcRenderer.invoke("car360:getUsageSnapshot", payload),
  getDeepSeekBalance: () => ipcRenderer.invoke("deepseek:getBalance"),
  getOpenCodeGoUsage: (payload) => ipcRenderer.invoke("opencode-go:getUsage", payload)
});
