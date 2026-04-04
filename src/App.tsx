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

export default function App() {
  const { profile } = useProfileStore()
  const { isDesktop, theme } = useUIStore()

  // Apply theme to HTML tag
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  // Gate: only true after Done step sets onboardingComplete
  const isOnboarded = !!profile?.onboardingComplete

  if (!isOnboarded) {
    return (
      <Routes>
        <Route path="/onboarding/*" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <div className="flex h-full bg-bg">
      {/* Desktop: sidebar navigation */}
      {isDesktop && <Sidebar />}

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Mobile: bottom nav */}
        {!isDesktop && <BottomNav />}
      </main>
    </div>
  )
}
