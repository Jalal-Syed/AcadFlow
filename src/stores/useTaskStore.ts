import { create } from 'zustand'
import type { Task, TaskStatus } from '@/types'
import { db } from '@/db/schema'
import dayjs from 'dayjs'

interface TaskState {
  tasks: Task[]
  isLoaded: boolean

  loadTasks: (semesterId: string) => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTask: (id: string, partial: Partial<Task>) => Promise<void>
  completeTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>

  // Derived getters
  getOverdue: () => Task[]
  getDueToday: () => Task[]
  getDueThisWeek: () => Task[]
  getBySubject: (subjectId: string) => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoaded: false,

  loadTasks: async (semesterId) => {
    const tasks = await db.tasks.where('semesterId').equals(semesterId).toArray()
    // Auto-flag overdue
    const now = new Date().toISOString()
    const updated = tasks.map(t =>
      t.status !== 'Done' && t.dueDate < now ? { ...t, status: 'Overdue' as TaskStatus } : t
    )
    set({ tasks: updated, isLoaded: true })
  },

  addTask: async (task) => {
    const now = new Date().toISOString()
    const full: Task = { ...task, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await db.tasks.add(full)
    set(state => ({ tasks: [...state.tasks, full] }))
  },

  updateTask: async (id, partial) => {
    const updatedAt = new Date().toISOString()
    await db.tasks.update(id, { ...partial, updatedAt })
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...partial, updatedAt } : t),
    }))
  },

  completeTask: async (id) => {
    await get().updateTask(id, { status: 'Done' })
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id)
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }))
  },

  getOverdue: () => {
    const now = new Date().toISOString()
    return get().tasks.filter(t => t.status !== 'Done' && t.dueDate < now)
  },

  getDueToday: () => {
    const today = dayjs().format('YYYY-MM-DD')
    return get().tasks.filter(t =>
      t.status !== 'Done' && dayjs(t.dueDate).format('YYYY-MM-DD') === today
    )
  },

  getDueThisWeek: () => {
    const start = dayjs().startOf('week')
    const end   = dayjs().endOf('week')
    return get().tasks.filter(t =>
      t.status !== 'Done' &&
      !dayjs(t.dueDate).isBefore(start) &&
      !dayjs(t.dueDate).isAfter(end)
    )
  },

  getBySubject: (subjectId) =>
    get().tasks.filter(t => t.subjectId === subjectId),
}))
