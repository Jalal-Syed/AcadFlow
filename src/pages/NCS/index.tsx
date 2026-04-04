/**
 * NCS — No Credit Subjects / Value-Added / Skill Development Courses
 * Per JNTUH R-25 Clauses 9.9, 9.10, 24
 * These have zero credit weight and don't impact CGPA.
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useSubjects } from '@/hooks/useSubjects'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import type { AttendanceRecord } from '@/types'
import {
  Hash, BookOpen, CheckCircle2, Clock,
  Info, TrendingUp,
} from 'lucide-react'

export default function NCSPage() {
  const { activeSemesterId } = useSemesterStore()
  const { subjects } = useSubjects()

  const ncsSubjects = subjects.filter(s => s.type === 'NoCredit')

  const allRecords = useLiveQuery<AttendanceRecord[]>(
    () => activeSemesterId
      ? db.attendanceRecords.where('semesterId').equals(activeSemesterId).toArray()
      : Promise.resolve([]),
    [activeSemesterId]
  ) ?? []

  const getAttendance = (subjectId: string) => {
    const records = allRecords.filter(r => r.subjectId === subjectId)
    const held = records.filter(r => r.status !== 'Cancelled' && r.status !== 'Holiday').length
    const attended = records.filter(r => r.status === 'Present' || r.status === 'Late').length
    return { held, attended, pct: held === 0 ? null : Math.round((attended / held) * 100) }
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text text-xl font-bold">No Credit Subjects</h1>
          <p className="text-text/30 text-xs mt-0.5">
            Value-added & skill development courses
          </p>
        </div>
        <Badge variant="warning" size="sm">
          <Hash size={10} className="mr-1" />{ncsSubjects.length} course{ncsSubjects.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Info banner */}
      <div className="bg-[rgba(108,99,255,0.06)] border border-[#6C63FF]/20 rounded-xl px-4 py-3 flex gap-3">
        <Info size={14} className="text-[#6C63FF] shrink-0 mt-0.5" />
        <div className="text-xs text-text/50 leading-relaxed">
          <p>No-credit subjects (VAC, SDC) <span className="text-text/70 font-medium">do not count towards CGPA</span> or the 160-credit graduation requirement.</p>
          <p className="mt-1 text-text/30">However, attendance in these courses is part of the aggregate attendance calculation for exam eligibility (R-25 Clause 7).</p>
        </div>
      </div>

      {ncsSubjects.length === 0 ? (
        <EmptyState
          title="No non-credit subjects"
          description="Add subjects with type 'No Credit' from the Subjects page to track them here."
        />
      ) : (
        <div className="space-y-3">
          {ncsSubjects.map(subject => {
            const { held, attended, pct } = getAttendance(subject.id)
            const status = pct === null ? 'not-started' : pct >= 75 ? 'on-track' : 'at-risk'

            return (
              <div
                key={subject.id}
                className="rounded-2xl border border-border/[0.07] bg-card/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${subject.color}18`, border: `1px solid ${subject.color}30` }}
                    >
                      <BookOpen size={16} style={{ color: subject.color }} />
                    </div>
                    <div>
                      <p className="text-text text-sm font-semibold">{subject.name}</p>
                      <p className="text-text/25 text-[10px] font-mono">{subject.code} · 0 credits (audit)</p>
                    </div>
                  </div>
                  <div>
                    {status === 'on-track' && (
                      <Badge variant="success" size="sm"><CheckCircle2 size={9} className="mr-0.5" />On Track</Badge>
                    )}
                    {status === 'at-risk' && (
                      <Badge variant="danger" size="sm"><TrendingUp size={9} className="mr-0.5" />At Risk</Badge>
                    )}
                    {status === 'not-started' && (
                      <Badge variant="default" size="sm"><Clock size={9} className="mr-0.5" />No Data</Badge>
                    )}
                  </div>
                </div>

                {/* Attendance row */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/[0.03] border border-border/[0.05] rounded-lg px-3 py-2 text-center">
                    <p className="text-text/25 text-[9px]">Classes Held</p>
                    <p className="text-text/70 text-sm font-mono font-semibold">{held}</p>
                  </div>
                  <div className="flex-1 bg-white/[0.03] border border-border/[0.05] rounded-lg px-3 py-2 text-center">
                    <p className="text-text/25 text-[9px]">Attended</p>
                    <p className="text-text/70 text-sm font-mono font-semibold">{attended}</p>
                  </div>
                  <div className="flex-1 bg-white/[0.03] border border-border/[0.05] rounded-lg px-3 py-2 text-center">
                    <p className="text-text/25 text-[9px]">Attendance</p>
                    <p className={`text-sm font-mono font-semibold ${
                      pct === null ? 'text-text/30' : pct >= 75 ? 'text-[#2ED573]' : pct >= 65 ? 'text-[#FFA502]' : 'text-[#FF4757]'
                    }`}>
                      {pct !== null ? `${pct}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {pct !== null && (
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 75 ? '#2ED573' : pct >= 65 ? '#FFA502' : '#FF4757',
                      }}
                    />
                  </div>
                )}

                {/* CGPA impact notice */}
                <div className="flex items-center gap-2 px-1">
                  <Hash size={10} className="text-text/15" />
                  <p className="text-text/15 text-[9px]">Does not impact CGPA · Attendance counted for aggregate eligibility</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* R-25 reference */}
      <div className="text-center px-4 py-6 space-y-1">
        <p className="text-text/15 text-[9px]">JNTUH R-25 — Clauses 9.9, 9.10, 24</p>
        <p className="text-text/10 text-[9px]">
          Skill Development Courses (1 credit each, II-1 to III-2) are evaluated like lab courses.
          Value-Added Courses follow theory evaluation pattern.
        </p>
      </div>
    </div>
  )
}
