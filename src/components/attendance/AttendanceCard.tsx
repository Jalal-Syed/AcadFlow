/**
 * AttendanceCard.tsx
 * Per-subject attendance status card.
 * Shows: subject name/code, ProgressRing, zone badge, safe-skip or catch-up count.
 */

import { clsx } from 'clsx'
import ProgressRing from '@/components/ui/ProgressRing'
import Badge from '@/components/ui/Badge'
import type { Subject, AttendanceSummary } from '@/types'

interface AttendanceCardProps {
  subject: Subject
  summary: AttendanceSummary
  onMarkPresent?: () => void
  onMarkAbsent?: () => void
  onClick?: () => void
}

const zoneToBadge: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  Safe:        'success',
  Okay:        'info',
  Condonable:  'warning',
  Critical:    'danger',
}

export default function AttendanceCard({
  subject,
  summary,
  onMarkPresent,
  onMarkAbsent,
  onClick,
}: AttendanceCardProps) {
  const badgeVariant = zoneToBadge[summary.zone] ?? 'default'

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl border border-border/[0.07] bg-card/[0.7] p-4',
        'transition-all duration-150',
        onClick && 'cursor-pointer active:scale-[0.98] hover:border-border/[0.12]',
      )}
    >
      <div className="flex items-center gap-4">
        {/* Progress ring */}
        <ProgressRing
          percent={summary.percentage}
          size={68}
          strokeWidth={6}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-text font-semibold text-sm truncate">{subject.name}</p>
              <p className="text-text/35 text-xs">{subject.code} · {subject.credits} cr</p>
            </div>
            <Badge variant={badgeVariant} dot size="sm">
              {summary.zone}
            </Badge>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-text/50 text-xs">
              {summary.effectiveAttended}/{summary.totalHeld} classes
            </span>
            {summary.safeSkips > 0 ? (
              <span className="text-[#2ED573] text-xs font-medium">
                +{summary.safeSkips} can skip
              </span>
            ) : summary.catchUpNeeded > 0 ? (
              <span className="text-[#FF4757] text-xs font-medium">
                need {summary.catchUpNeeded} consecutive
              </span>
            ) : null}
            {summary.bonusHours > 0 && (
              <span className="text-[#6C63FF] text-xs">
                +{summary.bonusHours} bonus
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick-mark buttons */}
      {(onMarkPresent || onMarkAbsent) && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/[0.06]">
          {onMarkPresent && (
            <button
              onClick={e => { e.stopPropagation(); onMarkPresent() }}
              className="flex-1 py-2 rounded-lg bg-[rgba(46,213,115,0.1)] border border-[#2ED573]/25
                         text-[#2ED573] text-xs font-semibold hover:bg-[rgba(46,213,115,0.18)] transition-colors"
            >
              Present
            </button>
          )}
          {onMarkAbsent && (
            <button
              onClick={e => { e.stopPropagation(); onMarkAbsent() }}
              className="flex-1 py-2 rounded-lg bg-[rgba(255,71,87,0.08)] border border-[#FF4757]/20
                         text-[#FF4757] text-xs font-semibold hover:bg-[rgba(255,71,87,0.15)] transition-colors"
            >
              Absent
            </button>
          )}
        </div>
      )}
    </div>
  )
}
