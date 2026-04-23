# AcadFlow — Fixes To Be Made

> Living tracker. Add items here BEFORE starting work on a fix. Update status immediately after completing each file change.
> Format: `- [ ] pending` / `- [x] done` / `- [~] in progress`

---

## Completed

### SCRAPER-001 — Universal Portal Scraper (Phase 1: Infrastructure)
> **Added:** 2026-04-04 | **Completed:** 2026-04-05 | **Status:** [x] done

**Decisions locked:**
- Adapter pattern: each portal = one file implementing `PortalAdapter` interface
- Platform: Electron (Node IPC, no CORS) + Android (Capacitor HTTP, no CORS). Web browser shows "use desktop or Android app".
- Conflict resolution: portal data always wins (overwrites local)
- Sync: scheduled every morning on app open + manual trigger button
- Credentials: encrypted local storage (Electron `safeStorage` + Capacitor `@capacitor/preferences`). User can opt out and enter every time.
- First adapter: `tkrec.in` (dev credentials in `portal_dev_credentials_for_tkrec.in.md`)

**Tasks:**

#### Core scraper layer
- [x] `src/lib/scraper/types.ts` — `PortalAdapter` interface, `SessionData`, `ScrapedAttendance`, `ScrapedMarks`, `ScrapedSubject`, `SyncResult` types
- [x] `src/lib/scraper/http.ts` — platform-aware HTTP: Electron → IPC to main, Android → `@capacitor/http`, web → throws `ScraperNotSupportedError`
- [x] `src/lib/scraper/crypto.ts` — credential encrypt/decrypt using Electron `safeStorage` (desktop) and AES-GCM via WebCrypto (Android)
- [x] `src/lib/scraper/index.ts` — orchestrator: `login()`, `syncAll()`, `scheduleDaily()`, `cancelSchedule()`
- [x] `src/lib/scraper/adapters/index.ts` — adapter registry `Record<string, PortalAdapter>`, `getAdapter(universityId)` helper
- [x] `src/lib/scraper/adapters/tkrec.ts` — TKREC (`tkrec.in`) adapter: login form POST, session cookie extraction, attendance page scrape, marks page scrape, subject list extraction. **Fixed 2026-04-05:** removed entire duplicate definition that was appended after the first; caused `Duplicate identifier` TypeScript build errors on `BASE`, `URLS`, `TKRECAdapter`, and all helper functions.

#### Electron bridge
- [x] `electron/scraper-bridge.js` — IPC handler `'scraper:fetch'`: receives `{url, method, headers, body}` from renderer, executes with Node `fetch` (no CORS), returns `{status, headers, text}`
- [x] `electron/main.js` — register `scraper-bridge` IPC handlers on app ready + wire `scheduler:check-sync` focus event
- [x] `electron/preload.js` — expose full `window.scraperBridge` API to renderer via `contextBridge` (fetch, encrypt, decrypt, storeCredential, loadCredential, clearCredential, onCheckSync)

#### Zustand store
- [x] `src/stores/usePortalStore.ts` — `adapterId`, `isConnected`, `lastSyncAt`, `syncLog`, `syncStatus`, `lastError`. Actions: `connect()`, `disconnect()`, `setSyncStatus()`, `recordSync()`, `syncNow()`, `clearLog()`

#### UI
- [x] `src/pages/Import/index.tsx` — full portal sync page: adapter picker, credential input form, connection status, last sync timestamp, manual sync button, sync log with per-entry stats
- [x] `src/pages/Settings/index.tsx` — added "Portal Sync" row in Data section + Portal Sync in QUICK_LINKS grid
- [x] `src/App.tsx` — added `/import` route + imported `ImportPage`
- [x] `src/components/ui/Sidebar.tsx` — added Import/Portal Sync nav item with live status dot (green/amber/red)
- [x] `src/components/ui/BottomNav.tsx` — accessible via Settings → Portal Sync (in QUICK_LINKS quick-tap grid)

#### Scheduling
- [x] `src/lib/scraper/scheduler.ts` — `maybeSyncNow()` with 20h interval guard, `initElectronScheduler()`, `onAppResume()`
- [x] `electron/main.js` — wires `scheduler:check-sync` IPC event on window focus via `wireScheduler(win)`
- [x] `src/main.tsx` — wires Capacitor `App.addListener('appStateChange')` for Android + Electron `scraperBridge.onCheckSync` listener

#### Docs
- [x] `AcadFlow_Product_Spec.md` — updated §13 (Roadmap) with finalised architecture decisions + implementation status table
- [x] `DEV_DOCS.md` — added §14 Scraper Architecture with adapter authoring guide
- [x] `README.md` — moved Portal Scraper from "Planned" to "In Progress" in upcoming features table

---

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

### SCRAPER-002 — WebView Capture Mode (Manual Import)
> **Added:** 2026-04-05 | **Status:** [ ] pending

**Context:**
Companion to SCRAPER-001 (the auto-login adapter). The auto-adapter works well for TKREC but will break when portals change their HTML, add CAPTCHAs, or use session tokens that can't be replayed. This mode is the fallback: the user opens the portal in a Capacitor InAppBrowser WebView, logs in manually, navigates to the page they want, and taps a "Capture" button. The app grabs the page's HTML via `executeScript`, parses it locally with `DOMParser` (no API, no AI), and writes the results straight into Dexie. No credentials are ever stored by this flow.

**Decisions locked:**
- No AI, no external API — all parsing is local `DOMParser` + DOM selectors
- Platform: Android only via `@capacitor/inappbrowser` (or community fork — verify `executeScript` support). Electron uses a different path: `win.webContents.executeJavaScript()` via a new IPC channel.
- Web/PWA: shows "not supported" — same as SCRAPER-001.
- Capture type (attendance vs marks) is selected by the user via a toggle **before** tapping Capture — not inferred.
- Conflict rule: same as SCRAPER-001 — portal data wins, existing records for same `subjectId + semesterId` replaced.
- Parser lives in `src/lib/scraper/webview-parser.ts` — separate from adapter parsers, but reuses `ScrapedAttendance`, `ScrapedMarks`, `ScrapedSubject` types from `types.ts`.
- The injected capture button re-injects on every page load (`loadstop` listener) so it survives navigation within the portal.
- Iframe handling: capture script checks for a same-origin iframe and grabs its `contentDocument` if present — TKREC portal uses frames.

---

#### Step 1 — Verify & install InAppBrowser
- [ ] Check `@capacitor/inappbrowser` changelog for `executeScript` support on your Capacitor v6 version. If unavailable, switch to community plugin `capacitor-inappbrowser`.
- [ ] `package.json` — add the correct package
- [ ] `android/app/src/main/AndroidManifest.xml` — confirm `INTERNET` permission (already present from SCRAPER-001, just verify)

---

#### Step 2 — New types in `src/lib/scraper/types.ts`
- [ ] Add `WebViewCaptureType = 'attendance' | 'marks'` union
- [ ] Add `WebViewCaptureResult` — wraps `ScrapedAttendance[] | ScrapedMarks[]` with a `captureType` discriminant
- [ ] Everything else (`ScrapedAttendance`, `ScrapedMarks`, `ScrapedSubject`) already exists — reuse as-is

---

#### Step 3 — New file: `src/lib/scraper/webview-parser.ts`
All DOM parsing logic lives here. Pure functions — takes an HTML string, returns typed scraped data.

- [ ] `cleanHtml(raw: string): string` — runs `DOMParser`, removes `<script>`, `<style>`, `<noscript>`, `<svg>`, `<img>` tags, returns `body.innerHTML`. Reduces size before parsing.
- [ ] `parseAttendance(html: string): ScrapedAttendance[]` — finds the attendance table, walks rows, extracts subject name / code / held / attended. Returns empty array (not throw) if table not found.
- [ ] `parseMarks(html: string): ScrapedMarks[]` — finds the marks/internal assessment table, extracts subject / CIE components / SEE. Returns empty array if not found.
- [ ] `parseSubjects(html: string): ScrapedSubject[]` — optional, extracts subject list if a subject registration page is captured.
- [ ] Each parser should be written defensively: `querySelector` with null checks throughout, skip malformed rows silently.
- [ ] **Note:** Initial parsers target TKREC portal HTML structure. When adding support for other portals, extend these functions with portal-ID-gated branches, or add a portal-specific parser file and dispatch from here.

---

#### Step 4 — New file: `src/lib/scraper/webview-capture.ts`
Orchestrator for the capture flow. Called from the Zustand store action.

- [ ] `openPortalWebView(portalUrl: string): Promise<void>` — opens InAppBrowser, registers `loadstop` listener that re-injects the floating capture button on every page load.
- [ ] Inject script: creates a fixed-position `button#acadflow-capture-btn` (`bottom: 20px, right: 20px, z-index: 999999`, styled with brand indigo). If button already exists, skip (guard with `getElementById` check).
- [ ] `captureCurrentPage(captureType: WebViewCaptureType): Promise<WebViewCaptureResult>` — calls `executeScript` to grab HTML:
  ```js
  (function() {
    const iframe = document.querySelector('iframe');
    const doc = iframe?.contentDocument ?? document;
    return doc.documentElement.outerHTML;
  })()
  ```
  Then calls the appropriate parser from `webview-parser.ts`. Returns result.
- [ ] `closeWebView(): void` — calls `browser.close()`.
- [ ] Electron path: instead of InAppBrowser, send `'webview:open'` IPC to main process. Main opens a `new BrowserWindow`, on `'webview:capture'` IPC calls `win.webContents.executeJavaScript(captureScript)` and sends back the HTML. Add this IPC handler to `electron/main.js` and expose `window.scraperBridge.openWebView` / `captureWebView` / `closeWebView` in `electron/preload.js`.

---

#### Step 5 — Extend `src/stores/usePortalStore.ts`
- [ ] Add `webViewOpen: boolean` state
- [ ] Add `captureType: WebViewCaptureType | null` state — set by the user before opening the WebView
- [ ] Add `openWebView(adapterId: string, captureType: WebViewCaptureType): Promise<void>` action — calls `openPortalWebView()` from `webview-capture.ts`, sets `webViewOpen: true`
- [ ] Add `capture(): Promise<void>` action — calls `captureCurrentPage(captureType)`, maps result to Dexie writes (see Step 6), calls `closeWebView()`, sets `webViewOpen: false`, logs to `syncLog`
- [ ] Keep existing SCRAPER-001 state and actions untouched — this is purely additive

---

#### Step 6 — Dexie writes (inside `capture()` action)
Map `WebViewCaptureResult` to existing schema. Same conflict rule as SCRAPER-001 (portal wins).

- [ ] **Attendance:** For each `ScrapedAttendance` entry, find matching subject in `useSemesterStore` by code/name, then call `useAttendanceStore.bulkImport()` (already exists from SCRAPER-001) — or write directly via `db.attendanceRecords.bulkPut()` if bulk import isn't exposed.
- [ ] **Marks:** `db.theoryMarks.put({ subjectId, semesterId, ...mappedFields })` — upsert, same pattern as the existing marks pages.
- [ ] After writes: call `useAttendanceStore.loadRecords(activeSemesterId)` or `useTaskStore.loadTasks()` as needed to refresh in-memory state.

---

#### Step 7 — UI in `src/pages/Import/index.tsx`
- [ ] Add a second mode tab to the existing Import page: **"Auto Sync"** (existing SCRAPER-001 flow) and **"Manual Capture"** (new WebView flow)
- [ ] Manual Capture tab contents:
  - Portal/adapter selector (reuse existing adapter picker — same `ADAPTERS` registry, same portal URLs)
  - Capture type toggle: `Attendance` / `Marks` (required before opening)
  - "Open Portal" button — calls `openWebView(adapterId, captureType)` from store
  - Instructional text: *"Log in, navigate to the [Attendance / Marks] page, then tap the purple Capture button that appears on screen."*
  - Status strip: shows `webViewOpen` state, last capture result summary, any parse errors
- [ ] The floating button injected into the WebView is the primary capture trigger on Android. On Electron, a "Capture Now" button in the native UI is the trigger (calls `capture()` from the store while the external window is open).

---

#### Step 8 — Docs
- [ ] `AcadFlow_Product_Spec.md` §13 — update SCRAPER-001 entry to note WebView capture as Phase 2; add implementation status table row
- [ ] `DEV_DOCS.md` §14 — add WebView Capture subsection explaining the flow, the parser file, and how to add portal-specific parser branches

---

**Files summary:**

| Action | Path |
|--------|------|
| Verify/add | `package.json` — InAppBrowser package |
| Edit | `src/lib/scraper/types.ts` — add `WebViewCaptureType`, `WebViewCaptureResult` |
| New | `src/lib/scraper/webview-parser.ts` — DOM parsers |
| New | `src/lib/scraper/webview-capture.ts` — WebView open/inject/capture/close |
| Edit | `src/stores/usePortalStore.ts` — add webview state + actions |
| Edit | `src/pages/Import/index.tsx` — add Manual Capture tab |
| Edit | `electron/main.js` — add `webview:open` / `webview:capture` IPC handlers |
| Edit | `electron/preload.js` — expose `openWebView`, `captureWebView`, `closeWebView` on `scraperBridge` |
| Edit | `AcadFlow_Product_Spec.md` — update §13 |
| Edit | `DEV_DOCS.md` — update §14 |

**Open questions before implementing:**
1. Does `@capacitor/inappbrowser` on Capacitor v6 support `executeScript` + `loadstop` event? Confirm in changelog before writing Step 4.
2. TKREC portal — does it use iframes? Test in a browser dev console with `document.querySelectorAll('iframe')` on the attendance page.
3. `bulkImport()` on `useAttendanceStore` — does it exist from SCRAPER-001 or does Step 6 need to write via `db.attendanceRecords.bulkPut()` directly? Check `src/stores/useAttendanceStore.ts`.

---

## SCRAPER-BUG — Portal Scraper Bug Audit & Fix Tasks
> **Added:** 2026-04-16 | **Status:** [ ] pending
>
> Full audit of the WebView + AI extraction portal scraper.
> The scraper was migrated from an adapter-based auto-login approach (SCRAPER-001) to a WebView + Gemini AI approach, but many references to the old architecture remain, and the new code has several bugs.

---

### Category 1 — Broken Store Destructuring (build/runtime errors)

#### BUG-001 · `Settings/index.tsx` destructures non-existent `isConnected` and `adapterId` from `usePortalStore`
> **Severity:** 🔴 High — will be `undefined` at runtime, displays broken UI text
>
> **File:** `src/pages/Settings/index.tsx` line 95
> **Code:** `const { isConnected: portalConnected, adapterId: portalAdapterId } = usePortalStore()`
>
> **Root cause:** These properties (`isConnected`, `adapterId`) belonged to the old SCRAPER-001 adapter-based store. The new store has `syncStatus`, `lastPortalUrl`, `apiKeySet`, etc. Both values will always be `undefined`.
>
> **Impact:** The Portal Sync row in Settings shows `"Auto-import attendance & marks"` always (since `portalConnected` is falsy). The `adapterId` text never renders. No crash, but misleading UI.

**Fix tasks:**
- [ ] Replace destructured props with current store shape: e.g. `const { syncStatus, apiKeySet, lastPortalUrl } = usePortalStore()`
- [ ] Update the Portal Sync `<SettingRow>` value text to reflect the new state, e.g. `apiKeySet ? 'AI key saved · Ready' : 'Tap to set up'`

---

#### BUG-002 · `Sidebar.tsx` destructures non-existent `isConnected` from `usePortalStore`
> **Severity:** 🔴 High — status dot never renders, misleading stale props
>
> **File:** `src/components/ui/Sidebar.tsx` line 33
> **Code:** `const { isConnected: portalConnected, syncStatus } = usePortalStore()`
>
> **Root cause:** Same as BUG-001. `isConnected` does not exist on the current store. `portalConnected` is always `undefined`, so the status dot on the Portal Sync nav item (line 87) never shows.

**Fix tasks:**
- [ ] Replace `isConnected: portalConnected` with a derived check, e.g. `const portalReady = apiKeySet` or use `syncStatus` directly
- [ ] Update the conditional on line 87 to use the new property

---

### Category 2 — Stale SyncStatus Values (dead UI branches)

#### BUG-003 · `Sidebar.tsx` checks for `syncStatus` values that don't exist in the type union
> **Severity:** 🟡 Medium — status dot color logic is broken
>
> **File:** `src/components/ui/Sidebar.tsx` lines 91–93
> **Code:** `syncStatus === 'syncing' || syncStatus === 'connecting'`
>
> **Root cause:** The `SyncStatus` type in `types.ts` defines: `'idle' | 'opening' | 'waiting' | 'extracting' | 'saving' | 'success' | 'error'`. The values `'syncing'` and `'connecting'` are from the old adapter-based design and no longer exist. The amber/pulse dot never activates; the green dot only shows if `portalConnected` is true (which it never is — see BUG-002).

**Fix tasks:**
- [ ] Replace `'syncing' || 'connecting'` with the current busy states: `'opening' || 'waiting' || 'extracting' || 'saving'`
- [ ] Replace `'error'` comparison to match the actual store value (this one is fine — `'error'` exists in the union)
- [ ] Consider falling through to green dot when `syncStatus === 'success'` or `apiKeySet === true`

---

### Category 3 — Missing Dependencies & Broken Platform Paths

#### BUG-004 · `@capacitor-community/inappbrowser` is NOT in `package.json`
> **Severity:** 🔴 High — Android capture always fails
>
> **File:** `src/lib/scraper/webview.ts` line 164
> **Code:** `import(/* @vite-ignore */ '@capacitor-community/inappbrowser')`
>
> **Root cause:** The `androidCapture()` function dynamically imports `@capacitor-community/inappbrowser`, but this package is not listed in `dependencies` or `devDependencies` in `package.json`. The import will always throw, and the catch block on line 167 will fire, making Android capture permanently broken with `"InAppBrowser plugin not found"`.

**Fix tasks:**
- [ ] Add `@capacitor-community/inappbrowser` to `package.json` dependencies
- [ ] Run `pnpm install` and (for Android) `npx cap sync android`
- [ ] Verify `executeScript` and `addListener('messageReceived', ...)` are supported in the installed version
- [ ] If the community plugin doesn't support `executeScript`, evaluate alternatives (e.g. `@nickkelly1/capacitor-inappbrowser` or the official `@capacitor/browser` with limitations)

---

#### BUG-005 · Import page has unused `Capacitor` import
> **Severity:** 🟢 Low — lint warning, unnecessary bundle weight
>
> **File:** `src/pages/Import/index.tsx` line 28
> **Code:** `import { Capacitor } from '@capacitor/core'`
>
> **Root cause:** Leftover import from a previous iteration. `Capacitor` is never referenced anywhere in the file.

**Fix tasks:**
- [ ] Remove the unused import line

---

### Category 4 — Dead Code & Stale References

#### BUG-006 · `main.tsx` imports and calls no-op scheduler functions
> **Severity:** 🟡 Medium — dead code, confusing for maintainers
>
> **File:** `src/main.tsx` line 19, lines 31–48
>
> **Root cause:** `scheduler.ts` was gutted to stubs (`maybeSyncNow`, `initElectronScheduler`, `onAppResume` are all no-ops). But `main.tsx` still imports them, calls `initElectronScheduler()` on startup, calls `onAppResume()` on Capacitor `appStateChange`, and wires `scraperBridge.onCheckSync`. All of these are dead code paths that do nothing.

**Fix tasks:**
- [ ] Remove the import of `initElectronScheduler`, `onAppResume`, `maybeSyncNow` from `main.tsx`
- [ ] Remove the `initElectronScheduler()` call (line 40)
- [ ] Remove the `scraperBridge.onCheckSync` wiring (lines 41–48)
- [ ] Remove the Capacitor `onAppResume()` call in `appStateChange` listener (line 31)
- [ ] Optionally delete `scheduler.ts` entirely (or keep the stub if there are other stale imports elsewhere)

---

#### BUG-007 · `main.tsx` references `scraperBridge.onCheckSync` which is not exposed in `preload.js`
> **Severity:** 🟢 Low — guarded by `typeof === 'function'` so doesn't crash, but dead code
>
> **File:** `src/main.tsx` lines 41–48
> **File:** `electron/preload.js` — `scraperBridge` API (lines 17–35)
>
> **Root cause:** `preload.js` exposes `scraperBridge` with 6 methods (`fetch`, `encrypt`, `decrypt`, `storeCredential`, `loadCredential`, `clearCredential`). There is no `onCheckSync` method. The `typeof` guard prevents a crash, but the entire block is dead.

**Fix tasks:**
- [ ] Covered by BUG-006 — remove the stale code block in `main.tsx`

---

#### BUG-008 · Dead stub files: `adapters/tkrec.ts`, `adapters/index.ts`, `http.ts`, `scheduler.ts`
> **Severity:** 🟢 Low — no runtime impact, but clutters the codebase
>
> **Files:**
> - `src/lib/scraper/adapters/tkrec.ts` — `export {}`
> - `src/lib/scraper/adapters/index.ts` — re-exports from `portals.ts` for compatibility
> - `src/lib/scraper/http.ts` — `export {}`
> - `src/lib/scraper/scheduler.ts` — all no-ops
>
> **Root cause:** Old adapter-based architecture files were stubbed out during migration to WebView + AI, but never deleted. The `adapters/` directory is entirely vestigial.

**Fix tasks:**
- [ ] Verify no other files import from these stubs (grep for `from.*scraper/http`, `from.*scraper/scheduler`, `from.*adapters/tkrec`, `from.*adapters/index`)
- [ ] Delete `src/lib/scraper/adapters/` directory entirely
- [ ] Delete `src/lib/scraper/http.ts`
- [ ] Delete `src/lib/scraper/scheduler.ts` (after BUG-006 is fixed)

---

### Category 5 — WebView Capture Flow Bugs

#### BUG-009 · `runCapture` never sets `syncStatus` to `'waiting'`
> **Severity:** 🟡 Medium — the "Waiting for capture" UI hint never appears
>
> **File:** `src/stores/usePortalStore.ts` lines 84–131
>
> **Root cause:** `runCapture()` sets `'opening'` before calling `capturePortalPage()`, then jumps to `'extracting'` after it resolves. The `'waiting'` status (defined in `SyncStatus` type and rendered in the Import page UI at line 445–453) is never set. Users see "Opening portal browser…" until the capture resolves, missing the instructional prompt to navigate and tap Capture.

**Fix tasks:**
- [ ] Either set `setSyncStatus('waiting')` after `capturePortalPage` opens (requires a callback/event from `webview.ts` when the WebView is loaded)
- [ ] Or restructure `capturePortalPage` to emit a "ready" signal so the store can transition `opening → waiting → extracting`

---

#### BUG-010 · `electronCapture` doesn't handle `null` payload (window closed without capture)
> **Severity:** 🟡 Medium — silent bad data instead of clean error
>
> **File:** `src/lib/scraper/webview.ts` lines 148–156
> **File:** `electron/preload.js` lines 65–69
>
> **Root cause:** When the portal window is closed without the user tapping Capture, `preload.js` calls `callback(null)`. In `electronCapture`, `JSON.parse(null)` returns `null`, which is then coerced into a `CapturedPage` with all fields `undefined`. The flow continues with `page.tables` being `undefined`, which `undefined.trim()` will throw on.

**Fix tasks:**
- [ ] In `electronCapture`, check `if (!payload)` before parsing and reject with a user-friendly message like `"Portal window closed without capturing. Try again."`
- [ ] Alternatively, in the preload `closedHandler`, don't call `callback(null)` — instead, the Promise in `webview.ts` should listen for a rejection/cancellation signal

---

#### BUG-011 · Injected capture script joins tables with literal `\n` text instead of a newline character
> **Severity:** 🟡 Medium — tables in the captured payload are separated by the literal two-character string `\n` instead of an actual newline
>
> **Files:**
> - `src/lib/scraper/webview.ts` line 93: `.join('\\\\n')`
> - `electron/main.js` line 86: `.join('\\\\n')`
>
> **Root cause:** The capture button script is defined as a template literal in TypeScript/JS. `'\\\\n'` in the source becomes `'\\n'` in the string value, which when evaluated as JS produces the two-character string `\n` (backslash + n), not a newline character. Table HTML blocks are concatenated with this literal text between them.
>
> **Impact:** When `extractTablesFromHtml()` later parses the payload, the literal `\n` text sits between `</table>` and `<table>` tags. `DOMParser` will render it as text nodes, which is mostly harmless but could confuse the AI or DOMParser in edge cases.

**Fix tasks:**
- [ ] Change `.join('\\\\n')` to `.join('\\n')` in `INJECT_CAPTURE_BUTTON` (webview.ts line 93)
- [ ] Change `.join('\\\\n')` to `.join('\\n')` in `INJECT_BUTTON_SCRIPT` (main.js line 86)

---

#### BUG-012 · Duplicate capture button injection scripts (DRY violation)
> **Severity:** 🟢 Low — maintenance risk, not a runtime bug
>
> **Files:**
> - `src/lib/scraper/webview.ts` lines 52–120 (`INJECT_CAPTURE_BUTTON`)
> - `electron/main.js` lines 73–95 (`INJECT_BUTTON_SCRIPT`)
>
> **Root cause:** The capture button injection script is defined separately in both files. They are similar but may drift over time. If a bug is fixed in one, the other remains broken.

**Fix tasks:**
- [ ] Move the canonical injection script to a single shared location (e.g. a `.js` file in `electron/` that's also importable by the renderer build, or inline it in `webview.ts` and have `main.js` import from the built output)
- [ ] Alternatively, if shared import is too complex, add a clear comment in both places referencing the other copy

---

#### BUG-013 · `extractTablesFromHtml` is called redundantly on already-extracted table HTML
> **Severity:** 🟢 Low — wasted work, no data corruption
>
> **File:** `src/stores/usePortalStore.ts` line 114
> **Code:** `const tableHtml = extractTablesFromHtml(page.tables)`
>
> **Root cause:** `page.tables` already contains only `<table>` HTML (extracted by the injected capture script). Running `extractTablesFromHtml()` on it again re-parses with DOMParser, strips nav/footer/header (none present), and re-extracts `<table>` tags — producing the same output. The extra `DOMParser` instantiation and DOM walk is wasted.

**Fix tasks:**
- [ ] Either pass `page.tables` directly to `extractWithAI()` (skip `extractTablesFromHtml`)
- [ ] Or rename/refactor `extractTablesFromHtml` to clarify it's only needed for full-page HTML, and use a lighter "add page context" wrapper for pre-extracted tables

---

#### BUG-014 · Android `androidCapture` event listeners leak on repeated captures
> **Severity:** 🟡 Medium — stacking listeners cause duplicate processing
>
> **File:** `src/lib/scraper/webview.ts` lines 175–199
>
> **Root cause:** `InAppBrowser.addListener('pageLoaded', ...)` and `InAppBrowser.addListener('messageReceived', ...)` are registered but never removed. If the user opens the capture flow multiple times (e.g. first attempt timeout → retry), listeners from previous invocations stack up. The `messageReceived` handler would fire on stale listeners.

**Fix tasks:**
- [ ] Store listener handles returned by `addListener()` and call `.remove()` on resolve, reject, and timeout
- [ ] Use `InAppBrowser.removeAllListeners()` if the plugin API supports it

---

### Category 6 — Data Integrity & Typo Bugs

#### BUG-015 · Typo in marks component matcher: `'vivavorce'` should be `'vivavoce'`
> **Severity:** 🟡 Medium — lab SEE viva voce marks may fail to match
>
> **File:** `src/lib/scraper/index.ts` line 275
> **Code:** `seeVivaVoce: getComp('vivavorce', 'seeviva', 'voce')`
>
> **Root cause:** `'vivavorce'` is a typo — should be `'vivavoce'`. If the AI returns a component labeled `"Viva Voce"`, the normalised form `"vivavoce"` won't match `"vivavorce"`. It might still match the fallback `'voce'`, but the primary matcher is broken.

**Fix tasks:**
- [ ] Change `'vivavorce'` → `'vivavoce'` on line 275

---

#### BUG-016 · `syncSubjects` updates Zustand store (in-memory only) without persisting new subjects to Dexie
> **Severity:** 🟡 Medium — scraped subjects may be lost on app restart if the Zustand persistence layer doesn't cover them
>
> **File:** `src/lib/scraper/index.ts` lines 60–99
>
> **Root cause:** `syncSubjects()` calls `store.addSubject()` and `store.updateSubject()` which update Zustand state (persisted to localStorage via `zustand/persist`). But the `subjects` table in Dexie (`db.subjects`) is never written to. If any other part of the app loads subjects from Dexie (not Zustand), scraped subjects would be missing.
>
> **Note:** This may not be a bug if the app exclusively uses Zustand for subjects and never reads from `db.subjects` directly. Verify by checking if any code reads `db.subjects`.

**Fix tasks:**
- [ ] Verify whether subjects are loaded from Zustand persist or Dexie on app start
- [ ] If Dexie is the source of truth, add `db.subjects.put(newSubject)` alongside `store.addSubject()`
- [ ] If Zustand persist is the sole source, this is fine — add a code comment clarifying that

---

### Category 7 — Security & Platform Hardening

#### BUG-017 · Portal BrowserWindow has `contextIsolation: false` and `sandbox: false`
> **Severity:** 🟡 Medium — security concern for Electron
>
> **File:** `electron/main.js` lines 115–120
>
> **Root cause:** The portal popup window disables both `contextIsolation` and `sandbox` to allow `executeJavaScript()` to work. This means the portal's own JavaScript has access to Node.js internals (if `nodeIntegration` were enabled — it's `false`, so the actual risk is reduced). However, `contextIsolation: false` still means the portal JS and the Electron preload script share the same JavaScript context, which is a known Electron security anti-pattern.
>
> **Impact:** If a college portal has an XSS vulnerability, malicious scripts could interact with Electron internal APIs.

**Fix tasks:**
- [ ] Investigate whether `executeJavaScript()` works with `contextIsolation: true` (it should — the main process's `webContents.executeJavaScript` runs in the page's context regardless of isolation)
- [ ] If it works, set `contextIsolation: true` on the portal window
- [ ] Keep `sandbox: false` only if `executeJavaScript` requires it (test)

---

#### BUG-018 · `apiKeySet` flag in persisted store can desync from actual stored key
> **Severity:** 🟢 Low — edge case, gracefully handled at runtime
>
> **File:** `src/stores/usePortalStore.ts`
>
> **Root cause:** `apiKeySet` is a boolean flag persisted in Zustand. If the user clears browser storage / app data externally, the Zustand persist entry may survive while the actual encrypted key in `sessionStorage` / `Preferences` / `safeStorage` is gone. The UI shows "API key saved" even though `loadApiKey()` would return `null`.
>
> **Impact:** Low — `runCapture` calls `loadApiKey()` and checks for null (line 109), so it would surface an error. But the Settings page "API key saved" indicator would be misleading.

**Fix tasks:**
- [ ] On Import page mount, verify the key actually loads: `loadApiKey().then(k => { if (!k) setApiKeySet(false) })`
- [ ] Or treat `apiKeySet` as a cached hint and always verify before showing "saved" UI

---

### Category 8 — Platform Detection Inconsistency

#### BUG-019 · `isElectron()` check is inconsistent between `crypto.ts` and `webview.ts`
> **Severity:** 🟢 Low — works today because both bridges are always exposed, but fragile
>
> **Files:**
> - `src/lib/scraper/crypto.ts` line 20: checks `window.scraperBridge`
> - `src/lib/scraper/webview.ts` line 22: checks `window.webviewBridge`
>
> **Root cause:** Both modules have their own `isElectron()` function checking for different bridge objects. If `preload.js` ever fails to expose one bridge (e.g. due to a syntax error in one `exposeInMainWorld` call), the two modules would disagree on the platform.

**Fix tasks:**
- [ ] Consolidate into a single `isElectron()` in a shared `platform.ts` utility that checks for either or both bridges
- [ ] Import from the shared module in both `crypto.ts` and `webview.ts`

---

### Summary — Task Checklist

| #  | ID | Severity | File(s) | Status |
|----|----|----------|---------|--------|
| 1  | BUG-001 | 🔴 High | `Settings/index.tsx` | `[ ]` |
| 2  | BUG-002 | 🔴 High | `Sidebar.tsx` | `[ ]` |
| 3  | BUG-003 | 🟡 Med  | `Sidebar.tsx` | `[ ]` |
| 4  | BUG-004 | 🔴 High | `webview.ts`, `package.json` | `[ ]` |
| 5  | BUG-005 | 🟢 Low  | `Import/index.tsx` | `[ ]` |
| 6  | BUG-006 | 🟡 Med  | `main.tsx`, `scheduler.ts` | `[ ]` |
| 7  | BUG-007 | 🟢 Low  | `main.tsx`, `preload.js` | `[ ]` |
| 8  | BUG-008 | 🟢 Low  | `adapters/*`, `http.ts`, `scheduler.ts` | `[ ]` |
| 9  | BUG-009 | 🟡 Med  | `usePortalStore.ts`, `webview.ts` | `[ ]` |
| 10 | BUG-010 | 🟡 Med  | `webview.ts`, `preload.js` | `[ ]` |
| 11 | BUG-011 | 🟡 Med  | `webview.ts`, `main.js` | `[ ]` |
| 12 | BUG-012 | 🟢 Low  | `webview.ts`, `main.js` | `[ ]` |
| 13 | BUG-013 | 🟢 Low  | `usePortalStore.ts` | `[ ]` |
| 14 | BUG-014 | 🟡 Med  | `webview.ts` | `[ ]` |
| 15 | BUG-015 | 🟡 Med  | `index.ts` (scraper) | `[ ]` |
| 16 | BUG-016 | 🟡 Med  | `index.ts` (scraper) | `[ ]` |
| 17 | BUG-017 | 🟡 Med  | `main.js` (electron) | `[ ]` |
| 18 | BUG-018 | 🟢 Low  | `usePortalStore.ts` | `[ ]` |
| 19 | BUG-019 | 🟢 Low  | `crypto.ts`, `webview.ts` | `[ ]` |

**Recommended fix order:** BUG-001 → BUG-002 → BUG-003 (broken UI, quick fixes) → BUG-010 → BUG-015 (data bugs) → BUG-004 (Android blocker) → BUG-011 → BUG-009 → BUG-006/007/008 (cleanup) → rest

