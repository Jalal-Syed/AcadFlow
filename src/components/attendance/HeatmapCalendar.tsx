/**
 * HeatmapCalendar.tsx
 * Monthly attendance heatmap — shows each day as a coloured dot.
 * Green = all present, red = absences, grey = no class / holiday.
 */

import { useMemo } from 'react'
import dayjs from 'dayjs'
import type { AttendanceRecord } from '@/types'

interface HeatmapCalendarProps {
  records: AttendanceRecord[]
  month?: string     // "YYYY-MM", defaults to current month
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function getDayColor(records: AttendanceRecord[]): string {
  if (records.length === 0) return 'transparent'
  const absent  = records.filter(r => r.status === 'Absent').length
  const present = records.filter(r => r.status === 'Present' || r.status === 'Late' || r.status === 'OD').length
  const cancelled = records.filter(r => r.status === 'Cancelled' || r.status === 'Holiday').length

  if (cancelled === records.length) return 'rgba(255,255,255,0.06)'
  if (absent === 0 && present > 0) return '#2ED573'
  if (absent > 0 && present > 0)   return '#FFA502'
  return '#FF4757'
}

export default function HeatmapCalendar({ records, month }: HeatmapCalendarProps) {
  const target = dayjs(month ?? undefined).startOf('month')
  const today  = dayjs()

  const days = useMemo(() => {
    const daysInMonth = target.daysInMonth()
    const startDow    = target.day()   // 0 = Sun

    // Build grid cells: leading empty + actual days
    const cells: { date: dayjs.Dayjs | null; records: AttendanceRecord[] }[] = [
      ...Array.from({ length: startDow }, () => ({ date: null, records: [] })),
    ]

    for (let d = 1; d <= daysInMonth; d++) {
      const date     = target.date(d)
      const dateStr  = date.format('YYYY-MM-DD')
      const dayRecs  = records.filter(r => dayjs(r.date).format('YYYY-MM-DD') === dateStr)
      cells.push({ date, records: dayRecs })
    }

    return cells
  }, [target, records])

  return (
    <div className="rounded-2xl border border-border/[0.07] bg-card/50 p-4 space-y-3">
      {/* Month header */}
      <p className="text-text/70 text-sm font-semibold">
        {target.format('MMMM YYYY')}
      </p>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] text-text/25 font-medium pb-1">
            {l}
          </div>
        ))}

        {/* Day cells */}
        {days.map((cell, i) => {
          if (!cell.date) return <div key={`e-${i}`} />

          const isToday   = cell.date.isSame(today, 'day')
          const isFuture  = cell.date.isAfter(today, 'day')
          const color     = isFuture ? 'rgba(255,255,255,0.04)' : getDayColor(cell.records)

          return (
            <div
              key={cell.date.format('YYYY-MM-DD')}
              title={cell.date.format('D MMM')}
              className="aspect-square rounded-md flex items-center justify-center relative"
              style={{ backgroundColor: color }}
            >
              <span
                className="text-[10px] font-mono leading-none"
                style={{ color: isFuture ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)' }}
              >
                {cell.date.date()}
              </span>
              {isToday && (
                <span className="absolute inset-0 rounded-md border-2 border-[#6C63FF] pointer-events-none" />
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1">
        {[
          { color: '#2ED573', label: 'Full present' },
          { color: '#FFA502', label: 'Mixed' },
          { color: '#FF4757', label: 'All absent' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-text/35">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
