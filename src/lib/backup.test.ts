import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackup, historyCsv, parseBackup } from "./backup";
import { DEFAULT_SETTINGS, type StatsStore } from "./pomo";

const stats: StatsStore = {
  day: {
    date: "2026-10-25",
    focusCount: 2,
    focusSec: 3000,
    breakCount: 1,
    breakSec: 300,
    projects: { "p-1": { seconds: 1500, sessions: 1 } },
  },
  history: [
    { date: "2026-10-23", focusSec: 1500, focusCount: 1 },
    { date: "2026-10-24", focusSec: 0, focusCount: 0 },
  ],
  log: [{ id: "l1", at: "09:30", mode: "focus", min: 25, projectId: "p-1" }],
};

const projects = [{ id: "p-1", name: "Thesis", url: "https://example.org", createdAt: 1 }];

describe("backup round trip", () => {
  it("parses what it builds", () => {
    const backup = buildBackup(
      { settings: { ...DEFAULT_SETTINGS, focusMin: 50 }, stats, projects, activeProjectId: "p-1" },
      new Date("2026-10-25T10:00:00Z")
    );
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed).toEqual(backup);
  });

  it("drops an active project that isn't in the backup", () => {
    const backup = buildBackup({ settings: DEFAULT_SETTINGS, stats, projects, activeProjectId: "gone" });
    expect(parseBackup(JSON.stringify(backup)).activeProjectId).toBeNull();
  });

  it("normalises out-of-range settings", () => {
    const backup = buildBackup({ settings: DEFAULT_SETTINGS, stats, projects, activeProjectId: null });
    const raw = { ...backup, settings: { focusMin: 9999, autoStart: true } };
    const parsed = parseBackup(JSON.stringify(raw));
    expect(parsed.settings.focusMin).toBe(120);
    expect(parsed.settings.autoStartBreaks).toBe(true);
  });
});

describe("parseBackup rejects bad files", () => {
  it.each([
    ["not json", "{nope", "valid JSON"],
    ["another app", JSON.stringify({ app: "other" }), "isn't a Kernel backup"],
    ["a future version", JSON.stringify({ app: "kernel", version: 2 }), "newer version"],
    ["missing stats", JSON.stringify({ app: "kernel", version: 1 }), "stats"],
  ])("%s", (_name, text, message) => {
    expect(() => parseBackup(text)).toThrow(message);
  });
});

describe("restoreBackup", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("writes the backup and then locks storage", async () => {
    const { restoreBackup } = await import("./backup");
    const pomo = await import("./pomo");
    const backup = buildBackup({
      settings: { ...DEFAULT_SETTINGS, focusMin: 45 },
      stats,
      projects,
      activeProjectId: "p-1",
    });
    restoreBackup(backup);
    expect(JSON.parse(localStorage.getItem("kernel.settings.v1")!).focusMin).toBe(45);
    expect(localStorage.getItem("kernel.activeProject.v1")).toBe("p-1");

    pomo.saveSettings({ ...DEFAULT_SETTINGS, focusMin: 10 });
    expect(JSON.parse(localStorage.getItem("kernel.settings.v1")!).focusMin).toBe(45);
  });
});

describe("historyCsv", () => {
  it("lists active days oldest first, including today", () => {
    expect(historyCsv(stats)).toBe(
      "date,focus_minutes,focus_sessions\n2026-10-23,25,1\n2026-10-25,50,2\n"
    );
  });
});
