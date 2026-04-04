/**
 * useSubjects.ts
 * Convenience hook that returns the subjects for the active semester,
 * already sorted by display order. Also exposes the active semester object
 * and subject CRUD actions so components don't need to reach into the store
 * directly for the common case.
 */

import { useMemo } from 'react'
import { useSemesterStore } from '@/stores/useSemesterStore'
import type { Subject, Semester } from '@/types'

// Subject colour palette — auto-assigned in order on creation
export const SUBJECT_COLORS = [
  '#6C63FF', // Electric Indigo
  '#00F5D4', // Neon Cyan
  '#FFA502', // Amber Gold
  '#FF6B9D', // Pink
  '#2ED573', // Emerald
  '#FF4757', // Red
  '#1E90FF', // Dodger Blue
  '#ECCC68', // Yellow
] as const

export interface UseSubjectsResult {
  subjects: Subject[]
  activeSemester: Semester | undefined
  activeSemesterId: string | null
  /** Next auto-assigned hex colour based on how many subjects exist */
  nextColor: string
  addSubject: (s: Subject) => void
  updateSubject: (id: string, partial: Partial<Subject>) => void
  removeSubject: (id: string) => void
  /** Find a single subject by id (returns undefined if not found) */
  getById: (id: string) => Subject | undefined
}

export function useSubjects(): UseSubjectsResult {
  const {
    subjects: allSubjects,
    activeSemesterId,
    activeSemester,
    addSubject,
    updateSubject,
    removeSubject,
  } = useSemesterStore()

  const subjects = useMemo(
    () =>
      allSubjects
        .filter(s => s.semesterId === activeSemesterId)
        .sort((a, b) => a.order - b.order),
    [allSubjects, activeSemesterId]
  )

  const nextColor = SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length]

  const getById = (id: string) => allSubjects.find(s => s.id === id)

  return {
    subjects,
    activeSemester: activeSemester(),
    activeSemesterId,
    nextColor,
    addSubject,
    updateSubject,
    removeSubject,
    getById,
  }
}
