import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePomodoro, type SessionEndHandler } from "./usePomodoro";
import { DEFAULT_SETTINGS, type Settings, type Mode } from "../lib/pomo";

const focusMs = DEFAULT_SETTINGS.focusMin * 60_000;
const shortMs = DEFAULT_SETTINGS.shortMin * 60_000;

function createHandler(next: Mode = "short", autoStart = false): SessionEndHandler {
  return () => ({ next, autoStart });
}

describe("usePomodoro", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in focus mode with full duration", () => {
    const { result } = renderHook(() =>
      usePomodoro(DEFAULT_SETTINGS, createHandler())
    );
    expect(result.current.mode).toBe("focus");
    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(focusMs);
    expect(result.current.totalMs).toBe(focusMs);
  });

  it("toggle starts and pauses the timer", () => {
    const { result } = renderHook(() =>
      usePomodoro(DEFAULT_SETTINGS, createHandler())
    );

    act(() => {
      result.current.toggle();
    });
    expect(result.current.running).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    // remaining should have decreased
    expect(result.current.remainingMs).toBeLessThan(focusMs);
    expect(result.current.remainingMs).toBeGreaterThan(focusMs - 6_000);

    act(() => {
      result.current.toggle(); // pause
    });
    expect(result.current.running).toBe(false);
    const pausedAt = result.current.remainingMs;

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    // time should not advance while paused
    expect(result.current.remainingMs).toBe(pausedAt);
  });

  it("completes a session and transitions via onSessionEnd", () => {
    const onEnd = vi.fn(createHandler("short", false));
    const { result } = renderHook(() => usePomodoro(DEFAULT_SETTINGS, onEnd));

    act(() => {
      result.current.toggle(); // start
    });

    act(() => {
      // jump past the full focus duration
      vi.advanceTimersByTime(focusMs + 500);
    });

    expect(onEnd).toHaveBeenCalledWith(
      "focus",
      "complete",
      focusMs,
      0
    );
    expect(result.current.mode).toBe("short");
    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(shortMs);
  });

  it("skip ends the current session without waiting", () => {
    const onEnd = vi.fn(createHandler("long"));
    const { result } = renderHook(() => usePomodoro(DEFAULT_SETTINGS, onEnd));

    act(() => {
      result.current.toggle();
    });
    act(() => {
      result.current.skip();
    });

    expect(onEnd).toHaveBeenCalledWith(
      "focus",
      "skip",
      focusMs,
      expect.any(Number)
    );
    expect(result.current.mode).toBe("long");
    expect(result.current.running).toBe(false);
  });

  it("reset restores full duration of current mode", () => {
    const { result } = renderHook(() =>
      usePomodoro(DEFAULT_SETTINGS, createHandler())
    );

    act(() => {
      result.current.toggle();
    });
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.running).toBe(false);
    expect(result.current.remainingMs).toBe(focusMs);
    expect(result.current.totalMs).toBe(focusMs);
  });

  it("switchMode changes mode and duration without auto-start", () => {
    const { result } = renderHook(() =>
      usePomodoro(DEFAULT_SETTINGS, createHandler())
    );

    act(() => {
      result.current.switchMode("short");
    });

    expect(result.current.mode).toBe("short");
    expect(result.current.remainingMs).toBe(shortMs);
    expect(result.current.running).toBe(false);
  });

  it("applies new settings durations when session is untouched", () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, focusMin: 25 };
    const { result, rerender } = renderHook(
      ({ s }) => usePomodoro(s, createHandler()),
      { initialProps: { s: settings } }
    );

    const longer: Settings = { ...settings, focusMin: 40 };
    rerender({ s: longer });

    expect(result.current.totalMs).toBe(40 * 60_000);
    expect(result.current.remainingMs).toBe(40 * 60_000);
  });

  it("does not overwrite remaining time when a session is already in progress", () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, focusMin: 25 };
    const { result, rerender } = renderHook(
      ({ s }) => usePomodoro(s, createHandler()),
      { initialProps: { s: settings } }
    );

    act(() => {
      result.current.toggle();
    });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    const remainingBefore = result.current.remainingMs;

    const longer: Settings = { ...settings, focusMin: 50 };
    rerender({ s: longer });

    // remaining should stay roughly the same (settings change is ignored mid-session)
    expect(result.current.remainingMs).toBeLessThanOrEqual(remainingBefore + 200);
    expect(result.current.remainingMs).toBeGreaterThan(remainingBefore - 2000);
  });
});
