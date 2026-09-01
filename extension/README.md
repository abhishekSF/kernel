# Kernel Witness

A local-only companion extension for the Kernel pomodoro app. It measures which of your enrolled projects had the foreground tab while a focus round runs, and nothing else.

## The trust boundary

| It can see                                  | It can never see                                  |
| ------------------------------------------- | ------------------------------------------------- |
| The active tab's URL, only during focus rounds | Page contents, titles, keystrokes, forms, history |
| Your enrolled project URLs (you wrote them) | Any tab while you are on a break or idle           |

- No network code exists in this extension. There is no `fetch`, no `XMLHttpRequest`, and no WebSocket. Grep for them if you like.
- Only whitelist-matched URLs are recorded, keyed by project id. Everything else increments one anonymous counter ("elsewhere"), and non-matching URLs are not stored anywhere.
- All state lives in `chrome.storage.local` on your machine. The popup has Export (JSON backup) and Wipe (delete everything). Uninstalling the extension deletes the storage with it.
- The content script is a short relay that activates only on pages carrying the `<html data-kernel-app>` marker. On every other page it exits immediately.

## Permissions

| Permission   | Why                                                        |
| ------------ | ---------------------------------------------------------- |
| `tabs`       | Read the active tab's URL to match your whitelist.          |
| `alarms`     | A 1-minute heartbeat so totals survive worker restarts.     |
| `storage`    | Keep the totals and your whitelist on this machine only.     |
| `<all_urls>` | Content-script match pattern for wherever you host Kernel (file://, localhost, a static host). It grants injection, not data access, and the script no-ops without the marker. |

## Install (about a minute)

1. Copy this `extension/` folder somewhere stable on your machine.
2. Open `chrome://extensions` and toggle Developer mode (top right).
3. Click Load unpacked, then select the `extension/` folder.
4. Open Kernel (for example, double-click `dist/index.html` or serve the folder). The header dot turns mint, which means Witness linked.

> Note on file:// pages. If you open Kernel straight from disk, also enable Allow access to file URLs on the extension card in `chrome://extensions`. Serving the folder (`npx serve dist`) skips this.

## How it works

1. Kernel loads, and its `data-kernel-app` marker activates the relay.
2. Kernel sends a `sync` message with your project whitelist (name and URL prefix, for example `chatgpt.com/c/0d9f...`).
3. You press Start on a focus round, which sends `session-start`. The worker begins counting. `chrome.tabs.onActivated`, `onUpdated`, and `windows.onFocusChanged` flip the current bucket (a project id, `other`, or `away` when the browser loses OS focus).
4. Sand runs out, which sends `session-end`. The worker replies with the split in seconds, like `{ "trip-planner": 837, "side-repo": 402 }` plus `elsewhere: 261`.
5. Kernel banks the split into today's stats and toasts the breakdown. Pauses are not counted, since session start and end bracket each running span.

## Manual fallback

Without the extension, or with it paused, Kernel keeps working the same way. The "Focusing on" chip banks the whole round to one project.

## Uninstalling

Remove it from `chrome://extensions`. All recorded data is deleted with it.
