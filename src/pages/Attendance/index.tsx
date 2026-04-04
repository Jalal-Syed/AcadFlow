/**
 * Attendance Page — Spec §6.3
 * Per-subject attendance cards, aggregate strip, heatmap, quick-mark FAB.
 */

import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { useAttendanceStore } from '@/stores/useAttendanceStore'
import { useSemesterStore }   from '@/stores/useSemesterStore'
import { useAttendance }      from '@/hooks/useAttendance'
import { useSubjects }        from '@/hooks/useSubjects'
import AttendanceCard         from '@/components/attendance/AttendanceCard'
import BunkingBudget          from '@/components/attendance/BunkingBudget'
import HeatmapCalendar        from '@/components/attendance/HeatmapCalendar'
import FAB                    from '@/components/ui/FAB'
import Modal                  from '@/components/ui/Modal'
import EmptyState             from '@/components/ui/EmptyState'
import Button                 from '@/components/ui/Button'
import { CardSkeleton }       from '@/components/ui/Skeleton'
import type { AttendanceStatus } from '@/types'

export default function AttendancePage() {
  const { activeSemesterId } = useSemesterStore()
  const { records, loadRecords, markAttendance } = useAttendanceStore()
  const { subjects }         = useSubjects()
  const { aggregate, sortedSummaries, isLoaded } = useAttendance()

  const [bulkModal, setBulkModal] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('Present')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (activeSemesterId) loadRecords(activeSemesterId)
  }, [activeSemesterId, loadRecords])

  const quickMark = async (subjectId: string, status: AttendanceStatus) => {
    if (!activeSemesterId) return
    await markAttendance({
      subjectId,
      semesterId: activeSemesterId,
      date: new Date().toISOString(),
      status,
      isMidtermBonusDay: false,
    })
  }

  const handleBulkMark = async () => {
    if (!activeSemesterId) return
    for (const id of selectedIds) {
      await markAttendance({
        subjectId: id,
        semesterId: activeSemesterId,
        date: new Date().toISOString(),
        status: bulkStatus,
        isMidtermBonusDay: false,
      })
    }
    setSelectedIds(new Set())
    setBulkModal(false)
  }

  const toggleSubject = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!subjects.length) {
    return (
      <div className="flex-1 flex items-center justify-center pb-24">
        <EmptyState
          title="No subjects yet"
          description="Add subjects in Settings to start tracking attendance."
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-28">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-text text-xl font-bold">Attendance</h1>
        <p className="text-text/30 text-xs mt-0.5">{dayjs().format('dddd, D MMMM')}</p>
      </div>

      <div className="px-4 space-y-4 mt-3">
        {/* Aggregate strip */}
        {!isLoaded ? <CardSkeleton /> : aggregate && <BunkingBudget aggregate={aggregate} />}

        {/* Heatmap */}
        <HeatmapCalendar records={records} />

        {/* Per-subject cards */}
        <h2 className="text-text/40 text-xs uppercase tracking-wider pt-1">Subjects</h2>

        {!isLoaded ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {[...sortedSummaries].sort((a, b) => {
              const subjectA = subjects.find(s => s.id === a.subjectId)
              const subjectB = subjects.find(s => s.id === b.subjectId)
              return (subjectA?.name || '').localeCompare(subjectB?.name || '')
            }).map(summary => {
              const subject = subjects.find(s => s.id === summary.subjectId)
              if (!subject) return null
              return (
                <AttendanceCard
                  key={subject.id}
                  subject={subject}
                  summary={summary}
                  onMarkPresent={() => quickMark(subject.id, 'Present')}
                  onMarkAbsent={() => quickMark(subject.id, 'Absent')}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* FAB — bulk mark */}
      <FAB
        onClick={() => { setSelectedIds(new Set(subjects.map(s => s.id))); setBulkModal(true) }}
        label="Mark Today"
      />

      {/* Bulk mark modal */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Mark Attendance" size="sm">
        <div className="space-y-4">
          {/* Status selector */}
          <div className="grid grid-cols-3 gap-2">
            {(['Present', 'Absent', 'OD'] as AttendanceStatus[]).map(s => (
              <button key={s}
                onClick={() => setBulkStatus(s)}
                className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                  bulkStatus === s
                    ? s === 'Present' ? 'bg-[rgba(46,213,115,0.2)] border-[#2ED573]/50 text-[#2ED573]'
                      : s === 'Absent' ? 'bg-[rgba(255,71,87,0.15)] border-[#FF4757]/50 text-[#FF4757]'
                      : 'bg-[rgba(108,99,255,0.15)] border-[#6C63FF]/50 text-[#6C63FF]'
                    : 'border-border/[0.08] text-text/50'
                }`}>
                {s}
              </button>
            ))}
          </div>

          {/* Subject checkboxes */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {subjects.map(s => (
              <button key={s.id}
                onClick={() => toggleSubject(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                  selectedIds.has(s.id)
                    ? 'border-[#6C63FF]/40 bg-[rgba(108,99,255,0.08)]'
                    : 'border-border/[0.06] bg-white/[0.02]'
                }`}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  selectedIds.has(s.id) ? 'bg-[#6C63FF] border-[#6C63FF]' : 'border-border/20'
                }`}>
                  {selectedIds.has(s.id) && <span className="text-text text-[10px]">✓</span>}
                </div>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-text/80 flex-1 truncate">{s.name}</span>
                <span className="text-text/30 text-xs">{s.code}</span>
              </button>
            ))}
          </div>

          <Button
            onClick={handleBulkMark}
            fullWidth
            disabled={selectedIds.size === 0}
          >
            Mark {selectedIds.size} subject{selectedIds.size !== 1 ? 's' : ''} as {bulkStatus}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
