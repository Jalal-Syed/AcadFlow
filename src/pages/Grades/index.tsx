/**
 * Grades Page — Spec §6.4 & §6.6
 * Shows ALL subject types: Theory (full marks card) · Lab (CIE/SEE breakdown) · NoCredit (info only)
 * SGPA is computed from Theory + Lab credits only.
 */

import { useState } from 'react'
import { db }              from '@/db/schema'
import { useLiveQuery }    from 'dexie-react-hooks'
import { useProfileStore } from '@/stores/useProfileStore'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useSubjects }     from '@/hooks/useSubjects'
import {
  computeTheoryMarks, calcSGPA, cgpaToPercentage, getDegreeClass,
  getGradeFromMarks,
} from '@/lib/calculations'
import SubjectMarksCard    from '@/components/grades/SubjectMarksCard'
import WhatIfSimulator     from '@/components/grades/WhatIfSimulator'
import ProgressBar         from '@/components/ui/ProgressBar'
import Badge               from '@/components/ui/Badge'
import EmptyState          from '@/components/ui/EmptyState'
import type { Subject, SubjectMarksComputed, TheoryMarks, LabMarks } from '@/types'

// ── Lab subject card ──────────────────────────────────────────────────────────

function LabMark({ label, value, max }: { label: string; value: number | null; max: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-mono font-bold text-text/80">
        {value !== null ? value : '—'}
      </span>
      <span className="text-[10px] text-text/25">/{max}</span>
      <span className="text-[9px] text-text/20 uppercase tracking-wide">{label}</span>
    </div>
  )
}

function LabCard({ subject, marks }: { subject: Subject; marks: LabMarks | null }) {
  const ciTotal = marks
    ? [marks.dayToDay, marks.vivaInternal, marks.internalExam, marks.labReport]
        .reduce<number>((sum, v) => sum + (v ?? 0), 0)
    : null

  const seeTotal = (marks?.seeEntered)
    ? [marks.seeWriteup, marks.seeExecution, marks.seeResults, marks.seePresentation, marks.seeVivaVoce]
        .reduce<number>((sum, v) => sum + (v ?? 0), 0)
    : null

  const total  = ciTotal !== null && seeTotal !== null ? ciTotal + seeTotal : null
  const passes = seeTotal !== null && ciTotal !== null && total !== null && total >= 40

  const gradeColor = total !== null
    ? total >= 90 ? '#2ED573' : total >= 70 ? '#00C9B1' : total >= 50 ? '#FFA502' : '#FF4757'
    : 'rgba(255,255,255,0.3)'

  return (
    <div
      className="rounded-2xl border border-border/[0.07] bg-card/[0.7] overflow-hidden"
      style={{ borderLeftColor: subject.color, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-text font-semibold text-sm">{subject.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[rgba(255,165,2,0.15)] text-[#FFA502] border border-[rgba(255,165,2,0.3)]">
              Lab
            </span>
          </div>
          <p className="text-text/35 text-xs mt-0.5">{subject.code} · {subject.credits} credits</p>
        </div>
        <div className="flex items-center gap-2">
          {total !== null && (
            <span className="text-xl font-bold font-mono" style={{ color: gradeColor }}>{total}</span>
          )}
          <Badge
            variant={marks ? (passes ? 'success' : seeTotal !== null ? 'danger' : 'warning') : 'default'}
            size="sm"
          >
            {!marks ? 'No data' : seeTotal === null ? 'Awaiting SEE' : passes ? 'Passed' : 'Failed'}
          </Badge>
        </div>
      </div>

      {/* CIE breakdown */}
      <div className="px-4 pb-3">
        <div className="bg-white/[0.03] border border-border/[0.06] rounded-xl p-3">
          <p className="text-text/30 text-[10px] uppercase tracking-wider mb-2.5">Lab CIE — /40</p>
          <div className="flex items-end justify-around gap-2">
            <LabMark label="Day-to-Day" value={marks?.dayToDay ?? null}     max={10} />
            <LabMark label="Viva Int."  value={marks?.vivaInternal ?? null} max={10} />
            <LabMark label="Int. Exam"  value={marks?.internalExam ?? null} max={10} />
            <LabMark label="Lab Report" value={marks?.labReport ?? null}    max={10} />
            <div className="w-px h-8 bg-white/[0.08]" />
            <LabMark
              label="CIE Total"
              value={ciTotal}
              max={40}
            />
          </div>
        </div>
      </div>

      {/* SEE breakdown */}
      <div className="px-4 pb-3">
        <div className="bg-white/[0.03] border border-border/[0.06] rounded-xl p-3">
          <p className="text-text/30 text-[10px] uppercase tracking-wider mb-2.5">Lab SEE — /60</p>
          <div className="flex items-end justify-around gap-2">
            <LabMark label="Write-up"   value={marks?.seeWriteup     ?? null} max={10} />
            <LabMark label="Execution"  value={marks?.seeExecution   ?? null} max={15} />
            <LabMark label="Results"    value={marks?.seeResults     ?? null} max={15} />
            <LabMark label="Present."   value={marks?.seePresentation ?? null} max={10} />
            <LabMark label="Viva"       value={marks?.seeVivaVoce    ?? null} max={10} />
            <div className="w-px h-8 bg-white/[0.08]" />
            <LabMark label="SEE Total"  value={seeTotal}                      max={60} />
          </div>
        </div>
      </div>

      {/* Total progress bar */}
      {total !== null && (
        <div className="px-4 pb-4">
          <ProgressBar value={total} max={100} showLabel height={5} />
        </div>
      )}
    </div>
  )
}

// ── No-credit subject card ────────────────────────────────────────────────────

function NoCreditCard({ subject }: { subject: Subject }) {
  return (
    <div
      className="rounded-2xl border border-border/[0.05] bg-card/40 px-4 py-3 flex items-center gap-3 opacity-70"
      style={{ borderLeftColor: subject.color, borderLeftWidth: 3 }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-text/70 text-sm font-medium truncate">{subject.name}</p>
        <p className="text-text/30 text-xs">{subject.code}</p>
      </div>
      <Badge variant="default" size="sm">No Credit</Badge>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GradesPage() {
  const { gradingScale }     = useProfileStore()
  const { activeSemesterId } = useSemesterStore()
  const { subjects }         = useSubjects()
  const [tab, setTab]        = useState<'marks' | 'whatif'>('marks')

  const theorySubjects   = subjects.filter(s => s.type === 'Theory')
  const labSubjects      = subjects.filter(s => s.type === 'Lab')
  const noCreditSubjects = subjects.filter(s => s.type === 'NoCredit')

  // Theory marks
  const theoryMarksList = useLiveQuery<TheoryMarks[], TheoryMarks[]>(
    () => activeSemesterId
      ? db.theoryMarks.where('semesterId').equals(activeSemesterId).toArray()
      : Promise.resolve([] as TheoryMarks[]),
    [activeSemesterId],
    []
  )

  // Lab marks
  const labMarksList = useLiveQuery<LabMarks[], LabMarks[]>(
    () => activeSemesterId
      ? db.labMarks.where('semesterId').equals(activeSemesterId).toArray()
      : Promise.resolve([] as LabMarks[]),
    [activeSemesterId],
    []
  )

  const theoryMarksMap = new Map(theoryMarksList?.map(m => [m.subjectId, m]) ?? [])
  const labMarksMap    = new Map(labMarksList?.map(m => [m.subjectId, m]) ?? [])

  // Computed theory list
  const computedList: SubjectMarksComputed[] = theorySubjects.map(s => {
    const raw = theoryMarksMap.get(s.id)
    if (!raw) return {
      subjectId: s.id,
      mt1Total: null, mt2Total: null, midTermCIE: null, assignAvg: null,
      ciTotal: null, seeMarks: null, totalMarks: null,
      grade: null, gradePoint: null, status: 'AwaitingSEE' as const,
      seeNeededToPass: null, seeNeededForGrade: {},
    }
    return computeTheoryMarks(raw, gradingScale)
  })

  // SGPA: theory + lab subjects that have a gradePoint
  const sgpa = calcSGPA([
    ...computedList
      .filter(c => c.gradePoint !== null)
      .map(c => ({
        credits:    theorySubjects.find(s => s.id === c.subjectId)?.credits ?? 0,
        gradePoint: c.gradePoint!,
      })),
    ...labSubjects.map(s => {
      const m = labMarksList?.find(lm => lm.subjectId === s.id)
      if (!m?.seeEntered) return null
      const total = [m.dayToDay, m.vivaInternal, m.internalExam, m.labReport,
                     m.seeWriteup, m.seeExecution, m.seeResults, m.seePresentation, m.seeVivaVoce]
        .reduce<number>((sum, v) => sum + (v ?? 0), 0)
      const { gradePoint } = getGradeFromMarks(total, gradingScale)
      return { credits: s.credits, gradePoint }
    }).filter((x): x is { credits: number; gradePoint: number } => x !== null),
  ])

  const degreeClass  = getDegreeClass(sgpa, true, true)
  const creditSubjectCount = theorySubjects.length + labSubjects.length

  const whatIfEntries = computedList.map(c => ({
    subject:  theorySubjects.find(s => s.id === c.subjectId)!,
    computed: c,
  })).filter(e => e.subject != null)

  if (!subjects.length) {
    return (
      <div className="flex-1 flex items-center justify-center pb-24">
        <EmptyState title="No subjects yet" description="Add subjects in Settings to get started." />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-text text-xl font-bold">Grades</h1>
      </div>

      <div className="px-4 space-y-4 mt-2">

        {/* SGPA summary */}
        <div className="rounded-2xl border border-[#6C63FF]/25 bg-[rgba(108,99,255,0.08)] p-4 flex items-center justify-between">
          <div>
            <p className="text-text/40 text-xs uppercase tracking-wider">Semester GPA</p>
            <p className="text-text text-4xl font-bold font-mono mt-0.5">
              {sgpa > 0 ? sgpa.toFixed(2) : '—'}
            </p>
            {sgpa > 0 && (
              <p className="text-text/30 text-xs mt-1">
                ≈ {cgpaToPercentage(sgpa).toFixed(1)}% · {degreeClass.replace(/([A-Z])/g, ' $1').trim()}
              </p>
            )}
          </div>
          <div className="text-right space-y-1.5">
            <Badge variant="primary">{gradingScale.name}</Badge>
            <p className="text-text/20 text-[10px]">
              {theorySubjects.length}T · {labSubjects.length}L · {noCreditSubjects.length}NC
            </p>
            <p className="text-text/15 text-[10px]">{creditSubjectCount} credit subjects</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white/[0.04] border border-border/[0.07] rounded-xl p-1">
          {(['marks', 'whatif'] as const).map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t ? 'bg-[#6C63FF] text-text shadow-sm' : 'text-text/40 hover:text-text/60'
              }`}
            >
              {t === 'marks' ? 'Subject Marks' : 'What-If Simulator'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'marks' ? (
          <div className="space-y-3">

            {/* Theory subjects */}
            {theorySubjects.length > 0 && (
              <>
                <p className="text-text/30 text-[10px] uppercase tracking-wider pt-1">
                  Theory — {theorySubjects.length} subject{theorySubjects.length !== 1 ? 's' : ''}
                </p>
                {computedList.map(computed => {
                  const subject = theorySubjects.find(s => s.id === computed.subjectId)
                  if (!subject) return null
                  return (
                    <SubjectMarksCard key={subject.id} subject={subject} computed={computed} />
                  )
                })}
              </>
            )}

            {/* Lab subjects */}
            {labSubjects.length > 0 && (
              <>
                <p className="text-text/30 text-[10px] uppercase tracking-wider pt-2">
                  Labs — {labSubjects.length} subject{labSubjects.length !== 1 ? 's' : ''}
                </p>
                {labSubjects.map(s => (
                  <LabCard key={s.id} subject={s} marks={labMarksMap.get(s.id) ?? null} />
                ))}
              </>
            )}

            {/* No-credit subjects */}
            {noCreditSubjects.length > 0 && (
              <>
                <p className="text-text/30 text-[10px] uppercase tracking-wider pt-2">
                  No Credit — {noCreditSubjects.length} subject{noCreditSubjects.length !== 1 ? 's' : ''}
                </p>
                {noCreditSubjects.map(s => (
                  <NoCreditCard key={s.id} subject={s} />
                ))}
              </>
            )}

          </div>
        ) : (
          <WhatIfSimulator entries={whatIfEntries} scale={gradingScale} />
        )}
      </div>
    </div>
  )
}
