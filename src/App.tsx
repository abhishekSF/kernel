import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { EndReason, Transition, usePomodoro } from "./hooks/usePomodoro";
import {
  MODE_META,
  MODE_ORDER,
  Mode,
  Project,
  Settings,
  formatClock,
  formatMinutes,
  loadActiveProject,
  loadProjects,
  loadSettings,
  loadStats,
  minutesFor,
  playChime,
  saveActiveProject,
  saveProjects,
  saveSettings,
  saveStats,
  timeNow,
  todayKey,
  uid,
} from "./lib/pomo";
import {
  SplitPayload,
  bridgeSend,
  isLinked,
  onSplit,
  useBridgeLinked,
} from "./lib/bridge";
import { Hourglass } from "./components/Hourglass";
import { StatsPanel } from "./components/StatsPanel";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { ProjectModal, ProjectPicker, ProjectsPanel } from "./components/ProjectsPanel";
import {
  CoffeeIcon,
  GearIcon,
  MoonIcon,
  PauseIcon,
  PlayIcon,
  ResetIcon,
  SkipIcon,
  SoundOffIcon,
  SoundOnIcon,
  TargetIcon,
  TomatoIcon,
} from "./components/icons";

interface Toast {
  id: number;
  msg: string;
  tone: Mode | "info";
}

const TONE_COLOR: Record<Toast["tone"], string> = {
  focus: "#ff6b52",
  short: "#45d0a0",
  long: "#f2b544",
  info: "#9db3a6",
};

const TAB_ICON: Record<Mode, (p: { className?: string }) => ReactNode> = {
  focus: (p) => <TargetIcon {...p} />,
  short: (p) => <CoffeeIcon {...p} />,
  long: (p) => <MoonIcon {...p} />,
};

interface PendingSegment {
  chipPid: string | null;
  elapsedSec: number;
  completed: boolean;
  timer: number;
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stats, setStats] = useState(loadStats);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const linked = useBridgeLinked();

  /* ---------- side projects ---------- */
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(loadActiveProject);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const activeProjectRef = useRef(activeProjectId);
  activeProjectRef.current = activeProjectId;
  const projectsRef = useRef(projects);
  projectsRef.current = projects;

  const pushToast = useCallback((msg: string, tone: Toast["tone"]) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, msg, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  /* ---------- witness attribution ---------- */

  const hasEnrolledUrls = useCallback(
    () => projectsRef.current.some((p) => p.url.trim() !== ""),
    []
  );
  const witnessUsable = useCallback(
    () => isLinked() && hasEnrolledUrls(),
    [hasEnrolledUrls]
  );

  const applyProjectTime = useCallback(
    (secsByPid: Record<string, number>, sessionPid: string | null) => {
      setStats((prev) => {
        const projectsMap = { ...prev.day.projects };
        for (const [pid, sec] of Object.entries(secsByPid)) {
          const cur = projectsMap[pid] ?? { seconds: 0, sessions: 0 };
          projectsMap[pid] = {
            seconds: cur.seconds + sec,
            sessions: cur.sessions + (pid === sessionPid ? 1 : 0),
          };
        }
        return { ...prev, day: { ...prev.day, projects: projectsMap } };
      });
    },
    []
  );

  const projectName = useCallback(
    (id: string | null | undefined) => projects.find((p) => p.id === id)?.name ?? null,
    [projects]
  );
  const projectNameRef = useRef(projectName);
  projectNameRef.current = projectName;

  const creditToChip = useCallback(
    (pid: string | null, sec: number, completed: boolean) => {
      if (!pid || sec < 5) return;
      applyProjectTime({ [pid]: sec }, completed ? pid : null);
    },
    [applyProjectTime]
  );
  const creditToChipRef = useRef(creditToChip);
  creditToChipRef.current = creditToChip;

  /* ---------- session lifecycle ---------- */

  // Set by handleSessionEnd when a focus round ends; read by the witness
  // segment effect, which runs after the mode has already transitioned.
  const focusEndRef = useRef<{ completed: boolean } | null>(null);

  const handleSessionEnd = useCallback(
    (mode: Mode, reason: EndReason): Transition => {
      const s = settingsRef.current;
      const durMin = minutesFor(s, mode);
      let next: Mode;

      if (mode === "focus") {
        focusEndRef.current = { completed: reason === "complete" };
        const newCount = statsRef.current.day.focusCount + 1;
        next = reason === "skip" ? "short" : newCount % s.longEvery === 0 ? "long" : "short";
      } else {
        next = "focus";
      }

      if (reason === "complete") {
        const sec = durMin * 60;
        const usingWitness = mode === "focus" && witnessUsable();
        const pid = mode === "focus" && !usingWitness ? activeProjectRef.current : null;
        setStats((prev) => {
          const day = { ...prev.day };
          const log = [
            ...prev.log,
            {
              id: uid("log"),
              at: timeNow(),
              mode,
              min: durMin,
              projectId: mode === "focus" ? activeProjectRef.current : null,
            },
          ];
          let history = prev.history;
          if (mode === "focus") {
            day.focusCount += 1;
            day.focusSec += sec;
            if (pid) {
              const projectsMap = { ...day.projects };
              const cur = projectsMap[pid] ?? { seconds: 0, sessions: 0 };
              projectsMap[pid] = { seconds: cur.seconds + sec, sessions: cur.sessions + 1 };
              day.projects = projectsMap;
            }
            const today = todayKey();
            history = [
              ...history.filter((h) => h.date !== today),
              { date: today, focusSec: day.focusSec, focusCount: day.focusCount },
            ].slice(-30);
          } else {
            day.breakCount += 1;
            day.breakSec += sec;
          }
          return { day, history, log };
        });

        if (s.sound) playChime(mode === "focus" ? "focus" : "break");

        if (mode === "focus") {
          const newCount = statsRef.current.day.focusCount + 1;
          if (newCount === s.dailyGoal) {
            pushToast(`Daily goal reached — ${newCount} rounds of deep work`, "focus");
          } else if (next === "long") {
            pushToast("Full cycle complete — a long break is earned", "long");
          } else {
            pushToast(`Focus round done — ${durMin} minutes banked`, "focus");
          }
        } else {
          pushToast("Break's over — back to the desk", "short");
        }
      } else {
        pushToast(next === "focus" ? "Skipped ahead to focus" : "Skipped ahead to a break", "info");
      }

      return { next, autoStart: s.autoStart };
    },
    [pushToast, witnessUsable]
  );

  const timer = usePomodoro(settings, handleSessionEnd);
  const { mode, remainingMs, totalMs, running } = timer;

  const totalRef = useRef(totalMs);
  totalRef.current = totalMs;
  const remainRef = useRef(remainingMs);
  remainRef.current = remainingMs;

  /* witness segments: one per contiguous running span of a focus round */
  const segRef = useRef<string | null>(null);
  const pendingRef = useRef<Map<string, PendingSegment>>(new Map());

  useEffect(() => {
    const active = mode === "focus" && running;

    if (active && segRef.current === null) {
      if (witnessUsable()) {
        const id = uid("seg");
        segRef.current = id;
        bridgeSend({ type: "session-start", payload: { sessionId: id } });
      }
      return;
    }

    if (!active && segRef.current !== null) {
      const id = segRef.current;
      segRef.current = null;
      bridgeSend({ type: "session-end", payload: { sessionId: id } });

      // On complete/skip the mode has already advanced, so the timer refs
      // describe the next session; fall back to the finished focus duration.
      // On pause (no end recorded) the refs still hold this round.
      const end = focusEndRef.current;
      focusEndRef.current = null;
      const completed = end?.completed ?? false;
      const elapsedSec = end
        ? completed
          ? Math.round(minutesFor(settingsRef.current, "focus") * 60)
          : 0
        : Math.max(0, Math.round((totalRef.current - remainRef.current) / 1000));
      const chipPid = activeProjectRef.current;

      const timerId = window.setTimeout(() => {
        pendingRef.current.delete(id);
        creditToChipRef.current(chipPid, elapsedSec, completed);
      }, 3500);
      pendingRef.current.set(id, { chipPid, elapsedSec, completed, timer: timerId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, running]);

  /* consume split reports from the witness */
  useEffect(() => {
    return onSplit((p: SplitPayload) => {
      const seg = pendingRef.current.get(p.sessionId);
      if (!seg) return;
      window.clearTimeout(seg.timer);
      pendingRef.current.delete(p.sessionId);

      if (!p.tracked) {
        creditToChip(seg.chipPid, seg.elapsedSec, seg.completed);
        return;
      }

      const secsByPid: Record<string, number> = {};
      let topPid: string | null = null;
      let top = 0;
      for (const [pid, sec] of Object.entries(p.split)) {
        if (sec <= 0) continue;
        secsByPid[pid] = sec;
        if (sec > top) {
          top = sec;
          topPid = pid;
        }
      }

      if (topPid === null) {
        creditToChip(seg.chipPid, seg.elapsedSec, seg.completed);
        return;
      }

      applyProjectTime(secsByPid, seg.completed ? topPid : null);

      if (seg.completed) {
        const parts = Object.entries(secsByPid).map(
          ([pid, sec]) => `${projectNameRef.current(pid) ?? "project"} ${formatMinutes(sec)}`
        );
        if (p.otherSeconds > 0) parts.push(`elsewhere ${formatMinutes(p.otherSeconds)}`);
        pushToast(`Round measured — ${parts.join(" · ")}`, "focus");
      }
    });
  }, [applyProjectTime, creditToChip, pushToast]);

  /* keep the witness whitelist in sync */
  useEffect(() => {
    if (!linked) return;
    bridgeSend({
      type: "sync",
      payload: {
        whitelist: projects.map((p) => ({ id: p.id, name: p.name, url: p.url })),
      },
    });
  }, [linked, projects]);

  /* clean up fallback timers on unmount */
  useEffect(() => {
    const pending = pendingRef.current;
    return () => {
      pending.forEach((seg) => window.clearTimeout(seg.timer));
      pending.clear();
    };
  }, []);

  /* ---------- persistence ---------- */

  useEffect(() => saveStats(stats), [stats]);
  useEffect(() => saveProjects(projects), [projects]);
  useEffect(() => saveActiveProject(activeProjectId), [activeProjectId]);

  /* ---------- living document title ---------- */

  useEffect(() => {
    document.title = running
      ? `${formatClock(remainingMs)} · ${MODE_META[mode].label} — Kernel`
      : "Kernel — Pomodoro Focus Timer";
  }, [running, remainingMs, mode]);

  /* ---------- keyboard shortcuts ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (drawerOpen || projectModalOpen || trackingOpen) return;
      if (e.code === "Space") {
        e.preventDefault();
        timer.toggle();
      } else if (e.code === "KeyR") {
        timer.reset();
      } else if (e.code === "KeyS") {
        timer.skip();
      } else if (e.code === "Digit1") {
        timer.switchMode("focus");
      } else if (e.code === "Digit2") {
        timer.switchMode("short");
      } else if (e.code === "Digit3") {
        timer.switchMode("long");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.toggle, timer.reset, timer.skip, timer.switchMode, drawerOpen, projectModalOpen, trackingOpen]);

  /* ---------- derived ---------- */

  const day = stats.day;
  const s = settings;
  const cycleFilled =
    day.focusCount > 0 && day.focusCount % s.longEvery === 0 && mode === "long"
      ? s.longEvery
      : day.focusCount % s.longEvery;

  const activeIdx = MODE_ORDER.indexOf(mode);
  const startLabel = running ? "Pause" : remainingMs < totalMs ? "Resume" : "Start";
  const round = Math.min(cycleFilled + (mode === "focus" ? 1 : 0), s.longEvery);

  const upNext =
    mode === "focus"
      ? (day.focusCount + 1) % s.longEvery === 0
        ? "a long break"
        : "a short break"
      : "focus";

  const statusLine = running
    ? MODE_META[mode].status
    : remainingMs < totalMs
      ? "Paused — space to resume"
      : `Up next: ${upNext}`;

  const toggleSound = () => {
    const next = { ...settingsRef.current, sound: !settingsRef.current.sound };
    setSettings(next);
    saveSettings(next);
    pushToast(next.sound ? "Chime on" : "Chime off", "info");
  };

  const createProject = (name: string, url: string) => {
    const p: Project = { id: uid("p"), name, url, createdAt: Date.now() };
    setProjects((prev) => [...prev, p]);
    setActiveProjectId(p.id);
    pushToast(`Focusing on “${name}”`, "info");
  };

  const removeProject = (id: string) => {
    const name = projects.find((p) => p.id === id)?.name ?? "Project";
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) setActiveProjectId(null);
    pushToast(`Removed “${name}”`, "info");
  };

  return (
    <div data-mode={mode} className="relative min-h-screen font-body">
      {/* ambient layers */}
      <div className="glow glow-a" aria-hidden />
      <div className="glow glow-b" aria-hidden />
      <div className="glow glow-c" aria-hidden />

      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        {/* ---------- header ---------- */}
        <header className="fade-up flex items-center justify-between pt-6 sm:pt-8">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl border transition-colors duration-700"
              style={{ borderColor: "var(--mode-line)", backgroundColor: "var(--mode-soft)" }}
            >
              <TomatoIcon className="h-7 w-7" />
            </div>
            <div>
              <div className="font-display text-[24px] font-bold leading-none tracking-tight text-cream">
                Kernel
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-mist-600">
                pomodoro · focus timer
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrackingOpen(true)}
              className="flex h-10 items-center gap-2 rounded-full border border-cream/10 px-3.5 text-mist-400 transition-all hover:border-cream/25 hover:text-cream active:scale-95"
              title={linked ? "Kernel Witness is linked — click for details" : "Manual mode — click to learn about local tab tracking"}
            >
              <span
                className={`h-2 w-2 rounded-full transition-colors duration-500 ${
                  linked ? "bg-mint pulse-dot" : "bg-mist-600"
                }`}
              />
              <span className="hidden text-[11px] font-bold uppercase tracking-[0.14em] md:inline">
                {linked ? "Witness linked" : "Manual mode"}
              </span>
            </button>
            <button
              onClick={toggleSound}
              className="grid h-10 w-10 place-items-center rounded-full border border-cream/10 text-mist-400 transition-all hover:border-cream/25 hover:text-cream active:scale-90"
              aria-label={s.sound ? "Mute chime" : "Unmute chime"}
              title={s.sound ? "Mute chime" : "Unmute chime"}
            >
              {s.sound ? <SoundOnIcon className="h-4.5 w-4.5" /> : <SoundOffIcon className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 items-center gap-2 rounded-full border border-cream/10 px-4 text-[12px] font-bold uppercase tracking-[0.14em] text-mist-400 transition-all hover:border-cream/25 hover:text-cream active:scale-95"
            >
              <GearIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </header>

        {/* ---------- main ---------- */}
        <main className="mt-7 grid items-start gap-6 lg:grid-cols-[7fr_5fr]">
          {/* timer card */}
          <section
            className="fade-up relative overflow-hidden rounded-[30px] border border-cream/8 bg-gradient-to-b from-pine-850 to-pine-900 px-5 pb-7 pt-5 sm:px-8"
            style={{ animationDelay: "60ms" }}
          >
            {/* mode tabs */}
            <div className="relative mx-auto grid max-w-[440px] grid-cols-3 rounded-full border border-cream/8 bg-pine-950/60 p-1">
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  transform: `translateX(${activeIdx * 100}%)`,
                  backgroundColor: "var(--mode-soft)",
                  border: "1px solid var(--mode-line)",
                }}
              />
              {MODE_ORDER.map((m) => (
                <button
                  key={m}
                  onClick={() => timer.switchMode(m)}
                  className={`relative z-10 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors duration-300 sm:text-[12px] ${
                    m === mode ? "text-cream" : "text-mist-600 hover:text-mist-400"
                  }`}
                  aria-pressed={m === mode}
                >
                  <span style={{ color: m === mode ? "var(--mode)" : undefined }}>
                    {TAB_ICON[m]({ className: "h-3.5 w-3.5" })}
                  </span>
                  <span className="hidden min-[420px]:inline">{MODE_META[m].label.split(" ")[0]}</span>
                  <span className="font-mono text-[10px] font-medium opacity-70">
                    {minutesFor(s, m)}m
                  </span>
                </button>
              ))}
            </div>

            {/* hourglass */}
            <div className="mt-5 sm:mt-7">
              <Hourglass
                mode={mode}
                remainingMs={remainingMs}
                totalMs={totalMs}
                running={running}
                round={round}
                cycleLen={s.longEvery}
                statusLine={statusLine}
                onToggle={timer.toggle}
              />
            </div>

            {/* what am I focusing on */}
            <div className="mt-5">
              <ProjectPicker
                projects={projects}
                activeId={activeProjectId}
                onSelect={setActiveProjectId}
                onNew={() => setProjectModalOpen(true)}
              />
            </div>

            {/* controls */}
            <div className="mt-5 flex items-center justify-center gap-4 sm:gap-5">
              <button
                onClick={timer.reset}
                className="group grid h-[52px] w-[52px] place-items-center rounded-full border border-cream/12 text-mist-400 transition-all duration-300 hover:border-cream/30 hover:text-cream active:scale-90"
                aria-label="Reset timer"
                title="Reset (R)"
              >
                <ResetIcon className="h-5 w-5 transition-transform duration-500 group-hover:-rotate-[200deg]" />
              </button>

              <button
                onClick={timer.toggle}
                className="flex h-[62px] min-w-[180px] items-center justify-center gap-2.5 rounded-full px-10 text-[15px] font-extrabold uppercase tracking-[0.22em] transition-all duration-300 hover:brightness-110 active:scale-[0.96]"
                style={{
                  backgroundColor: "var(--mode)",
                  color: "var(--mode-ink)",
                  boxShadow: "0 10px 30px -10px var(--mode-glow), inset 0 1px 0 rgba(255,255,255,0.22)",
                }}
              >
                {running ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5 translate-x-[1px] translate-y-[2px]" />}
                {startLabel}
              </button>

              <button
                onClick={timer.skip}
                className="group grid h-[52px] w-[52px] place-items-center rounded-full border border-cream/12 text-mist-400 transition-all duration-300 hover:border-cream/30 hover:text-cream active:scale-90"
                aria-label="Skip to next session"
                title="Skip (S)"
              >
                <SkipIcon className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* shortcut hints */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-cream/6 pt-4 text-[11px] text-mist-600">
              <span className="flex items-center gap-1.5"><kbd>Space</kbd> start / pause</span>
              <span className="flex items-center gap-1.5"><kbd>R</kbd> reset</span>
              <span className="flex items-center gap-1.5"><kbd>S</kbd> skip</span>
              <span className="flex items-center gap-1.5"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> modes</span>
            </div>
          </section>

          {/* stats column */}
          <StatsPanel
            day={day}
            log={stats.log}
            history={stats.history}
            settings={s}
            cycleFilled={cycleFilled}
            projectName={projectName}
          >
            <ProjectsPanel
              projects={projects}
              day={day}
              onAdd={() => setProjectModalOpen(true)}
              onRemove={removeProject}
            />
          </StatsPanel>
        </main>

        {/* ---------- footer ---------- */}
        <footer
          className="fade-up mt-10 flex flex-col items-center justify-between gap-2 border-t border-cream/6 pt-5 text-[11.5px] text-mist-600 sm:flex-row"
          style={{ animationDelay: "420ms" }}
        >
          <span className="text-mist-500">Small rounds, daily — that's how the kernel grows.</span>
          <span className="font-mono uppercase tracking-[0.14em] text-[10px]">
            stats live in this browser · nothing leaves your machine
          </span>
        </footer>
      </div>

      {/* ---------- toasts ---------- */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in flex items-center gap-2.5 rounded-full border border-cream/12 bg-pine-850/95 py-2.5 pl-4 pr-5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.7)]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: TONE_COLOR[t.tone], boxShadow: `0 0 10px ${TONE_COLOR[t.tone]}88` }}
            />
            <span className="text-[13px] font-semibold text-mist-300">{t.msg}</span>
          </div>
        ))}
      </div>

      <SettingsDrawer
        open={drawerOpen}
        settings={settings}
        onClose={() => setDrawerOpen(false)}
        onSave={(next) => {
          setSettings(next);
          saveSettings(next);
          pushToast("Settings saved", "info");
        }}
      />

      <ProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onCreate={createProject}
      />

      {/* ---------- tracking explainer ---------- */}
      {trackingOpen && (
        <TrackingModal linked={linked} onClose={() => setTrackingOpen(false)} />
      )}
    </div>
  );
}

/* ---------------- tracking explainer modal ---------------- */

function TrackingModal({ linked, onClose }: { linked: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const Row = ({ k, v, good }: { k: string; v: string; good?: boolean }) => (
    <li className="flex items-start gap-2.5 py-1.5">
      <span
        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: good ? "#45d0a0" : "#ff6b52" }}
      />
      <span className="text-[13px] leading-relaxed text-mist-300">
        <span className="font-bold text-cream">{k}.</span> {v}
      </span>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-pine-950/75 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="How tab tracking works"
        className="toast-in relative max-h-[86vh] w-full max-w-md overflow-y-auto rounded-[24px] border border-cream/10 bg-pine-900 p-6 shadow-2xl sm:p-7"
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${linked ? "bg-mint pulse-dot" : "bg-mist-600"}`}
          />
          <h3 className="font-display text-xl font-semibold text-cream">
            Kernel Witness — local tab tracking
          </h3>
        </div>
        <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.18em] text-mist-600">
          {linked ? "status: linked" : "status: not installed"}
        </p>

        <p className="mt-4 text-[13.5px] leading-relaxed text-mist-400">
          A tiny browser extension that measures which of your enrolled projects
          had the foreground tab — and only while a focus round is running. When
          the sand runs out, the round splits itself: <span className="font-mono text-[12.5px] text-mist-300">Trip planner 14m · Repo 7m · elsewhere 4m</span>.
        </p>

        <ul className="mt-4 border-t border-cream/8 pt-3">
          <Row good k="Sees" v="The active tab's URL, and only during focus rounds." />
          <Row good k="Counts" v="Only sites you enrolled as projects. Everything else is one anonymous “elsewhere” number — no URLs kept." />
          <Row k="Never touches" v="Page contents, titles, keystrokes, or anything while you're on a break or idle." />
          <Row good k="Stores" v="chrome.storage.local on this machine only. Export or wipe it from the extension popup; uninstalling deletes it." />
          <Row good k="Sends" v="Nothing. There is no network code in the extension at all." />
        </ul>

        <div className="mt-4 rounded-2xl border border-cream/8 bg-pine-950/50 p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-mist-600">
            Install (about a minute)
          </div>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-4 text-[13px] text-mist-400">
            <li>Copy the <span className="font-mono text-[12px] text-cream">extension/</span> folder from this project (its README has the full install notes) to your machine.</li>
            <li>Open <span className="font-mono text-[12px] text-cream">chrome://extensions</span> and enable Developer mode.</li>
            <li>Click “Load unpacked” and select that folder.</li>
            <li>Reload Kernel — this dot turns mint, and rounds start measuring.</li>
            <li className="list-none pl-0 text-[12px] text-mist-600">
              Opening Kernel straight from disk? Enable <span className="font-mono">Allow access to file URLs</span> on the extension card too.
            </li>
          </ol>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-full border border-cream/12 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-mist-400 transition-all hover:border-cream/25 hover:text-cream active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
