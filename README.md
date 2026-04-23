# AcadFlow 🦉

> **The Academic OS for Indian Engineering Students**
> *"Your semester, under control."*

[![Version](https://img.shields.io/badge/version-0.1.0-6C63FF?style=flat-square)](package.json)
[![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20TypeScript%20%2B%20Vite-00F5D4?style=flat-square)]()
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20PWA%20%7C%20Electron-2ED573?style=flat-square)]()
[![Regulation](https://img.shields.io/badge/regulation-JNTUH%20R--25-FFA502?style=flat-square)]()
[![License](https://img.shields.io/badge/license-MIT-white?style=flat-square)](LICENSE)

---

## What is AcadFlow?

Indian engineering students juggle 6–8 subjects per semester — each with its own attendance counter, two mid-term exams, CBT scores, assignment deadlines, lab records, and an end-sem that can make or break your year. Tracking it all across WhatsApp groups, paper, and three disconnected apps is the status quo.

**AcadFlow** fixes that. It is a single, offline-first academic management app built around the **JNTUH R-25** regulation, with grading presets for VTU, Anna University, JNTUA, and more. Everything lives on your device — no sign-up, no internet required for core features. An optional Supabase account lets you sync data across devices.

---

## Features

| Module | What it does |
|---|---|
| **Attendance Tracker** | Per-subject and aggregate %, safe-skip budget, condonation zone warnings, bulk-mark, heatmap calendar, mid-term bonus hours (R-25 Clause 7.4) |
| **CGPA / GPA Calculator** | SGPA per semester, cumulative CGPA (JNTUH best-160-of-164 credits), degree classification, What-If simulator |
| **Internal Marks (Theory CIE)** | MT1 + MT2 (Part A + Part B), CBT best-2-of-3, assignment avg, viva. Back-calculates SEE marks needed per grade |
| **Lab Marks** | CIE: Day-to-Day + Viva + Internal Exam + Lab Report → /40. SEE: 5-component breakdown → /60 |
| **Tasks & Assignments** | Assignments, Lab Records, Projects, Presentations, Vivas — priority flags, sub-tasks, filter tabs (Overdue / Today / Upcoming / Done) |
| **Timetable** | Weekly Mon–Sat period grid, add/delete periods, live "Today's Schedule" on Dashboard |
| **Exam Countdown** | MidTerm 1/2, CBT, SEE, Supplementary, Lab SEE, Viva — live countdown (d/h/m), subject + type filters |
| **Syllabus Tracker** | Per-subject Units → Topics. Status cycles: Not Started → In Progress → Completed → Revision Done |
| **Notes Organiser** | Subject-tagged notes by category (Notes, PYQs, Reference, Lab Manual). Pin, external links |
| **Academic Calendar** | Monthly view with holidays, exam dates, and task deadlines overlaid |
| **Semesters** | Create, edit, archive, delete. Progress bar, quick links to Subjects / Labs / NCS / Syllabus |
| **Subjects** | Theory / Lab / No-Credit subject management with colour coding and live attendance preview |
| **Portal Scraper** | Import attendance + marks directly from your college portal (TKREC supported; WebView capture mode for others) |
| **Cloud Sync** | Optional Supabase-backed cross-device sync. Google OAuth + magic-link sign-in. Delta sync, last-write-wins |
| **Settings** | Grading scale, dark/light theme, JSON data export/import/reset, sync status |
| **Onboarding** | 6-step first-run flow: Welcome → Profile → University → Semester → Subjects → Done |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- Android Studio (only if building the APK locally)

### Install & Run (Web / Dev)

```bash
git clone https://github.com/Jalal-Syed/AcademicTracker.git
cd AcademicTracker
pnpm install
pnpm dev          # http://localhost:5173
```

### Environment Variables (for cloud sync)

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

The app works fully offline without these. They are only needed for the optional cross-device sync feature.

---

## Scripts

```bash
pnpm dev                  # Dev server with HMR at localhost:5173
pnpm build                # TypeScript check + Vite production build → dist/
pnpm preview              # Serve the production build locally
pnpm lint                 # ESLint
pnpm format               # Prettier
pnpm test                 # Vitest unit tests

# Android
pnpm cap:sync             # Build + sync web assets into the Android project
pnpm cap:open             # Open Android Studio (then Build → Generate Signed APK)

# Electron desktop
pnpm electron:dev         # Run as Electron desktop app in dev mode
pnpm electron:build:win   # Build Windows installer (.exe) → release-builds/
pnpm electron:build:linux # Build Linux AppImage → release-builds/
pnpm electron:build:mac   # Build macOS DMG → release-builds/
```

---

## Building for All Platforms

### The Short Answer

You cannot reliably cross-compile all platforms from a single Windows machine.
The correct workflow is to **push a version tag to GitHub** — the CI pipeline handles everything automatically.

```bash
git tag v0.2.0
git push origin v0.2.0
```

This triggers `.github/workflows/release.yml` which spins up 4 parallel jobs across GitHub-hosted runners and produces:

| Artifact | Runner | Output |
|---|---|---|
| Android APK | `ubuntu-latest` | `AcadFlow-v0.2.0-android.apk` |
| Windows installer | `windows-latest` | `AcadFlow-Setup-0.2.0.exe` |
| Linux AppImage | `ubuntu-latest` | `AcadFlow-0.2.0.AppImage` |
| macOS DMG | `macos-latest` | `AcadFlow-0.2.0.dmg` |

All 4 files are automatically attached to a GitHub Release. The update manifest files (`latest.yml`, `latest-linux.yml`, `latest-mac.yml`) are also uploaded so installed desktop apps can auto-update.

---

### Building Locally from Windows

#### Android APK (local)

1. Install [Android Studio](https://developer.android.com/studio) and accept the SDK licences.
2. Install JDK 17 (bundled with Android Studio or install separately).
3. Run:

```bash
pnpm cap:sync       # builds the web app + copies dist/ into the Android project
pnpm cap:open       # opens Android Studio
```

4. In Android Studio: **Build → Generate Signed Bundle / APK → APK → debug** (for sideloading) or set up a keystore for a release APK.

> **Note:** The CI workflow generates a debug-signed APK automatically. For Play Store distribution you need a release keystore — see [Android signing docs](https://developer.android.com/studio/publish/app-signing).

#### Windows installer (local)

```bash
pnpm electron:build:win
```

Output: `release-builds/AcadFlow Setup x.y.z.exe`

#### Linux AppImage from Windows

`electron-builder` can cross-compile Linux targets from Windows but requires [Docker Desktop](https://www.docker.com/products/docker-desktop/). Without Docker, use the CI pipeline instead.

If you have Docker running:

```bash
pnpm electron:build:linux
```

#### macOS DMG from Windows

❌ **Not possible.** macOS builds require Apple's toolchain and code-signing certificates which only run on macOS. The CI pipeline uses a `macos-latest` GitHub Actions runner for this.

---

## Desktop Auto-Updates

Once a user installs AcadFlow (Windows `.exe` or Linux `.AppImage`), the app checks for updates automatically — no manual reinstall ever needed.

### How it works

1. On startup and every 4 hours, the app calls `electron-updater` which fetches the `latest.yml` (Windows) or `latest-linux.yml` (Linux) manifest from the GitHub Release.
2. If a newer version is available, it downloads the new installer **silently in the background** while the user continues working.
3. When the download is complete, a banner appears in the app: **"Update ready — restart to install"**.
4. The user clicks **"Restart now"** or, if they dismiss it, the update installs automatically the next time they quit the app normally.

### Releasing an update

```bash
# 1. Bump the version in package.json
#    (e.g. "version": "0.1.0" → "0.2.0")

# 2. Commit and tag
git add package.json
git commit -m "chore: bump to v0.2.0"
git tag v0.2.0
git push origin main --tags

# 3. CI builds all 4 platforms and publishes the GitHub Release.
#    Installed apps will discover the update within 4 hours (or on next launch).
```

### macOS auto-updates

macOS requires the app to be **code-signed and notarized** by Apple for auto-updates to work. This requires an Apple Developer account and certificates stored as GitHub Actions secrets (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `CSC_LINK`, `CSC_KEY_PASSWORD`). Without this, macOS users download the new DMG manually from the GitHub Releases page.

---

## Project Structure

```
AcadFlow/
├── src/
│   ├── App.tsx                  # Root — routing, onboarding gate, theme, layout
│   ├── main.tsx                 # Entry point, Capacitor init, auth init, sync
│   ├── index.css                # CSS custom properties (dark/light tokens)
│   │
│   ├── types/index.ts           # All TypeScript interfaces and union types
│   ├── constants/grading.ts     # Grading scale presets, attendance zones, palette
│   ├── db/schema.ts             # Dexie AcadFlowDB — 15-table schema + auto-stamp hooks
│   │
│   ├── lib/
│   │   ├── calculations.ts      # Pure functions — attendance, CIE, SGPA, CGPA, grading
│   │   ├── notifications.ts     # Capacitor local notifications
│   │   ├── supabase.ts          # Supabase client (auth + sync)
│   │   ├── sync/index.ts        # Delta sync orchestrator (push/pull, last-write-wins)
│   │   └── scraper/             # Portal scraper (WebView capture + AI extraction)
│   │
│   ├── stores/                  # Zustand stores
│   │   ├── useProfileStore.ts
│   │   ├── useSemesterStore.ts
│   │   ├── useAttendanceStore.ts
│   │   ├── useTaskStore.ts
│   │   ├── useExamStore.ts
│   │   ├── useAuthStore.ts      # Supabase session (Google OAuth + magic link)
│   │   ├── useSyncStore.ts      # Sync state (lastSyncAt, syncStatus)
│   │   ├── usePortalStore.ts    # Portal scraper state
│   │   └── useUIStore.ts
│   │
│   ├── hooks/                   # useAttendance, useSubjects, useTodaySchedule
│   │
│   ├── components/
│   │   ├── ui/                  # 16 design system primitives
│   │   ├── attendance/          # AttendanceCard, BunkingBudget, HeatmapCalendar
│   │   ├── grades/              # SubjectMarksCard, CGPAChart, WhatIfSimulator
│   │   └── tasks/               # TaskItem
│   │
│   └── pages/                   # 18 pages
│       ├── Onboarding/          # 6-step wizard
│       ├── Login/               # Google OAuth + magic link (optional)
│       ├── AuthCallback/        # OAuth redirect handler (web + Electron + Android)
│       ├── Dashboard/
│       ├── Attendance/
│       ├── Grades/
│       ├── Tasks/ + Assignments/
│       ├── Timetable/
│       ├── Exams/
│       ├── Syllabus/
│       ├── Notes/
│       ├── Calendar/
│       ├── Subjects/ + Semesters/
│       ├── Labs/ + NCS/
│       ├── Import/              # Portal scraper UI
│       └── Settings/
│
├── electron/
│   ├── main.js                  # Main process — windows, IPC, deep-link, auto-updater
│   ├── preload.js               # contextBridge — scraperBridge, authBridge, webviewBridge, updateBridge
│   ├── scraper-bridge.js        # CORS-free HTTP fetch via Node
│   └── package.json             # electron-updater dependency
│
├── .github/workflows/
│   └── release.yml              # CI: APK + EXE + AppImage + DMG on git tag push
│
├── public/icons/                # PWA icons (192, 512, maskable)
├── capacitor.config.ts
├── vite.config.ts               # Electron-aware base path + PWA config
├── tailwind.config.ts
└── package.json
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS v3 |
| State | Zustand with persist middleware |
| Local DB | Dexie.js (IndexedDB) — 15 tables, v3 schema with delta-sync hooks |
| Routing | React Router v6 |
| Animation | Framer Motion |
| Charts | Recharts |
| Dates | Day.js |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Mobile | Capacitor v6 |
| PWA | vite-plugin-pwa + Workbox |
| Desktop | Electron 30 + electron-builder + electron-updater |
| Cloud | Supabase (auth + PostgreSQL sync) |

---

## Platform Support

| Platform | Status | Notes |
|---|---|---|
| Android (APK) | ✅ Ready | Sideload via debug APK or use Android Studio for release APK |
| PWA | ✅ Configured | Icons pending — add to `public/icons/` |
| Desktop Web | ✅ Responsive | Works in any modern browser |
| Windows (Electron) | ✅ Shipped — v0.1.0 | Auto-updates via electron-updater |
| Linux (Electron) | ✅ CI build ready | AppImage, auto-updates supported |
| macOS (Electron) | ✅ CI build ready | DMG; auto-updates require Apple code-signing |

---

## University & Grading Support

| University | Preset |
|---|---|
| JNTUH R-25 | ✅ Primary — best-2-of-3 CBT, best-160 CGPA, 75% aggregate, SEE ≥ 21 |
| VTU | ✅ |
| Anna University | ✅ |
| JNTUA | ✅ |
| Custom | ✅ — define grade points + pass thresholds in Settings |

---

## Data & Privacy

All academic data is stored **locally on your device** using IndexedDB (Dexie.js). The core app works completely offline with no account required.

**Cloud sync is opt-in.** When you sign in via Settings → Sign in to sync, your data is encrypted in transit and stored in your personal Supabase row (scoped by user ID). AcadFlow does not have access to your data.

Export a full JSON backup from **Settings → Data → Export** at any time.

---

## Upcoming

| Feature | Status |
|---|---|
| **Portal Scraper** — auto-import attendance + marks from your college portal (TKREC adapter + WebView capture mode) | 🛠️ In Progress |
| **Android Home Screen Widget** — attendance % + next exam countdown | 🗓️ Planned |
| **Google Calendar Sync** | 🗓️ Planned |
| **Flux AI Nudges** — smart attendance alerts + study schedule generator | 🗓️ Planned |
| **iOS (Capacitor)** | 🗓️ Planned — needs Mac + Apple Developer account |
| **Play Store / F-Droid release** | 🗓️ Planned — requires release keystore + store listing |

---

## Regulation Reference

All JNTUH-specific logic derives from **JNTUH B.Tech R-25** (AY 2025–26):

- Attendance: Clause 7 (aggregate eligibility), Clause 7.4 (mid-term bonus hours)
- CIE: Clause 8 (best-2-of-3, assignment avg, viva)
- Grading scale: Clause 10.3 (O / A+ / A / B+ / B / C / F)
- CGPA: Clauses 10.9 / 10.11 (best 160 of 164 credits, percentage formula)
- Degree classification: Clause 17
- Promotion gate: Clause 14 (≥ 25% registered credits per year-end)

---

*Made for students who are tired of doing academics in five different places at once.*
