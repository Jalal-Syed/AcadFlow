# AcadFlow — Fixes To Be Made

> Living tracker. Add items here BEFORE starting work on a fix. Update status immediately after completing each file change.
> Format: `- [ ] pending` / `- [x] done` / `- [~] in progress`

---

## Active / In Progress

_(none currently)_

---

## Completed

### FIX-004 — Blank screen in Electron production build
> **Reported:** 2026-04-04 | **Fixed:** 2026-04-04

**Problem:** Installed Electron app showed a blank screen on launch.

**Root cause:** Vite's default `base` is `'/'`. The built `dist/index.html` referenced all assets with absolute paths like `<script src="/assets/index-Abc123.js">`. When Electron loads the file via `file://`, the path `/assets/...` resolves to `file:///assets/...` — the filesystem root — which doesn't exist. React never mounted. Complete blank screen.

**Fix:**
- Added `const isElectronBuild = process.env.ELECTRON === 'true'` and `base: isElectronBuild ? './' : '/'` to `vite.config.ts`. Electron builds now use relative asset paths (`./assets/...`) that resolve correctly from any `file://` location. Web/PWA builds remain unaffected (`base: '/'`).
- Updated all `electron:build*` scripts in `package.json` to prepend `cross-env ELECTRON=true pnpm build &&` so the Vite build always runs with the correct base before `electron-builder` packages the output.
- Added `cross-env ^7.0.3` to `devDependencies` (required for cross-platform env var injection on Windows).

**Files changed:**
- `vite.config.ts` — `base` conditional on `ELECTRON` env var
- `package.json` — electron build scripts + `cross-env` devDep

**To rebuild:**
```bash
pnpm install          # picks up cross-env
pnpm electron:build:win
```

### FIX-001 — ThemeToggle overlapping FAB
> **Reported:** 2026-04-04 | **Fixed:** 2026-04-04

**Problem:** `ThemeToggle` was `fixed bottom-20 right-4 z-50`. Every page FAB is also `fixed bottom-20 right-5`. They stacked directly on top of each other.

**Fix:** Removed standalone `ThemeToggle` from `App.tsx`. Integrated sun/moon icon button into:
- `BottomNav.tsx` — trailing edge of nav bar, separated by `border-l` divider
- `Sidebar.tsx` — footer strip alongside the collapse toggle

**Files changed:**
- `src/App.tsx` — removed ThemeToggle import + render
- `src/components/ui/BottomNav.tsx` — added theme toggle button
- `src/components/ui/Sidebar.tsx` — added theme toggle button

---

### FIX-002 — HeatmapCalendar dates invisible in light mode
> **Reported:** 2026-04-04 | **Fixed:** 2026-04-04

**Problem (two bugs):**
1. `color: 'var(--color-text)'` in React inline style. The CSS var stores raw space-separated RGB (`17 17 17`) — must be consumed as `rgb(var(--color-text))`, not a bare `var()`. Produced invalid CSS output.
2. Future date text hardcoded to `rgba(128,128,128,0.4)` — invisible on light (`#F8F9FA`) background.

**Fix:** All inline text colours replaced with `rgb(var(--color-text) / opacity)` pattern. Refactored `getDayColor()` → `getDayCellKind()` typed enum to separate bg and text logic.

**Files changed:**
- `src/components/attendance/HeatmapCalendar.tsx`

---

### FIX-003 — Content stretches full width on large screens
> **Reported:** 2026-04-04 | **Fixed:** 2026-04-04

**Problem:** All pages expanded to fill the full viewport width (or full `<main>` area after sidebar) regardless of screen size. On 1440px+ monitors, cards and text stretched to uncomfortable widths.

**Fix:** Added a single centering wrapper in `App.tsx` inside `<main>`. All pages render inside `max-w-3xl` (768px) centered with `mx-auto`. This covers all 16 pages with one change — no individual page files touched.

- Mobile (< 640px): max-w-3xl never activates, full device width as before.
- Tablet/desktop: content column is max 768px, centered. Background (`bg-bg`) still fills the full viewport on both sides.
- Onboarding: separate route path uses `max-w-lg` (512px) — appropriate for form-style flows.
- Fixed-position elements (BottomNav, FAB, Modals): unaffected — they're positioned relative to the viewport, not the content wrapper.

**Files changed:**
- `src/App.tsx`

---

## Backlog / Planned

### SCRAPER-001 — Universal Portal Scraper (Phase 1: Infrastructure)
> **Added:** 2026-04-04 | **Status:** [ ] pending

**Decisions locked:**
- Adapter pattern: each portal = one file implementing `PortalAdapter` interface
- Platform: Electron (Node IPC, no CORS) + Android (Capacitor HTTP, no CORS). Web browser shows "use desktop or Android app".
- Conflict resolution: portal data always wins (overwrites local)
- Sync: scheduled every morning on app open + manual trigger button
- Credentials: encrypted local storage (Electron `safeStorage` + Capacitor `@capacitor/preferences`). User can opt out and enter every time.
- First adapter: `tkrec.in` (dev credentials in `portal_dev_credentials_for_tkrec.in.md`)

**Tasks — mark each `[x]` when the file is saved:**

#### Core scraper layer
- [ ] `src/lib/scraper/types.ts` — `PortalAdapter` interface, `SessionData`, `ScrapedAttendance`, `ScrapedMarks`, `ScrapedSubject`, `SyncResult` types
- [ ] `src/lib/scraper/http.ts` — platform-aware HTTP: Electron → IPC to main, Android → `@capacitor/http`, web → throws `ScraperNotSupportedError`
- [ ] `src/lib/scraper/crypto.ts` — credential encrypt/decrypt using Electron `safeStorage` (desktop) and AES-GCM via WebCrypto (Android)
- [ ] `src/lib/scraper/index.ts` — orchestrator: `login()`, `syncAll()`, `scheduleDaily()`, `cancelSchedule()`
- [ ] `src/lib/scraper/adapters/index.ts` — adapter registry `Record<string, PortalAdapter>`, `getAdapter(universityId)` helper
- [ ] `src/lib/scraper/adapters/tkrec.ts` — TKREC (`tkrec.in`) adapter: login form POST, session cookie extraction, attendance page scrape, marks page scrape, subject list extraction

#### Electron bridge
- [ ] `electron/scraper-bridge.js` — IPC handler `'scraper:fetch'`: receives `{url, method, headers, body}` from renderer, executes with Node `fetch` (no CORS), returns `{status, headers, text}`
- [ ] `electron/main.js` — register `scraper-bridge` IPC handlers on app ready
- [ ] `electron/preload.js` — expose `window.scraperBridge.fetch()` to renderer via `contextBridge`

#### Zustand store
- [ ] `src/stores/usePortalStore.ts` — `portalConfig` (adapterId, encryptedCredentials, lastSyncAt, syncStatus), `connect()`, `disconnect()`, `syncNow()`, `getStatus()`

#### UI
- [ ] `src/pages/Import/index.tsx` — full portal sync page: adapter picker, credential input form, connection status, last sync timestamp, manual sync button, per-data-type toggle (attendance / marks / subjects), sync log
- [ ] `src/pages/Settings/index.tsx` — add "Portal Sync" row in the Data section linking to `/import`
- [ ] `src/App.tsx` — add `/import` route + import `ImportPage`
- [ ] `src/components/ui/Sidebar.tsx` — add Import nav item (desktop)
- [ ] `src/components/ui/BottomNav.tsx` — accessible from Settings/More tab (no new tab needed)

#### Scheduling
- [ ] `src/lib/scraper/scheduler.ts` — `scheduleDailySync()`: on Electron uses `node-cron` (or checks elapsed time on focus), on Android checks last sync on `appStateChange` to active; fires `syncNow()` if last sync > 20h ago
- [ ] `electron/main.js` — wire scheduler on window focus event
- [ ] `src/main.tsx` — wire Capacitor `App.addListener('appStateChange')` for Android scheduling

#### Docs
- [ ] `AcadFlow_Product_Spec.md` — update §14.1 with finalised architecture decisions
- [ ] `DEV_DOCS.md` — add §14 Scraper Architecture with adapter authoring guide
- [ ] `README.md` — move Portal Scraper from "Planned" to "In Progress" in upcoming features table
- [ ] `fixes-to-be-made.md` — mark SCRAPER-001 tasks done as each file is completed

