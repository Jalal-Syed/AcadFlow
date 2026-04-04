/**
 * SubjectMarksCard.tsx
 * Displays the full CIE breakdown, SEE marks, total, grade, and what SEE marks
 * are needed to pass or hit a target grade for a theory subject.
 */

import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import type { Subject, SubjectMarksComputed } from '@/types'

interface SubjectMarksCardProps {
  subject: Subject
  computed: SubjectMarksComputed
  onEdit?: () => void
}

function Mark({ label, value, max, color }: { label: string; value: number | null; max: number; color?: string }) {
  const display = value !== null ? `${value}` : '—'
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-mono font-bold" style={{ color: color ?? 'rgba(255,255,255,0.8)' }}>
        {display}
      </span>
      <span className="text-[10px] text-text/30">/{max}</span>
      <span className="text-[9px] text-text/20 uppercase tracking-wide">{label}</span>
    </div>
  )
}

const STATUS_STYLE: Record<string, string> = {
  Passed:      'success',
  AwaitingSEE: 'warning',
  Failed:      'danger',
  Supplementary: 'danger',
}

export default function SubjectMarksCard({ subject, computed, onEdit }: SubjectMarksCardProps) {
  const gradeColor = computed.gradePoint !== null
    ? computed.gradePoint >= 7 ? '#2ED573'
      : computed.gradePoint >= 5 ? '#FFA502'
      : '#FF4757'
    : 'rgba(255,255,255,0.4)'

  return (
    <div
      className="rounded-2xl border border-border/[0.07] bg-card/[0.7] overflow-hidden"
      style={{ borderLeftColor: subject.color, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div>
          <p className="text-text font-semibold text-sm">{subject.name}</p>
          <p className="text-text/35 text-xs mt-0.5">{subject.code} · {subject.credits} credits</p>
        </div>
        <div className="flex items-center gap-2">
          {computed.grade && (
            <span className="text-xl font-bold font-mono" style={{ color: gradeColor }}>
              {computed.grade}
            </span>
          )}
          <Badge variant={STATUS_STYLE[computed.status] as any ?? 'default'} size="sm">
            {computed.status === 'AwaitingSEE' ? 'Awaiting SEE' : computed.status}
          </Badge>
        </div>
      </div>

      {/* CIE breakdown row */}
      <div className="px-4 pb-3">
        <div className="bg-white/[0.03] border border-border/[0.06] rounded-xl p-3">
          <p className="text-text/30 text-[10px] uppercase tracking-wider mb-2.5">CIE Breakdown</p>
          <div className="flex items-end justify-around gap-2">
            <Mark label="MT1"    value={computed.mt1Total}    max={30} />
            <Mark label="MT2"    value={computed.mt2Total}    max={30} />
            <div className="w-px h-8 bg-white/[0.08]" />
            <Mark label="Mid CIE" value={computed.midTermCIE} max={30} color="#6C63FF" />
            <Mark label="Assign"  value={computed.assignAvg}  max={5}  />
            <div className="w-px h-8 bg-white/[0.08]" />
            <Mark label="CIE"    value={computed.ciTotal}     max={40} color="#00F5D4" />
            <Mark label="SEE"    value={computed.seeMarks}    max={60} />
            <div className="w-px h-8 bg-white/[0.08]" />
            <Mark label="Total"  value={computed.totalMarks}  max={100} color={gradeColor} />
          </div>
        </div>
      </div>

      {/* Total progress bar */}
      {computed.totalMarks !== null && (
        <div className="px-4 pb-3">
          <ProgressBar value={computed.totalMarks} max={100} showLabel height={5} />
        </div>
      )}

      {/* SEE needed */}
      {computed.status === 'AwaitingSEE' && computed.seeNeededToPass !== null && (
        <div className="mx-4 mb-4 bg-[rgba(255,165,2,0.08)] border border-[#FFA502]/20 rounded-xl px-3 py-2">
          <p className="text-[#FFA502] text-xs font-medium">
            Need ≥ {computed.seeNeededToPass}/60 in SEE to pass
          </p>
          {Object.keys(computed.seeNeededForGrade).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1.5">
              {Object.entries(computed.seeNeededForGrade)
                .filter(([, v]) => v <= 60)
                .slice(0, 5)
                .map(([grade, needed]) => (
                  <span key={grade} className="text-[10px] text-text/40">
                    {grade}: {needed}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Edit button */}
      {onEdit && (
        <div className="px-4 pb-4">
          <button
            onClick={onEdit}
            className="w-full py-2 rounded-xl border border-border/[0.08] text-text/50 text-xs
                       hover:bg-white/[0.04] hover:text-text/70 transition-colors"
          >
            Edit marks
          </button>
        </div>
      )}
    </div>
  )
}
