import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import {
  DayStats,
  HistoryEntry,
  LogEntry,
  MODE_META,
  Mode,
  Settings,
  formatMinutes,
  lastNDays,
  todayKey,
  weekdayLetter,
} from "../lib/pomo";
import { ClockIcon, CoffeeIcon, FlameIcon, MoonIcon, TargetIcon } from "./icons";

/* animated integer */
function useCountUp(value: number, duration = 550) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    let raf = 0;
    const startT = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - startT) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

const MODE_DOT: Record<Mode, string> = {
  focus: "#ff6b52",
  short: "#45d0a0",
  long: "#f2b544",
};

interface StatsPanelProps {
  day: DayStats;
  log: LogEntry[];
  history: HistoryEntry[];
  settings: Settings;
  cycleFilled: number;
  projectName?: (id: string | null | undefined) => string | null;
  children?: ReactNode;
}

function StatsPanelInner({
  day,
  log,
  history,
  settings,
  cycleFilled,
  projectName,
  children,
}: StatsPanelProps) {
  const sessions = useCountUp(day.focusCount);
  const focusMin = useCountUp(Math.round(day.focusSec / 60));

  const days = lastNDays(7);
  const weekData = days.map((key) => {
    if (key === todayKey()) {
      return { date: key, sec: day.focusSec, count: day.focusCount };
    }
    const h = history.find((e) => e.date === key);
    return { date: key, sec: h?.focusSec ?? 0, count: h?.focusCount ?? 0 };
  });
  const weekTotal = weekData.reduce((a, b) => a + b.sec, 0);
  const maxSec = Math.max(...weekData.map((d) => d.sec), 1);
  const today = todayKey();

  const goalPct = Math.min(100, Math.round((day.focusCount / settings.dailyGoal) * 100));
  const goalHit = day.focusCount >= settings.dailyGoal;

  return (
    <div className="flex flex-col gap-5">
      {/* ------- today ------- */}
      <section
        className="fade-up relative overflow-hidden rounded-[26px] border border-cream/8 bg-gradient-to-b from-pine-850 to-pine-900 p-6 sm:p-7"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-cream">Today</h2>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-mist-600">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>

        <div className="mt-5 flex items-end gap-6">
          <div>
            <div className="font-display text-[64px] leading-none font-semibold text-cream tabular-nums">
              {sessions}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-mist-500">
              <FlameIcon className="h-4 w-4 text-ember" />
              focus sessions
            </div>
          </div>
          <div className="mb-1 h-14 w-px bg-cream/10" />
          <div>
            <div className="font-display text-[40px] leading-none font-medium text-mist-300 tabular-nums">
              {focusMin}
              <span className="ml-1 text-xl text-mist-500">min</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-mist-500">
              <ClockIcon className="h-4 w-4 text-mint" />
              deep work
            </div>
          </div>
        </div>

        {/* goal */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-[0.16em]">
            <span className="flex items-center gap-1.5 text-mist-500">
              <TargetIcon className="h-4 w-4" />
              daily goal
            </span>
            <span className={goalHit ? "text-mint" : "text-mist-400"}>
              {goalHit ? "achieved ✓" : `${day.focusCount} of ${settings.dailyGoal}`}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream/8">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.max(goalPct, day.focusCount > 0 ? 4 : 0)}%`,
                backgroundColor: goalHit ? "#45d0a0" : "var(--mode)",
              }}
            />
          </div>
        </div>

        {/* cycle dots */}
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-cream/6 bg-pine-950/50 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-mist-500">
            <CoffeeIcon className="h-4 w-4" />
            until long break
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: settings.longEvery }).map((_, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: i < cycleFilled ? "var(--mode)" : "rgba(238,243,236,0.12)",
                  boxShadow: i < cycleFilled ? "0 0 10px var(--mode-glow)" : "none",
                  transform: i < cycleFilled ? "scale(1)" : "scale(0.85)",
                }}
              />
            ))}
            <MoonIcon
              className={`ml-1 h-4 w-4 transition-colors duration-500 ${
                cycleFilled >= settings.longEvery ? "text-honey" : "text-mist-600"
              }`}
            />
          </div>
        </div>
      </section>

      {children}

      {/* ------- week ------- */}
      <section
        className="fade-up rounded-[26px] border border-cream/8 bg-gradient-to-b from-pine-850 to-pine-900 p-6 sm:p-7"
        style={{ animationDelay: "220ms" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-cream">This week</h2>
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-mist-500">
            {formatMinutes(weekTotal)} focused
          </span>
        </div>

        <div className="mt-5 flex h-[120px] items-end gap-2.5">
          {weekData.map((d, idx) => {
            const isToday = d.date === today;
            const pct = d.sec > 0 ? Math.max(8, (d.sec / maxSec) * 100) : 4;
            return (
              <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-2">
                <div className="pointer-events-none absolute -top-7 z-10 rounded-md border border-cream/10 bg-pine-950 px-2 py-0.5 font-mono text-[10px] text-mist-300 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {formatMinutes(d.sec)}
                </div>
                <div className="flex h-[92px] w-full items-end rounded-lg bg-cream/4 px-[22%]">
                  <div
                    className="bar-grow w-full rounded-md transition-all duration-500"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: isToday
                        ? "var(--mode)"
                        : d.sec > 0
                          ? "rgba(157,179,166,0.4)"
                          : "rgba(238,243,236,0.1)",
                      animationDelay: `${280 + idx * 60}ms`,
                    }}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest ${
                    isToday ? "text-cream" : "text-mist-600"
                  }`}
                >
                  {weekdayLetter(d.date)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------- log ------- */}
      <section
        className="fade-up rounded-[26px] border border-cream/8 bg-gradient-to-b from-pine-850 to-pine-900 p-6 sm:p-7"
        style={{ animationDelay: "320ms" }}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-cream">Session log</h2>
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-mist-500">
            {log.length} {log.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {log.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-cream/12 px-4 py-6 text-center text-sm text-mist-500">
            Nothing logged yet today.
            <br />
            <span className="text-mist-400">Finish a focus round to plant your first seed.</span>
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-1.5">
            {log.slice(-6).reverse().map((e) => (
              <li
                key={e.id}
                className="fade-up flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-cream/4"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: MODE_DOT[e.mode], boxShadow: `0 0 8px ${MODE_DOT[e.mode]}66` }}
                />
                <span className="font-mono text-[12px] text-mist-500 tabular-nums">{e.at}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-mist-300">
                  {MODE_META[e.mode].label}
                  {e.mode === "focus" && projectName && projectName(e.projectId) && (
                    <span className="text-mist-600"> · {projectName(e.projectId)}</span>
                  )}
                </span>
                <span className="font-mono text-[12px] text-mist-400 tabular-nums">+{e.min}m</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export const StatsPanel = memo(StatsPanelInner);
