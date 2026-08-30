const STORAGE_KEY = "codex-usage-dashboard-v1";

const sampleState = {
  quota: {
    planName: "Codex 5-hour window",
    usedUnits: 18,
    windowCap: 80,
    resetTime: nextResetTime(),
    notes: "Update this from Settings > Usage or the Codex limit banner whenever Codex shows a reset time."
  },
  quotaLog: [
    {
      at: new Date().toISOString(),
      planName: "Codex 5-hour window",
      usedUnits: 18,
      windowCap: 80,
      resetTime: nextResetTime(),
      notes: "Sample entry"
    }
  ],
  api: null
};

const els = {
  codexUsed: document.querySelector("#codexUsed"),
  codexProgress: document.querySelector("#codexProgress"),
  codexRemaining: document.querySelector("#codexRemaining"),
  resetCountdown: document.querySelector("#resetCountdown"),
  resetAt: document.querySelector("#resetAt"),
  apiRequests: document.querySelector("#apiRequests"),
  apiTokens: document.querySelector("#apiTokens"),
  apiCost: document.querySelector("#apiCost"),
  apiStatus: document.querySelector("#apiStatus"),
  apiUpdatedAt: document.querySelector("#apiUpdatedAt"),
  modelList: document.querySelector("#modelList"),
  emptyModelState: document.querySelector("#emptyModelState"),
  quotaLog: document.querySelector("#quotaLog"),
  quotaForm: document.querySelector("#quotaForm"),
  planName: document.querySelector("#planName"),
  usedUnits: document.querySelector("#usedUnits"),
  windowCap: document.querySelector("#windowCap"),
  resetTime: document.querySelector("#resetTime"),
  notes: document.querySelector("#notes"),
  syncApiButton: document.querySelector("#syncApiButton"),
  resetDemoButton: document.querySelector("#resetDemoButton")
};

let state = loadState();

function nextResetTime() {
  const date = new Date();
  date.setHours(date.getHours() + 3, 0, 0, 0);
  return toDatetimeLocal(date);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return sampleState;

  try {
    return { ...sampleState, ...JSON.parse(raw) };
  } catch {
    return sampleState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4
  }).format(value || 0);
}

function toDatetimeLocal(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value) {
  return value ? new Date(value) : null;
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function timeUntil(value) {
  const target = fromDatetimeLocal(value);
  if (!target || Number.isNaN(target.getTime())) return "--";

  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "Reset due";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function statusClass(ratio) {
  if (ratio >= 0.9) return "status-danger";
  if (ratio >= 0.7) return "status-warn";
  return "status-good";
}

function renderQuota() {
  const quota = state.quota || {};
  const used = Number(quota.usedUnits ?? quota.usedMessages ?? 0);
  const cap = Number(quota.windowCap ?? quota.messageCap ?? 0);
  const remaining = Math.max(cap - used, 0);
  const ratio = cap > 0 ? clamp(used / cap, 0, 1) : 0;

  els.codexUsed.textContent = cap > 0 ? `${used} / ${cap}` : "No cap";
  els.codexProgress.style.width = `${Math.round(ratio * 100)}%`;
  els.codexProgress.style.background = ratio >= 0.9 ? "var(--danger)" : ratio >= 0.7 ? "var(--warn)" : "var(--accent)";
  els.codexRemaining.textContent =
    cap > 0 ? `${remaining} units left for ${quota.planName || "this quota"}` : "Configure your Codex window below";
  els.codexRemaining.className = statusClass(ratio);
  els.resetCountdown.textContent = timeUntil(quota.resetTime);
  els.resetAt.textContent = quota.resetTime ? `Resets at ${formatDateTime(quota.resetTime)}` : "Add a reset time below";

  els.planName.value = quota.planName || "";
  els.usedUnits.value = used || "";
  els.windowCap.value = cap || "";
  els.resetTime.value = quota.resetTime || "";
  els.notes.value = quota.notes || "";
}

function flattenBuckets(snapshot) {
  const buckets = snapshot?.usage?.data?.data || [];
  return buckets.flatMap((bucket) => bucket.results || []);
}

function summarizeUsage(snapshot) {
  const rows = flattenBuckets(snapshot);
  const models = new Map();

  for (const row of rows) {
    const model = row.model || "unknown";
    const current = models.get(model) || {
      model,
      inputTokens: 0,
      outputTokens: 0,
      requests: 0
    };
    current.inputTokens += row.input_tokens || 0;
    current.outputTokens += row.output_tokens || 0;
    current.requests += row.num_model_requests || 0;
    models.set(model, current);
  }

  return Array.from(models.values()).sort((a, b) => b.requests - a.requests);
}

function summarizeCost(snapshot) {
  const buckets = snapshot?.costs?.data?.data || [];
  return buckets.reduce((sum, bucket) => {
    const results = bucket.results || [];
    return (
      sum +
      results.reduce((inner, row) => inner + (row.amount?.value || 0), 0)
    );
  }, 0);
}

function renderApi() {
  const snapshot = state.api;
  const models = summarizeUsage(snapshot);
  const totalRequests = models.reduce((sum, row) => sum + row.requests, 0);
  const totalInput = models.reduce((sum, row) => sum + row.inputTokens, 0);
  const totalOutput = models.reduce((sum, row) => sum + row.outputTokens, 0);
  const cost = summarizeCost(snapshot);
  const usageError = snapshot?.usage && !snapshot.usage.ok ? snapshot.usage.error : "";
  const costError = snapshot?.costs && !snapshot.costs.ok ? snapshot.costs.error : "";

  els.apiRequests.textContent = snapshot ? formatNumber(totalRequests) : "--";
  els.apiTokens.textContent = snapshot
    ? `${formatNumber(totalInput)} input / ${formatNumber(totalOutput)} output tokens`
    : "Waiting for sync";
  els.apiCost.textContent = snapshot ? formatCurrency(cost) : "--";
  els.apiStatus.textContent = usageError || costError || (snapshot ? "Synced" : "Local only");
  els.apiStatus.className = usageError || costError ? "status-warn" : "status-good";
  els.apiUpdatedAt.textContent = snapshot?.generatedAt
    ? `Updated ${formatDateTime(snapshot.generatedAt)}`
    : "No API sync yet.";

  els.modelList.innerHTML = "";
  els.emptyModelState.style.display = models.length ? "none" : "grid";

  for (const row of models) {
    const total = row.inputTokens + row.outputTokens;
    const el = document.createElement("div");
    el.className = "model-row";
    el.innerHTML = `
      <div class="row-top">
        <span class="row-title">${escapeHtml(row.model)}</span>
        <span class="row-meta">${formatNumber(row.requests)} requests</span>
      </div>
      <div class="row-meta">${formatNumber(total)} total tokens · ${formatNumber(row.inputTokens)} input · ${formatNumber(row.outputTokens)} output</div>
    `;
    els.modelList.appendChild(el);
  }
}

function renderLog() {
  const log = state.quotaLog || [];
  els.quotaLog.innerHTML = "";

  if (!log.length) {
    els.quotaLog.innerHTML = '<div class="empty-state">No quota entries yet.</div>';
    return;
  }

  for (const entry of log.slice(0, 8)) {
    const used = Number(entry.usedUnits ?? entry.usedMessages ?? 0);
    const cap = Number(entry.windowCap ?? entry.messageCap ?? 0);
    const ratio = cap > 0 ? used / cap : 0;
    const el = document.createElement("div");
    el.className = "log-row";
    el.innerHTML = `
      <div class="row-top">
        <span class="row-title">${escapeHtml(entry.planName || "Codex quota")}</span>
        <span class="row-meta">${formatDateTime(entry.at)}</span>
      </div>
      <div class="progress"><span style="width: ${Math.round(clamp(ratio, 0, 1) * 100)}%"></span></div>
      <div class="row-meta">${used} / ${cap} units · reset ${formatDateTime(entry.resetTime)}</div>
      ${entry.notes ? `<div class="row-meta">${escapeHtml(entry.notes)}</div>` : ""}
    `;
    els.quotaLog.appendChild(el);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render() {
  renderQuota();
  renderApi();
  renderLog();
}

els.quotaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const quota = {
    planName: els.planName.value.trim(),
    usedUnits: Number(els.usedUnits.value || 0),
    windowCap: Number(els.windowCap.value || 0),
    resetTime: els.resetTime.value,
    notes: els.notes.value.trim()
  };

  state.quota = quota;
  state.quotaLog = [
    { at: new Date().toISOString(), ...quota },
    ...(state.quotaLog || [])
  ].slice(0, 20);
  saveState();
  render();
});

els.syncApiButton.addEventListener("click", async () => {
  if (!window.usageBridge) {
    els.apiStatus.textContent = "API sync only works in the desktop app";
    els.apiStatus.className = "status-warn";
    return;
  }

  els.syncApiButton.disabled = true;
  els.syncApiButton.textContent = "Syncing...";

  try {
    state.api = await window.usageBridge.getUsageSnapshot();
    saveState();
    render();
  } catch (error) {
    els.apiStatus.textContent = error.message || "Sync failed";
    els.apiStatus.className = "status-warn";
  } finally {
    els.syncApiButton.disabled = false;
    els.syncApiButton.textContent = "Sync API usage";
  }
});

els.resetDemoButton.addEventListener("click", () => {
  state = sampleState;
  saveState();
  render();
});

render();
setInterval(renderQuota, 30000);
