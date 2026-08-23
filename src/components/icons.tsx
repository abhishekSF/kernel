interface IconProps {
  className?: string;
  strokeWidth?: number;
}

const base = (className?: string) => className ?? "w-5 h-5";

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(className)} aria-hidden>
      <path d="M8.5 5.6a1 1 0 0 1 1.53-.85l10 6.4a1 1 0 0 1 0 1.7l-10 6.4A1 1 0 0 1 8.5 18.4V5.6z" />
    </svg>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={base(className)} aria-hidden>
      <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" />
    </svg>
  );
}

export function ResetIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

export function SkipIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M6 5.5v13l9-6.5-9-6.5z" fill="currentColor" stroke="none" />
      <path d="M18 5v14" />
    </svg>
  );
}

export function GearIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.2 12a7.2 7.2 0 0 0-.14-1.4l2-1.55-2-3.46-2.36.95a7.3 7.3 0 0 0-2.42-1.4L13.9 2.6h-3.8l-.38 2.54a7.3 7.3 0 0 0-2.42 1.4l-2.36-.95-2 3.46 2 1.55a7.2 7.2 0 0 0 0 2.8l-2 1.55 2 3.46 2.36-.95a7.3 7.3 0 0 0 2.42 1.4l.38 2.54h3.8l.38-2.54a7.3 7.3 0 0 0 2.42-1.4l2.36.95 2-3.46-2-1.55c.1-.45.14-.92.14-1.4z" />
    </svg>
  );
}

export function SoundOnIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M11 5.5 6.5 9H3.5v6h3L11 18.5v-13z" fill="currentColor" stroke="none" />
      <path d="M15 9a4.2 4.2 0 0 1 0 6" />
      <path d="M17.6 6.6a8 8 0 0 1 0 10.8" />
    </svg>
  );
}

export function SoundOffIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M11 5.5 6.5 9H3.5v6h3L11 18.5v-13z" fill="currentColor" stroke="none" />
      <path d="M15 9.5 20 14.5M20 9.5 15 14.5" />
    </svg>
  );
}

export function CloseIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={base(className)} aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function TargetIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={base(className)} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CoffeeIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M5 9h11v6.5a3.5 3.5 0 0 1-3.5 3.5H8.5A3.5 3.5 0 0 1 5 15.5V9z" />
      <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M7 4.5c.8 1 1.2 2 1.2 3M10.5 4c.6.9 1 1.9 1 3M14 4.5c.5.8.8 1.7.8 2.8" />
    </svg>
  );
}

export function MoonIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z" />
    </svg>
  );
}

export function CheckIcon({ className, strokeWidth = 2.2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ClockIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={base(className)} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function FlameIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M12 21c3.9 0 6.5-2.5 6.5-6.2 0-2.6-1.4-4.6-2.9-6.3-.7 1-1.3 1.5-2.1 1.9.3-2.5-.8-5.2-3-6.4.2 2.3-.7 3.7-2 5.2-1.4 1.7-3 3.5-3 5.6C5.5 18.5 8.1 21 12 21z" />
    </svg>
  );
}

export function PlusIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" className={base(className)} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function LinkIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M10 14a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7.1-7.1L11 5.9" />
      <path d="M14 10a5 5 0 0 0-7.1 0l-2.4 2.4a5 5 0 0 0 7.1 7.1L13 18.1" />
    </svg>
  );
}

export function TrashIcon({ className, strokeWidth = 1.8 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={base(className)} aria-hidden>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function TomatoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={base(className)} aria-hidden>
      <circle cx="16" cy="18.5" r="11.5" fill="var(--mode, #ff6b52)" />
      <ellipse cx="12" cy="15.5" rx="3.4" ry="2.2" fill="white" opacity="0.18" transform="rotate(-18 12 15.5)" />
      <path
        d="M16 4.5c-2.2 2.3-5.6 2.9-8 2.2 1.1 2.9 3.6 4.6 8 4.6s6.9-1.7 8-4.6c-2.4.7-5.8.1-8-2.2z"
        fill="#45d0a0"
      />
      <path d="M16 4.5v3.2" stroke="#2b8a67" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
