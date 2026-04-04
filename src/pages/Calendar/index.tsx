/**
 * Calendar — Unified academic calendar
 * Shows holidays, exams, and task deadlines in a monthly view.
 * Spec §6.12
 */

import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useSubjects } from '@/hooks/useSubjects'
import { useTaskStore } from '@/stores/useTaskStore'
import { useExamStore } from '@/stores/useExamStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import FAB from '@/components/ui/FAB'
import Badge from '@/components/ui/Badge'
import type { Holiday, HolidayType } from '@/types'
import {
  ChevronLeft, ChevronRight, Trash2,
  BookOpen, CheckSquare, Palmtree,
} from 'lucide-react'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HOLIDAY_TYPE_COLOR: Record<HolidayType, string> = {
  Gazetted: '#FF4757',
  University: '#6C63FF',
  Local: '#FFA502',
  CollegeEvent: '#00F5D4',
}

const HOLIDAY_TYPE_LABEL: Record<HolidayType, string> = {
  Gazetted: '🏛️ Gazetted Holiday',
  University: '🎓 University Holiday',
  Local: '📍 Local Holiday',
  CollegeEvent: '🎪 College Event',
}

interface DayEvent {
  type: 'holiday' | 'exam' | 'task'
  color: string
  label: string
  id: string
}

export default function CalendarPage() {
  const { activeSemesterId } = useSemesterStore()
  const { subjects } = useSubjects()
  const { tasks } = useTaskStore()
  const { exams } = useExamStore()

  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddHoliday, setShowAddHoliday] = useState(false)

  // Holiday form state
  const [hName, setHName] = useState('')
  const [hDate, setHDate] = useState('')
  const [hType, setHType] = useState<HolidayType>('University')
  const [saving, setSaving] = useState(false)

  const holidays = useLiveQuery<Holiday[]>(
    () => activeSemesterId
      ? db.holidays.where('semesterId').equals(activeSemesterId).toArray()
      : Promise.resolve([]),
    [activeSemesterId]
  ) ?? []

  const today = dayjs()

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = currentMonth.daysInMonth()
    const startDow = currentMonth.day()

    const cells: { date: dayjs.Dayjs | null }[] = [
      ...Array.from({ length: startDow }, () => ({ date: null })),
    ]

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: currentMonth.date(d) })
    }

    return cells
  }, [currentMonth])

  // Events per date
  const eventsMap = useMemo(() => {
    const map = new Map<string, DayEvent[]>()

    const addEvent = (dateStr: string, event: DayEvent) => {
      const existing = map.get(dateStr) ?? []
      existing.push(event)
      map.set(dateStr, existing)
    }

    // Holidays
    for (const h of holidays) {
      const dateStr = dayjs(h.date).format('YYYY-MM-DD')
      addEvent(dateStr, {
        type: 'holiday',
        color: HOLIDAY_TYPE_COLOR[h.type],
        label: h.name,
        id: h.id,
      })
    }

    // Exams
    for (const e of exams) {
      const dateStr = dayjs(e.date).format('YYYY-MM-DD')
      const subject = subjects.find(s => s.id === e.subjectId)
      addEvent(dateStr, {
        type: 'exam',
        color: subject?.color ?? '#6C63FF',
        label: `${e.name}${subject ? ` (${subject.code})` : ''}`,
        id: e.id,
      })
    }

    // Tasks
    for (const t of tasks) {
      if (t.status === 'Done') continue
      const dateStr = dayjs(t.dueDate).format('YYYY-MM-DD')
      const subject = subjects.find(s => s.id === t.subjectId)
      addEvent(dateStr, {
        type: 'task',
        color: subject?.color ?? '#FFA502',
        label: t.title,
        id: t.id,
      })
    }

    return map
  }, [holidays, exams, tasks, subjects])

  const prevMonth = () => setCurrentMonth(m => m.subtract(1, 'month'))
  const nextMonth = () => setCurrentMonth(m => m.add(1, 'month'))
  const goToday = () => setCurrentMonth(today.startOf('month'))

  const selectedEvents = selectedDate ? eventsMap.get(selectedDate) ?? [] : []

  const handleAddHoliday = async () => {
    if (!hName.trim() || !hDate || !activeSemesterId) return
    setSaving(true)
    await db.holidays.add({
      id: crypto.randomUUID(),
      semesterId: activeSemesterId,
      date: hDate,
      name: hName.trim(),
      type: hType,
    })
    setSaving(false)
    setShowAddHoliday(false)
    setHName(''); setHDate(''); setHType('University')
  }

  const handleDeleteHoliday = async (id: string) => {
    await db.holidays.delete(id)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
      <h1 className="text-text text-xl font-bold">Calendar</h1>

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/5 text-text/50 hover:text-text transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-text font-semibold text-sm">{currentMonth.format('MMMM YYYY')}</p>
          {!currentMonth.isSame(today, 'month') && (
            <button onClick={goToday} className="text-[#6C63FF] text-[10px] hover:underline">
              Go to today
            </button>
          )}
        </div>
        <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/5 text-text/50 hover:text-text transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-border/[0.07] bg-card/50 p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map((l, i) => (
            <div key={i} className="text-center text-[10px] text-text/30 font-medium py-1">
              {l}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((cell, i) => {
            if (!cell.date) return <div key={`e-${i}`} />

            const dateStr = cell.date.format('YYYY-MM-DD')
            const isToday = cell.date.isSame(today, 'day')
            const isSelected = selectedDate === dateStr
            const events = eventsMap.get(dateStr) ?? []
            const hasHoliday = events.some(e => e.type === 'holiday')
            const hasExam = events.some(e => e.type === 'exam')
            const hasTask = events.some(e => e.type === 'task')

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 relative transition-all ${
                  isSelected
                    ? 'bg-[rgba(108,99,255,0.2)] border border-[#6C63FF]/40'
                    : isToday
                    ? 'bg-white/[0.06]'
                    : 'hover:bg-white/[0.04]'
                } ${hasHoliday ? 'bg-[rgba(255,71,87,0.06)]' : ''}`}
              >
                <span className={`text-[11px] font-mono leading-none ${
                  isToday ? 'text-[#6C63FF] font-bold' : 'text-text/60'
                }`}>
                  {cell.date.date()}
                </span>

                {/* Event dots */}
                {events.length > 0 && (
                  <div className="flex gap-0.5">
                    {hasHoliday && <span className="w-1 h-1 rounded-full bg-[#FF4757]" />}
                    {hasExam && <span className="w-1 h-1 rounded-full bg-[#6C63FF]" />}
                    {hasTask && <span className="w-1 h-1 rounded-full bg-[#FFA502]" />}
                  </div>
                )}

                {isToday && (
                  <span className="absolute inset-0 rounded-lg border-2 border-[#6C63FF]/40 pointer-events-none" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        {[
          { color: '#FF4757', label: 'Holiday', icon: Palmtree },
          { color: '#6C63FF', label: 'Exam', icon: BookOpen },
          { color: '#FFA502', label: 'Deadline', icon: CheckSquare },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-text/35">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="rounded-2xl border border-border/[0.07] bg-card/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-text font-semibold text-sm">
              {dayjs(selectedDate).format('dddd, D MMMM YYYY')}
            </p>
            <Badge variant={selectedEvents.length > 0 ? 'primary' : 'default'} size="sm">
              {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-text/30 text-xs">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 bg-white/[0.03] border border-border/[0.06] rounded-xl px-3 py-2.5"
                >
                  <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text/80 text-xs font-medium truncate">{event.label}</p>
                    <p className="text-text/30 text-[10px] capitalize">{event.type}</p>
                  </div>
                  {event.type === 'holiday' && (
                    <button
                      onClick={() => handleDeleteHoliday(event.id)}
                      className="text-text/20 hover:text-[#FF4757] transition-colors p-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming holidays section */}
      {holidays.length > 0 && (
        <section className="space-y-2">
          <p className="text-text/40 text-xs uppercase tracking-wider">Holidays this semester</p>
          {[...holidays]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(h => (
              <div
                key={h.id}
                className="flex items-center gap-3 bg-card/50 border border-border/[0.06] rounded-xl px-3 py-2.5"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ backgroundColor: `${HOLIDAY_TYPE_COLOR[h.type]}20`, color: HOLIDAY_TYPE_COLOR[h.type] }}
                >
                  {dayjs(h.date).format('DD')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text/80 text-xs font-medium truncate">{h.name}</p>
                  <p className="text-text/30 text-[10px]">
                    {dayjs(h.date).format('ddd, D MMM')} · {h.type}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteHoliday(h.id)}
                  className="text-text/15 hover:text-[#FF4757] transition-colors p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
        </section>
      )}

      <FAB onClick={() => setShowAddHoliday(true)} label="Add Holiday" />

      <Modal open={showAddHoliday} onClose={() => { setShowAddHoliday(false); setHName(''); setHDate('') }} title="Add Holiday">
        <div className="space-y-4">
          <Input
            label="Holiday Name"
            value={hName}
            onChange={e => setHName(e.target.value)}
            placeholder="e.g. Republic Day"
            autoFocus
          />
          <Input
            label="Date"
            type="date"
            value={hDate}
            onChange={e => setHDate(e.target.value)}
          />
          <Select
            label="Type"
            value={hType}
            onChange={e => setHType(e.target.value as HolidayType)}
            options={Object.entries(HOLIDAY_TYPE_LABEL).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Button fullWidth onClick={handleAddHoliday} loading={saving} disabled={!hName.trim() || !hDate}>
            Add Holiday
          </Button>
        </div>
      </Modal>
    </div>
  )
}
