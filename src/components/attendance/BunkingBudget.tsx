/**
 * BunkingBudget.tsx
 * Aggregate attendance banner — shown at top of Attendance page.
 * Displays overall %, zone colour strip, safe-skip count, and condonation warning.
 */

import ProgressBar from '@/components/ui/ProgressBar'
import type { AggregateAttendance } from '@/types'
import { ATTENDANCE_ZONES } from '@/constants/grading'

interface BunkingBudgetProps {
  aggregate: AggregateAttendance
  threshold?: number   // default 75
}

export default function BunkingBudget({
  aggregate,
  threshold = 75,
}: BunkingBudgetProps) {
  const zone = ATTENDANCE_ZONES.find(z => z.zone === aggregate.zone)
  const zoneColor = zone?.color ?? '#FF4757'

  const getMessage = () => {
    if (aggregate.zone === 'Safe')
      return `You can skip ${aggregate.aggregateSafeSkips} more class${aggregate.aggregateSafeSkips !== 1 ? 'es' : ''} and still stay above ${threshold}%.`
    if (aggregate.zone === 'Okay')
      return `Right at the threshold. Skip carefully — ${aggregate.aggregateSafeSkips} safe skips left.`
    if (aggregate.zone === 'Condonable')
      return `Below ${threshold}% but within condonation range. Attend every class from here.`
    return `Detained risk. You need to attend consecutive classes to recover. Contact your tutor.`
  }

  return (
    <div
      className="rounded-2xl border p-5 space-y-3"
      style={{
        backgroundColor: `${zoneColor}10`,
        borderColor:      `${zoneColor}30`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text/50 text-xs uppercase tracking-wider">Aggregate Attendance</p>
          <p className="text-text text-3xl font-bold font-mono mt-0.5">
            {aggregate.aggregatePercentage.toFixed(1)}
            <span className="text-lg text-text/50">%</span>
          </p>
        </div>
        <div
          className="text-xs font-bold px-3 py-1.5 rounded-full border"
          style={{ color: zoneColor, borderColor: `${zoneColor}50`, backgroundColor: `${zoneColor}15` }}
        >
          {zone?.label ?? aggregate.zone}
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar
        value={aggregate.aggregatePercentage}
        height={6}
        animate
      />

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-text/50">
        <span>{aggregate.totalAttended} attended</span>
        <span className="text-text/20">·</span>
        <span>{aggregate.totalHeld - aggregate.totalAttended} missed</span>
        <span className="text-text/20">·</span>
        <span>{aggregate.totalHeld} total</span>
      </div>

      {/* Message */}
      <p className="text-xs leading-relaxed" style={{ color: zoneColor }}>
        {getMessage()}
      </p>
    </div>
  )
}
