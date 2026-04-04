/**
 * WhatIfSimulator.tsx
 * Interactive SGPA simulator — drag SEE marks, tap subjects to see grade targets.
 * Spec §6.4 Mode 3: What-If Simulator
 */

import { useState, useMemo } from 'react'
import { RefreshCw, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { calcSGPA, getGradeFromMarks } from '@/lib/calculations'
import type { Subject, SubjectMarksComputed, GradingScale } from '@/types'

interface WhatIfEntry {
  subject: Subject
  computed: SubjectMarksComputed
}

interface WhatIfSimulatorProps {
  entries: WhatIfEntry[]
  scale: GradingScale
}

export default function WhatIfSimulator({ entries, scale }: WhatIfSimulatorProps) {
  // SEE overrides: subjectId → hypothetical SEE marks (from slider)
  const [seeOverrides, setSeeOverrides] = useState<Record<string, number>>({})
  // Which subject row is expanded to show grade targets
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Target SGPA input
  const [targetSGPA, setTargetSGPA] = useState('')

  const results = useMemo(() => {
    return entries.map(({ subject, computed }) => {
      const seeMark = seeOverrides[subject.id] ?? computed.seeMarks ?? 0
      const total   = (computed.ciTotal ?? 0) + seeMark
      const { grade, gradePoint } = getGradeFromMarks(total, scale)
      const passes  = seeMark >= scale.seePassMin && total >= scale.overallPassMin
      return {
        subject,
        computed,
        hypotheticalSEE:   seeMark,
        hypotheticalTotal: total,
        hypotheticalGrade: grade,
        hypotheticalGP:    gradePoint,
        passes,
      }
    })
  }, [entries, seeOverrides, scale])

  const simulatedSGPA = useMemo(() => {
    const creditEntries = results
      .filter(r => r.subject.credits > 0)
      .map(r => ({ credits: r.subject.credits, gradePoint: r.hypotheticalGP }))
    return calcSGPA(creditEntries)
  }, [results])

  const reset = () => { setSeeOverrides({}); setExpandedId(null) }
  const isDirty = Object.keys(seeOverrides).length > 0

  // Target SGPA gap analysis
  const targetSGPANum = parseFloat(targetSGPA)
  const targetValid   = !isNaN(targetSGPANum) && targetSGPANum > 0 && targetSGPANum <= 10

  const sgpaColor = simulatedSGPA >= 8.5 ? '#2ED573'
    : simulatedSGPA >= 7 ? '#00F5D4'
    : simulatedSGPA >= 5 ? '#FFA502'
    : '#FF4757'

  return (
    <div className="rounded-2xl border border-border/[0.07] bg-card/50 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/[0.06]">
        <div>
          <p className="text-text/70 text-sm font-semibold">What-If Simulator</p>
          <p className="text-text/30 text-[10px]">Drag SEE · Tap subject for grade targets</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-text/30">Simulated SGPA</p>
            <p className="font-bold text-2xl font-mono leading-none" style={{ color: sgpaColor }}>
              {simulatedSGPA.toFixed(2)}
            </p>
          </div>
          {isDirty && (
            <button
              onClick={reset}
              className="text-text/30 hover:text-text/70 transition-colors p-1.5 rounded-lg hover:bg-white/5"
              title="Reset all"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Onboarding hint ────────────────────────────────────── */}
      {!isDirty && entries.some(e => e.computed.ciTotal !== null) && (
        <div className="px-4 py-2 bg-[rgba(108,99,255,0.07)] border-b border-border/[0.04]">
          <p className="text-[10px] text-[#6C63FF]/80">
            💡 Slide to simulate your End-Sem marks. Tap a subject to see exactly what you need for each grade.
          </p>
        </div>
      )}

      {entries.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-text/30 text-sm">No theory subjects found.</p>
        </div>
      )}

      {/* ── Subject rows ───────────────────────────────────────── */}
      <div className="divide-y divide-white/[0.04]">
        {results.map(r => {
          const isExpanded = expandedId === r.subject.id
          const cie = r.computed.ciTotal

          // Build grade target table from the grading scale
          const gradeTargets = scale.grades
            .filter(g => g.gradePoint > 0)
            .map(g => {
              const seeNeeded = cie !== null
                ? Math.max(scale.seePassMin, g.minMarks - cie)
                : null
              return { ...g, seeNeeded }
            })
            .filter(g => g.seeNeeded !== null && g.seeNeeded <= 60)

          const currentSEE = seeOverrides[r.subject.id] ?? r.computed.seeMarks ?? 0

          return (
            <div key={r.subject.id}>
              {/* Main row */}
              <div className="px-4 py-3 flex items-center gap-3">
                {/* Subject colour dot */}
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.subject.color }} />

                {/* Name + CIE */}
                <div className="flex-1 min-w-0">
                  <p className="text-text text-xs font-medium truncate">{r.subject.name}</p>
                  <p className="text-text/30 text-[10px]">
                    CIE: {cie !== null ? `${cie}/40` : '—'}
                    {' · '}Total: {cie !== null ? `${(cie + currentSEE).toFixed(0)}/100` : '—'}
                  </p>
                </div>

                {/* SEE slider */}
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={0} max={60} step={1}
                    value={currentSEE}
                    onChange={e =>
                      setSeeOverrides(prev => ({ ...prev, [r.subject.id]: Number(e.target.value) }))
                    }
                    className="w-20 h-1 accent-[#6C63FF] cursor-pointer"
                  />
                  <span className="text-text/60 text-xs font-mono w-8 text-right">
                    {currentSEE}
                  </span>
                </div>

                {/* Grade badge + expand toggle */}
                <div className="flex items-center gap-1">
                  <span
                    className="text-xs font-bold w-7 text-center"
                    style={{
                      color: r.hypotheticalGP >= 8 ? '#2ED573'
                        : r.hypotheticalGP >= 6 ? '#00C9B1'
                        : r.hypotheticalGP >= 5 ? '#FFA502'
                        : '#FF4757',
                    }}
                  >
                    {r.hypotheticalGrade}
                  </span>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : r.subject.id)}
                    className="text-text/25 hover:text-text/60 transition-colors p-0.5"
                    title={isExpanded ? 'Collapse' : 'Show grade targets'}
                  >
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>

              {/* Expanded: grade target grid */}
              {isExpanded && (
                <div className="mx-4 mb-3 rounded-xl bg-white/[0.025] border border-border/[0.07] p-3 space-y-2.5">
                  <p className="text-[10px] text-text/40 font-semibold uppercase tracking-wider">
                    End-Sem (SEE) marks needed
                  </p>

                  {cie === null ? (
                    <p className="text-text/30 text-xs">
                      Enter your CIE marks in the Subject Marks tab first.
                    </p>
                  ) : gradeTargets.length === 0 ? (
                    <p className="text-[#FF4757] text-xs">
                      No achievable grade targets — CIE is too low to pass.
                    </p>
                  ) : (
                    <>
                      {/* Pass condition reminder */}
                      <p className="text-[10px] text-text/25">
                        Pass requires SEE ≥ {scale.seePassMin} AND total ≥ {scale.overallPassMin}.
                        Tap a grade to set the slider.
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {gradeTargets.map(g => {
                          const seeNeeded = g.seeNeeded!
                          const achieved  = currentSEE >= seeNeeded
                          return (
                            <button
                              key={g.grade}
                              onClick={() => setSeeOverrides(prev => ({ ...prev, [r.subject.id]: seeNeeded }))}
                              className="text-center rounded-xl py-2.5 border transition-all active:scale-95"
                              style={{
                                borderColor: achieved ? `${r.subject.color}60` : 'rgba(255,255,255,0.07)',
                                backgroundColor: achieved ? `${r.subject.color}15` : 'rgba(255,255,255,0.03)',
                              }}
                            >
                              <p className="font-bold text-sm" style={{ color: achieved ? r.subject.color : 'rgba(255,255,255,0.6)' }}>
                                {g.grade}
                              </p>
                              <p className="text-[10px] text-text/40 font-mono">
                                {seeNeeded}/60
                              </p>
                              <p className="text-[9px] text-text/20">
                                ({cie + seeNeeded}/100 total)
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Target SGPA calculator ─────────────────────────────── */}
      <div className="px-4 py-3.5 border-t border-border/[0.06] bg-white/[0.02] space-y-2">
        <div className="flex items-center gap-2">
          <Target size={12} className="text-[#00F5D4] shrink-0" />
          <p className="text-[10px] text-text/50 font-semibold uppercase tracking-wider">
            SGPA Target
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number" step="0.1" min="0" max="10"
            value={targetSGPA}
            onChange={e => setTargetSGPA(e.target.value)}
            placeholder="e.g. 8.5"
            className="w-24 rounded-lg border border-border/[0.1] bg-white/[0.05] text-text text-sm
                       px-2.5 py-1.5 placeholder:text-text/20
                       focus:outline-none focus:border-[#6C63FF]/50 focus:ring-1 focus:ring-[#6C63FF]/20"
          />
          {targetValid && (
            <p className="text-xs flex-1 leading-relaxed">
              {simulatedSGPA >= targetSGPANum
                ? <span className="text-[#2ED573]">✓ Simulation already achieves {targetSGPANum.toFixed(1)} SGPA!</span>
                : <span className="text-[#FFA502]">
                    Gap: <strong>{(targetSGPANum - simulatedSGPA).toFixed(2)}</strong> — push your SEE marks higher.
                  </span>
              }
            </p>
          )}
        </div>
      </div>

      <p className="text-[10px] text-text/15 px-4 py-2 border-t border-border/[0.04]">
        Simulation only · Does not affect saved marks · JNTUH R-25
      </p>
    </div>
  )
}
