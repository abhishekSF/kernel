/* Kernel Witness content script.
 *
 * Activates only on pages that carry the data-kernel-app marker (the Kernel
 * web app). On every other page it exits immediately. Its only job is to
 * relay postMessage traffic between the page and the background service
 * worker so the web app can talk to the extension without chrome.* APIs.
 */

if (!document.documentElement.hasAttribute("data-kernel-app")) {
  // not a Kernel page — do nothing
} else {
  const PAGE_KEY = "kernel-page";
  const EXT_KEY = "kernel-ext";
  const ORIGIN = window.location.origin;

  const relayToPage = (msg) => {
    if (msg) window.postMessage({ k: EXT_KEY, msg }, ORIGIN);
  };

  // Page -> background. The background answers through sendResponse, which
  // resolves this promise; forward that reply back to the page. Without this
  // the pong and split replies are dropped and the app never links.
  const relayToBackground = (msg) =>
    chrome.runtime.sendMessage(msg).then(relayToPage).catch(() => {});

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== ORIGIN) return;
    const d = e.data;
    if (!d || d.k !== PAGE_KEY || !d.msg) return;
    relayToBackground(d.msg);
  });

  // announce presence; the pong reply links the page immediately
  relayToBackground({ type: "hello" });
}
