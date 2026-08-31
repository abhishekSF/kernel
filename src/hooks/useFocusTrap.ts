import { RefObject, useEffect } from "react";

const SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * While `active`, keeps Tab focus inside `containerRef`, moves focus in on
 * activation (to `initialFocusRef` if given, else the first focusable), and
 * restores focus to the previously focused element on deactivation.
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) => el.getClientRects().length > 0
      );

    (initialFocusRef?.current ?? focusable()[0] ?? container).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const el = document.activeElement;
      if (!e.shiftKey && (el === last || !container.contains(el))) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (el === first || !container.contains(el))) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      restoreTo?.focus?.();
    };
  }, [active, containerRef, initialFocusRef]);
}
