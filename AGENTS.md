# Kernel

Kernel is a local-first Pomodoro focus timer (React 18 + TypeScript + Vite 6, Tailwind v4). It is a single-page web app with no backend, database, or network calls — state lives in browser `localStorage`. An optional Chrome MV3 extension (`extension/`) tracks per-project tab-time but is not required for the core app.

## Cursor Cloud specific instructions

- Standard scripts live in `package.json`: `npm run dev` (Vite dev server), `npm run build`, `npm test` (`vitest run`), `npm run typecheck` (`tsc --noEmit`). There is no lint script/config in this repo.
- The dev server binds `0.0.0.0:3000` with `strictPort: true` (see `vite.config.js`). If port 3000 is already taken, Vite will exit rather than pick another port — free the port instead of expecting a fallback.
- The core product is fully client-side; no services, env vars, or databases are needed to run or test it. Just `npm run dev` and open `http://localhost:3000`.
- The optional `extension/` (Kernel Witness) is plain vanilla JS with no build step; load it unpacked in Chrome to test the tab-time bridge. This integration cannot be exercised in a headless shell.
