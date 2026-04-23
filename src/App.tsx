import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useProfileStore } from '@/stores/useProfileStore'
import { useUIStore } from '@/stores/useUIStore'

// Layout
import BottomNav from '@/components/ui/BottomNav'
import Sidebar from '@/components/ui/Sidebar'

// Pages
import OnboardingPage from '@/pages/Onboarding'
import DashboardPage from '@/pages/Dashboard'
import AttendancePage from '@/pages/Attendance'
import GradesPage from '@/pages/Grades'
import TasksPage from '@/pages/Tasks'
import AssignmentsPage from '@/pages/Assignments'
import SubjectsPage from '@/pages/Subjects'
import SemestersPage from '@/pages/Semesters'
import LabsPage from '@/pages/Labs'
import NCSPage from '@/pages/NCS'
import TimetablePage from '@/pages/Timetable'
import ExamsPage from '@/pages/Exams'
import SyllabusPage from '@/pages/Syllabus'
import NotesPage from '@/pages/Notes'
import CalendarPage from '@/pages/Calendar'
import SettingsPage from '@/pages/Settings'
import ImportPage from '@/pages/Import'
import LoginPage from '@/pages/Login'
import AuthCallbackPage from '@/pages/AuthCallback'

export default function App() {
  const { profile } = useProfileStore()
  const { isDesktop, theme } = useUIStore()

  // Apply theme class to <html> so CSS custom properties switch correctly
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  const isOnboarded = !!profile?.onboardingComplete

  // ── Auth routes (always accessible, regardless of onboarding state) ────────
  // These two routes must be reachable before onboarding completes, so they
  // are declared outside the onboarding / main-app gates below.
  const authRoutes = (
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
    </>
  )

  // ── Onboarding flow ────────────────────────────────────────────────────────
  // Narrower max-width (512px) — appropriate for a focused multi-step form.
  if (!isOnboarded) {
    return (
      <div className="flex h-full bg-bg">
        <div className="flex-1 flex flex-col w-full max-w-lg mx-auto min-w-0">
          <Routes>
            {authRoutes}
            <Route path="/onboarding/*" element={<OnboardingPage />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Routes>
        </div>
      </div>
    )
  }

  // ── Main app shell ─────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-bg">
      {/* Desktop: sidebar navigation */}
      {isDesktop && <Sidebar />}

      {/* Content column — constrained to max-w-3xl (768px) and centred.
          Applies to all 16 pages without touching individual page files.
          Mobile screens are narrower than 768px so max-w never activates there.
          Fixed-position elements (BottomNav, FAB, Modals) are viewport-relative
          and are unaffected by this wrapper. */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto min-w-0 overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/grades" element={<GradesPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/semesters" element={<SemestersPage />} />
            <Route path="/labs" element={<LabsPage />} />
            <Route path="/ncs" element={<NCSPage />} />
            <Route path="/timetable" element={<TimetablePage />} />
            <Route path="/exams" element={<ExamsPage />} />
            <Route path="/syllabus" element={<SyllabusPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/import" element={<ImportPage />} />
            {authRoutes}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {!isDesktop && <BottomNav />}
      </main>
    </div>
  )
}
