import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  clamp,
  formatClock,
  formatMinutes,
  minutesFor,
  todayKey,
  lastNDays,
  weekdayLetter,
  DEFAULT_SETTINGS,
  loadSettings,
  loadStats,
  loadTimer,
  saveTimer,
  type Settings,
  type TimerSnapshot,
} from "./pomo";

describe("clamp", () => {
  it("returns value when inside range", () => {
    expect(clamp(10, 1, 20)).toBe(10);
  });
  it("clamps to min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps to max", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
  it("returns min for NaN", () => {
    expect(clamp(Number.NaN, 3, 9)).toBe(3);
  });
});

describe("formatClock", () => {
  it("formats whole minutes", () => {
    expect(formatClock(25 * 60_000)).toBe("25:00");
  });
  it("formats remaining seconds", () => {
    expect(formatClock(90_000)).toBe("01:30");
  });
  it("never goes negative", () => {
    expect(formatClock(-5000)).toBe("00:00");
  });
  it("ceils fractional seconds", () => {
    expect(formatClock(1001)).toBe("00:02");
  });
});

describe("formatMinutes", () => {
  it("handles zero", () => {
    expect(formatMinutes(0)).toBe("0m");
  });
  it("rounds under an hour", () => {
    expect(formatMinutes(90)).toBe("2m");
  });
  it("formats hours", () => {
    expect(formatMinutes(3600)).toBe("1h");
  });
  it("formats hours + minutes", () => {
    expect(formatMinutes(5400)).toBe("1h 30m");
  });
});

describe("minutesFor", () => {
  const s: Settings = { ...DEFAULT_SETTINGS, focusMin: 30, shortMin: 7, longMin: 20 };
  it("returns focus duration", () => {
    expect(minutesFor(s, "focus")).toBe(30);
  });
  it("returns short duration", () => {
    expect(minutesFor(s, "short")).toBe(7);
  });
  it("returns long duration", () => {
    expect(minutesFor(s, "long")).toBe(20);
  });
});

describe("todayKey / lastNDays / weekdayLetter", () => {
  it("produces YYYY-MM-DD", () => {
    const key = todayKey(new Date("2026-08-23T15:00:00"));
    expect(key).toBe("2026-08-23");
  });
  it("lastNDays returns correct length and order", () => {
    const days = lastNDays(3);
    expect(days).toHaveLength(3);
    expect(days[0] < days[1] && days[1] < days[2]).toBe(true);
  });
  it("weekdayLetter returns two-letter day", () => {
    expect(weekdayLetter("2026-08-23")).toMatch(/^[A-Z][a-z]$/);
  });
});

describe("loadSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when empty", () => {
    const s = loadSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps out-of-range values", () => {
    localStorage.setItem(
      "kernel.settings.v1",
      JSON.stringify({ focusMin: 999, shortMin: 0, longEvery: 1 })
    );
    const s = loadSettings();
    expect(s.focusMin).toBe(120);
    expect(s.shortMin).toBe(1);
    expect(s.longEvery).toBe(2);
  });
});

describe("loadStats day rollover", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts a fresh day when date changes", () => {
    const yesterday = "2020-01-01";
    localStorage.setItem(
      "kernel.stats.v1",
      JSON.stringify({
        day: {
          date: yesterday,
          focusCount: 3,
          focusSec: 4500,
          breakCount: 2,
          breakSec: 600,
          projects: {},
        },
        history: [],
        log: [{ id: "x", at: "10:00", mode: "focus", min: 25 }],
      })
    );
    const stats = loadStats();
    expect(stats.day.date).toBe(todayKey());
    expect(stats.day.focusCount).toBe(0);
    expect(stats.history).toHaveLength(1);
    expect(stats.history[0].date).toBe(yesterday);
    expect(stats.log).toHaveLength(0);
  });
});

describe("timer snapshot persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips a valid snapshot", () => {
    const snap: TimerSnapshot = {
      mode: "focus",
      remainingMs: 12_000,
      totalMs: 25 * 60_000,
      running: true,
      endAt: Date.now() + 12_000,
      savedAt: Date.now(),
    };
    saveTimer(snap);
    const loaded = loadTimer();
    expect(loaded).toMatchObject({
      mode: "focus",
      remainingMs: 12_000,
      running: true,
    });
  });

  it("rejects snapshots older than 24h", () => {
    const old: TimerSnapshot = {
      mode: "focus",
      remainingMs: 1000,
      totalMs: 25 * 60_000,
      running: false,
      endAt: null,
      savedAt: Date.now() - 25 * 60 * 60 * 1000,
    };
    saveTimer(old);
    expect(loadTimer()).toBeNull();
  });
});
