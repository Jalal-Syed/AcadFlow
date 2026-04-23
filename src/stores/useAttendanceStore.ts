import { create } from 'zustand'
import type { AttendanceRecord, AttendanceStatus } from '@/types'
import { db } from '@/db/schema'
import dayjs from 'dayjs'

interface AttendanceState {
  records: AttendanceRecord[]
  isLoaded: boolean

  loadRecords: (semesterId: string) => Promise<void>
  markAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>
  updateRecord: (id: string, status: AttendanceStatus) => Promise<void>
  bulkMark: (subjectIds: string[], semesterId: string, fromDate: string, toDate: string, status: AttendanceStatus) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  getRecordsBySubject: (subjectId: string) => AttendanceRecord[]
  getRecordsByDate: (date: string) => AttendanceRecord[]
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  isLoaded: false,

  loadRecords: async (semesterId) => {
    const records = await db.attendanceRecords.where('semesterId').equals(semesterId).toArray()
    set({ records, isLoaded: true })
  },

  markAttendance: async (record) => {
    const id = crypto.randomUUID()
    const full: AttendanceRecord = { ...record, id }
    await db.attendanceRecords.add(full)
    set(state => ({ records: [...state.records, full] }))
  },

  updateRecord: async (id, status) => {
    // FIX NEW-BUG-02: stamp updatedAt in both DB and in-memory state so sync layer sees the change
    const updatedAt = new Date().toISOString()
    await db.attendanceRecords.update(id, { status, updatedAt })
    set(state => ({
      records: state.records.map(r => r.id === id ? { ...r, status, updatedAt } : r),
    }))
  },

  bulkMark: async (subjectIds, semesterId, fromDate, toDate, status) => {
    const records: AttendanceRecord[] = []
    let current = dayjs(fromDate)
    const end   = dayjs(toDate)

    while (!current.isAfter(end)) {
      for (const subjectId of subjectIds) {
        // FIX NEW-BUG-01: include updatedAt so in-memory state matches DB (Dexie hook stamps DB but not the object we push into Zustand)
        records.push({
          id: crypto.randomUUID(),
          subjectId,
          semesterId,
          date: current.toISOString(),
          status,
          isMidtermBonusDay: false,
          updatedAt: new Date().toISOString(),
        })
      }
      current = current.add(1, 'day')
    }

    await db.attendanceRecords.bulkAdd(records)
    set(state => ({ records: [...state.records, ...records] }))
  },

  deleteRecord: async (id) => {
    await db.attendanceRecords.delete(id)
    set(state => ({ records: state.records.filter(r => r.id !== id) }))
  },

  getRecordsBySubject: (subjectId) =>
    get().records.filter(r => r.subjectId === subjectId),

  getRecordsByDate: (date) => {
    const d = dayjs(date).format('YYYY-MM-DD')
    return get().records.filter(r => dayjs(r.date).format('YYYY-MM-DD') === d)
  },
}))
