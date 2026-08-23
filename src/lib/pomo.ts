export type Mode = "focus" | "short" | "long";

export interface Settings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  longEvery: number;
  dailyGoal: number;
  autoStart: boolean;
  sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  dailyGoal: 8,
  autoStart: false,
  sound: true,
};

export const MODE_ORDER: Mode[] = ["focus", "short", "long"];

export const MODE_META: Record<
  Mode,
  { label: string; status: string; next: string }
> = {
  focus: {
    label: "Focus",
    status: "Deep work in progress",
    next: "stay with it",
  },
  short: {
    label: "Short break",
    status: "Stretch, sip, look away",
    next: "a short break",
  },
  long: {
    label: "Long break",
    status: "Step away from the desk",
    next: "a long break",
  },
};

/* ---------------- stats ---------------- */

export interface ProjectStats {
  seconds: number;
  sessions: number;
}

export interface DayStats {
  date: string;
  focusCount: number;
  focusSec: number;
  breakCount: number;
  breakSec: number;
  projects: Record<string, ProjectStats>;
}

export interface HistoryEntry {
  date: string;
  focusSec: number;
  focusCount: number;
}

export interface LogEntry {
  id: string;
  at: string; // "14:32"
  mode: Mode;
  min: number;
  projectId?: string | null;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  createdAt: number;
}

export interface StatsStore {
  day: DayStats;
  history: HistoryEntry[];
  log: LogEntry[];
}

export const PROJECT_COLORS = [
  "#ff6b52",
  "#45d0a0",
  "#f2b544",
  "#7fb4ff",
  "#e58bd6",
  "#c9a2ff",
  "#6fd6c3",
];

export function projectColor(index: number): string {
  return PROJECT_COLORS[((index % PROJECT_COLORS.length) + PROJECT_COLORS.length) % PROJECT_COLORS.length];
}

/* ---------------- storage ---------------- */

const KEYS = {
  settings: "kernel.settings.v1",
  stats: "kernel.stats.v1",
  timer: "kernel.timer.v1",
  projects: "kernel.projects.v1",
  activeProject: "kernel.activeProject.v1",
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — app still works in memory */
  }
}

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const emptyDay = (date: string): DayStats => ({
  date,
  focusCount: 0,
  focusSec: 0,
  breakCount: 0,
  breakSec: 0,
  projects: {},
});

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(KEYS.settings);
  const merged = { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  return {
    focusMin: clamp(merged.focusMin, 1, 120),
    shortMin: clamp(merged.shortMin, 1, 60),
    longMin: clamp(merged.longMin, 1, 90),
    longEvery: clamp(merged.longEvery, 2, 8),
    dailyGoal: clamp(merged.dailyGoal, 1, 24),
    autoStart: !!merged.autoStart,
    sound: !!merged.sound,
  };
}

export function saveSettings(s: Settings) {
  write(KEYS.settings, s);
}

export function loadStats(): StatsStore {
  const today = todayKey();
  const s = read<StatsStore>(KEYS.stats);
  if (!s || !s.day) {
    return { day: emptyDay(today), history: [], log: [] };
  }
  let history = Array.isArray(s.history) ? s.history : [];
  let log = Array.isArray(s.log) ? s.log : [];
  let day = s.day;
  if (day.date !== today) {
    // rollover: archive yesterday, start a fresh day
    if (day.focusSec > 0 || day.focusCount > 0) {
      history = [
        ...history.filter((h) => h.date !== day.date),
        { date: day.date, focusSec: day.focusSec, focusCount: day.focusCount },
      ];
    }
    history = history.slice(-30);
    log = [];
    day = emptyDay(today);
  }
  day = { ...day, projects: day.projects ?? {} };
  return { day, history, log };
}

export function saveStats(s: StatsStore) {
  write(KEYS.stats, s);
}

export interface TimerSnapshot {
  mode: Mode;
  remainingMs: number;
  totalMs: number;
  running: boolean;
  endAt: number | null;
  savedAt: number;
}

export function loadTimer(): TimerSnapshot | null {
  const t = read<TimerSnapshot>(KEYS.timer);
  if (!t || typeof t.remainingMs !== "number") return null;
  // ignore snapshots older than a day
  if (Date.now() - (t.savedAt ?? 0) > 24 * 60 * 60 * 1000) return null;
  if (!MODE_ORDER.includes(t.mode)) return null;
  return t;
}

export function saveTimer(t: TimerSnapshot) {
  write(KEYS.timer, t);
}

export function loadProjects(): Project[] {
  const list = read<Project[]>(KEYS.projects);
  if (!Array.isArray(list)) return [];
  return list.filter((p) => p && typeof p.id === "string" && typeof p.name === "string");
}

export function saveProjects(list: Project[]) {
  write(KEYS.projects, list);
}

export function loadActiveProject(): string | null {
  try {
    const raw = localStorage.getItem(KEYS.activeProject);
    return raw ? raw : null;
  } catch {
    return null;
  }
}

export function saveActiveProject(id: string | null) {
  try {
    if (id) localStorage.setItem(KEYS.activeProject, id);
    else localStorage.removeItem(KEYS.activeProject);
  } catch {
    /* non-fatal */
  }
}

/* ---------------- helpers ---------------- */

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const minutesFor = (s: Settings, m: Mode): number =>
  m === "focus" ? s.focusMin : m === "short" ? s.shortMin : s.longMin;

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(sec: number): string {
  if (sec <= 0) return "0m";
  const m = Math.round(sec / 60);
  if (m < 60) return `${Math.max(1, m)}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function timeNow(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

export function weekdayLetter(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
}

/* ---------------- chime ---------------- */

export function playChime(kind: "focus" | "break") {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const notes =
      kind === "focus" ? [523.25, 659.25, 783.99, 1046.5] : [783.99, 659.25, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);
      osc.connect(gain);
      osc.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
    window.setTimeout(() => ctx.close(), 2000);
  } catch {
    /* audio blocked — silent finish */
  }
}
