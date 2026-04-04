/**
 * useTodaySchedule.ts
 * Derives the live schedule for the current day by:
 *  1. Loading timetable slots for the active semester + today's weekday
 *  2. Applying any TimetableOverride records for today's date
 *  3. Joining subject metadata so components get one clean array to render
 *
 * Reads directly from Dexie (not a store) because timetable data is
 * reference-like and doesn't need reactive store memory.
 */

import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { db } from '@/db/schema'
import { useSemesterStore } from '@/stores/useSemesterStore'
import type { TimetableSlot, TimetableOverride, Subject, WeekDay } from '@/types'

export interface ScheduledPeriod {
  slotId: string
  period: number
  startTime: string
  endTime: string
  subject: Subject | null         // null = break / cancelled with no replacement
  room?: string
  isLab: boolean
  label?: string
  override?: TimetableOverride    // present if today's slot was modified
}

export interface UseTodayScheduleResult {
  periods: ScheduledPeriod[]
  isLoading: boolean
  /** ISO weekday label, e.g. "Mon" */
  todayLabel: WeekDay
  /** Re-fetch (call after adding/editing timetable entries) */
  refresh: () => void
}

// dayjs weekday index → WeekDay label
const DAY_MAP: Record<number, WeekDay> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
}

export function useTodaySchedule(): UseTodayScheduleResult {
  const { activeSemesterId, subjects } = useSemesterStore()
  const [periods, setPeriods] = useState<ScheduledPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const today    = dayjs()
  const todayLabel = DAY_MAP[today.day()] as WeekDay
  const todayStr   = today.format('YYYY-MM-DD')

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    if (!activeSemesterId) {
      setPeriods([])
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)

      // 1. Slots for today's weekday in the active semester
      const slots: TimetableSlot[] = await db.timetableSlots
        .where('[semesterId+day]')
        .equals([activeSemesterId!, todayLabel])
        .toArray()

      // 2. Any overrides for today specifically
      const overrideList: TimetableOverride[] = await db.timetableOverrides
        .where('semesterId').equals(activeSemesterId!)
        .and(o => dayjs(o.date).format('YYYY-MM-DD') === todayStr)
        .toArray()

      const overrideMap = new Map(overrideList.map(o => [o.originalSlotId, o]))

      // 3. Build subject map from store (no extra DB read)
      const subjectMap = new Map<string, Subject>(subjects.map(s => [s.id, s]))

      // 4. Merge slots + overrides
      const result: ScheduledPeriod[] = slots
        .sort((a, b) => a.period - b.period)
        .map(slot => {
          const override = overrideMap.get(slot.id)

          // Cancelled with no replacement → subject = null
          if (override?.type === 'Cancelled') {
            return {
              slotId: slot.id,
              period: slot.period,
              startTime: slot.startTime,
              endTime: slot.endTime,
              subject: null,
              isLab: slot.isLab,
              label: 'Cancelled',
              override,
            }
          }

          // Rescheduled / Extra → use override subject if provided
          const subjectId = override?.newSubjectId ?? slot.subjectId
          return {
            slotId: slot.id,
            period: slot.period,
            startTime: override?.newStartTime ?? slot.startTime,
            endTime: override?.newEndTime ?? slot.endTime,
            subject: subjectId ? (subjectMap.get(subjectId) ?? null) : null,
            room: override?.newRoom ?? slot.room,
            isLab: slot.isLab,
            label: slot.label,
            override,
          }
        })

      if (!cancelled) {
        setPeriods(result)
        setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [activeSemesterId, todayLabel, todayStr, subjects, tick])

  return { periods, isLoading, todayLabel, refresh }
}
