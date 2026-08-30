import { memo, useEffect, useMemo, useRef, useState } from "react";
import { DayStats, Project, formatMinutes, projectColor } from "../lib/pomo";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { CloseIcon, LinkIcon, PlusIcon, TrashIcon } from "./icons";

/* ---------------- picker chip (above Start button) ---------------- */

interface PickerProps {
  projects: Project[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
}

function ProjectPickerInner({ projects, activeId, onSelect, onNew }: PickerProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.24em] text-mist-600">
        Focusing on
      </span>
      {projects.map((p, i) => {
        const active = p.id === activeId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(active ? null : p.id)}
            aria-pressed={active}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 active:scale-95"
            style={
              active
                ? {
                    borderColor: projectColor(i),
                    backgroundColor: `${projectColor(i)}1f`,
                    color: "#eef3ec",
                  }
                : {
                    borderColor: "rgba(238,243,236,0.12)",
                    color: "#8ba093",
                  }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: projectColor(i) }}
            />
            <span className="max-w-[120px] truncate">{p.name}</span>
          </button>
        );
      })}
      <button
        onClick={onNew}
        className="flex items-center gap-1 rounded-full border border-dashed border-cream/16 px-3 py-1.5 text-[12px] font-semibold text-mist-500 transition-all duration-200 hover:border-cream/35 hover:text-cream active:scale-95"
      >
        <PlusIcon className="h-3 w-3" />
        New project
      </button>
    </div>
  );
}

export const ProjectPicker = memo(ProjectPickerInner);

/* ---------------- overview panel ---------------- */

interface PanelProps {
  projects: Project[];
  day: DayStats;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

function ProjectsPanelInner({ projects, day, onAdd, onRemove }: PanelProps) {
  const rows = useMemo(() => {
    const total = Object.values(day.projects).reduce((a, b) => a + b.seconds, 0);
    return projects
      .map((p, i) => ({ p, i, s: day.projects[p.id] ?? { seconds: 0, sessions: 0 } }))
      .filter((r) => r.s.seconds > 0)
      .sort((a, b) => b.s.seconds - a.s.seconds)
      .map((r) => ({ ...r, pct: total > 0 ? Math.round((r.s.seconds / total) * 100) : 0 }));
  }, [projects, day.projects]);

  return (
    <section
      className="fade-up rounded-[26px] border border-cream/8 bg-gradient-to-b from-pine-850 to-pine-900 p-6 sm:p-7"
      style={{ animationDelay: "170ms" }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-cream">Side projects</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-mist-500 transition-colors hover:text-cream"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          add
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-cream/12 px-4 py-6 text-center">
          <p className="text-sm text-mist-400">
            Keep tabs on the side projects you're juggling — a chat thread, a repo, a draft.
          </p>
          <button
            onClick={onAdd}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cream/16 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-mist-300 transition-all hover:border-cream/35 hover:text-cream active:scale-95"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add your first project
          </button>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3.5">
          {projects.map((p, i) => {
            const s = day.projects[p.id] ?? { seconds: 0, sessions: 0 };
            const row = rows.find((r) => r.p.id === p.id);
            return (
              <li key={p.id} className="group">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: projectColor(i) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cream">
                    {p.name}
                  </span>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      title={`Open ${p.name}`}
                      className="text-mist-500 transition-colors hover:text-cream"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => onRemove(p.id)}
                    title={`Remove ${p.name}`}
                    aria-label={`Remove ${p.name}`}
                    className="text-mist-600 opacity-0 transition-all hover:text-ember group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-3 pl-[22px]">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream/7">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${row?.pct ?? 0}%`,
                        backgroundColor: projectColor(i),
                        minWidth: s.seconds > 0 ? "6px" : 0,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-mist-500 tabular-nums">
                    {formatMinutes(s.seconds)}
                    <span className="text-mist-600"> · {s.sessions}s</span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {projects.length > 0 && rows.length === 0 && (
        <p className="mt-4 text-[12px] text-mist-600">
          No focus time logged on these yet today.
        </p>
      )}
    </section>
  );
}

export const ProjectsPanel = memo(ProjectsPanelInner);

/* ---------------- add-project modal ---------------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, url: string) => void;
}

export function ProjectModal({ open, onClose, onCreate }: ModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(open, dialogRef, nameRef);

  useEffect(() => {
    if (open) {
      setName("");
      setUrl("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = () => {
    const n = name.trim();
    if (!n) {
      setError("Give the project a name first.");
      nameRef.current?.focus();
      return;
    }
    let u = url.trim();
    if (u && !/^https?:\/\//i.test(u)) u = `https://${u}`;
    onCreate(n, u);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-pine-950/75 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add a side project"
        className="toast-in relative w-full max-w-sm rounded-[24px] border border-cream/10 bg-pine-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold text-cream">New side project</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-mist-500">
              Tag your focus rounds so you can see where the hours go. Paste the
              ChatGPT / Gemini / repo link to jump back in one click.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-cream/10 text-mist-400 transition-all hover:border-cream/25 hover:text-cream active:scale-90"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-mist-600">
            Project name
          </span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Trip planner bot"
            maxLength={40}
            className="mt-1.5 w-full rounded-xl border border-cream/12 bg-pine-950/70 px-3.5 py-2.5 text-sm font-medium text-cream outline-none transition-colors placeholder:text-mist-600 focus:border-[var(--mode)]"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-mist-600">
            Link (optional)
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="chatgpt.com/c/…"
            className="mt-1.5 w-full rounded-xl border border-cream/12 bg-pine-950/70 px-3.5 py-2.5 font-mono text-[12.5px] text-cream outline-none transition-colors placeholder:text-mist-600 focus:border-[var(--mode)]"
          />
        </label>

        {error && <p className="mt-3 text-[12px] font-semibold text-ember">{error}</p>}

        <div className="mt-6 flex gap-2.5">
          <button
            onClick={submit}
            className="flex-1 rounded-full py-2.5 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[var(--mode-ink)] transition-all hover:brightness-110 active:scale-[0.97]"
            style={{ backgroundColor: "var(--mode)" }}
          >
            Create project
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-cream/12 px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-mist-400 transition-all hover:border-cream/25 hover:text-cream active:scale-[0.97]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
