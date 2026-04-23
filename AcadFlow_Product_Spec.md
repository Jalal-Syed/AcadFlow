# AcadFlow — Product Specification

> **Regulation:** JNTUH B.Tech R-25 (AY 2025–26)
> **Version:** 2.0 — Last updated 2026-04-05
> **Status:** All 16 pages implemented · Electron Windows installer shipped · Build passing

---

## Table of Contents

1. [Vision](#1-vision)
2. [Branding & Identity](#2-branding--identity)
3. [Target Audience](#3-target-audience)
4. [Platform Strategy](#4-platform-strategy)
5. [Tech Stack](#5-tech-stack)
6. [Data Architecture](#6-data-architecture)
7. [Design System](#7-design-system)
8. [Routing](#8-routing)
9. [Feature Specifications](#9-feature-specifications)
10. [JNTUH R-25 Rules Reference](#10-jntuh-r-25-rules-reference)
11. [Calculation Engine](#11-calculation-engine)
12. [Notification System](#12-notification-system)
13. [Roadmap](#13-roadmap)
14. [Known Gaps](#14-known-gaps)

---

## 1. Vision

Indian engineering students juggle 6–8 subjects per semester, each with independent attendance counters, two mid-term exams, CBT scores, assignment deadlines, lab records, and an end-sem. There is no single reliable tool that consolidates this.

**AcadFlow** is the Academic Operating System for Indian engineering students. It tracks everything, calculates everything, reminds you of everything — offline, always-available, built specifically around JNTUH R-25 with preset support for VTU, Anna University, JNTUA, and more.

> *"If it's academic and it can be tracked, AcadFlow tracks it."*

---

## 2. Branding & Identity

**Name:** AcadFlow — *Acad* (academic) + *Flow* (state of control, smooth progress).
**Taglines:** "Your semester, under control." / "The academic OS you deserved from day one."
**Mascot:** Flux — a circuit-board-winged owl whose eye colour shifts with academic health (green / amber / red).

### Colour Palette

| Token | Hex | Use |
|---|---|---|
| Primary | `#6C63FF` | Electric Indigo — CTAs, active states |
| Accent | `#00F5D4` | Neon Cyan — secondary accents |
| Danger | `#FF4757` | Errors, critical attendance, failed grades |
| Warning | `#FFA502` | Amber — deadlines, condonable zone |
| Success | `#2ED573` | Emerald — present, passed, safe |
| Background (dark) | `#0D0D14` | Page background |
| Surface (dark) | `#13131F` | Cards and modals |
| Card (dark) | `#1A1A2E` | Elevated card surface |

### Typography

| Role | Font |
|---|---|
| Body + headings | Inter (active) |
| Monospace / numbers | JetBrains Mono |

---

## 3. Target Audience

**Primary:** B.Tech student, JNTUH-affiliated college, Android phone, frequently offline.

| Segment | Notes |
|---|---|
| B.Tech (years 1–4) | Primary — JNTUH R-25 is the reference regulation |
| Diploma | Simpler semester structure, same attendance rules |
| M.Tech | Fewer subjects, thesis tracking needed (future) |
| Integrated B.Tech+M.Tech | 10 semesters |

### Grading System Support

| Mode | Description |
|---|---|
| JNTUH R-25 | Primary — 10-point CGPA, best-160 credits, SEE >= 21 |
| VTU | SEE pass >= 18 |
| Anna University | Slightly different grade bands |
| JNTUA | Similar to JNTUH |
| Custom | User-defined grade points and thresholds |

---

## 4. Platform Strategy

| Platform | Method | Priority |
|---|---|---|
| Android App | React + Vite -> Capacitor -> APK | P1 |
| PWA | vite-plugin-pwa + Workbox | P1 |
| Desktop Web | Hosted on Vercel/Netlify | P1 |
| Electron (Windows/Linux/macOS) | electron + electron-builder | P1 -- shipped v0.1.0 |

### Responsive Breakpoints

| Width | Layout |
|---|---|
| < 768px | Full device width, bottom nav, single column |
| 768-1024px | Content capped at 768px max-width, centred |
| > 1024px | Full sidebar (240px), content at 768px max-width |

### Electron Note

Electron loads via `file://`. Vite's default `base: '/'` produces absolute asset paths that break on `file://`. Fixed by setting `base: './'` when `ELECTRON=true` env var is present (via `cross-env`). All `electron:build*` scripts prepend `cross-env ELECTRON=true pnpm build`.

---

## 5. Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS v3 |
| State | Zustand with persist middleware |
| Local DB | Dexie.js (IndexedDB) |
| Routing | React Router v6 |
| Animation | Framer Motion |
| Charts | Recharts |
| Dates | Day.js |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Mobile | Capacitor v6 |
| PWA | vite-plugin-pwa + Workbox |
| Desktop | Electron + electron-builder |
| Export | jsPDF + jspdf-autotable, SheetJS |
| Package manager | pnpm |

---

## 6. Data Architecture

**Local-first.** All data lives on device. No account required. Cloud sync is planned (Supabase) but not built.

### Two Parallel Storage Tracks

| Store | Technology | What lives there |
|---|---|---|
| Zustand + persist | localStorage | Profile, semesters, subjects, UI state |
| Dexie | IndexedDB | Attendance, tasks, exams, timetable, notes, marks, syllabus |

The split is intentional: subjects and semesters are small and benefit from Zustand's synchronous API. Attendance records can be thousands of rows — they belong in Dexie with indexed queries.

### IndexedDB Schema (15 tables)

| Table | Primary Key | Key Indexes |
|---|---|---|
| profile | &id | -- |
| gradingScales | &id | universityId |
| semesters | &id | number, isActive |
| subjects | &id | semesterId, type |
| attendanceRecords | &id | subjectId, semesterId, date, status |
| theoryMarks | &id | subjectId, semesterId |
| labMarks | &id | subjectId, semesterId |
| tasks | &id | semesterId, subjectId, status, dueDate, priority |
| exams | &id | semesterId, subjectId, type, date |
| timetableSlots | &id | semesterId, day, [semesterId+day] |
| timetableOverrides | &id | semesterId, date |
| syllabusUnits | &id | subjectId |
| notes | &id | semesterId, subjectId, category, isPinned |
| studySets | &id | semesterId |
| holidays | &id | semesterId, date |

### Zustand Store Reference

| Store | Persisted? | DB-backed? | Key state |
|---|---|---|---|
| useProfileStore | yes (acadflow-profile) | no | profile, gradingScale |
| useSemesterStore | yes (acadflow-semesters) | no | semesters[], subjects[], activeSemesterId |
| useAttendanceStore | no | yes - loadRecords(semId) | records[], isLoaded |
| useTaskStore | no | yes - loadTasks(semId) | tasks[], isLoaded |
| useExamStore | no | yes - loadExams(semId) | exams[], isLoaded |
| useUIStore | yes (theme only) | no | theme, isDesktop, openModals[] |

**Pattern:** DB-backed stores require `loadX(activeSemesterId)` called in `useEffect` on mount. Always include the action in the dep array.

**`activeSemester` is a function, not a value.** Call it as: `useSemesterStore(s => s.activeSemester())`

---

## 7. Design System

**Language:** Glassmorphic Dark Neon. Dark-first, glass cards (backdrop-blur: 12px), Electric Indigo + Neon Cyan accents.

All tokens are CSS custom properties switched by `.dark` / `.light` class on `<html>`. `App.tsx` applies the class from `useUIStore.theme` in a `useEffect`.

### Semantic Token Map

| Token | Dark | Light |
|---|---|---|
| text-text | #FFFFFF | #111111 |
| bg-bg | #0D0D14 | #F8F9FA |
| bg-surface | #13131F | #FFFFFF |
| bg-card | #1A1A2E | #F1F3F5 |

**CSS variable usage:** Custom properties store raw RGB channels (e.g. `17 17 17`) for Tailwind opacity support. Always consume as `rgb(var(--color-text))` or `rgb(var(--color-text) / 0.55)`. Never use bare `var(--color-text)` in a `color:` property.

### UI Primitives (src/components/ui/)

| Component | Key Props |
|---|---|
| Button | variant (primary/secondary/danger/ghost), size, loading, fullWidth |
| Badge | variant (success/warning/danger/info/primary/default), size, dot |
| ProgressRing | percent, size, strokeWidth — SVG ring, colour maps to zone |
| ProgressBar | value, max, height, animate, showLabel |
| Modal | open, onClose, title, size (sm/md/lg) |
| Input | label, hint, error |
| Select | label, options[], error |
| FAB | onClick, label, icon |
| EmptyState | title, description, action? |
| Skeleton | Loading placeholder, style?: CSSProperties |
| Toast | Imperative — use exported toast helper |
| BottomNav | Mobile nav + theme toggle at trailing edge |
| Sidebar | Desktop nav (240px, collapsible) + theme toggle in footer |

---

## 8. Routing

Onboarding gate in `App.tsx`: if `profile?.onboardingComplete !== true`, all routes redirect to `/onboarding`.

| Route | Page | Notes |
|---|---|---|
| /onboarding/* | Onboarding (6 steps) | Welcome -> Profile -> University -> Semester -> Subjects -> Done |
| / | Dashboard | Command centre |
| /attendance | Attendance | Mark + analytics |
| /grades | Grades | CIE + CGPA + WhatIf |
| /tasks | Tasks | All task types |
| /assignments | Assignments | Assignment-specific view |
| /timetable | Timetable | Weekly period grid |
| /exams | Exams | Countdown + filters |
| /syllabus | Syllabus | Unit -> Topic drill-down |
| /notes | Notes | Tagged notes organiser |
| /calendar | Calendar | Monthly overlay view |
| /subjects | Subjects | Subject CRUD |
| /semesters | Semesters | Semester CRUD + progress |
| /labs | Labs | Lab marks tracker |
| /ncs | NCS | No-Credit Subjects |
| /settings | Settings | Profile, grading, theme, export/import |
| * | -> / | Catch-all redirect |

**Content max-width:** All pages render inside `max-w-3xl` (768px) `mx-auto` wrapper in `App.tsx`. Zero individual page files need width logic. Onboarding uses `max-w-lg` (512px).

---

## 9. Feature Specifications

### 9.1 Onboarding (6 Steps)

Triggered on first launch only. `finish()` calls `updateProfile({ onboardingComplete: true })` before navigating to `/` — this is the gate condition. Missing this call causes an infinite redirect loop back to onboarding.

Steps: Welcome -> Profile (name, college, roll no.) -> University (university, degree, branch, grading preset) -> Semester (number, academic year, start/end dates, attendance threshold) -> Subjects (add Theory/Lab/NoCredit) -> Done (seeds grading scales to DB).

### 9.2 Dashboard

Sections (top-to-bottom, mobile): header strip with greeting + academic health badge > Today's Schedule card > Attendance summary strip > Upcoming deadlines > CGPA snapshot > Flux nudge card.

Data: greets with `profile.name`. Attendance from `useAttendanceStore`. Tasks from `useTaskStore`. Exams from `useExamStore`. All loaded in a single `useEffect` — all three load actions must be in the deps array.

### 9.3 Attendance Tracker

- Per-subject and aggregate tracking. Per-subject % is informational; **aggregate % is the real JNTUH eligibility metric.**
- Mark from Dashboard (today's schedule) or Attendance page (any date).
- Bulk mark: all subjects across a date range in one tap.
- Mid-term bonus: +2 hours per theory subject per mid-term appeared (R-25 Clause 7.4), toggleable per subject.
- OD counted as Present: toggleable. Medical excluded: toggleable.
- Heatmap: `getDayCellKind()` returns typed enum. All text colours use `rgb(var(--color-text) / opacity)` — light-mode safe.

**Attendance Zones:**

| Zone | Aggregate % | Colour |
|---|---|---|
| Safe | >= 85% | #2ED573 |
| Okay | 75-84% | #00C9B1 |
| Condonable | 65-74% | #FFA502 |
| Critical (Detained Risk) | < 65% | #FF4757 |

### 9.4 Grades (CGPA / GPA Calculator)

**Mode 1 - Semester GPA:** Input grades/marks per subject -> SGPA.
**Mode 2 - Cumulative CGPA:** All semester SGPAs + credits -> running CGPA + sparkline.
**Mode 3 - What-If Simulator:** Adjust expected grades per subject, see real-time SGPA update. Per-subject grade target grid. SGPA target calculator with gap analysis. Theory subjects only (labs not in what-if).
**Mode 4 - Target CGPA:** Input desired final CGPA + semesters remaining -> required SGPA per remaining semester.

### 9.5 Internal Marks (Theory CIE)

```
MT1 = Part A (/10) + Part B (/20) = /30
MT2 = Part A (/10) + Part B (/20) = /30
CBT = /30 (optional)
Mid-term CIE = best-2-of-3(MT1, MT2, CBT) averaged -> /30
Assignment CIE = avg(Assign1, Assign2) -> /5
Viva = /5
Total CIE = Mid-term CIE + Assignment avg + Viva -> /40
SEE = /60    Total = /100
```

Pass: SEE >= 21 AND Total >= 40 (R-25 Clause 8.1). App back-calculates SEE needed to pass and SEE needed for each grade.

### 9.6 Lab Marks

```
CIE (/40): Day-to-Day /10 + Viva (Internal) /10 + Internal Exam /10 + Lab Report /10
SEE (/60): Write-up /10 + Execution /15 + Results /15 + Presentation /10 + Viva Voce /10
```

Stored via `db.labMarks.put()` (upsert) — no separate add/update paths.

### 9.7 Tasks & Assignments

Types: Assignment / LabRecord / Project / Presentation / Viva / Other.
Priorities: Low / Medium / High / Critical.
Filter tabs: All / Overdue / Today / This Week / Done. FAB quick-add.
Assignments page: same task store, adds description textarea + subject filter chips.

### 9.8 Timetable

Weekly Mon-Sat period grid. Queried via compound Dexie index `[semesterId+day]`. Delete calls `db.timetableSlots.delete()` directly. Timetable override UI not yet built (schema exists).

### 9.9 Exam Countdown

Types: MidTerm1/2, CBT, SEE, Supplementary, LabSEE, Viva, FieldProject, Internship, ProjectViva.
Countdown ticker: updates every 60s via `setInterval`. 3 independent filters: tab (upcoming/past) + subject + type. Past: newest-first. Upcoming: soonest-first.

### 9.10 Syllabus Tracker

Two-screen drill-down: Subject list -> Unit/Topic detail. Topic status cycles on tap: NotStarted -> InProgress -> Completed -> RevisionDone. Topics stored inline in `SyllabusUnit.topics[]` — each status change does a full array replace via `db.syllabusUnits.update(unitId, { topics: [...] })`.

### 9.11 Notes Organiser

Categories: Notes / PYQs / Reference / LabManual / Other. Sort: pinned first, then createdAt descending. No edit flow — delete and re-add. richText stored as plain string (no KaTeX yet).

### 9.12 Calendar

Monthly grid overlaying: holidays (Dexie query), exam dates + task deadlines (from in-memory store — requires tasks + exams already loaded). Event dot colours: holiday=red, exam=indigo, task=amber. Day-detail panel on tap. Add Holiday modal.

### 9.13 Subjects

Theory / Lab / NoCredit grouped cards. Live attendance % per subject via `useLiveQuery`. Auto-colour from `SUBJECT_COLORS` palette. CRUD via Zustand store actions.

### 9.14 Semesters

Active / archived sections. Progress bar = elapsed / totalDays. Delete requires 3-step confirmation. Quick-links grid to /subjects, /labs, /ncs, /syllabus.

### 9.15 Settings

- Profile, university, grading scale config
- Theme toggle (dark/light) — persisted + applied to `<html>` in App.tsx
- Export: native `Blob + URL.createObjectURL` — full JSON of all 15 tables
- Import: `db.transaction('rw', db.tables, ...)` — clears all tables then bulk-adds
- Clear All: with confirmation dialog

### 9.16 NCS (No-Credit Subjects)

Read-only view. Attendance pulled from `db.attendanceRecords` via `useLiveQuery`. Displays R-25 note: NCS attendance IS counted in aggregate eligibility.

---

## 10. JNTUH R-25 Rules Reference

### Attendance (Clause 7)

Eligibility is **aggregate across ALL subjects** — not per-subject.

| Rule | Value |
|---|---|
| Minimum aggregate threshold | 75% |
| Condonation band | 65-74% (valid grounds + fee) |
| Non-condonable | Below 65% -- detained, no exceptions |
| Mid-term bonus | +2 hours per theory subject per mid-term appeared (Clause 7.4) |
| OD | Counted as Present (toggleable) |
| Medical | Shown separately, user decides (toggleable) |

### Grading Scale (Clause 10.3)

| Marks | Grade | Grade Point |
|---|---|---|
| >= 90 | O (Outstanding) | 10 |
| 80-89 | A+ (Excellent) | 9 |
| 70-79 | A (Very Good) | 8 |
| 60-69 | B+ (Good) | 7 |
| 50-59 | B (Average) | 6 |
| 40-49 | C (Pass) | 5 |
| < 40 | F (Fail) | 0 |

Pass condition (Clause 8.1): SEE >= 21 AND Total >= 40.

### SGPA & CGPA (Clauses 10.9 / 10.11)

```
SGPA = Sum(Credits x GradePoint) / Sum(Credits)
CGPA = best 160 of 164 registered credits (greedy sort by grade point desc)
Percentage = (CGPA - 0.5) x 10
```

### Degree Classification (Clause 17)

| CGPA | Class | Conditions |
|---|---|---|
| >= 7.5 | First Class with Distinction | All first attempt + never detained |
| >= 7.5 (conditions not met) | First Class | -- |
| >= 6.5 | First Class | -- |
| >= 5.5 | Second Class | -- |
| >= 5.0 | Pass Class | -- |

### Promotion Gate (Clause 14)

Must earn >= 25% of total registered credits at end of Year 1 (Sem 2) and Year 2 (Sem 4).

---

## 11. Calculation Engine

**File:** `src/lib/calculations.ts` — pure functions, no side effects, fully testable.

| Function | What it does |
|---|---|
| `calcSubjectAttendance(subject, records)` | Per-subject held/attended/bonus/percentage/zone. safeSkips and catchUpNeeded are intentionally 0 -- per-subject skips are not the JNTUH eligibility metric. |
| `calcAggregateAttendance(subjects, records)` | Sums across all subjects. The real detention risk metric. |
| `calcMidTermCIE(mt1, mt2, cbt, hasCBT)` | Best-2-of-3, averaged -> /30. Handles partial entries. |
| `calcCIETheory(marks)` | Mid-term CIE + assignment avg + viva -> /40. |
| `computeTheoryMarks(marks, scale)` | Master: full computation -> SubjectMarksComputed. |
| `calcSGPA(subjects)` | Standard weighted average. |
| `calcCGPA(courses, useBest160)` | JNTUH best-160 greedy sort; non-JNTUH uses all credits. |
| `cgpaToPercentage(cgpa)` | (cgpa - 0.5) x 10 |
| `getDegreeClass(cgpa, firstAttempt, neverDetained)` | Checks bands from DEGREE_CLASSES. |
| `getPromotionStatus(earned, registered)` | >= 25% gate check. |
| `calcBacklogImpact(cgpa, totalCredits, failedCredits, targetGP)` | Simulates supplementary -> new CGPA. |

### Aggregate Safe-Skip Formula

```
aggregateSafeSkips = floor(totalAttended / 0.75 - totalHeld)
```

Derivation: `attended / (held + x) >= 0.75` => `x <= attended / 0.75 - held`.

The broken formula `totalAttended - ceil(totalHeld x 0.75)` underestimates the budget because the denominator grows as you skip more. This has been corrected.

---

## 12. Notification System

**File:** `src/lib/notifications.ts` — uses `@capacitor/local-notifications`. Silently no-ops on web. Notification IDs are deterministic string hashes (cancellable without DB storage).

### Android Channels

| Channel | Importance | Vibration |
|---|---|---|
| exams | HIGH (4) | Yes |
| tasks | HIGH (4) | Yes |
| attendance | DEFAULT (3) | No |

Channels created once on app init via `createNotificationChannels()` in `main.tsx`.

| Function | Triggers |
|---|---|
| scheduleExamNotifications | 7d, 3d, 1d, and morning-of at 8 AM |
| scheduleTaskNotifications | 24h and 1h before due datetime |
| scheduleAttendanceReminder | Daily 10min before first class, next 90 days (batched <= 60) |

---

## 13. Roadmap

### SCRAPER-001 — Universal Portal Scraper (🛠️ In Progress — Phase 1 Complete)

Auto-imports attendance, marks, and subjects from any college portal. Adapter pattern — one file per portal implementing a shared `PortalAdapter` interface.

**Platform HTTP strategy:**

| Platform | Approach |
|---|---|
| Electron | IPC → Node fetch (no CORS) via `electron/scraper-bridge.js` |
| Android | `@capacitor/http` native plugin (bypasses WebView CORS) |
| Web | Throws `ScraperNotSupportedError` — shows "use desktop or Android" |

**Implementation status — Phase 1 (Infrastructure): ✅ Complete**

| File | Purpose | Status |
|---|---|---|
| `src/lib/scraper/types.ts` | `PortalAdapter` interface, `SessionData`, `ScrapedAttendance`, `ScrapedMarks`, `ScrapedSubject`, `SyncResult` | ✅ Done |
| `src/lib/scraper/http.ts` | Platform-aware HTTP layer | ✅ Done |
| `src/lib/scraper/crypto.ts` | Credential encryption (Electron `safeStorage` + AES-GCM) | ✅ Done |
| `src/lib/scraper/index.ts` | Orchestrator: `login()`, `syncAll()`, `scheduleDaily()` | ✅ Done |
| `src/lib/scraper/scheduler.ts` | Daily sync with 20h interval guard | ✅ Done |
| `src/lib/scraper/adapters/index.ts` | Adapter registry + `getAdapter()` helper | ✅ Done |
| `src/lib/scraper/adapters/tkrec.ts` | TKREC (`tkrec.in`) adapter — login, attendance, marks, subjects | ✅ Done |
| `src/stores/usePortalStore.ts` | Portal config + sync state + log | ✅ Done |
| `src/pages/Import/index.tsx` | Full portal sync UI (adapter picker, credentials, log) | ✅ Done |
| `electron/scraper-bridge.js` | Node-side IPC `'scraper:fetch'` handler | ✅ Done |
| `electron/main.js` | Registers bridge IPC + wires scheduler on window focus | ✅ Done |
| `electron/preload.js` | Exposes full `window.scraperBridge` API via `contextBridge` | ✅ Done |
| `src/main.tsx` | Wires Android `appStateChange` + Electron `onCheckSync` | ✅ Done |
| `src/App.tsx` | `/import` route added | ✅ Done |
| `src/pages/Settings/index.tsx` | Portal Sync row in Data section + quick-link | ✅ Done |
| `src/components/ui/Sidebar.tsx` | Import nav item with live status dot | ✅ Done |

**Architecture decisions (locked):**
- Adapter pattern: one file per portal implementing `PortalAdapter`
- Conflict resolution: portal data always wins (overwrites local for same `subjectId + semesterId`)
- Sync schedule: daily at app open (if > 20h since last sync) + manual trigger button
- Credentials: encrypted locally — never in IndexedDB or `localStorage`. User may opt out and enter each time.
- First adapter: TKREC (`tkrec.in`) — dev credentials in `portal_dev_credentials_for_tkrec.in.md` (gitignored)

For the full adapter authoring guide, see `DEV_DOCS.md §14`.

### Supabase Cloud Sync (V1.2)

Cross-device backup via Supabase Auth (Google SSO) + Postgres + Realtime. Architecture ready — env vars scaffolded, `UserProfile.id` is a UUID.

### Other Planned Features

- **Android Home Screen Widget (V1.1):** Aggregate attendance % + next exam countdown.
- **Google Calendar Sync (V1.3):** Push exam dates and deadlines via OAuth.
- **Flux AI Nudges (V2.1):** Contextual nudges, auto-generated study schedule, overloaded week warnings.

---

## 14. Known Gaps

| Item | Status | Notes |
|---|---|---|
| Portal scraper | 🛠️ In Progress | Phase 1 (infrastructure + TKREC adapter) complete. See §13 and `DEV_DOCS.md §14` for details. |
| PWA icons | Empty | public/icons/ has no actual icon files -- PWA installability incomplete |
| Supabase sync | Planned | Architecture ready, not built |
| Vitest unit tests | None | src/lib/calculations.ts is the priority target |
| Playwright E2E | None | Priority: onboarding, attendance mark -> %, CGPA update |
| Android back-button | Not wired | @capacitor/app installed, App.addListener not called in main.tsx |
| Haptic feedback | Not wired | @capacitor/haptics installed, not triggered on events |
| KaTeX in Notes | Planned | richText stored as plain string currently |
| Timetable overrides | Schema only | timetableOverrides table exists, no UI |
| Flux animations | V1.1 | Lottie animations planned |
| Settings version string | Mismatch | Hardcodes v1.5; package.json has 0.1.0 |
| JetBrains Mono | Not imported | Declared in Tailwind mono but no font import -- system fallback |
| font-display Tailwind class | Undefined | Used in Sidebar.tsx wordmark, not in tailwind.config.ts -- falls back to sans |
