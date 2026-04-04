import { create } from 'zustand'
import type { Exam } from '@/types'
import { db } from '@/db/schema'
import dayjs from 'dayjs'

interface ExamState {
  exams: Exam[]
  isLoaded: boolean

  loadExams: (semesterId: string) => Promise<void>
  addExam: (exam: Omit<Exam, 'id' | 'createdAt'>) => Promise<void>
  updateExam: (id: string, partial: Partial<Exam>) => Promise<void>
  deleteExam: (id: string) => Promise<void>

  getUpcoming: (limitDays?: number) => Exam[]
  getNext: () => Exam | null
}

export const useExamStore = create<ExamState>((set, get) => ({
  exams: [],
  isLoaded: false,

  loadExams: async (semesterId) => {
    const exams = await db.exams.where('semesterId').equals(semesterId).toArray()
    set({ exams: exams.sort((a, b) => a.date.localeCompare(b.date)), isLoaded: true })
  },

  addExam: async (exam) => {
    const full: Exam = { ...exam, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    await db.exams.add(full)
    set(state => ({
      exams: [...state.exams, full].sort((a, b) => a.date.localeCompare(b.date)),
    }))
  },

  updateExam: async (id, partial) => {
    await db.exams.update(id, partial)
    set(state => ({
      exams: state.exams.map(e => e.id === id ? { ...e, ...partial } : e),
    }))
  },

  deleteExam: async (id) => {
    await db.exams.delete(id)
    set(state => ({ exams: state.exams.filter(e => e.id !== id) }))
  },

  getUpcoming: (limitDays = 30) => {
    const now    = dayjs()
    const cutoff = now.add(limitDays, 'day')
    return get().exams.filter(e => {
      const d = dayjs(e.date)
      return d.isAfter(now) && d.isBefore(cutoff)
    })
  },

  getNext: () => {
    const now = dayjs()
    return get().exams.find(e => dayjs(e.date).isAfter(now)) ?? null
  },
}))
