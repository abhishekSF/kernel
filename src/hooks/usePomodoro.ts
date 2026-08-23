import { useCallback, useEffect, useRef, useState } from "react";
import {
  Mode,
  Settings,
  TimerSnapshot,
  loadTimer,
  minutesFor,
  saveTimer,
} from "../lib/pomo";

export type EndReason = "complete" | "skip";

export interface Transition {
  next: Mode;
  autoStart: boolean;
}

export type SessionEndHandler = (
  mode: Mode,
  reason: EndReason,
  totalMs: number,
  remainingMs: number
) => Transition;

interface EngineState {
  mode: Mode;
  remainingMs: number;
  totalMs: number;
  running: boolean;
}

const durOf = (s: Settings, m: Mode) => minutesFor(s, m) * 60_000;

function initFromSnapshot(s: Settings): EngineState & {
  endAt: number | null;
  pendingComplete: boolean;
} {
  const snap: TimerSnapshot | null = loadTimer();
  if (snap) {
    const total = snap.totalMs > 0 ? snap.totalMs : durOf(s, snap.mode);
    if (snap.running && snap.endAt) {
      const rem = snap.endAt - Date.now();
      if (rem > 0) {
        return {
          mode: snap.mode,
          remainingMs: rem,
          totalMs: total,
          running: true,
          endAt: snap.endAt,
          pendingComplete: false,
        };
      }
      // finished while the tab was closed — credit it on mount
      return {
        mode: snap.mode,
        remainingMs: 0,
        totalMs: total,
        running: false,
        endAt: null,
        pendingComplete: true,
      };
    }
    return {
      mode: snap.mode,
      remainingMs: Math.min(snap.remainingMs, total),
      totalMs: total,
      running: false,
      endAt: null,
      pendingComplete: false,
    };
  }
  const total = durOf(s, "focus");
  return {
    mode: "focus",
    remainingMs: total,
    totalMs: total,
    running: false,
    endAt: null,
    pendingComplete: false,
  };
}

export function usePomodoro(settings: Settings, onSessionEnd: SessionEndHandler) {
  const [init] = useState(() => initFromSnapshot(settings));
  const [mode, setMode] = useState<Mode>(init.mode);
  const [totalMs, setTotalMs] = useState(init.totalMs);
  const [remainingMs, setRemainingMs] = useState(init.remainingMs);
  const [running, setRunning] = useState(init.running);

  const endAtRef = useRef<number | null>(init.endAt);
  const pendingRef = useRef(init.pendingComplete);
  const finishingRef = useRef(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const remainingRef = useRef(remainingMs);
  remainingRef.current = remainingMs;
  const totalRef = useRef(totalMs);
  totalRef.current = totalMs;
  const runningRef = useRef(running);
  runningRef.current = running;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onEndRef = useRef(onSessionEnd);
  onEndRef.current = onSessionEnd;

  const persist = useCallback(() => {
    saveTimer({
      mode: modeRef.current,
      remainingMs: remainingRef.current,
      totalMs: totalRef.current,
      running: runningRef.current,
      endAt: endAtRef.current,
      savedAt: Date.now(),
    });
  }, []);

  const beginSession = useCallback((m: Mode, startNow: boolean) => {
    const total = durOf(settingsRef.current, m);
    setMode(m);
    setTotalMs(total);
    setRemainingMs(total);
    if (startNow) {
      endAtRef.current = Date.now() + total;
      setRunning(true);
    } else {
      endAtRef.current = null;
      setRunning(false);
    }
  }, []);

  const finish = useCallback(
    (reason: EndReason, remainingOverride?: number) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      const finishedMode = modeRef.current;
      const rem = remainingOverride ?? remainingRef.current;
      const { next, autoStart } = onEndRef.current(
        finishedMode,
        reason,
        totalRef.current,
        rem
      );
      window.setTimeout(() => {
        finishingRef.current = false;
      }, 100);
      endAtRef.current = null;
      beginSession(next, autoStart && reason === "complete");
    },
    [beginSession]
  );

  const finishRef = useRef(finish);
  finishRef.current = finish;

  // credit sessions that completed while the tab was closed
  useEffect(() => {
    if (pendingRef.current) {
      pendingRef.current = false;
      finishRef.current("complete", 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* tick — poll at 200ms for precise completion, but only push state
     when the displayed second changes (≤1 render/sec across the app) */
  useEffect(() => {
    if (!running) return;
    let lastSec = -1;
    const id = window.setInterval(() => {
      const endAt = endAtRef.current;
      if (endAt == null) return;
      const rem = endAt - Date.now();
      if (rem <= 0) {
        setRunning(false);
        setRemainingMs(0);
        endAtRef.current = null;
        persist();
        finishRef.current("complete", 0);
        return;
      }
      const sec = Math.ceil(rem / 1000);
      if (sec !== lastSec) {
        lastSec = sec;
        setRemainingMs(rem);
        persist();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running, persist, mode]);

  // persist on pause / mode change / duration change
  useEffect(() => {
    persist();
  }, [running, mode, totalMs, persist]);

  // when durations change in settings, apply them to an untouched session
  useEffect(() => {
    if (!runningRef.current && remainingRef.current === totalRef.current) {
      const total = durOf(settings, modeRef.current);
      if (total !== totalRef.current) {
        setTotalMs(total);
        setRemainingMs(total);
      }
    }
  }, [settings]);

  const start = useCallback(() => {
    let rem = remainingRef.current;
    if (rem <= 0) rem = totalRef.current;
    endAtRef.current = Date.now() + rem;
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (endAtRef.current != null) {
      setRemainingMs(Math.max(0, endAtRef.current - Date.now()));
    }
    endAtRef.current = null;
    setRunning(false);
  }, []);

  const toggle = useCallback(() => {
    if (runningRef.current) pause();
    else start();
  }, [pause, start]);

  const reset = useCallback(() => {
    const total = durOf(settingsRef.current, modeRef.current);
    endAtRef.current = null;
    setRunning(false);
    setTotalMs(total);
    setRemainingMs(total);
  }, []);

  const skip = useCallback(() => {
    endAtRef.current = null;
    setRunning(false);
    finishRef.current("skip");
  }, []);

  const switchMode = useCallback((m: Mode) => {
    endAtRef.current = null;
    setRunning(false);
    const total = durOf(settingsRef.current, m);
    setMode(m);
    setTotalMs(total);
    setRemainingMs(total);
  }, []);

  return {
    mode,
    totalMs,
    remainingMs,
    running,
    start,
    pause,
    toggle,
    reset,
    skip,
    switchMode,
  };
}
