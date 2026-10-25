import {
  HISTORY_DAYS,
  HistoryEntry,
  Project,
  Settings,
  StatsStore,
  lockStorage,
  normalizeSettings,
  saveActiveProject,
  saveProjects,
  saveSettings,
  saveStats,
  todayKey,
} from "./pomo";

export interface Backup {
  app: "kernel";
  version: 1;
  exportedAt: string;
  settings: Settings;
  stats: StatsStore;
  projects: Project[];
  activeProjectId: string | null;
}

export interface BackupSource {
  settings: Settings;
  stats: StatsStore;
  projects: Project[];
  activeProjectId: string | null;
}

export function buildBackup(src: BackupSource, now = new Date()): Backup {
  return {
    app: "kernel",
    version: 1,
    exportedAt: now.toISOString(),
    settings: src.settings,
    stats: src.stats,
    projects: src.projects,
    activeProjectId: src.activeProjectId,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isHistoryEntry = (h: unknown): h is HistoryEntry =>
  isObj(h) &&
  typeof h.date === "string" &&
  typeof h.focusSec === "number" &&
  typeof h.focusCount === "number";

/** Validates a backup file. Throws an Error with a user-facing message. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isObj(data) || data.app !== "kernel") {
    throw new Error("That file isn't a Kernel backup.");
  }
  if (data.version !== 1) {
    throw new Error("This backup was made by a newer version of Kernel.");
  }
  const stats = data.stats;
  if (!isObj(stats) || !isObj(stats.day) || typeof stats.day.date !== "string") {
    throw new Error("The backup's stats are missing or damaged.");
  }
  const projects = Array.isArray(data.projects)
    ? data.projects.filter(
        (p): p is Project =>
          isObj(p) && typeof p.id === "string" && typeof p.name === "string"
      )
    : [];
  const history = Array.isArray(stats.history)
    ? stats.history.filter(isHistoryEntry).slice(-HISTORY_DAYS)
    : [];
  const log = Array.isArray(stats.log) ? (stats.log as StatsStore["log"]) : [];
  const day = stats.day as unknown as StatsStore["day"];
  const activeProjectId =
    typeof data.activeProjectId === "string" &&
    projects.some((p) => p.id === data.activeProjectId)
      ? data.activeProjectId
      : null;

  return {
    app: "kernel",
    version: 1,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : "",
    settings: normalizeSettings(isObj(data.settings) ? (data.settings as Partial<Settings>) : null),
    stats: {
      day: {
        date: day.date,
        focusCount: Number(day.focusCount) || 0,
        focusSec: Number(day.focusSec) || 0,
        breakCount: Number(day.breakCount) || 0,
        breakSec: Number(day.breakSec) || 0,
        projects: isObj(day.projects) ? day.projects : {},
      },
      history,
      log,
    },
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      url: typeof p.url === "string" ? p.url : "",
      createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
    })),
    activeProjectId,
  };
}

/** Writes a backup over the current data. The caller must reload the page. */
export function restoreBackup(b: Backup) {
  saveSettings(b.settings);
  saveStats(b.stats);
  saveProjects(b.projects);
  saveActiveProject(b.activeProjectId);
  lockStorage();
}

/** One row per day: archived history plus today, oldest first. */
export function historyCsv(stats: StatsStore): string {
  const today = todayKey();
  const rows = [
    ...stats.history.filter((h) => h.date !== today && h.date !== stats.day.date),
    { date: stats.day.date, focusSec: stats.day.focusSec, focusCount: stats.day.focusCount },
  ]
    .filter((r) => r.focusSec > 0 || r.focusCount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const lines = ["date,focus_minutes,focus_sessions"];
  for (const r of rows) {
    lines.push(`${r.date},${Math.round(r.focusSec / 60)},${r.focusCount}`);
  }
  return lines.join("\n") + "\n";
}

/** Saves text as a file on this device. Nothing is uploaded. */
export function downloadText(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
