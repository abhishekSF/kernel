import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, Settings, clamp } from "../lib/pomo";
import { CloseIcon } from "./icons";

interface FieldProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (n: number) => void;
}

function Stepper({ label, hint, value, min, max, unit, onChange }: FieldProps) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const n = clamp(parseInt(draft, 10), min, max);
    onChange(n);
    setDraft(String(n));
  };

  const bump = (d: number) => {
    const n = clamp(value + d, min, max);
    onChange(n);
    setDraft(String(n));
  };

  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <div className="text-sm font-bold text-cream">{label}</div>
        <div className="mt-0.5 text-[12px] text-mist-500">{hint}</div>
      </div>
      <div className="flex items-center gap-1.5 rounded-xl border border-cream/10 bg-pine-950/60 p-1">
        <button
          type="button"
          onClick={() => bump(-1)}
          className="grid h-8 w-8 place-items-center rounded-lg text-mist-400 transition-all hover:bg-cream/8 hover:text-cream active:scale-90"
          aria-label={`Decrease ${label}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <div className="flex w-[74px] items-baseline justify-center gap-1">
          <input
            type="number"
            value={draft}
            min={min}
            max={max}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="w-10 bg-transparent text-center font-mono text-lg font-semibold text-cream outline-none tabular-nums focus:text-[var(--mode-bright)]"
            aria-label={label}
          />
          <span className="text-[11px] font-bold uppercase text-mist-600">{unit}</span>
        </div>
        <button
          type="button"
          onClick={() => bump(1)}
          className="grid h-8 w-8 place-items-center rounded-lg text-mist-400 transition-all hover:bg-cream/8 hover:text-cream active:scale-90"
          aria-label={`Increase ${label}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
    >
      <div>
        <div className="text-sm font-bold text-cream">{label}</div>
        <div className="mt-0.5 text-[12px] text-mist-500">{hint}</div>
      </div>
      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300"
        style={{ backgroundColor: value ? "var(--mode)" : "rgba(238,243,236,0.12)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow transition-all duration-300"
          style={{ left: value ? "22px" : "2px" }}
        />
      </span>
    </button>
  );
}

interface SettingsDrawerProps {
  open: boolean;
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

export function SettingsDrawer({ open, settings, onSave, onClose }: SettingsDrawerProps) {
  const [draft, setDraft] = useState<Settings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-pine-950/70 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-cream/10 bg-pine-900 shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-cream/8 px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-cream">Tune the timer</h2>
            <p className="mt-0.5 text-[12px] text-mist-500">Changes apply to the next session of each mode.</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-cream/10 text-mist-400 transition-all hover:border-cream/25 hover:text-cream active:scale-90"
            aria-label="Close settings"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-mist-600">Durations</div>
          <div className="mt-1 divide-y divide-cream/6">
            <Stepper label="Focus" hint="One deep-work round" value={draft.focusMin} min={1} max={120} unit="min" onChange={(n) => set("focusMin", n)} />
            <Stepper label="Short break" hint="The breather between rounds" value={draft.shortMin} min={1} max={60} unit="min" onChange={(n) => set("shortMin", n)} />
            <Stepper label="Long break" hint="The reward after a full cycle" value={draft.longMin} min={1} max={90} unit="min" onChange={(n) => set("longMin", n)} />
          </div>

          <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-mist-600">Rhythm</div>
          <div className="mt-1 divide-y divide-cream/6">
            <Stepper label="Long break every" hint="Focus rounds per cycle" value={draft.longEvery} min={2} max={8} unit="rnd" onChange={(n) => set("longEvery", n)} />
            <Stepper label="Daily goal" hint="Focus sessions you aim for" value={draft.dailyGoal} min={1} max={24} unit="ses" onChange={(n) => set("dailyGoal", n)} />
          </div>

          <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.22em] text-mist-600">Behaviour</div>
          <div className="mt-1 divide-y divide-cream/6">
            <Toggle label="Auto-start next session" hint="Roll straight into the next round" value={draft.autoStart} onChange={(b) => set("autoStart", b)} />
            <Toggle label="Completion chime" hint="A soft tone when a session ends" value={draft.sound} onChange={(b) => set("sound", b)} />
          </div>
        </div>

        <div className="border-t border-cream/8 px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onSave(draft);
                onClose();
              }}
              className="flex-1 rounded-full py-3 text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--mode-ink)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "var(--mode)", boxShadow: "0 6px 24px -6px var(--mode-glow)" }}
            >
              Save settings
            </button>
            <button
              onClick={() => setDraft(DEFAULT_SETTINGS)}
              className="rounded-full border border-cream/12 px-4 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-mist-400 transition-all hover:border-cream/25 hover:text-cream active:scale-[0.97]"
            >
              Defaults
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
