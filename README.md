# AcadFlow

> **The Academic OS for Indian Engineering Students**  
> *"Your semester, under control."*

[![Version](https://img.shields.io/badge/version-0.1.0-6C63FF?style=flat-square)](package.json)
[![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20TypeScript%20%2B%20Vite-00F5D4?style=flat-square)]()
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20PWA%20%7C%20Web-2ED573?style=flat-square)]()
[![Regulation](https://img.shields.io/badge/regulation-JNTUH%20R--25-FFA502?style=flat-square)]()

---

## What is AcadFlow?

AcadFlow consolidates everything Indian engineering students track manually across 4–5 apps (or worse, paper): attendance percentages, CIE marks, CGPA, deadlines, timetable, exam countdowns, and syllabus coverage — into one offline-first, always-available app.

Built specifically around **JNTUH R-25** academic regulations, with architecture that supports VTU, Anna University, JNTUA, and other university presets without code changes.

---

## Features (V1 Scope)

| Module | Description |
|---|---|
| **Attendance Tracker** | Per-subject & aggregate %, safe-skip budget, condonation zones, bulk mark, R-25 midterm bonus hours |
| **CGPA / GPA Calculator** | SGPA per semester, CGPA with JNTUH best-160-credits rule, degree classification, what-if simulator |
| **CIE & SEE Tracker** | MT1/MT2 (Part A+B), CBT best-2-of-3 average, assignment avg, viva, SEE marks needed to pass/target grade |
| **Tasks & Deadlines** | Assignment, lab record, project, presentation — Kanban + deadline calendar, subtasks, priority flags |
| **Timetable** | Weekly period grid, lab blocks, one-off overrides (cancelled / rescheduled periods) |
| **Exam Countdown** | MT, CBT, SEE, Supplementary — live countdown timers with notification scheduling |
| **Syllabus Progress** | Unit-wise topic tracker, coverage %, linked to exam prep study sets |
| **Notes Organiser** | Subject-tagged notes, PYQs, lab manuals, external links, study sets |
| **Academic Calendar** | Holidays, college events, exam dates, deadline overlay |
| **Promotion Gate Checker** | R-25 25%-credit-gate eligibility, shortfall calculation |
| **Backlog Impact Calculator** | Simulates CGPA delta if a backlog subject is cleared at a target grade |
| **Onboarding** | 6-step guided setup: profile → university → semester → subjects |
| **Settings** | Grading scale preset, theme toggle, data export (PDF / Excel / JSON), semester archive |

---

## Tech Stack

```
React 18 + TypeScript    Component framework
Vite 5                   Build tool & dev server
Tailwind CSS v3          Utility-first styling
Zustand                  Lightweight state (persisted via IndexedDB)
Dexie.js                 IndexedDB ORM — 16-table schema
React Router v6          Client-side routing
Framer Motion            Page transitions & micro-animations
Recharts                 CGPA trend charts
Day.js                   Date/time (2KB)
React Hook Form + Zod    Type-safe forms
Capacitor v6             Android APK packaging
vite-plugin-pwa          PWA + Workbox offline caching
jspdf / SheetJS          PDF & Excel export
```

---

## Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **pnpm** (preferred — `npm install -g pnpm`)
- Android Studio (only for APK builds)

### Install & Run

```bash
# Clone
git clone https://github.com/Jalal-Syed/AcademicTracker.git
cd AcademicTracker

# Install dependencies
pnpm install

# Start dev server (http://localhost:5173)
pnpm dev

# Production build
pnpm build

# Android APK (requires Android Studio)
pnpm cap:sync
pnpm cap:open
```

### Other scripts

```bash
pnpm lint          # ESLint check
pnpm format        # Prettier format all src files
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright E2E tests
pnpm preview       # Preview production build locally
```

---

## Project Structure

```
src/
├── components/
│   ├── ui/            # Design system primitives (Button, Card, Badge, Modal…)
│   ├── attendance/    # AttendanceCard, HeatmapCalendar, BunkingBudget…
│   ├── grades/        # SubjectMarksCard, CGPAChart, WhatIfSimulator…
│   ├── tasks/         # TaskItem, KanbanBoard, DeadlineCalendar…
│   └── timetable/     # TimetableGrid, PeriodSlot, DayView…
├── constants/
│   └── grading.ts     # JNTUH R-25 grade scale, attendance zones, degree classes
├── db/
│   └── schema.ts      # Dexie AcadFlowDB — 16-table IndexedDB schema
├── hooks/
│   ├── useAttendance.ts      # Computed summaries from store + calculations
│   ├── useSubjects.ts        # Active semester subjects + colour palette
│   └── useTodaySchedule.ts   # Live timetable for today + override resolution
├── lib/
│   ├── calculations.ts  # All pure academic math (CGPA, CIE, attendance, SGPA…)
│   ├── formatters.ts    # Display helpers
│   └── notifications.ts # Capacitor local notification scheduling
├── pages/
│   ├── Onboarding/    ├── Dashboard/   ├── Attendance/
│   ├── Grades/        ├── Tasks/       ├── Timetable/
│   ├── Exams/         ├── Syllabus/    ├── Notes/
│   ├── Calendar/      └── Settings/
├── stores/            # Zustand stores (profile, semester, attendance, tasks, exams, UI)
└── types/
    └── index.ts       # All TypeScript types & interfaces
```

---

## Platforms

| Target | Method | Status |
|---|---|---|
| **Android APK** | React + Vite → Capacitor → APK | 🔨 In progress |
| **PWA** | Vite PWA Plugin + Workbox | 🔨 In progress |
| **Desktop Web** | Hosted on Vercel/Netlify | 🔨 In progress |

---

## University Support

| University | Grading Preset | Notes |
|---|---|---|
| JNTUH | ✅ R-25 (primary) | Best-160 CGPA, MT best-2-of-3, promotion gate |
| VTU | ✅ Preset | |
| Anna University | ✅ Preset | |
| JNTUA | ✅ Preset | |
| RTU / GTU / RGPV | ✅ Preset | |
| Custom | ✅ User-defined | Define your own grade points and thresholds |

---

## Build Status

| Layer | Status |
|---|---|
| Config & tooling (Vite, Tailwind, Capacitor, ESLint) | ✅ Complete |
| TypeScript types (`src/types/index.ts`) | ✅ Complete |
| IndexedDB schema (`src/db/schema.ts`) | ✅ Complete |
| Grading constants (`src/constants/grading.ts`) | ✅ Complete |
| Calculation logic (`src/lib/calculations.ts`) | ✅ Complete |
| Zustand stores (6 stores) | ✅ Complete |
| UI design system (15 primitives) | ✅ Complete |
| React hooks (3 hooks) | ✅ Complete |
| Page shells (11 pages) | ✅ Complete |
| Onboarding step components | 🔨 Next |
| Feature components (attendance, grades, tasks…) | 🔨 Upcoming |
| Notification system | 🔨 Upcoming |
| Export / reports (PDF, Excel) | 🔨 Upcoming |
| Unit tests (Vitest) | 🔨 Upcoming |
| E2E tests (Playwright) | 🔨 Upcoming |

---

## Regulation Reference

All JNTUH-specific logic (attendance thresholds, CIE structure, best-2-of-3 CBT rule, best-160-credits CGPA, promotion credit gate, SEE pass minimum, degree classification) is derived from the **JNTUH B.Tech R-25 regulation** (AY 2025–26 onwards).

Future regulation updates (R-27 etc.) are modelled as new `GradingScale` presets — zero code changes required.

---

## Mascot

**Flux** 🦉 — a small, circuit-board-winged owl whose eyes shift colour based on your academic health (green = safe, amber = watch out, red = danger zone). Appears in onboarding, empty states, and motivational nudges.

---

*Full product specification: [`AcadFlow_Product_Spec.md`](./AcadFlow_Product_Spec.md)*
