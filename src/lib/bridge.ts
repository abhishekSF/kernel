/* Bridge between Kernel (web app) and the Kernel Witness browser extension.
   Protocol: window.postMessage, tagged messages, relayed by the extension's
   content script to its background service worker. Everything stays local. */

import { useSyncExternalStore } from "react";

const PAGE_KEY = "kernel-page";
const EXT_KEY = "kernel-ext";

export interface BridgeMsg {
  type: string;
  payload?: unknown;
}

export interface WhitelistEntry {
  id: string;
  name: string;
  url: string;
}

export interface SplitPayload {
  sessionId: string;
  tracked: boolean;
  split: Record<string, number>; // projectId -> seconds
  otherSeconds: number; // seconds on non-enrolled tabs (no URLs stored)
}

type Listener = () => void;
type SplitHandler = (p: SplitPayload) => void;

const listeners = new Set<Listener>();
const splitHandlers = new Set<SplitHandler>();

let linked = false;
let lastPong = 0;

function setLinked(v: boolean) {
  if (v !== linked) {
    linked = v;
    listeners.forEach((l) => l());
  }
}

window.addEventListener("message", (e) => {
  const d = e.data as { k?: string; msg?: BridgeMsg } | null;
  if (!d || d.k !== EXT_KEY || !d.msg) return;
  const msg = d.msg;
  if (msg.type === "pong" || msg.type === "hello") {
    lastPong = Date.now();
    setLinked(true);
  } else if (msg.type === "split") {
    splitHandlers.forEach((h) => h(msg.payload as SplitPayload));
  }
});

/** Send a message toward the extension (relayed by the content script). */
export function bridgeSend(msg: BridgeMsg) {
  window.postMessage({ k: PAGE_KEY, msg }, "*");
}

export function isLinked(): boolean {
  return linked;
}

export function onSplit(h: SplitHandler): () => void {
  splitHandlers.add(h);
  return () => {
    splitHandlers.delete(h);
  };
}

/** React hook — true while the Witness extension is answering pings. */
export function useBridgeLinked(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => linked
  );
}

/* heartbeat: ping every 3s, drop the link if no pong for 9s */
window.setInterval(() => {
  bridgeSend({ type: "ping" });
  if (linked && Date.now() - lastPong > 9000) setLinked(false);
}, 3000);
bridgeSend({ type: "ping" });
