import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { MODE_META, Mode, formatClock } from "../lib/pomo";

interface HourglassProps {
  mode: Mode;
  remainingMs: number;
  totalMs: number;
  running: boolean;
  round: number;
  cycleLen: number;
  statusLine: string;
  onToggle: () => void;
}

const FLOOR_Y = 376;

const SAND = ["#f0c27e", "#e5b26b", "#d9a35a", "#c98f4a"];

/* deterministic pseudo-random stream pixels */
const SAND_PIXELS = Array.from({ length: 26 }, (_, i) => {
  const r1 = ((i * 37 + 11) % 17) / 17;
  const r2 = ((i * 53 + 7) % 13) / 13;
  const r3 = ((i * 29 + 5) % 19) / 19;
  const r4 = ((i * 71 + 3) % 23) / 23;
  return {
    x: 125.5 + r1 * 9,
    size: 1.7 + r2 * 1.8,
    dur: 0.62 + r3 * 0.55,
    delay: (i / 26) * 0.8 + r1 * 0.25,
    drift: (r2 - 0.5) * 8,
    opacity: 0.5 + r4 * 0.5,
    color: SAND[i % SAND.length],
  };
});

function HourglassInner({
  mode,
  remainingMs,
  totalMs,
  running,
  round,
  cycleLen,
  statusLine,
  onToggle,
}: HourglassProps) {
  const progress =
    totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;

  /* top sand: surface descends, funnel dip deepens */
  const surfaceY = 54 + progress * 148;
  const dip = Math.min(4 + progress * 26, Math.max(0, 212 - surfaceY - 2));
  const topSand = `M 58 ${surfaceY} Q 130 ${surfaceY + dip} 202 ${surfaceY} L 202 214 L 58 214 Z`;

  /* bottom sand: mound grows */
  const h = progress * 118;
  const apexY = FLOOR_Y - 1.28 * h;
  const mound = `M 58 ${FLOOR_Y} L 58 ${FLOOR_Y - 0.3 * h} Q 130 ${apexY} 202 ${
    FLOOR_Y - 0.3 * h
  } L 202 ${FLOOR_Y} Z`;

  const flowing = running && progress > 0.004 && progress < 0.996;
  const streamEnd = Math.max(apexY + 2, 220);

  /* flip the glass end-over-end whenever the session changes */
  const [flip, setFlip] = useState(0);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setFlip((f) => f + 1);
  }, [mode, totalMs]);

  const secondsKey = Math.ceil(remainingMs / 1000);

  const glassPath = useMemo(
    () =>
      "M 66 44 C 66 132 124 148 124 206 L 124 214 C 124 272 66 288 66 376 " +
      "L 194 376 C 194 288 136 272 136 214 L 136 206 C 136 148 194 132 194 44 Z",
    []
  );

  return (
    <div className="relative mx-auto w-full max-w-[360px] select-none">
      {/* soft ambient pool behind the glass */}
      <div
        aria-hidden
        className="absolute inset-x-[-12%] inset-y-[4%] rounded-full opacity-60 transition-colors duration-700"
        style={{ background: "radial-gradient(ellipse at center, var(--mode-soft) 0%, transparent 65%)" }}
      />

      {/* mode label */}
      <div className="relative z-10 mb-1 flex items-center justify-center gap-2">
        {running && (
          <span
            className="pulse-dot inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--mode)" }}
          />
        )}
        <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-mist-500">
          {MODE_META[mode].label}
        </span>
      </div>

      {/* the glass — full end-over-end flip per session, always landing upright.
          Clicking the glass starts / pauses the timer. */}
      <div
        className="hg-press relative z-10 cursor-pointer"
        onClick={onToggle}
        title={running ? "Pause (Space)" : "Start (Space)"}
        aria-hidden
      >
        <div className="hg-spin" style={{ transform: `rotate(${flip * 360}deg)` }}>
          <svg
            viewBox="0 0 260 420"
            className="mx-auto w-[240px] sm:w-[264px]"
            role="img"
            aria-label={`${MODE_META[mode].label} hourglass, ${formatClock(remainingMs)} remaining`}
          >
            <defs>
              <clipPath id="hg-glass-clip">
                <path d={glassPath} />
              </clipPath>
              <linearGradient id="hg-sand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2ac67" />
                <stop offset="100%" stopColor="#c8873f" />
              </linearGradient>
            </defs>

            {/* frame: rails + caps */}
            <rect x="57" y="34" width="3" height="352" rx="1.5" fill="rgba(238,243,236,0.14)" />
            <rect x="200" y="34" width="3" height="352" rx="1.5" fill="rgba(238,243,236,0.14)" />
            <rect x="44" y="22" width="172" height="13" rx="6.5" fill="rgba(238,243,236,0.16)" />
            <rect x="44" y="385" width="172" height="13" rx="6.5" fill="rgba(238,243,236,0.16)" />
            <circle cx="58.5" cy="28.5" r="2.2" fill="rgba(238,243,236,0.28)" />
            <circle cx="201.5" cy="28.5" r="2.2" fill="rgba(238,243,236,0.28)" />
            <circle cx="58.5" cy="391.5" r="2.2" fill="rgba(238,243,236,0.28)" />
            <circle cx="201.5" cy="391.5" r="2.2" fill="rgba(238,243,236,0.28)" />

            {/* sand, clipped inside the glass */}
            <g clipPath="url(#hg-glass-clip)">
              <path d={mound} fill="url(#hg-sand)" />
              {flowing &&
                SAND_PIXELS.map((g, i) => (
                  <rect
                    key={i}
                    className="grain"
                    x={g.x}
                    y={215}
                    width={g.size}
                    height={g.size}
                    fill={g.color}
                    shapeRendering="crispEdges"
                    style={
                      {
                        "--fall": `${streamEnd - 215}px`,
                        "--drift": `${g.drift}px`,
                        "--dur": `${g.dur}s`,
                        "--delay": `${g.delay}s`,
                        opacity: g.opacity,
                      } as CSSProperties
                    }
                  />
                ))}
              {/* top sand drawn last so the stream appears to leave it */}
              <path d={topSand} fill="url(#hg-sand)" />
              {/* surface highlight */}
              <path
                d={`M 70 ${surfaceY + 1.5} Q 130 ${surfaceY + dip + 1.5} 190 ${surfaceY + 1.5}`}
                fill="none"
                stroke="rgba(255,235,200,0.35)"
                strokeWidth="1.4"
              />
            </g>

            {/* glass outline + sheen */}
            <path
              d={glassPath}
              fill="rgba(238,243,236,0.028)"
              stroke="rgba(238,243,236,0.3)"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path
              d="M 78 62 C 78 120 112 140 120 178"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 80 356 C 82 322 100 306 112 292"
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* time readout — ticks in step with the falling sand */}
      <div className="relative z-10 -mt-2 text-center">
        <div
          className="font-mono font-medium leading-none tracking-tight text-cream tabular-nums"
          style={{ fontSize: "clamp(52px, 8.5vw, 78px)" }}
          aria-live="off"
        >
          <span key={secondsKey} className="tick-in inline-block">
            {formatClock(remainingMs)}
          </span>
        </div>
        <div className="mt-2.5 text-[13px] font-medium text-mist-500">
          {mode === "focus" ? (
            <>
              Round{" "}
              <span className="font-mono text-mist-300 tabular-nums">
                {round}
                <span className="text-mist-600"> / {cycleLen}</span>
              </span>
            </>
          ) : (
            statusLine
          )}
        </div>
      </div>
    </div>
  );
}

export const Hourglass = memo(HourglassInner);
