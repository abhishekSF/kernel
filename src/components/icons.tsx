import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

export function TargetIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...p}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function CoffeeIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...p}>
      <path
        d="M5 9h11v6.5a3.5 3.5 0 0 1-3.5 3.5H8.5A3.5 3.5 0 0 1 5 15.5V9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M7 4.5c.8 1 1.2 2 1.2 3M10.5 4c.6.9 1 1.9 1 3M14 4.5c.5.8.8 1.7.8 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function MoonIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...p}>
      <path
        d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...p}>
      <path d="M8 5.5v13l11-6.5L8 5.5z" />
    </svg>
  );
}

export function PauseIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...p}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function ResetIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...p}>
      <path
        d="M4 12a8 8 0 0 1 13.5-5.8M20 12a8 8 0 0 1-13.5 5.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M17 3v4h4M7 21v-4H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SkipIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...p}>
      <path d="M5 5.5v13l8.5-6.5L5 5.5z" />
      <rect x="16" y="5" width="3" height="14" rx="0.8" />
    </svg>
  );
}

export function GearIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...p}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SoundOnIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...p}>
      <path d="M4 10v4h3l5 4V6L7 10H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 9.5a3 3 0 0 1 0 5M18.5 7.5a6 6 0 0 1 0 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SoundOffIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...p}>
      <path d="M4 10v4h3l5 4V6L7 10H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 10l4 4M20 10l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function TomatoIcon({ className, ...p }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...p}>
      <path
        d="M12 4c-1.2 0-2.2.6-2.8 1.5C8.5 4.6 7.2 4 5.8 4.5 4 5.2 3.2 7.2 4 9c.5 1.1 1.4 1.9 2.5 2.2-.2.6-.3 1.3-.3 2 0 4 2.7 7.3 6 7.3s6-3.3 6-7.3c0-.7-.1-1.4-.3-2 1.1-.3 2-1.1 2.5-2.2.8-1.8 0-3.8-1.8-4.5-1.4-.5-2.7.1-3.4 1C14.2 4.6 13.2 4 12 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 4v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
