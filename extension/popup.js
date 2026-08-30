/* Kernel Witness — popup dashboard. Purely local view over chrome.storage.local. */

const COLORS = ["#ff6b52", "#45d0a0", "#f2b544", "#7fb4ff", "#e58bd6", "#c9a2ff", "#6fd6c3"];
const KEY = "kernel-witness-v1";

const $ = (id) => document.getElementById(id);

function fmt(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}

function fmtClock(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function getState() {
  const got = await chrome.storage.local.get(KEY);
  return got[KEY] ?? null;
}

async function render() {
  const state = await getState();

  const toggle = $("enabled");
  const enabled = state?.enabled !== false;
  toggle.classList.toggle("on", enabled);
  toggle.setAttribute("aria-checked", String(enabled));

  $("todayDate").textContent = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const day = state?.day && state.day.date === todayStr() ? state.day : null;
  const rowsEl = $("todayRows");
  rowsEl.innerHTML = "";

  if (!day || !enabled) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = enabled
      ? "Nothing measured yet today. Start a focus round in Kernel."
      : "Tracking is paused. Flip the switch to resume counting.";
    rowsEl.appendChild(p);
    $("todayTotal").textContent = "0m";
  } else {
    const entries = Object.entries(day.projects ?? {}).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((a, [, ms]) => a + ms, 0) + (day.otherMs || 0);
    $("todayTotal").textContent = fmt(total);

    const nameOf = (pid) =>
      (state.whitelist ?? []).find((w) => w.id === pid)?.name ?? "project";
    const colorOf = (pid) => {
      const i = (state.whitelist ?? []).findIndex((w) => w.id === pid);
      return COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length];
    };

    for (const [pid, ms] of entries) {
      rowsEl.appendChild(makeRow(colorOf(pid), nameOf(pid), ms, total));
    }
    if (day.otherMs > 0) {
      rowsEl.appendChild(makeRow("rgba(238,243,236,0.3)", "elsewhere", day.otherMs, total));
    }
    if (entries.length === 0 && !day.otherMs) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Nothing measured yet today.";
      rowsEl.appendChild(p);
    }
  }

  const wlEl = $("whitelist");
  wlEl.innerHTML = "";
  const list = state?.whitelist ?? [];
  if (list.length === 0) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No projects enrolled yet. Add them in Kernel with a URL.";
    wlEl.appendChild(p);
  } else {
    list.forEach((w, i) => {
      const row = document.createElement("div");
      row.className = "row";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = COLORS[i % COLORS.length];
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = w.name;
      const val = document.createElement("span");
      val.className = "val";
      let host;
      try {
        host = new URL(/^https?:\/\//.test(w.url) ? w.url : `https://${w.url}`).hostname.replace(/^www\./, "");
      } catch {
        host = w.url;
      }
      val.textContent = host;
      row.append(dot, name, val);
      wlEl.appendChild(row);
    });
  }
}

function makeRow(color, name, ms, total) {
  const wrap = document.createElement("div");
  const row = document.createElement("div");
  row.className = "row";

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = color;

  const nm = document.createElement("span");
  nm.className = "name";
  nm.textContent = name;

  const val = document.createElement("span");
  val.className = "val";
  val.textContent = `${fmtClock(ms)} · ${total > 0 ? Math.round((ms / total) * 100) : 0}%`;

  row.append(dot, nm, val);

  const bar = document.createElement("div");
  bar.className = "bar";
  const fill = document.createElement("div");
  fill.style.width = `${total > 0 ? Math.max(3, (ms / total) * 100) : 0}%`;
  fill.style.background = color;
  bar.appendChild(fill);

  wrap.append(row, bar);
  return wrap;
}

/* ---------------- actions ---------------- */

$("enabled").addEventListener("click", async () => {
  const state = (await getState()) ?? {};
  const next = state.enabled === false;
  await chrome.runtime.sendMessage({ type: "sync", payload: { enabled: next } });
  render();
});

$("export").addEventListener("click", async () => {
  const state = await getState();
  const blob = new Blob([JSON.stringify(state ?? {}, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `kernel-witness-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

let armed = false;
let armTimer = 0;
$("wipe").addEventListener("click", async (e) => {
  if (!armed) {
    armed = true;
    e.currentTarget.classList.add("arm");
    e.currentTarget.textContent = "Sure? Click again";
    armTimer = setTimeout(() => {
      armed = false;
      e.currentTarget.classList.remove("arm");
      e.currentTarget.textContent = "Wipe data";
    }, 2600);
    return;
  }
  clearTimeout(armTimer);
  armed = false;
  e.currentTarget.classList.remove("arm");
  e.currentTarget.textContent = "Wipe data";
  await chrome.runtime.sendMessage({ type: "wipe" });
  render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[KEY]) render();
});

render();
