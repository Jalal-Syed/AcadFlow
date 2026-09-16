import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Semester, Subject } from '@/types'
import { deleteCloudRecord, upsertCloudRecord } from '@/lib/cloudRecords'

interface SemesterState {
  semesters: Semester[]
  subjects: Subject[]
  activeSemesterId: string | null

  // Getters
  activeSemester: () => Semester | undefined

  // Semester actions
  addSemester: (s: Semester) => Promise<void>
  updateSemester: (id: string, partial: Partial<Semester>) => Promise<void>
  setActiveSemester: (id: string) => void
  archiveSemester: (id: string) => void
  removeSemester: (id: string) => Promise<void>

  // Subject actions
  addSubject: (s: Subject) => Promise<void>
  updateSubject: (id: string, partial: Partial<Subject>) => Promise<void>
  removeSubject: (id: string) => Promise<void>
  getSubjectsBySemester: (semesterId: string) => Subject[]
}

export const useSemesterStore = create<SemesterState>()(
  persist(
    (set, get) => ({
      semesters: [],
      subjects: [],
      activeSemesterId: null,

      activeSemester: () => get().semesters.find(s => s.id === get().activeSemesterId),

          addSemester: async (s) => {
            const semester = { ...s, updatedAt: s.updatedAt ?? new Date().toISOString() }
            await upsertCloudRecord('semesters', semester)
            set(state => ({ semesters: [...state.semesters, semester] }))
          },

          updateSemester: async (id, partial) => {
            const current = get().semesters.find(semester => semester.id === id)
            if (!current) return
            const semester = { ...current, ...partial, updatedAt: new Date().toISOString() }
            await upsertCloudRecord('semesters', semester)
            set(state => ({
              semesters: state.semesters.map(s => s.id === id ? semester : s),
            }))
          },

      setActiveSemester: (id) => set({ activeSemesterId: id }),

      archiveSemester: (id) =>
        set(state => ({
          semesters: state.semesters.map(s => s.id === id ? { ...s, isArchived: true, isActive: false, updatedAt: new Date().toISOString() } : s),
        })),

      removeSemester: async (id) => {
        const subjects = get().subjects.filter(subject => subject.semesterId === id)
        await deleteCloudRecord('semesters', id)
        await Promise.all(subjects.map(subject => deleteCloudRecord('subjects', subject.id)))
        set(state => ({
          semesters: state.semesters.filter(s => s.id !== id),
          subjects:  state.subjects.filter(s => s.semesterId !== id),
        }))
      },

      addSubject: async (s) => {
        const subject = { ...s, updatedAt: s.updatedAt ?? new Date().toISOString() }
        await upsertCloudRecord('subjects', subject)
        set(state => ({ subjects: [...state.subjects, subject] }))
      },

      updateSubject: async (id, partial) => {
        const current = get().subjects.find(subject => subject.id === id)
        if (!current) return
        const subject = { ...current, ...partial, updatedAt: new Date().toISOString() }
        await upsertCloudRecord('subjects', subject)
        set(state => ({
          subjects: state.subjects.map(s => s.id === id ? subject : s),
        }))
      },

      removeSubject: async (id) => {
        await deleteCloudRecord('subjects', id)
        set(state => ({ subjects: state.subjects.filter(s => s.id !== id) }))
      },

      getSubjectsBySemester: (semesterId) =>
        get().subjects.filter(s => s.semesterId === semesterId).sort((a, b) => a.order - b.order),
    }),
    { name: 'acadflow-semesters' }
  )
)
