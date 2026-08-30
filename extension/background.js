/* Kernel Witness — background service worker.
 *
 * Measures foreground-active-tab time against a user-enrolled whitelist,
 * ONLY while the Kernel web app reports a running focus round.
 *
 * Privacy contract (also in README.md):
 *  - Never reads page contents or titles — only tab URLs via chrome.tabs.
 *  - Only URLs whose host+path prefix match an enrolled project are keyed
 *    by project id. Everything else increments one anonymous "other" number.
 *  - No URLs are persisted besides the whitelist the user enrolled themselves.
 *  - All state lives in chrome.storage.local. No network access of any kind.
 */

import { matchProject } from "./witness-core.js";

const KEY = "kernel-witness-v1";
const MAX_GAP_MS = 24 * 60 * 60 * 1000; // never credit more than a day at once

/* ---------------- state ---------------- */

const DEFAULT_STATE = {
  enabled: true,
  whitelist: [], // [{ id, name, url }]
  session: null, // { id, startedAt, lastTick, currentKey, accum: {pid: ms}, otherMs }
  day: null, // { date, projects: {pid: ms}, otherMs }
  history: [], // [{ date, totalMs, projects: {pid: ms}, otherMs }] last 30
};

let state = structuredClone(DEFAULT_STATE);

/* resolves once storage has rehydrated `state`; every listener waits on it
   so a cold-worker wake can't mutate (and persist over) the default state */
let ready;

/* ephemeral (in-memory) mirror of the active tab */
const mem = { tabId: null, urlKey: "away" };

/* ---------------- storage ---------------- */

async function load() {
  try {
    const got = await chrome.storage.local.get(KEY);
    if (got[KEY]) {
      state = { ...structuredClone(DEFAULT_STATE), ...got[KEY] };
      state.whitelist = Array.isArray(state.whitelist) ? state.whitelist : [];
      state.history = Array.isArray(state.history) ? state.history.slice(-30) : [];
    }
  } catch {
    /* corrupted storage — start fresh */
  }
}

function persist() {
  chrome.storage.local.set({ [KEY]: state }).catch(() => {});
}

/* ---------------- URL whitelist matching ---------------- */

async function keyForTab(tabId, knownUrl) {
  let url = knownUrl;
  if (!url) {
    try {
      url = (await chrome.tabs.get(tabId)).url;
    } catch {
      return "away";
    }
  }
  if (!url) return "away";
  return matchProject(state.whitelist, url) ?? "other";
}

/* ---------------- session accounting ---------------- */

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function emptyDay(date) {
  return { date, projects: {}, otherMs: 0 };
}

function ensureDay() {
  const t = todayStr();
  if (!state.day || state.day.date !== t) {
    if (state.day && (state.day.otherMs > 0 || Object.keys(state.day.projects || {}).length)) {
      const total =
        (state.day.otherMs || 0) +
        Object.values(state.day.projects || {}).reduce((a, b) => a + b, 0);
      state.history = [
        ...state.history.filter((h) => h.date !== state.day.date),
        {
          date: state.day.date,
          totalMs: total,
          projects: { ...(state.day.projects || {}) },
          otherMs: state.day.otherMs || 0,
        },
      ].slice(-30);
    }
    state.day = emptyDay(t);
  }
  if (!state.day.projects) state.day.projects = {};
}

function flushElapsed() {
  if (!state.session) return;
  const now = Date.now();
  const gap = Math.min(now - (state.session.lastTick || now), MAX_GAP_MS);
  if (gap > 0) {
    const key = state.session.currentKey;
    if (key === "other") {
      state.session.otherMs = (state.session.otherMs || 0) + gap;
    } else if (key && key !== "away") {
      state.session.accum[key] = (state.session.accum[key] || 0) + gap;
    }
    // "away" is intentionally not counted
  }
  state.session.lastTick = now;
}

function bankToDay() {
  if (!state.session) return;
  ensureDay();
  for (const [pid, ms] of Object.entries(state.session.accum || {})) {
    state.day.projects[pid] = (state.day.projects[pid] || 0) + ms;
  }
  state.day.otherMs = (state.day.otherMs || 0) + (state.session.otherMs || 0);
}

/* ---------------- message handlers ---------------- */

function handleSync(msg) {
  if (Array.isArray(msg.payload?.whitelist)) {
    state.whitelist = msg.payload.whitelist.map((w) => ({
      id: String(w.id),
      name: String(w.name || ""),
      url: String(w.url || ""),
    }));
    persist();
  }
  if (typeof msg.payload?.enabled === "boolean") {
    state.enabled = msg.payload.enabled;
    persist();
  }
}

function handleSessionStart(msg) {
  flushElapsed();
  const id = String(msg.payload?.sessionId || Date.now());
  state.session = {
    id,
    startedAt: Date.now(),
    lastTick: Date.now(),
    currentKey: mem.urlKey || "away",
    accum: {},
    otherMs: 0,
  };
  persist();
}

function handleSessionEnd() {
  if (!state.session) return null;
  flushElapsed();
  const split = {};
  for (const [pid, ms] of Object.entries(state.session.accum || {})) {
    split[pid] = Math.round(ms / 1000);
  }
  const otherSeconds = Math.round((state.session.otherMs || 0) / 1000);
  bankToDay();
  const payload = {
    sessionId: state.session.id,
    tracked: true,
    split,
    otherSeconds,
  };
  state.session = null;
  persist();
  return payload;
}

/* ---------------- tab tracking ---------------- */

async function resolveActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id != null) {
      mem.tabId = tab.id;
      mem.urlKey = await keyForTab(tab.id, tab.url);
    } else {
      mem.tabId = null;
      mem.urlKey = "away";
    }
  } catch {
    mem.tabId = null;
    mem.urlKey = "away";
  }
  if (state.session) {
    flushElapsed();
    state.session.currentKey = mem.urlKey;
    persist();
  }
}

chrome.tabs.onActivated.addListener(async () => {
  await ready;
  await resolveActiveTab();
});

chrome.tabs.onUpdated.addListener(async (tabId, info) => {
  await ready;
  if (info.url && tabId === mem.tabId) {
    mem.urlKey = await keyForTab(tabId, info.url);
    if (state.session) {
      flushElapsed();
      state.session.currentKey = mem.urlKey;
      persist();
    }
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  await ready;
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (state.session) {
      flushElapsed();
      state.session.currentKey = "away";
      persist();
    }
    mem.urlKey = "away";
  } else {
    await resolveActiveTab();
  }
});

/* ---------------- alarms (heartbeat) ---------------- */

chrome.alarms.create("tick", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (a) => {
  await ready;
  if (a.name === "tick" && state.session) {
    flushElapsed();
    persist();
  }
});

/* ---------------- messaging ---------------- */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg.type !== "string") return;
  // Serialize behind boot() so a message that lands before storage has
  // rehydrated can't act on — and then persist — a fresh default state.
  ready.then(() => {
    switch (msg.type) {
      case "ping":
      case "hello":
        sendResponse({ type: "pong" });
        break;
      case "sync":
        handleSync(msg);
        sendResponse({ type: "ok" });
        break;
      case "session-start":
        handleSessionStart(msg);
        sendResponse({ type: "ok" });
        break;
      case "session-end":
        sendResponse({ type: "split", payload: handleSessionEnd() });
        break;
      case "get-state":
        ensureDay();
        sendResponse({ type: "state", payload: state });
        break;
      case "wipe":
        state = structuredClone(DEFAULT_STATE);
        persist();
        sendResponse({ type: "ok" });
        break;
      default:
        sendResponse(undefined);
    }
  });
  return true; // reply asynchronously once boot() settles
});

/* ---------------- boot ---------------- */

async function boot() {
  await load();
  ensureDay();
  if (state.session) {
    flushElapsed();
    persist();
  }
  await resolveActiveTab();
}
ready = boot();
