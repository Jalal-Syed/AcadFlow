# AcadFlow — Developer Documentation

> **Internal reference for contributors and future maintainers.**
> For the product overview, see [README.md](./README.md).
> For the full product specification, see [AcadFlow_Product_Spec.md](./AcadFlow_Product_Spec.md).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Layer — IndexedDB Schema](#2-data-layer--indexeddb-schema)
3. [State Management — Zustand Stores](#3-state-management--zustand-stores)
4. [Calculation Engine](#4-calculation-engine)
5. [Hooks](#5-hooks)
6. [Design System](#6-design-system)
7. [Routing](#7-routing)
8. [Notification System](#8-notification-system)
9. [Adding a New University Grading Preset](#9-adding-a-new-university-grading-preset)
10. [Adding a New Page](#10-adding-a-new-page)
11. [Key Patterns & Conventions](#11-key-patterns--conventions)
12. [Bug Fixes Log](#12-bug-fixes-log)
13. [Known Gaps & TODOs](#13-known-gaps--todos)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     React UI Layer                      │
│  Pages  ─►  Feature Components  ─►  UI Primitives       │
└──────────────────────┬──────────────────────────────────┘
                       │ reads / dispatches
┌──────────────────────▼──────────────────────────────────┐
│             Hooks  (derived computed state)              │
│   useAttendance  │  useSubjects  │  useTodaySchedule     │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌───────────────┐           ┌─────────────────────┐
│ Zustand Stores│           │  lib/calculations.ts │
│ (in-memory    │           │  (pure functions,    │
│  + persisted) │           │   no side effects)   │
└───────┬───────┘           └─────────────────────┘
        │ read / write
┌───────▼──────────────────────────────────────────────┐
│              Dexie.js  ──►  IndexedDB                │
│  15-table schema — all academic data lives here      │
└──────────────────────────────────────────────────────┘
```

**Two distinct storage mechanisms run in parallel:**

| Store | What lives there | Persistence |
|---|---|---|
| **Zustand + `persist`** | Profile, semesters, subjects, UI state | `localStorage` (via Zustand middleware) |
| **Dexie / IndexedDB** | Attendance records, tasks, exams, timetable, notes, marks, syllabus | IndexedDB (survives sessions, survives reload) |

The reason for the split: subjects and semesters are small, frequently read, and benefit from the synchronous Zustand API. Attendance records can be thousands of rows — they belong in IndexedDB with Dexie's indexed queries.

---

## 2. Data Layer — IndexedDB Schema

**File:** `src/db/schema.ts`

The singleton `db` export is an instance of `AcadFlowDB extends Dexie`. Import it anywhere:

```ts
import { db } from '@/db/schema'
```

### Tables & Indexes

| Table | Primary Key | Indexes |
|---|---|---|
| `profile` | `&id` | — |
| `gradingScales` | `&id` | `universityId` |
| `semesters` | `&id` | `number`, `isActive` |
| `subjects` | `&id` | `semesterId`, `type` |
| `attendanceRecords` | `&id` | `subjectId`, `semesterId`, `date`, `status` |
| `theoryMarks` | `&id` | `subjectId`, `semesterId` |
| `labMarks` | `&id` | `subjectId`, `semesterId` |
| `tasks` | `&id` | `semesterId`, `subjectId`, `status`, `dueDate`, `priority` |
| `exams` | `&id` | `semesterId`, `subjectId`, `type`, `date` |
| `timetableSlots` | `&id` | `semesterId`, `day`, `subjectId` |
| `timetableOverrides` | `&id` | `semesterId`, `originalSlotId`, `date` |
| `syllabusUnits` | `&id` | `subjectId` |
| `notes` | `&id` | `semesterId`, `subjectId`, `category`, `isPinned` |
| `studySets` | `&id` | `semesterId` |
| `holidays` | `&id` | `semesterId`, `date` |

### Compound Index Example (Timetable)

The `useTodaySchedule` hook queries timetable slots by both `semesterId` and `day` in a single efficient call using Dexie's compound index syntax:

```ts
// In schema.ts:
timetableSlots: '&id, semesterId, day, subjectId, [semesterId+day]'

// In the hook:
const slots = await db.timetableSlots
  .where('[semesterId+day]')
  .equals([activeSemesterId, todayLabel])
  .toArray()
```

### Seeding Grading Scales

`seedGradingScales()` is called once during the Done step of onboarding. It checks if any scales exist and bulk-inserts all presets from `constants/grading.ts` if not. Safe to call multiple times.

---

## 3. State Management — Zustand Stores

All stores live in `src/stores/`. Two patterns are used:

### Pattern A — Persisted Store (profile / semesters / UI)

```ts
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({ ... }),
    { name: 'acadflow-profile' }   // localStorage key
  )
)
```

These stores hydrate synchronously on first render from `localStorage`. Small, frequently-read data only.

### Pattern B — IndexedDB-backed Store (attendance / tasks / exams)

```ts
export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  isLoaded: false,

  loadRecords: async (semesterId) => {
    const records = await db.attendanceRecords.where('semesterId').equals(semesterId).toArray()
    set({ records, isLoaded: true })
  },
  // ...
}))
```

Pages call `loadRecords(activeSemesterId)` inside a `useEffect` on mount. The `isLoaded` flag is used to show skeleton loading states before data arrives.

### Store Reference

| Store | Persisted? | Loaded from DB? | Key state |
|---|---|---|---|
| `useProfileStore` | ✅ `localStorage` | — | `profile`, `gradingScale` |
| `useSemesterStore` | ✅ `localStorage` | — | `semesters[]`, `subjects[]`, `activeSemesterId` |
| `useAttendanceStore` | ❌ | ✅ `loadRecords(semId)` | `records[]`, `isLoaded` |
| `useTaskStore` | ❌ | ✅ `loadTasks(semId)` | `tasks[]`, `isLoaded` |
| `useExamStore` | ❌ | ✅ `loadExams(semId)` | `exams[]`, `isLoaded` |
| `useUIStore` | ✅ (theme only) | — | `theme`, `activeTab`, `isDesktop`, `openModals[]` |

### `useSemesterStore` — `activeSemester()` is a getter function

`activeSemester` is exposed as a **function**, not a value, because Zustand doesn't support derived selectors in `persist` stores without extra boilerplate:

```ts
// In store:
activeSemester: () => get().semesters.find(s => s.id === get().activeSemesterId)

// In components — call it:
const sem = useSemesterStore(s => s.activeSemester())
```

---

## 4. Calculation Engine

**File:** `src/lib/calculations.ts`

All academic math is in pure functions here — no store imports, no side effects, fully testable with Vitest. Components never do math directly; they call these functions or get pre-computed results from a hook.

### Key Functions

#### `calcSubjectAttendance(subject, records) → AttendanceSummary`

Filters `records` to a single subject, computes held/attended/bonus/percentage/zone. Note: `safeSkips` and `catchUpNeeded` are intentionally set to `0` here — per JNTUH R-25, detention eligibility is based on **aggregate**, not per-subject.

#### `calcAggregateAttendance(subjects, records) → AggregateAttendance`

Sums across all subjects and computes the real eligibility metric.

**Safe-skip formula:**
```
aggregateSafeSkips = floor(totalAttended / 0.75 - totalHeld)
```
This is correct. The earlier (broken) formula `totalAttended - ceil(totalHeld × 0.75)` was wrong because it doesn't account for the denominator growing as you skip more classes.

#### `calcMidTermCIE(mt1, mt2, cbt, hasCBT) → number | null`

Implements the JNTUH R-25 best-2-of-3 rule: sorts the available scores descending, takes the top 2, averages them → /30.

#### `calcCIETheory(marks) → number | null`

Adds mid-term CIE + assignment average + viva → /40 (CIE total).

#### `computeTheoryMarks(marks, scale) → SubjectMarksComputed`

Master function: calls the above, adds SEE, determines pass/fail status and grade.

#### `calcSGPA(subjects) → number`

Standard weighted average: `Σ(credits × gradePoint) / Σ(credits)`.

#### `calcCGPA(allCourses, useBest160) → number`

For JNTUH: sorts courses by grade point descending, greedily picks up to 160 credits, then calls `calcSGPA`. For other universities, uses all credits.

#### `cgpaToPercentage(cgpa) → number`

JNTUH R-25 Clause 10.11: `(cgpa − 0.5) × 10`.

#### `getDegreeClass(cgpa, isFirstAttemptAll, neverDetained) → DegreeClass`

Checks CGPA bands against `DEGREE_CLASSES` in `constants/grading.ts`. "First with Distinction" requires both `isFirstAttemptAll` and `neverDetained`.

---

## 5. Hooks

### `useAttendance()` — `src/hooks/useAttendance.ts`

Pulls `records` from `useAttendanceStore` and `subjects` from `useSemesterStore`, runs all calculations via `useMemo`, and returns clean summary objects. Components import this instead of touching stores and calculations separately.

```ts
const { summaries, aggregate, sortedSummaries, isLoaded, markAttendance } = useAttendance()
```

### `useSubjects()` — `src/hooks/useSubjects.ts`

Returns subjects filtered to `activeSemesterId`, sorted by `order`. Also provides `nextColor` (auto-cycle through `SUBJECT_COLORS` palette) and CRUD actions forwarded from the store.

```ts
const { subjects, nextColor, addSubject, getById } = useSubjects()
```

### `useTodaySchedule()` — `src/hooks/useTodaySchedule.ts`

Reads directly from Dexie (bypasses the store — timetable data is reference-like). Loads today's slots, resolves any overrides for today's date, joins subject metadata from the store. Returns a clean `ScheduledPeriod[]` array ready to render. Exposes a `refresh()` callback to re-trigger on data mutation.

```ts
const { periods, isLoading, todayLabel, refresh } = useTodaySchedule()
```

---

## 6. Design System

**File:** `src/components/ui/`

The app uses a custom glassmorphic dark-neon design system. All tokens are in `tailwind.config.ts` and `src/index.css`.

### Color Tokens

| Token | Hex | Use |
|---|---|---|
| `--color-primary` | `#6C63FF` | Electric Indigo — CTAs, active states |
| `--color-accent` | `#00F5D4` | Neon Cyan — secondary accents |
| `--color-danger` | `#FF4757` | Errors, critical attendance, failed grades |
| `--color-warning` | `#FFA502` | Amber — deadlines, condonable zone |
| `--color-success` | `#2ED573` | Emerald — present, passed, safe |
| `--color-bg` | `#0D0D14` | Page background |
| `--color-surface` | `#13131F` | Cards and modals |
| `--color-card` | `#1A1A2E` | Elevated card surface |

### UI Primitives

| Component | Props of note |
|---|---|
| `Button` | `variant` (primary/secondary/danger/ghost), `size`, `loading`, `fullWidth` |
| `Badge` | `variant` (success/warning/danger/info/primary/default), `size`, `dot` |
| `ProgressRing` | `percent`, `size`, `strokeWidth` — SVG ring, colour auto-maps to zone |
| `ProgressBar` | `value`, `max`, `height`, `animate`, `showLabel` |
| `Modal` | `open`, `onClose`, `title`, `size` (sm/md/lg) — uses a portal |
| `Input` | Extends `<input>` — `label`, `hint`, `error` for react-hook-form wiring |
| `Select` | Extends `<select>` — `label`, `options[]`, `error` |
| `FAB` | Floating Action Button — `onClick`, `label`, `icon` |
| `EmptyState` | `title`, `description`, `action?` |
| `Skeleton` / `CardSkeleton` | Loading placeholders |
| `Toast` | Imperative toast system (use the exported `toast` helper) |

---

## 7. Routing

**File:** `src/App.tsx`

The app has two route trees: the **onboarding gate** (shown until `profile.onboardingComplete === true`) and the **main app** (once onboarded).

```
/onboarding/*     → OnboardingPage (multi-step wizard, internal state)
/                 → DashboardPage
/attendance       → AttendancePage
/grades           → GradesPage
/tasks            → TasksPage
/assignments      → TasksPage (same component, different filter default)
/timetable        → TimetablePage
/exams            → ExamsPage
/syllabus         → SyllabusPage
/notes            → NotesPage
/calendar         → CalendarPage
/settings         → SettingsPage
*                 → redirect to /
```

The gate logic:

```tsx
const isOnboarded = !!profile?.onboardingComplete

if (!isOnboarded) {
  return (
    <Routes>
      <Route path="/onboarding/*" element={<OnboardingPage />} />
      <Route path="*" element={<Navigate to="/onboarding" replace />} />
    </Routes>
  )
}
```

`onboardingComplete` is set to `true` inside the `finish()` function in `OnboardingPage` (via `updateProfile`) **before** navigating to `/`. This is critical — the old code forgot to set it, causing an infinite redirect loop.

---

## 8. Notification System

**File:** `src/lib/notifications.ts`

Uses `@capacitor/local-notifications`. Silently no-ops on web/PWA (Capacitor wraps the call in try/catch). All notification IDs are derived deterministically from a string hash so they can be cancelled by ID without storing them in the DB.

### Channels (Android only)

| Channel | Importance | Vibration |
|---|---|---|
| `exams` | HIGH (4) | Yes |
| `tasks` | HIGH (4) | Yes |
| `attendance` | DEFAULT (3) | No |

Channels are created once on app init via `createNotificationChannels()` called from `main.tsx`.

### Scheduling Functions

| Function | Triggers |
|---|---|
| `scheduleExamNotifications(opts)` | 7d, 3d, 1d, and morning-of before exam — fires at 8 AM each |
| `cancelExamNotifications(examId)` | Cancels all 4 notifications for an exam |
| `scheduleTaskNotifications(opts)` | 24h and 1h before due date |
| `cancelTaskNotifications(taskId)` | Cancels both task notifications |
| `scheduleAttendanceReminder(opts)` | Daily, 10 min before first class, for next 90 days (batched in chunks of 60) |

---

## 9. Adding a New University Grading Preset

1. Open `src/constants/grading.ts`
2. Add a new `GradingScale` object following the existing pattern:

```ts
export const MY_UNIVERSITY: GradingScale = {
  id: 'my-university-scheme',
  universityId: 'Custom',          // or add a new UniversityId to types/index.ts
  name: 'My University (2024)',
  seePassMin: 18,                  // minimum SEE marks to pass
  overallPassMin: 40,              // minimum total to pass
  cgpaToPercentFormula: 'multiply10',
  grades: [
    { grade: 'O',  minMarks: 90, gradePoint: 10 },
    { grade: 'A+', minMarks: 80, gradePoint: 9  },
    // ...
    { grade: 'F',  minMarks: 0,  gradePoint: 0  },
  ],
}
```

3. Add it to `GRADING_SCALES`:

```ts
export const GRADING_SCALES: Record<string, GradingScale> = {
  [JNTUH_R25.id]: JNTUH_R25,
  [MY_UNIVERSITY.id]: MY_UNIVERSITY,
  // ...
}
```

4. Add it to the University dropdown in `src/pages/Onboarding/steps/University.tsx` (`UNIVERSITY_OPTIONS` array).

That's it. The calculation engine, CGPA logic, and SEE-needed back-calculator all consume `GradingScale` generically — no other changes needed.

---

## 10. Adding a New Page

1. Create `src/pages/MyPage/index.tsx`
2. Register a route in `src/App.tsx`
3. Add a nav entry in `src/components/ui/BottomNav.tsx` (mobile) and `src/components/ui/Sidebar.tsx` (desktop)

Typical page skeleton:

```tsx
import { useEffect } from 'react'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useMyStore } from '@/stores/useMyStore'

export default function MyPage() {
  const { activeSemesterId } = useSemesterStore()
  const { data, isLoaded, loadData } = useMyStore()

  useEffect(() => {
    if (activeSemesterId) loadData(activeSemesterId)
  }, [activeSemesterId, loadData])    // ← always include the action in deps

  if (!isLoaded) return <LoadingSkeleton />

  return (
    <div className="flex-1 overflow-y-auto pb-28 px-4 pt-6">
      {/* content */}
    </div>
  )
}
```

The `pb-28` bottom padding is intentional — leaves space for the bottom nav on mobile.

---

## 11. Key Patterns & Conventions

### Path Alias

`@/` maps to `src/`. Configured in `vite.config.ts` and `tsconfig.json`. Always use it — no relative `../../` imports.

### ID Generation

All new records use `crypto.randomUUID()`. This is available natively in all modern browsers and in Node ≥ 19. No external library needed.

### ISO Dates

All dates stored as ISO strings (`new Date().toISOString()`). Day.js is used for all comparison and formatting operations — never native `Date` arithmetic in components.

### `useEffect` Dependency Arrays

Always include all functions called inside `useEffect` in the dep array. Zustand store actions are stable references (don't cause re-runs), but omitting them suppresses ESLint and makes the code misleading.

```ts
// ✅ Correct
useEffect(() => {
  if (activeSemesterId) loadRecords(activeSemesterId)
}, [activeSemesterId, loadRecords])

// ❌ Wrong — misses loadRecords
useEffect(() => {
  if (activeSemesterId) loadRecords(activeSemesterId)
}, [activeSemesterId])
```

### SSR / Non-Browser Guard

`window` is not guaranteed to exist (Vitest, SSR). Always guard:

```ts
// ✅
isDesktop: typeof window !== 'undefined' && window.innerWidth > 1024

// ❌
isDesktop: window.innerWidth > 1024
```

### Null Safety in Calculations

Functions in `calculations.ts` accept `number | null | undefined` for mark fields. The `safeNum()` helper normalises these to `number | null`. Always propagate `null` up — never substitute `0` silently unless the field is intentionally optional.

### TypeScript Strictness

`tsconfig.json` has `"strict": true`. All `any` casts should be justified with a comment. Unused imports/variables are build errors (TS6133) — clean them up.

---

## 12. Bug Fixes Log

These bugs were found during code audit on 2026-04-04 and fixed:

| # | File | Bug | Fix |
|---|---|---|---|
| 1 | `lib/calculations.ts` | `aggregateSafeSkips` formula was `totalAttended - ceil(0.75 × totalHeld)` — underestimates the budget because the denominator grows as you skip | Corrected to `floor(totalAttended / 0.75 - totalHeld)` |
| 2 | `pages/Onboarding/index.tsx` | `finish()` never called `updateProfile({ onboardingComplete: true })` — caused infinite redirect loop back to onboarding | Added `updateProfile({ onboardingComplete: true })` as first step in `finish()` |
| 3 | `pages/Attendance/index.tsx` | `loadRecords` missing from `useEffect` dep array | Added `loadRecords` to deps |
| 3b | `pages/Dashboard/index.tsx` | `loadRecords`, `loadTasks`, `loadExams` all missing from `useEffect` dep array | Added all three to deps |
| 4 | `stores/useUIStore.ts` | `window.innerWidth` accessed directly in initial state without browser guard — throws in non-browser environments | Wrapped with `typeof window !== 'undefined' &&` |

---

## 13. Known Gaps & TODOs

These are features described in the spec that are architecturally wired but not yet built out:

| Item | Notes |
|---|---|
| **Supabase cloud sync** | ✅ Shipped — `src/lib/supabase.ts`, `src/stores/useAuthStore.ts`, `src/lib/sync/index.ts`, `src/stores/useSyncStore.ts`. Google OAuth + magic-link auth, delta sync (push/pull via `updatedAt`), last-write-wins. Dexie v3 upgrade adds `updatedAt` index + auto-stamp hooks on all tables. |
| **PDF / Excel export** | `jspdf` and `xlsx` are in `package.json`. The export functions in Settings need to be wired up. |
| **PWA service worker** | `vite-plugin-pwa` is configured but the manifest icons in `public/icons/` are empty placeholders. |
| **Android back-button** | `@capacitor/app` is installed. `App.addListener('backButton', ...)` needs to be wired in `main.tsx`. |
| **Haptic feedback** | `@capacitor/haptics` is installed. Should fire on attendance mark, task complete. |
| **Flux mascot** | Lottie animations for the owl. Planned for V1.1. |
| **KaTeX in Notes** | Rich text / math formula support for notes. |
| **Vitest unit tests** | `src/lib/calculations.ts` is the priority target — pure functions, easy to test. |
| **Playwright E2E** | Onboarding flow, attendance mark → percentage update, task add → list update. |
| **JNTUH portal scraper** | V1.3 feature. Planned as a separate Capacitor plugin or a backend proxy. |
| **Home screen widget** | Android widget showing aggregate attendance + next exam countdown. V1.1. |

---

*DEV_DOCS.md — AcadFlow v1.4 — Last updated 2026-04-04*

---

## 14. Scraper Architecture

> **Status:** Architecture finalised. Implementation tracked in `fixes-to-be-made.md` under SCRAPER-001.

### Overview

The portal scraper is built around an **adapter pattern**. The core engine (`src/lib/scraper/`) is completely portal-agnostic. Each university/college portal gets a single adapter file in `src/lib/scraper/adapters/`. Adding support for a new portal means writing one file and registering it — nothing else changes.

### File Map

```
src/lib/scraper/
├── types.ts           PortalAdapter interface, SessionData, ScrapedAttendance,
│                    ScrapedMarks, ScrapedSubject, SyncResult, HttpClient
├── http.ts            Platform-aware HTTP layer (see below)
├── crypto.ts          Credential encryption (Electron safeStorage / WebCrypto)
├── scheduler.ts       Daily sync scheduling
├── index.ts           Orchestrator: login(), syncAll(), scheduleDaily()
└── adapters/
    ├── index.ts         Registry + getAdapter(id) helper
    └── tkrec.ts         TKREC portal adapter (first, used for dev/testing)

src/stores/usePortalStore.ts   Portal config + sync state
src/pages/Import/index.tsx     Portal sync UI

electron/scraper-bridge.js     Node-side IPC fetch handler (no CORS)
electron/preload.js            contextBridge: exposes window.scraperBridge
```

### Platform HTTP Layer

CORS blocks direct portal fetches in the browser. The `http.ts` module abstracts this:

| Platform | Mechanism | How detected |
|---|---|---|
| Electron | `window.scraperBridge.fetch()` (IPC → Node fetch) | `window.scraperBridge !== undefined` |
| Android | `@capacitor/http` CapacitorHttp | `Capacitor.isNativePlatform()` |
| Web | Throws `ScraperNotSupportedError` | fallback |

### Writing a New Adapter

1. Create `src/lib/scraper/adapters/myportal.ts`
2. Implement the `PortalAdapter` interface from `types.ts`:

```ts
import type { PortalAdapter, SessionData, HttpClient } from '../types'

export const MyPortalAdapter: PortalAdapter = {
  id: 'my-portal',             // unique string, shown in adapter picker
  name: 'My University Portal',
  baseUrl: 'https://portal.myuniv.edu',
  credentialFields: [
    { label: 'Roll Number', key: 'username', type: 'text' },
    { label: 'Password',    key: 'password', type: 'password' },
  ],

  async login(credentials, http) {
    // POST to login endpoint, extract session cookies/token
    const res = await http.post('/login', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(credentials).toString(),
    })
    const cookies = res.headers['set-cookie'] ?? ''
    return { cookies, token: null }  // whatever the portal uses
  },

  async scrapeSubjects(session, http) {
    const res = await http.get('/student/subjects', { cookies: session.cookies })
    const doc = new DOMParser().parseFromString(res.text, 'text/html')
    // parse table rows → return ScrapedSubject[]
    return []
  },

  async scrapeAttendance(session, http) {
    // same pattern
    return []
  },

  async scrapeMarks(session, http) {
    // same pattern
    return []
  },
}
```

3. Register it in `src/lib/scraper/adapters/index.ts`:

```ts
import { TKRECAdapter } from './tkrec'
import { MyPortalAdapter } from './myportal'

export const ADAPTERS: Record<string, PortalAdapter> = {
  [TKRECAdapter.id]:    TKRECAdapter,
  [MyPortalAdapter.id]: MyPortalAdapter,
}

export function getAdapter(id: string): PortalAdapter | null {
  return ADAPTERS[id] ?? null
}
```

4. Add it to the adapter picker options in `src/pages/Import/index.tsx`.

That's the entire contract. The engine calls `login()` then `scrapeSubjects()`, `scrapeAttendance()`, `scrapeMarks()` in sequence. Your adapter just needs to return the right types.

### Data Mapping

The orchestrator (`index.ts`) maps scraped types to AcadFlow's internal schema:

| Scraped type | Maps to | Store action |
|---|---|---|
| `ScrapedSubject` | `Subject` | `useSemesterStore.addSubject()` |
| `ScrapedAttendance` | `AttendanceRecord[]` (one per class held) | `useAttendanceStore.bulkImport()` |
| `ScrapedMarks` | `TheoryMarks` or `LabMarks` | `db.theoryMarks.put()` / `db.labMarks.put()` |

**Conflict rule: portal always wins.** Existing records for the same `subjectId + semesterId` are replaced, not merged.

### Scheduling

- **Electron:** `scheduler.ts` registers a `node-cron` job (`0 8 * * *` = 8 AM daily). Also fires on window focus if last sync > 20h ago.
- **Android:** `src/main.tsx` registers `App.addListener('appStateChange', ...)`. When app resumes from background, checks `lastSyncAt` — if > 20h ago, calls `syncNow()`.
- Both paths call the same `syncAll()` function in `index.ts`.

### Credential Storage

| Platform | Storage | Encryption |
|---|---|---|
| Electron | `electron.safeStorage.encryptString()` → stored in user data dir | OS-level keychain (hardware-backed on Windows/Mac) |
| Android | WebCrypto AES-GCM, key in `@capacitor/preferences` | Software AES-256 |

Credentials are never stored in IndexedDB, Zustand `localStorage`, or any plaintext file. The user can choose "ask every time" to skip storage entirely.
