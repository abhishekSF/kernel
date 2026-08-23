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

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.k !== PAGE_KEY || !d.msg) return;
    chrome.runtime.sendMessage(d.msg).catch(() => {});
  });

  chrome.runtime.onMessage.addListener((msg) => {
    window.postMessage({ k: EXT_KEY, msg }, "*");
  });

  // announce presence
  chrome.runtime.sendMessage({ type: "hello" }).catch(() => {});
}
