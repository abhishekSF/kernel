/* Desktop notifications through the browser's Notification API. They are
   drawn by the operating system; no push service or server is involved. */

export type NotifyPermission = NotificationPermission | "unsupported";

export function notifyPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** Must be called from a user gesture (a click), or browsers ignore it. */
export async function requestNotifyPermission(): Promise<NotifyPermission> {
  const current = notifyPermission();
  if (current !== "default") return current;
  try {
    return await Notification.requestPermission();
  } catch {
    return notifyPermission();
  }
}

/** Shows a notification only when Kernel isn't the tab you're looking at.
    `silent` suppresses the OS sound when Kernel's own chime already plays. */
export function notifySessionEnd(title: string, body: string, silent: boolean) {
  if (notifyPermission() !== "granted") return;
  if (!document.hidden && document.hasFocus()) return;
  try {
    const n = new Notification(title, {
      body,
      tag: "kernel-session",
      icon: `${import.meta.env.BASE_URL}icon.svg`,
      silent,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}
