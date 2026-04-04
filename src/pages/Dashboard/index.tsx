/**
 * Dashboard — Home page  Spec §6.2
 * Sections: header · attendance strip · today's schedule ·
 *           assignments (always visible) · upcoming exams (always visible)
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { BookOpen, CheckSquare, CalendarClock, ArrowRight } from 'lucide-react'
import { useProfileStore }    from '@/stores/useProfileStore'
import { useAttendanceStore } from '@/stores/useAttendanceStore'
import { useSemesterStore }   from '@/stores/useSemesterStore'
import { useTaskStore }       from '@/stores/useTaskStore'
import { useExamStore }       from '@/stores/useExamStore'
import { useAttendance }      from '@/hooks/useAttendance'
import { useSubjects }        from '@/hooks/useSubjects'
import { useTodaySchedule }   from '@/hooks/useTodaySchedule'
import BunkingBudget          from '@/components/attendance/BunkingBudget'
import TaskItem               from '@/components/tasks/TaskItem'
import { CardSkeleton }       from '@/components/ui/Skeleton'

export default function DashboardPage() {
  const { profile }          = useProfileStore()
  const { activeSemesterId } = useSemesterStore()
  const { subjects }         = useSubjects()
  const { loadRecords }      = useAttendanceStore()
  const { tasks, loadTasks, completeTask } = useTaskStore()
  const { exams, loadExams } = useExamStore()
  const { aggregate, isLoaded }    = useAttendance()
  const { periods, isLoading: scheduleLoading, todayLabel } = useTodaySchedule()

  useEffect(() => {
    if (!activeSemesterId) return
    loadRecords(activeSemesterId)
    loadTasks(activeSemesterId)
    loadExams(activeSemesterId)
  }, [activeSemesterId, loadRecords, loadTasks, loadExams])

  const now    = dayjs()
  const hour   = now.hour()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.name?.split(' ')[0] ?? 'there'

  // Assignments: all non-done tasks, sorted soonest first
  const pendingTasks = tasks
    .filter(t => t.status !== 'Done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const overdueTasks  = pendingTasks.filter(t => t.dueDate < now.toISOString())
  const upcomingTasks = pendingTasks.filter(t => t.dueDate >= now.toISOString())

  // Exams: all upcoming, sorted soonest first
  const upcomingExams = exams
    .filter(e => dayjs(e.date).isAfter(now))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="flex-1 overflow-y-auto pb-24">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-2">
        <p className="text-text/40 text-sm">{greeting},</p>
        <h1 className="text-text text-2xl font-bold tracking-tight">{firstName} 👋</h1>
        <p className="text-text/25 text-xs mt-0.5">{now.format('dddd, D MMMM YYYY')}</p>
      </div>

      <div className="px-4 space-y-5 mt-4">

        {/* ── Attendance strip ───────────────────────────────────── */}
        {subjects.length > 0 && (
          !isLoaded
            ? <CardSkeleton />
            : aggregate
              ? <BunkingBudget aggregate={aggregate} threshold={profile?.attendanceThreshold} />
              : null
        )}

        {/* ── Today's schedule ───────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-text/50 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CalendarClock size={13} /> Today · {todayLabel}
            </h2>
            <Link to="/timetable" className="text-[#6C63FF] text-xs flex items-center gap-0.5 hover:underline">
              Manage <ArrowRight size={11} />
            </Link>
          </div>

          {scheduleLoading ? (
            <CardSkeleton />
          ) : periods.length === 0 ? (
            <div className="rounded-xl border border-border/[0.05] bg-white/[0.02] px-4 py-3 text-center">
              <p className="text-text/25 text-xs">No classes today — set up your timetable to see them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {periods.map(p => (
                <div key={p.slotId}
                  className="flex items-center gap-3 bg-card/50 border border-border/[0.06] rounded-xl px-3 py-2.5">
                  <div className="text-right shrink-0 w-12">
                    <p className="text-text/60 text-xs font-mono">{p.startTime}</p>
                    <p className="text-text/25 text-[10px] font-mono">{p.endTime}</p>
                  </div>
                  <div className="w-px h-8 bg-white/[0.08]" />
                  <div className="flex-1 min-w-0">
                    {p.subject ? (
                      <>
                        <p className="text-text text-sm font-medium truncate">{p.subject.name}</p>
                        <p className="text-text/30 text-xs">
                          {p.subject.code}{p.room ? ` · ${p.room}` : ''}{p.isLab ? ' · Lab' : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-text/25 text-sm italic">{p.label ?? 'Break'}</p>
                    )}
                  </div>
                  {p.subject && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.subject.color }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Assignments ────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className={`text-xs uppercase tracking-wider flex items-center gap-1.5 font-semibold ${
              overdueTasks.length > 0 ? 'text-[#FF4757]' : 'text-text/50'
            }`}>
              <CheckSquare size={13} />
              Assignments
              {overdueTasks.length > 0 && (
                <span className="bg-[#FF4757] text-text text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                  {overdueTasks.length} overdue
                </span>
              )}
            </h2>
            <Link to="/assignments" className="text-[#6C63FF] text-xs flex items-center gap-0.5 hover:underline">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/[0.07] px-4 py-5 text-center space-y-1">
              <p className="text-text/30 text-sm">No pending assignments 🎉</p>
              <p className="text-text/15 text-xs">Add one from the Assignments page</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Show overdue first, then up to 3 upcoming */}
              {overdueTasks.slice(0, 2).map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  subject={subjects.find(s => s.id === task.subjectId)}
                  onComplete={completeTask}
                />
              ))}
              {upcomingTasks.slice(0, 3).map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  subject={subjects.find(s => s.id === task.subjectId)}
                  onComplete={completeTask}
                />
              ))}
              {pendingTasks.length > 5 && (
                <Link
                  to="/assignments"
                  className="block text-center text-xs text-[#6C63FF] py-2 hover:underline"
                >
                  +{pendingTasks.length - 5} more — view all
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ── Upcoming Exams ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-text/50 text-xs uppercase tracking-wider flex items-center gap-1.5 font-semibold">
              <BookOpen size={13} /> Upcoming Exams
              {upcomingExams.length > 0 && (
                <span className="bg-[rgba(108,99,255,0.2)] text-[#6C63FF] text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {upcomingExams.length}
                </span>
              )}
            </h2>
            <Link to="/exams" className="text-[#6C63FF] text-xs flex items-center gap-0.5 hover:underline">
              Manage <ArrowRight size={11} />
            </Link>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/[0.07] px-4 py-5 text-center space-y-1">
              <p className="text-text/30 text-sm">No exams scheduled</p>
              <p className="text-text/15 text-xs">Add your mid-terms, CBTs, and end-sems</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingExams.slice(0, 5).map(exam => {
                const daysLeft = dayjs(exam.date).diff(now, 'day')
                const subject  = subjects.find(s => s.id === exam.subjectId)
                return (
                  <div
                    key={exam.id}
                    className="flex items-center gap-3 bg-card/50 border border-border/[0.06] rounded-xl px-3 py-2.5"
                  >
                    {/* Countdown pill */}
                    <div
                      className="shrink-0 text-center w-11 py-1 rounded-lg"
                      style={{
                        backgroundColor: daysLeft <= 3 ? 'rgba(255,71,87,0.15)'
                          : daysLeft <= 7 ? 'rgba(255,165,2,0.12)'
                          : 'rgba(108,99,255,0.12)',
                      }}
                    >
                      <p
                        className="text-sm font-bold font-mono leading-none"
                        style={{
                          color: daysLeft <= 3 ? '#FF4757'
                            : daysLeft <= 7 ? '#FFA502'
                            : '#6C63FF',
                        }}
                      >
                        {daysLeft}
                      </p>
                      <p className="text-[9px] text-text/25 leading-none mt-0.5">days</p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-text text-sm font-medium truncate">{exam.name}</p>
                      <p className="text-text/35 text-xs">
                        {subject ? `${subject.code} · ` : ''}{dayjs(exam.date).format('D MMM, h:mm A')}
                      </p>
                    </div>

                    {subject && (
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                    )}
                  </div>
                )
              })}
              {upcomingExams.length > 5 && (
                <Link
                  to="/exams"
                  className="block text-center text-xs text-[#6C63FF] py-2 hover:underline"
                >
                  +{upcomingExams.length - 5} more exams
                </Link>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
