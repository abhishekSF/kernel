/* Pure URL-matching helpers for Kernel Witness.
 *
 * No chrome.* access lives here so the whitelist logic stays unit-testable
 * and is shared verbatim by the service worker. */

/** Normalize a URL to { host, path } for prefix matching, or null if it is
 *  not an http(s) URL. Drops a leading "www." and any trailing slashes. */
export function normalize(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return {
      host: u.hostname.replace(/^www\./, "").toLowerCase(),
      path: u.pathname.replace(/\/+$/, ""),
    };
  } catch {
    return null;
  }
}

/** Returns the enrolled project id for a tab URL, or null. Host must match and
 *  the tab path must equal the enrolled path or sit under it on a segment
 *  boundary, so "/c/abc" enrolls "/c/abc/edit" but not the sibling "/c/abcdef". */
export function matchProject(whitelist, tabUrl) {
  const n = normalize(tabUrl);
  if (!n) return null;
  for (const w of whitelist) {
    const wn = normalize(w.url);
    if (!wn || wn.host !== n.host) continue;
    if (!wn.path || n.path === wn.path || n.path.startsWith(wn.path + "/")) {
      return w.id;
    }
  }
  return null;
}
