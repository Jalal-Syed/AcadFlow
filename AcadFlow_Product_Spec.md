# AcadFlow — Product Specification Document
### *The Academic OS for Indian Engineering Students*

> **Version:** 1.4 — V1 Core Complete
> **Author:** Derived from founder interview + JNTUH R-25 Academic Regulations  
> **Date:** 2026-04-02  
> **Regulation Reference:** JNTUH B.Tech R-25 (effective AY 2025–26)  
> **Status:** 🟢 All files complete — `pnpm build` passing

---

## Table of Contents

1. [Vision & Mission](#1-vision--mission)
2. [Branding & Identity](#2-branding--identity)
3. [Target Audience](#3-target-audience)
4. [Platform Strategy](#4-platform-strategy)
5. [Tech Stack](#5-tech-stack)
6. [Feature Specifications](#6-feature-specifications)
   - 6.1 Onboarding & Profile Setup
   - 6.2 Dashboard (Home)
   - 6.3 Attendance Tracker
   - 6.4 CGPA / GPA Calculator
   - 6.5 Assignment, Deadline & Project Manager
   - 6.6 Internal Marks & End-Sem Tracker
   - 6.7 Timetable & Schedule
   - 6.8 Exam Countdown Timers
   - 6.9 Syllabus Progress Tracker
   - 6.10 Study Material & Notes Organizer
   - 6.11 Backlog Impact Calculator
   - 6.12 Holiday & College Calendar
   - 6.13 University Grading Presets
   - 6.14 Promotion Rules & Credit Gates
7. [UI / UX Design System](#7-ui--ux-design-system)
8. [Data Architecture](#8-data-architecture)
9. [Notification System](#9-notification-system)
10. [Build, Deployment & Distribution](#10-build-deployment--distribution)
11. [Future Roadmap](#11-future-roadmap)
12. [Non-Negotiables & Quality Gates](#12-non-negotiables--quality-gates)
13. [Progress Log](#13-progress-log)

---

## 1. Vision & Mission

### The Problem
Indian engineering students — across thousands of JNTUH, VTU, Anna University, JNTUA, and similar affiliated colleges — have no single reliable tool that consolidates the academic chaos of their daily life. The pain isn't grades alone. It's the fragmented, invisible mess of:
- 6–8 subjects per semester, each with independent assignment deadlines
- Lab submissions, viva, and poster presentation schedules that appear with zero notice
- Two mid-term exams per subject, averaged for 30 CIE marks, plus separate assignment and viva components — all tracked manually
- The 75% aggregate attendance rule and condonation bands hanging over every decision to attend or skip
- Mid-term exams, CBTs, end-sem, supplementary, and backlog exam dates scattered across notice boards and WhatsApp groups
- Promotion rules that gate you from the next year if credits fall below 25% of total registered

No existing tool solves this holistically. Students use 4–5 disconnected apps (or worse, paper) and still drop the ball.

### The Vision
**AcadFlow** is the single Academic Operating System for Indian engineering students. It tracks everything, calculates everything, reminds you of everything, and keeps your academic life from falling apart — offline, always-available, beautiful enough that you actually want to open it.

### Core Principle
> "If it's academic and it can be tracked, AcadFlow tracks it."

---

## 2. Branding & Identity

### App Name
**AcadFlow**
- *Acad* — Academic. Immediately legible.
- *Flow* — State of being in control, smooth progress, no friction.
- Tagline: **"Your semester, under control."**
- Alt tagline: **"The academic OS you deserved from day one."**

### Mascot
**"Flux"** — a small, energetic owl with circuit-board wing patterns and glowing eyes that shift color based on your current academic health (green = great, amber = watch out, red = danger zone). Flux appears in:
- Onboarding screens (guiding the user through setup)
- Empty states ("No assignments yet — enjoy it while it lasts!")
- Motivational nudges when attendance drops or a deadline is near
- Achievement unlocks (e.g., "Full attendance week 🦉")

Flux should feel like a witty, nerdy companion — not a corporate mascot. Think Duolingo owl energy, but self-aware and slightly sarcastic.

### Logo Mark
A stylized "A" formed by two intersecting sine waves — one representing grades (peaks = exams), one representing time (x-axis = semester). Clean, geometric, works as an app icon at 48x48 px and as a full wordmark.

### Color Identity
- **Primary:** Electric Indigo `#6C63FF`
- **Accent:** Neon Cyan `#00F5D4`
- **Danger:** Vibrant Red `#FF4757`
- **Warning:** Amber Gold `#FFA502`
- **Success:** Emerald `#2ED573`
- **Background (dark):** `#0D0D14`
- **Surface (dark):** `#13131F`
- **Card (dark):** `#1A1A2E`

---

## 3. Target Audience

### Primary User
- Engineering student (B.Tech / B.E., years 1–4)
- Indian university system — JNTUH-affiliated colleges as the initial reference model
- Age: 17–22
- Device: Android smartphone (primary), laptop browser (secondary)
- Connectivity: Frequently offline or on patchy hostel Wi-Fi

### Extended Users
| Segment | Degree | Notes |
|---|---|---|
| Diploma students | 3-year polytechnic | Simpler semester structure, same attendance rules |
| Postgrad | M.Tech / M.E. | More research-oriented, fewer subjects, thesis tracking needed |
| Integrated | 5-year B.Tech+M.Tech | 10 semesters, longer arc |
| All branches | CS/IT, ECE/EEE, Mech, Civil, Chem, etc. | Branch-agnostic subject system |

### Grading System Support
| Mode | Description |
|---|---|
| 10-point CGPA | AICTE/UGC standard. Grade points: O=10, A+=9, A=8, B+=7, B=6, C=5, F=0 |
| Percentage | Direct % input and calculation |
| Custom | User-defined grade points and thresholds |
| University preset | Pre-loaded scales for JNTUH, VTU, Anna University, JNTUA, RTU, GTU, RGPV, etc. |

---

## 4. Platform Strategy

### Three Equal Targets

| Platform | Method | Priority |
|---|---|---|
| **Android App** | React + Vite → Capacitor → APK | P1 |
| **PWA** | Vite PWA Plugin + Service Worker | P1 |
| **Desktop Web** | Hosted on Vercel/Netlify, responsive layout | P1 |

### Platform-Specific Behavior
- **Android (Capacitor):** Native push notifications, haptic feedback on attendance mark, back-button handling, splash screen, status bar theming.
- **PWA:** `manifest.json` with full installability, offline caching via Workbox, background sync for reminders.
- **Desktop:** Sidebar navigation instead of bottom nav, keyboard shortcuts, wider data-dense layouts.

### Responsive Breakpoints
```
Mobile:  < 640px   → bottom nav, single column, touch-first
Tablet:  640–1024px → hybrid layout, collapsible sidebar
Desktop: > 1024px  → full sidebar, multi-column dashboard
```

---

## 5. Tech Stack

### Core Framework
| Layer | Choice | Reason |
|---|---|---|
| Framework | **React 18 + TypeScript** | Component reusability, strong ecosystem, Capacitor support |
| Build Tool | **Vite 5** | Fastest dev server, native ESM, excellent PWA plugin |
| Styling | **Tailwind CSS v3** | Utility-first, mobile-first, purge = tiny bundle |
| State Management | **Zustand** | Lightweight, no boilerplate, persists to IndexedDB easily |
| Routing | **React Router v6** | Standard, supports nested routes cleanly |
| Icons | **Lucide React** | Clean, consistent, tree-shakeable |
| Charts | **Recharts** | React-native, responsive, good for CGPA trend charts |
| Animations | **Framer Motion** | Page transitions, card reveals, gesture support |
| Date/Time | **Day.js** | 2KB alternative to moment, handles academic calendars well |
| Forms | **React Hook Form + Zod** | Type-safe, performant, zero re-renders |

### Storage
| Layer | Technology |
|---|---|
| Primary local DB | **IndexedDB** via **Dexie.js** (clean API, reactive queries) |
| App state cache | **Zustand** with `persist` middleware → IndexedDB adapter |
| File/notes blobs | IndexedDB blob storage |
| Cloud sync (future) | **Supabase** (PostgreSQL + Auth + Realtime) — architecture ready from day 1 |

### Mobile (Capacitor)
```
@capacitor/core
@capacitor/android
@capacitor/local-notifications
@capacitor/haptics
@capacitor/status-bar
@capacitor/splash-screen
@capacitor/app
```

### PWA
```
vite-plugin-pwa
workbox-window
workbox-strategies (NetworkFirst for API, CacheFirst for assets)
```

### Export / Reports
```
jspdf + jspdf-autotable  → PDF report cards
xlsx (SheetJS)           → Excel export
file-saver               → JSON/CSV download trigger
```

### Dev Tooling
```
ESLint + Prettier
Husky + lint-staged (pre-commit hooks)
Vitest (unit tests)
Playwright (E2E)
```

---

## 6. Feature Specifications

---

### 6.1 Onboarding & Profile Setup

**Trigger:** First launch only. Skippable after step 1.

**Flow:**
1. **Welcome screen** — Flux mascot intro, tagline, "Let's set up your semester" CTA
2. **Academic Profile:**
   - Full name
   - College name (free text + optional search from a preset list)
   - University affiliation (dropdown: JNTUH, VTU, Anna Univ, JNTUA, Other)
   - Degree type (B.Tech / Diploma / M.Tech / Integrated)
   - Branch / stream
   - Current semester (1–10)
   - Roll number (optional, used for display only)
3. **Grading System Setup:**
   - Auto-fill based on university selection
   - Option to override with custom grade points
   - Attendance threshold (default 75%, editable)
4. **Subject Setup for Current Semester:**
   - Add subjects one by one (name, subject code, credits, type: Theory/Lab)
   - Quick-add templates per branch (e.g., "CSE Sem 3 — JNTUH" pre-fills common subjects)
5. **Timetable Setup** — covered in 6.7
6. **Done** — Flux celebrates, dashboard loads

**Data Saved:** `userProfile`, `semesterConfig`, `subjectList`, `timetable`

---

### 6.2 Dashboard (Home)

The Dashboard is the **command center**. It must deliver the full academic health picture at a glance without any digging.

**Sections (top to bottom on mobile):**

#### 1. Header Strip
- Greeting: "Good morning, [Name] 👋"
- Current date + week number of semester
- Quick academic health badge: 🟢 On Track / 🟡 Watch Out / 🔴 Danger Zone (computed from attendance + upcoming deadlines)

#### 2. Today's Schedule Card
- Today's classes from timetable
- Each class shows: subject name, time, room (if set)
- Tap to mark attendance directly from here
- Visual indicator: completed / upcoming / missed

#### 3. Attendance Summary Strip
- **Top row:** Aggregate attendance % (large, prominent badge) with zone colour and label ("Safe" / "Condonable" / "Detained Risk")
- **Below:** Horizontal scroll of per-subject attendance cards
- Each card: subject name, current %, color-coded per zone table
- Tap any card → full per-subject attendance detail
- Mid-term bonus hours shown as a separate "+Xh bonus" tag if applicable

#### 4. Upcoming Deadlines
- Next 3–5 items from the Assignment/Exam manager
- Sorted by urgency (days remaining)
- Color-coded urgency: green (>7 days), amber (3–7 days), red (<3 days), black (overdue)

#### 5. CGPA Snapshot
- Current cumulative CGPA (large, prominent)
- This semester's predicted SGPA
- Tiny sparkline showing CGPA trend across semesters

#### 6. Flux Nudge Card
- One dynamic, contextual tip from Flux
- Examples: "You can skip 2 more classes in Data Structures safely.", "DBMS internal is in 3 days. You've not added any notes yet.", "You've had full attendance this week 🔥"

---

### 6.3 Attendance Tracker

The most-used daily feature. Must be frictionless to mark and powerful to analyze.

#### Marking Attendance
- **From Dashboard:** Tap today's class → mark Present / Absent / Late / OD (On Duty) / Medical
- **From Attendance module:** Full subject list, mark any date retroactively
- **Bulk entry:** "I missed all classes from [date] to [date]" — marks all as absent in one tap
- **Swipe gesture:** Swipe right on a class = Present, swipe left = Absent (configurable)

#### Per-Subject View
For each subject, display:
- Total classes held
- Classes attended
- Current attendance % (large, circular progress indicator)
- **Bunking Budget:** "You can miss X more classes and stay above 75%"
- **Catch-up Alert:** "You need to attend the next Y classes consecutively to recover"
- Calendar heatmap of attendance (like GitHub contribution graph, per subject)
- Monthly trend chart

#### Attendance Rules (JNTUH R-25 — Clause 7)

> ⚠️ **Critical:** JNTUH attendance eligibility is calculated as **aggregate across ALL subjects** in a semester — not per-subject independently. The app tracks per-subject for granularity but must prominently display the **aggregate %** that determines exam eligibility.

| Rule | JNTUH R-25 Value | Configurable in App? |
|---|---|---|
| Minimum aggregate threshold | **75%** | Yes (other universities may differ) |
| Condonation band | **65–74%** (up to 10% shortage, on valid grounds + fee) | Display only — user manually applies |
| Non-condonable zone | **Below 65%** — no exceptions, student is detained | Hard-coded, cannot be overridden |
| Mid-term attendance bonus | **+2 hours per theory subject** if student appears for that subject's mid-term exam (Clause 7.4) | Toggle on/off per subject |
| On Duty (OD) | Counted as present | Toggle on/off |
| Medical leave | Show separately; user decides if college excludes it | Toggle on/off |
| Detained consequence | Registration cancelled, internal marks voided, must re-register next year | Informational warning only |

#### Attendance Zones & UI Colours
| Zone | Aggregate % | Meaning | Colour |
|---|---|---|---|
| Safe | ≥ 85% | No risk, comfortable buffer | Emerald `#2ED573` |
| Okay | 75–84% | Above threshold, low buffer | Teal `#00C9B1` |
| Condonable | 65–74% | Below threshold but may be condoned (fee + grounds) | Amber `#FFA502` |
| Critical | < 65% | Non-condonable — student will be detained | Red `#FF4757` |

#### Bunking Budget Formula
```
// Per-subject safe-skip counter (informational, not the eligibility metric)
per_subject_safe_skips = floor(total_classes_held × 0.75) - classes_attended
if per_subject_safe_skips < 0: show "You need to attend N more classes in [Subject]"

// Aggregate eligibility (the real JNTUH metric)
total_classes_all_subjects = sum of classes held across all subjects
total_attended_all_subjects = sum of attended across all subjects (+ mid-term bonus hours)
aggregate_pct = (total_attended / total_classes) × 100

aggregate_safe_skips = total_classes_all_subjects - floor(total_classes_all_subjects × 0.75)
                       - (total_classes_all_subjects - total_attended_all_subjects)
```

The **dashboard prominently shows aggregate %** with a clear label. Per-subject % is shown as a secondary breakdown.

#### Semester-wide Summary
- Overall attendance % across all subjects
- Subjects at risk (below threshold)
- Total working days vs holidays

---

### 6.4 CGPA / GPA Calculator

#### Modes

**Mode 1: Semester GPA Calculator**
- Input: Grade/marks for each subject in a semester + their credits
- Output: SGPA for that semester
- Supports: O/A+/A/B+/B/C/F grade input OR raw marks (auto-converts to grade)

**Mode 2: Cumulative CGPA**
- Pulls all semester SGPAs and credits
- Calculates running CGPA
- Displays semester-wise breakdown table
- CGPA trend line chart across all semesters

**Mode 3: What-If Simulator**
- Select a semester
- Adjust expected grades for subjects
- See real-time CGPA update as you drag/change inputs
- "What grade do I need in End-Sem to get an A in this subject?"
- "What SGPA do I need this semester to reach 8.0 CGPA overall?"

**Mode 4: Target CGPA Calculator**
- Input: Desired final CGPA, semesters remaining
- Output: Required SGPA per remaining semester
- Shows if target is achievable and how hard

#### JNTUH Grading Scale (R-25, Clause 10.3)
| Marks Range | Grade | Grade Point |
|---|---|---|
| ≥ 90 | O (Outstanding) | 10 |
| 80–89 | A+ (Excellent) | 9 |
| 70–79 | A (Very Good) | 8 |
| 60–69 | B+ (Good) | 7 |
| 50–59 | B (Average) | 6 |
| 40–49 | C (Pass) | 5 |
| < 40 | F (Fail) | 0 |
| Absent | Ab | 0 |

**Pass condition (Clause 8.1):** Student must score **≥ 35% in SEE (21/60 marks)** AND **≥ 40% overall (40/100 marks)** to earn a C grade and the credits.

#### SGPA & CGPA Formulae (Clause 10.9 / 10.11)
```
SGPA = Σ(Ci × Gi) / Σ(Ci)
CGPA = best 160 of 164 registered credits
Percentage = (Final CGPA − 0.5) × 10
```

#### Degree Classification (Clause 17)
| CGPA Range | Class | Conditions |
|---|---|---|
| ≥ 7.5 | **First Class with Distinction** | All courses passed in first appearance; never detained |
| ≥ 7.5 (conditions not met) | **First Class** | — |
| ≥ 6.5 and < 7.5 | **First Class** | — |
| ≥ 5.5 and < 6.5 | **Second Class** | — |
| ≥ 5.0 and < 5.5 | **Pass Class** | — |

---

### 6.5 Assignment, Deadline & Project Manager

**Views:** List / Calendar / Subject / Kanban. Task types: Assignment / Lab / Project / Presentation / Viva / Other. Priorities: Low / Medium / High / Critical. Supports sub-tasks, recurring tasks, swipe-to-complete, FAB quick-add, deadline conflict detection.

---

### 6.6 Internal Marks & End-Sem Tracker

Theory CIE = best-2-of-3(MT1, MT2, CBT) avg (30) + Assignment avg (5) + Viva (5) = 40. SEE = 60. Pass: SEE ≥ 21 AND total ≥ 40. Lab CIE: 4 × 10 components. App back-calculates SEE needed per grade target.

---

### 6.7 Timetable & Schedule

Weekly repeating Mon–Sat grid, up to 8 periods/day. Override individual dates (cancelled / rescheduled / extra). Subject color coding consistent across all modules. Conflict detection.

---

### 6.8 Exam Countdown Timers

Types: Mid-Term 1/2, CBT, SEE, Supplementary, Lab SEE, Viva, Field Project, Internship, Project Viva. Full countdown display, timeline view, auto-scheduled notifications.

---

### 6.9 Syllabus Progress Tracker

Per-subject units → topics. Status: Not Started / In Progress / Completed / Revision Done. Progress bars. Urgency indicator synced with exam countdown.

---

### 6.10 Study Material & Notes Organizer

Organized by Semester → Subject → Category. Stores links, rich text notes (KaTeX support), tags. Study set grouping. No file cloud storage in V1 — links only.

---

### 6.11 Backlog Impact Calculator

Before/After CGPA comparison when failing a subject. Simulates supplementary score → new CGPA. Credit gate recovery path.

---

### 6.12 Holiday & College Calendar

Monthly view with 6 event type colors. Adding a holiday auto-skips timetable attendance for that day. Semester start/end configurable.

---

### 6.13 University Grading Presets

Pre-loaded: JNTUH, JNTUA, VTU, Anna University, RTU, GTU, RGPV, AKTU, OU, AU. Full `GradingScale` object per preset. Fully overridable.

---

### 6.14 Promotion Rules & Credit Gates (R-25, Clause 14)

Credit gates at end of Year 1 (Sem 2) and Year 2 (Sem 4): must earn ≥ 25% of total registered credits. App shows Promotion Eligibility Card. MEME exit eligibility shown after Sem 4. Graduation tracker: X of 160 credits earned.

---

## 7. UI / UX Design System

**Design Language: Glassmorphic Dark Neon.** Dark-first (`#0D0D14`), glass cards (`backdrop-blur: 12px`), Electric Indigo + Neon Cyan neon accents, 4 elevation levels.

**Typography:** Space Grotesk (display), DM Sans (body), JetBrains Mono (numbers).

**Navigation:** Mobile = bottom nav (5 tabs, glass bg, glow underline on active). Desktop = left sidebar (240px, collapsible to 64px).

**Animations:** Framer Motion page transitions, staggered card mounts, progress bar width animations, attendance pulse, CGPA counter roll.

**Light mode:** Full token set under `[data-theme="light"]`. Dark is default, respects `prefers-color-scheme`.

---

## 8. Data Architecture

**Local-first.** Dexie.js → IndexedDB. Zustand for app state cache. Supabase cloud sync architecturally prepared, not built in V1.

Key tables: `userProfile`, `semesters`, `subjects`, `attendanceRecords`, `timetableSlots`, `timetableOverrides`, `tasks`, `examRecords`, `notes`, `syllabusUnits`, `syllabusTopic`, `holidays`, `gradingScales`.

Export: full JSON backup + PDF report card via jsPDF.

---

## 9. Notification System

Capacitor Local Notifications (Android) + Web Push API (PWA). Triggers: assignment due (24h/1h), exam countdown (7d/3d/1d/morning), CBT reminder (3d), supply exam (7d/3d), attendance danger (on drop), daily class (15min before), overdue tasks (9 AM daily). All individually toggleable in Settings.

---

## 10. Build, Deployment & Distribution

**Dev:** `pnpm dev`. **Build:** `pnpm build` (tsc + vite build). **Android:** `pnpm cap:sync && pnpm cap:open` → Android Studio → signed APK/AAB.

**Web:** Vercel, zero-config. Domain: `acadflow.in` / `acadflow.app`. CI/CD: GitHub Actions → auto-deploy on main.

**Play Store:** Target API 34, min SDK 24, Education category, free, no ads.

---

## 11. Future Roadmap

**V1.1:** Flux Lottie animations, onboarding tutorial overlay, Android home screen widget, semester archive.
**V1.2:** Supabase auth (Google SSO), background sync, cross-device restore.
**V1.3:** JNTUH portal scraper, CSV ERP import, Google Calendar sync.
**V2.0:** QR timetable sharing, anonymous CGPA leaderboard, shared study sets.
**V2.1:** AI deadline prioritization, study schedule generator, smarter Flux predictions.

---

## 12. Non-Negotiables & Quality Gates

- FCP < 1.5s on 4G, TTI < 3s on Snapdragon 665-class
- Lighthouse PWA ≥ 90, Performance ≥ 85, bundle < 400KB gzipped
- 100% offline for core features, zero data loss (Dexie atomic transactions)
- Unit tests for all calculation logic, E2E for onboarding / attendance / tasks / CGPA
- WCAG AA contrast, 44×44px tap targets, color never sole status indicator

---

*End of AcadFlow Product Specification v1.3*

> **Regulation Reference:** JNTUH B.Tech R-25 (AY 2025–26 onwards). All future regulation changes should be modelled as new `GradingScale` presets — the architecture supports this without code changes.

---

## 13. Progress Log

> **Rule:** This section is updated after EVERY filesystem change — no exceptions.

---

### 13.1 Decisions Locked

| Decision | Choice | Reason |
|---|---|---|
| Package Manager | **pnpm** | Fastest installs, strict hoisting, disk-efficient |
| Starting Point | **Full scaffold + Design System** | Build the right foundation once |
| Project Root | `C:\Users\hehehe\Documents\Dev\AcadFlow\` | Local dev path |
| GitHub Repo | `github.com/Jalal-Syed/AcademicTracker.git` | Existing repo |

---

### 13.2 Complete File Inventory

#### Root & Config (Session 1)
| File | Status |
|---|---|
| `package.json` | ✅ |
| `vite.config.ts` | ✅ |
| `tsconfig.json` | ✅ |
| `tsconfig.node.json` | ✅ |
| `tailwind.config.ts` | ✅ |
| `postcss.config.js` | ✅ |
| `.env.example` | ✅ |
| `.eslintrc.cjs` | ✅ |
| `.gitignore` | ✅ |
| `.prettierrc` | ✅ |
| `capacitor.config.ts` | ✅ |
| `index.html` | ✅ |
| `README.md` | ✅ |
| `AcadFlow_Product_Spec.md` | ✅ |

#### App Shell & Core (Session 1)
| File | Status |
|---|---|
| `src/main.tsx` | ✅ |
| `src/App.tsx` | ✅ |
| `src/index.css` | ✅ |
| `src/types/index.ts` | ✅ |
| `src/db/schema.ts` | ✅ |
| `src/constants/grading.ts` | ✅ |
| `src/lib/calculations.ts` | ✅ |
| `src/lib/notifications.ts` | ✅ |

#### Zustand Stores (Session 1)
| File | Status |
|---|---|
| `src/stores/useProfileStore.ts` | ✅ |
| `src/stores/useSemesterStore.ts` | ✅ |
| `src/stores/useAttendanceStore.ts` | ✅ |
| `src/stores/useTaskStore.ts` | ✅ |
| `src/stores/useExamStore.ts` | ✅ |
| `src/stores/useUIStore.ts` | ✅ |

#### Hooks (Session 2)
| File | Status |
|---|---|
| `src/hooks/useAttendance.ts` | ✅ |
| `src/hooks/useSubjects.ts` | ✅ |
| `src/hooks/useTodaySchedule.ts` | ✅ |

#### Design System — UI Primitives (Session 2)
| File | Status |
|---|---|
| `src/components/ui/Button.tsx` | ✅ |
| `src/components/ui/Card.tsx` | ✅ |
| `src/components/ui/Badge.tsx` | ✅ |
| `src/components/ui/ProgressRing.tsx` | ✅ |
| `src/components/ui/ProgressBar.tsx` | ✅ |
| `src/components/ui/BottomNav.tsx` | ✅ |
| `src/components/ui/Sidebar.tsx` | ✅ |
| `src/components/ui/Modal.tsx` | ✅ |
| `src/components/ui/Input.tsx` | ✅ |
| `src/components/ui/Select.tsx` | ✅ |
| `src/components/ui/Chip.tsx` | ✅ |
| `src/components/ui/FAB.tsx` | ✅ |
| `src/components/ui/EmptyState.tsx` | ✅ |
| `src/components/ui/Skeleton.tsx` | ✅ |
| `src/components/ui/Toast.tsx` | ✅ |

#### Feature Components (Session 3)
| File | Status |
|---|---|
| `src/components/attendance/AttendanceCard.tsx` | ✅ |
| `src/components/attendance/BunkingBudget.tsx` | ✅ |
| `src/components/attendance/HeatmapCalendar.tsx` | ✅ |
| `src/components/grades/SubjectMarksCard.tsx` | ✅ |
| `src/components/grades/CGPAChart.tsx` | ✅ |
| `src/components/grades/WhatIfSimulator.tsx` | ✅ Upgraded — per-subject grade target grid, tap-to-set slider, SGPA target calculator, pass condition display |
| `src/components/tasks/TaskItem.tsx` | ✅ |

#### Onboarding Steps (Session 3)
| File | Status |
|---|---|
| `src/pages/Onboarding/index.tsx` | ✅ |
| `src/pages/Onboarding/steps/Welcome.tsx` | ✅ |
| `src/pages/Onboarding/steps/Profile.tsx` | ✅ Fixed — `setProfile()` on first run, `updateProfile()` on revisit |
| `src/pages/Onboarding/steps/University.tsx` | ✅ |
| `src/pages/Onboarding/steps/Semester.tsx` | ✅ |
| `src/pages/Onboarding/steps/Subjects.tsx` | ✅ |
| `src/pages/Onboarding/steps/Done.tsx` | ✅ |

#### Pages (Sessions 2–3)
| File | Status |
|---|---|
| `src/pages/Dashboard/index.tsx` | ✅ Full implementation |
| `src/pages/Attendance/index.tsx` | ✅ Full implementation |
| `src/pages/Grades/index.tsx` | ✅ Full implementation |
| `src/pages/Tasks/index.tsx` | ✅ Full implementation — filter tabs (all/overdue/today/upcoming/done), add modal |
| `src/pages/Assignments/index.tsx` | ✅ Full implementation — task-store-backed dedicated view for assignments, filtering and specific types |
| `src/pages/Timetable/index.tsx` | ✅ Full implementation — day selector, slot list, add/delete period modal |
| `src/pages/Exams/index.tsx` | ✅ Full implementation — live countdown chips, filtering, upcoming/past sections, edit/add modal |
| `src/pages/Syllabus/index.tsx` | ✅ Full implementation — subject list → unit/topic drill-down, status cycling, unit/topic add |
| `src/pages/Notes/index.tsx` | ✅ Full implementation — subject + category filters, pin/unpin, delete, external links |
| `src/pages/Calendar/index.tsx` | ✅ Full implementation — monthly calendar view with holidays, exams, and task deadlines |
| `src/pages/Settings/index.tsx` | ✅ Full implementation — profile management, university/grading, theme toggling, data management |
| `src/pages/Subjects/index.tsx` | ✅ Full implementation — subjects management with color-coded grouped views |
| `src/pages/Semesters/index.tsx` | ✅ Full implementation — semesters management with active/archive logic and progress tracking |
| `src/pages/Labs/index.tsx` | ✅ Full implementation — lab marks entry page with CIE/SEE breakdowns |
| `src/pages/NCS/index.tsx` | ✅ Full implementation — no-credit subjects tracker with attendance checks |

---

### 13.3 Build Fix Log

#### Build Fix Session — 2026-04-01

> `pnpm build` failed with TypeScript strict-mode errors (TS6133 unused imports/variables).  
> All errors were unused imports or variables — zero logic changes required.

| File | Fix Applied |
|---|---|
| `src/components/attendance/AttendanceCard.tsx` | Removed unused `import { ATTENDANCE_ZONES }` — the import was never referenced anywhere in the component |
| `src/components/grades/SubjectMarksCard.tsx` | Removed unused `clsx` import |
| `src/components/tasks/TaskItem.tsx` | Removed unused `onDelete` destructure; replaced non-existent `dueDate.isToday?.()` with `dueDate.isSame(dayjs(), 'day')` |
| `src/components/ui/Skeleton.tsx` | Added `style?: CSSProperties` to `SkeletonProps` interface |
| `src/hooks/useAttendance.ts` | Replaced unmaintainable conditional type inference with explicit typed signatures |
| `src/lib/calculations.ts` | Removed unused imports: `LabMarks`, `CGPAResult`, `JNTUH_TOTAL_CREDITS` |
| `src/pages/Attendance/index.tsx` | Removed unused `summaries` destructure |
| `src/pages/Grades/index.tsx` | Removed unused imports; fixed `useLiveQuery` generic types |
| `src/pages/Onboarding/index.tsx` | Removed unused `db` import |
| `src/pages/Onboarding/steps/University.tsx` | Removed unused `degree` variable from `watch()` |

**Current build status: ✅ Passing** — `pnpm build` completes with 0 errors.

---

### 13.4 Install & Run

```bash
cd C:\Users\hehehe\Documents\Dev\AcadFlow

pnpm install
pnpm dev           # http://localhost:5173

pnpm build         # tsc + vite build → dist/
pnpm cap:sync      # sync to Android project
pnpm cap:open      # open Android Studio → build APK
```

---

### 13.5 Session 4 — Developer Progress Update

> Fetched and audited on 2026-04-02. Changes made directly by developer since Session 3.

#### Pages promoted from stubs to full implementations
| Page | What was built |
|---|---|
| `Tasks` | Filter tabs (all/overdue/today/upcoming/done), add-task modal with type/priority/subject/due-datetime, live pending count |
| `Timetable` | Day selector bar with per-day slot counts, period cards with colour strips, add/delete period modal |
| `Exams` | Improved — live countdown chips (d/h/m) with 1m tick, upcoming/past split, subject and type filters, edit exam modal |
| `Syllabus` | Two-screen drill-down: subject list → unit/topic detail; topic status cycles on tap (NotStarted→InProgress→Completed→RevisionDone); per-unit and overall progress bars |
| `Notes` | Subject + category dual filter, pin/unpin, delete, external link support, textarea for quick notes |
| `Assignments` | New — Task-store-backed dedicated view for assignments with filtering (Overdue, This Week, etc.) and specific assignment-type categorization |
| `Calendar` | New — Monthly calendar grid that aggregates holidays, exams, and task deadlines |
| `Settings` | New — Profile management, university/grading scale configuration, theme toggling, and data management (Export/Import/Clear) |
| `Subjects` | New — Management view for subjects, color-coded cards, type categorization (Theory/Lab/NoCredit), CRUD |
| `Semesters` | New — Semester management with progress tracking, active/archive switching, and creation/editing |
| `Labs` | New — Dedicated lab marks tracker following JNTUH R-25 Clause 9.5 (CIE 40/SEE 60 breakdown) |
| `NCS` | New — Dedicated view for No-Credit subjects tracking with R-25 impact notices |

#### Component upgrades
| Component | Upgrade |
|---|---|
| `WhatIfSimulator.tsx` | Per-subject grade target grid (tap to set slider to exact SEE needed); SGPA target calculator with gap analysis; pass condition reminder; onboarding hint banner; SGPA colour coding |
| `App.tsx` | Extended Routes to include new Assignments, Subjects, Semesters, Labs, and NCS pages |
| `Sidebar.tsx` | Extended navigation Sidebar to include the newly integrated pages |

#### Bug fixes
| File | Fix |
|---|---|
| `steps/Profile.tsx` | First-run now calls `setProfile()` to create a full profile object; revisits use `updateProfile()` |
| `calculations.ts` | `safeSkips`/`catchUpNeeded` intentionally zeroed in `calcSubjectAttendance` — JNTUH R-25 uses aggregate attendance for detention, not per-subject |
| `App.tsx` / `Exams.tsx` | Resolved deep TS lint errors over unused variables post refactoring |

#### Still pending
| File | Status |
|---|---|
| `N/A` | `✨ All application pages fully implemented.` |

---

*Spec last updated: 2026-04-02 — v1.4. All 68 core files fully implemented. Ready for next QA/E2E testing phase.*
