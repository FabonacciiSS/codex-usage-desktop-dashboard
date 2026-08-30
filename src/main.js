const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 640,
    title: "Codex Usage Dashboard",
    backgroundColor: "#f6f7f9",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function toUnixSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

async function openaiRequest(endpoint, params) {
  const apiKey = process.env.OPENAI_ADMIN_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      error: "Missing OPENAI_ADMIN_KEY. Usage and cost endpoints require an admin key."
    };
  }

  const url = new URL(`https://api.openai.com/v1/organization/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
    } else if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: body.error?.message || response.statusText || "OpenAI request failed"
    };
  }

  return { ok: true, status: response.status, data: body };
}

ipcMain.handle("openai:getUsageSnapshot", async () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  const baseParams = {
    start_time: toUnixSeconds(start),
    end_time: toUnixSeconds(end),
    bucket_width: "1d"
  };

  const [usage, costs] = await Promise.all([
    openaiRequest("usage/completions", { ...baseParams, group_by: ["model"], limit: 31 }),
    openaiRequest("costs", { ...baseParams, limit: 31 })
  ]);

  return {
    generatedAt: new Date().toISOString(),
    usage,
    costs
  };
});
