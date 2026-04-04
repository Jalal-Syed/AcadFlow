import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Semester, Subject } from '@/types'

interface SemesterState {
  semesters: Semester[]
  subjects: Subject[]
  activeSemesterId: string | null

  // Getters
  activeSemester: () => Semester | undefined

  // Semester actions
  addSemester: (s: Semester) => void
  updateSemester: (id: string, partial: Partial<Semester>) => void
  setActiveSemester: (id: string) => void
  archiveSemester: (id: string) => void

  // Subject actions
  addSubject: (s: Subject) => void
  updateSubject: (id: string, partial: Partial<Subject>) => void
  removeSubject: (id: string) => void
  getSubjectsBySemester: (semesterId: string) => Subject[]
}

export const useSemesterStore = create<SemesterState>()(
  persist(
    (set, get) => ({
      semesters: [],
      subjects: [],
      activeSemesterId: null,

      activeSemester: () => get().semesters.find(s => s.id === get().activeSemesterId),

      addSemester: (s) => set(state => ({ semesters: [...state.semesters, s] })),

      updateSemester: (id, partial) =>
        set(state => ({
          semesters: state.semesters.map(s => s.id === id ? { ...s, ...partial } : s),
        })),

      setActiveSemester: (id) => set({ activeSemesterId: id }),

      archiveSemester: (id) =>
        set(state => ({
          semesters: state.semesters.map(s => s.id === id ? { ...s, isArchived: true, isActive: false } : s),
        })),

      addSubject: (s) => set(state => ({ subjects: [...state.subjects, s] })),

      updateSubject: (id, partial) =>
        set(state => ({
          subjects: state.subjects.map(s => s.id === id ? { ...s, ...partial } : s),
        })),

      removeSubject: (id) =>
        set(state => ({ subjects: state.subjects.filter(s => s.id !== id) })),

      getSubjectsBySemester: (semesterId) =>
        get().subjects.filter(s => s.semesterId === semesterId).sort((a, b) => a.order - b.order),
    }),
    { name: 'acadflow-semesters' }
  )
)
