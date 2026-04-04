/**
 * useAttendance.ts
 * Derived hook — computes per-subject and aggregate attendance summaries
 * from raw store records + calculation functions. Components import this
 * instead of touching the store and calculations separately.
 */

import { useMemo } from 'react'
import { useAttendanceStore } from '@/stores/useAttendanceStore'
import { useSemesterStore } from '@/stores/useSemesterStore'
import {
  calcSubjectAttendance,
  calcAggregateAttendance,
} from '@/lib/calculations'
import type { AttendanceSummary, AggregateAttendance, AttendanceStatus } from '@/types'

export interface UseAttendanceResult {
  /** Per-subject computed summaries, keyed by subjectId */
  summaries: Record<string, AttendanceSummary>
  /** Aggregate across all subjects for the active semester */
  aggregate: AggregateAttendance | null
  /** Sorted list of summaries (ascending by percentage — worst first) */
  sortedSummaries: AttendanceSummary[]
  /** True if the store has finished loading records from IndexedDB */
  isLoaded: boolean
  /** Raw store actions passed through for convenience */
  markAttendance: (record: Omit<import('@/types').AttendanceRecord, 'id'>) => Promise<void>
  updateRecord: (id: string, status: AttendanceStatus) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
}

export function useAttendance(): UseAttendanceResult {
  const { records, isLoaded, markAttendance, updateRecord, deleteRecord } = useAttendanceStore()
  const { subjects, activeSemesterId } = useSemesterStore()

  const activeSubjects = useMemo(
    () => subjects.filter(s => s.semesterId === activeSemesterId),
    [subjects, activeSemesterId]
  )

  const summaries = useMemo<Record<string, AttendanceSummary>>(() => {
    const map: Record<string, AttendanceSummary> = {}
    for (const subject of activeSubjects) {
      map[subject.id] = calcSubjectAttendance(subject, records)
    }
    return map
  }, [activeSubjects, records])

  const aggregate = useMemo<AggregateAttendance | null>(() => {
    if (activeSubjects.length === 0) return null
    return calcAggregateAttendance(activeSubjects, records)
  }, [activeSubjects, records])

  const sortedSummaries = useMemo(
    () => Object.values(summaries).sort((a, b) => a.percentage - b.percentage),
    [summaries]
  )

  return {
    summaries,
    aggregate,
    sortedSummaries,
    isLoaded,
    markAttendance,
    updateRecord,
    deleteRecord,
  }
}
