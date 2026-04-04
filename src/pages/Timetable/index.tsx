/**
 * Timetable — Weekly schedule grid + period management
 * Spec §6.7
 */

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/schema'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useSubjects } from '@/hooks/useSubjects'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import EmptyState from '@/components/ui/EmptyState'
import FAB from '@/components/ui/FAB'
import type { WeekDay, TimetableSlot } from '@/types'
import { Trash2, Clock } from 'lucide-react'

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL: Record<WeekDay, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

function todayDay(): WeekDay {
  const map: Record<number, WeekDay> = {
    0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
  }
  return map[new Date().getDay()] ?? 'Mon'
}

export default function TimetablePage() {
  const { activeSemesterId } = useSemesterStore()
  const { subjects } = useSubjects()

  const [selectedDay, setSelectedDay] = useState<WeekDay>(todayDay)
  const [showModal, setShowModal]     = useState(false)
  const [subjectId, setSubjectId]     = useState('')
  const [period,    setPeriod]        = useState('1')
  const [startTime, setStartTime]     = useState('09:00')
  const [endTime,   setEndTime]       = useState('10:00')
  const [room,      setRoom]          = useState('')
  const [isLab,     setIsLab]         = useState(false)
  const [saving,    setSaving]        = useState(false)

  const slots = useLiveQuery<TimetableSlot[]>(
    () => activeSemesterId
      ? db.timetableSlots.where('semesterId').equals(activeSemesterId).toArray()
      : Promise.resolve([]),
    [activeSemesterId]
  ) ?? []

  const daySlots = slots
    .filter(s => s.day === selectedDay)
    .sort((a, b) => a.period - b.period)

  const slotCountByDay = DAYS.reduce<Record<WeekDay, number>>((acc, d) => {
    acc[d] = slots.filter(s => s.day === d).length
    return acc
  }, {} as Record<WeekDay, number>)

  const closeModal = () => {
    setShowModal(false)
    setSubjectId(''); setPeriod('1'); setStartTime('09:00')
    setEndTime('10:00'); setRoom(''); setIsLab(false)
  }

  const handleAdd = async () => {
    if (!activeSemesterId || !subjectId) return
    setSaving(true)
    const slot: TimetableSlot = {
      id:          crypto.randomUUID(),
      semesterId:  activeSemesterId,
      subjectId,
      day:         selectedDay,
      period:      parseInt(period) || 1,
      startTime,
      endTime,
      room:        room.trim() || undefined,
      isLab,
    }
    await db.timetableSlots.add(slot)
    setSaving(false)
    closeModal()
  }

  const handleDelete = async (id: string) => {
    await db.timetableSlots.delete(id)
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
      <h1 className="text-text text-xl font-bold">Timetable</h1>

      {/* Day selector */}
      <div className="grid grid-cols-6 gap-1 bg-white/[0.04] border border-border/[0.07] rounded-2xl p-1.5">
        {DAYS.map(day => {
          const count   = slotCountByDay[day] ?? 0
          const isToday = day === todayDay()
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex flex-col items-center py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedDay === day
                  ? 'bg-[#6C63FF] text-text shadow-sm'
                  : isToday
                  ? 'bg-white/[0.08] text-text/80'
                  : 'text-text/40 hover:text-text/70'
              }`}
            >
              <span>{day}</span>
              {count > 0 && (
                <span className={`text-[9px] mt-0.5 font-normal ${selectedDay === day ? 'text-text/70' : 'text-text/25'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-text/50 text-sm">{DAY_FULL[selectedDay]}</p>
        <p className="text-text/30 text-xs">{daySlots.length} period{daySlots.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Slots */}
      {daySlots.length === 0 ? (
        <EmptyState
          title={`No classes on ${DAY_FULL[selectedDay]}`}
          description="Tap + to add a period."
        />
      ) : (
        <div className="space-y-2">
          {daySlots.map(slot => {
            const subject = subjects.find(s => s.id === slot.subjectId)
            return (
              <div
                key={slot.id}
                className="rounded-2xl border border-border/[0.07] bg-card/[0.7] p-4 flex items-center gap-3"
              >
                {/* Subject colour strip */}
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ backgroundColor: subject?.color ?? '#6C63FF' }}
                />

                {/* Period number */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{
                    backgroundColor: subject ? `${subject.color}20` : 'rgba(108,99,255,0.15)',
                    color:           subject?.color ?? '#6C63FF',
                  }}
                >
                  {slot.period}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-text font-semibold text-sm truncate">
                      {subject?.name ?? 'Unknown Subject'}
                    </p>
                    {slot.isLab && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[rgba(255,165,2,0.15)] text-[#FFA502] border border-[rgba(255,165,2,0.3)]">
                        Lab
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-text/35 text-xs mt-0.5">
                    <Clock size={10} />
                    <span>{slot.startTime} – {slot.endTime}</span>
                    {slot.room && <><span className="text-text/20">·</span><span>{slot.room}</span></>}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(slot.id)}
                  className="text-text/15 hover:text-[#FF4757] transition-colors p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <FAB onClick={() => setShowModal(true)} label="Add Period" />

      <Modal open={showModal} onClose={closeModal} title={`Add Period — ${DAY_FULL[selectedDay]}`}>
        <div className="space-y-4">
          <Select
            label="Subject"
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            placeholder="Select subject"
            options={subjects.map(s => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Period #"
              type="number"
              min={1}
              max={8}
              value={period}
              onChange={e => setPeriod(e.target.value)}
              hint="1–8"
            />
            <Input
              label="Room (optional)"
              value={room}
              onChange={e => setRoom(e.target.value)}
              placeholder="e.g. A-201"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            <Input label="End Time"   type="time" value={endTime}   onChange={e => setEndTime(e.target.value)}   />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isLab}
              onChange={e => setIsLab(e.target.checked)}
              className="w-4 h-4 accent-[#FFA502] rounded"
            />
            <span className="text-sm text-text/70">Lab / Practical block</span>
          </label>
          <Button fullWidth onClick={handleAdd} loading={saving} disabled={!subjectId}>
            Add Period
          </Button>
        </div>
      </Modal>
    </div>
  )
}
