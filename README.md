# Kernel

A local-first focus timer shaped like an hourglass. Sand drains as each round runs. It has three modes (Focus, Short break, Long break), custom durations, automatic cycle progression, daily statistics, and an optional side-project tracker backed by a small browser extension.

Everything runs in the browser. Stats live in `localStorage`, and the companion extension keeps its counts in `chrome.storage.local`. Nothing is sent anywhere.

## Features

- **Hourglass timer.** A custom SVG with draining sand, mode-colored themes, and a flip animation between sessions.
- **Pomodoro rhythm.** Focus, short break, repeat, then a long break, with configurable lengths and a "long break every N" setting.
- **Drift-free engine.** The timer stores an absolute end timestamp, so it stays accurate across tab freezes and laptop sleep.
- **Resume across reloads.** Close the tab mid-round and Kernel restores the exact remaining time, or credits the session if it finished while you were away.
- **Side-project tracking.** Tag each focus round with a project. The optional Witness extension can also split the round by which enrolled tabs were in the foreground.
- **Daily and weekly stats.** Focus sessions, deep-work minutes, daily goal progress, a 7-day chart, and a session log.
- **Keyboard-first.** Space, R, S, and 1/2/3 for start and pause, reset, skip, and mode switching.
- **Zero backend.** No accounts, no analytics, no network calls from the app itself.
- **Optional Witness extension.** Manifest V3, whitelist-only, no network code. Uninstalling it deletes its data.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build to dist/
npm test             # unit tests (Vitest)
npm run typecheck    # TypeScript check
npm run test:watch   # watch mode
```

You can also open `dist/index.html` directly, or serve the `dist/` folder with any static host (`npx serve dist`, GitHub Pages, Netlify, Cloudflare Pages).

## Keyboard shortcuts

| Key     | Action                |
|---------|-----------------------|
| `Space` | Start / Pause         |
| `R`     | Reset current round   |
| `S`     | Skip to next mode     |
| `1`     | Switch to Focus       |
| `2`     | Switch to Short break |
| `3`     | Switch to Long break  |

Shortcuts are ignored while you type in an input or when a drawer or modal is open.

## Project structure

```
index.html                 App shell (fonts, theme, data-kernel-app marker)
src/
  main.tsx                 React entry
  App.tsx                  Layout, session lifecycle, Witness bridge wiring
  index.css                Design tokens, mode themes, animations
  lib/
    pomo.ts                Domain model: settings, stats, storage, chime
    pomo.test.ts           Pure helper + storage tests
    bridge.ts              postMessage bridge to the Witness extension
  hooks/
    usePomodoro.ts         Drift-free timer engine with resume-on-reload
    usePomodoro.test.ts    Start / pause / complete / skip tests
  components/
    Hourglass.tsx          Animated sandglass
    StatsPanel.tsx         Today / week / session log
    ProjectsPanel.tsx      Side projects: picker, overview, add dialog
    SettingsDrawer.tsx     Durations, rhythm, behaviour
    icons.tsx              Hand-drawn SVG icon set
extension/                 Kernel Witness (optional)
  manifest.json            Manifest V3, tabs + storage + alarms only
  background.js            Whitelist matching + second accounting
  content.js               Relay that activates only on Kernel pages
  popup.html / popup.js    Local dashboard: view, export, wipe
  README.md                Trust-boundary documentation
```

## How the timer works

The engine (`usePomodoro`) does not rely on `setInterval` drift.

1. On Start it records an absolute `endAt = Date.now() + remainingMs`.
2. A 200 ms poll updates React state only when the displayed second changes, so it renders about once per second.
3. On Pause it freezes the remaining time and clears `endAt`.
4. Snapshots are written to `localStorage` continuously. If the tab is closed and reopened:
   - still running, the remaining time is recalculated from the original `endAt`
   - already finished while closed, the session is credited on mount
5. Session end, whether complete or skip, is handed to a callback, so the parent decides the next mode and whether to auto-start.

## Kernel Witness (optional extension)

Turns the manual "Focusing on" chips into automatic per-project measurement.

### Trust boundary

| It can see                                 | It can never see                                  |
|--------------------------------------------|---------------------------------------------------|
| Active tab URL only while a focus round runs | Page contents, titles, keystrokes, forms, history |
| URLs you explicitly enrolled               | Any tab while you are on a break or idle           |

- No network code exists in the extension. There is no `fetch`, XHR, or WebSocket.
- Only whitelist-matched URLs are keyed by project id. Everything else increments one anonymous "elsewhere" counter, and non-matching URLs are never stored.
- All state lives in `chrome.storage.local`. The popup has Export (JSON) and Wipe. Uninstalling the extension deletes the data.
- The content script is a short relay that activates only on pages carrying the `<html data-kernel-app>` marker.

### Install (about a minute)

1. Open `chrome://extensions` and enable Developer mode.
2. Load unpacked, then select the `extension/` folder.
3. If you open Kernel from disk, also enable Allow access to file URLs on the extension card.
4. Reload Kernel. The header indicator turns mint, which means Witness linked.
5. Add a project with a URL in Kernel, start a focus round, and the split appears on completion.

Full details live in [`extension/README.md`](extension/README.md).

## Development notes

- Stack: React 18, TypeScript, Vite 6, Tailwind CSS v4.
- State: localStorage for settings, stats, timer snapshot, and projects.
- No routing, no backend, no external APIs.
- Design tokens live in `src/index.css` (`--pine-*`, `--ember`, `--mint`, `--honey`, and per-mode CSS variables).
- Reduced-motion preferences are respected.

### Running tests

```bash
npm test             # single run
npm run test:watch   # watch mode
```

Tests cover:

- Pure helpers (`clamp`, `formatClock`, `formatMinutes`, day-rollover logic, timer-snapshot expiry).
- Timer engine behaviour (start and pause, completion transition, skip, reset, mode switch, and settings updates while idle or mid-session).

## Deploying

Kernel is a static site. Any of these work:

```bash
npm run build
# then serve the dist/ folder
```

- On GitHub Pages, push `dist/` to a `gh-pages` branch or use a GitHub Actions static-site workflow.
- On Netlify, Cloudflare Pages, or Vercel, set the build command to `npm run build` and the publish directory to `dist`.
- Locally, run `npx serve dist` or any nginx or Caddy static file server.

There is no server-side code. The only requirement is HTTPS if you want the extension to talk to a remote origin. Localhost and `file://` work with the appropriate extension permission.

## Privacy model

| Component   | Data stored                          | Leaves the machine? |
|-------------|--------------------------------------|---------------------|
| Web app     | Settings, stats, projects, timer     | Never               |
| Witness     | Whitelist + per-project second counts| Never               |

There are no analytics, no accounts, and no third-party scripts or external font requests. The UI uses system font stacks only.

## License

MIT, see [LICENSE](LICENSE).

## Contributing and next ideas

Kernel is intentionally small. If you want to extend it:

- Split the large `App.tsx` into smaller hooks or contexts.
- Add an optional light theme.
- Export and import the full stats JSON from the web app itself.
- Add more visual polish or accessibility improvements.

A GitHub Actions CI workflow (typecheck, test, build) is included under `.github/workflows/ci.yml`.

PRs that keep the local-first and privacy guarantees intact are welcome.
