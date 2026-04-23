import Dexie, { Table } from 'dexie'
import type {
  UserProfile, Semester, Subject,
  AttendanceRecord, TheoryMarks, LabMarks,
  Task, Exam, TimetableSlot, TimetableOverride,
  SyllabusUnit, Note, StudySet, Holiday,
  GradingScale,
} from '@/types'

// Tables that need updatedAt stamped (all except gradingScales)
const STAMPED_TABLES = [
  'profile', 'semesters', 'subjects', 'attendanceRecords',
  'theoryMarks', 'labMarks', 'tasks', 'exams',
  'timetableSlots', 'timetableOverrides', 'syllabusUnits',
  'notes', 'studySets', 'holidays',
] as const

export class AcadFlowDB extends Dexie {
  // Tables
  profile!:            Table<UserProfile>
  gradingScales!:      Table<GradingScale>
  semesters!:          Table<Semester>
  subjects!:           Table<Subject>
  attendanceRecords!:  Table<AttendanceRecord>
  theoryMarks!:        Table<TheoryMarks>
  labMarks!:           Table<LabMarks>
  tasks!:              Table<Task>
  exams!:              Table<Exam>
  timetableSlots!:     Table<TimetableSlot>
  timetableOverrides!: Table<TimetableOverride>
  syllabusUnits!:      Table<SyllabusUnit>
  notes!:              Table<Note>
  studySets!:          Table<StudySet>
  holidays!:           Table<Holiday>

  constructor() {
    super('AcadFlowDB')

    // v2 schema kept so Dexie can run its upgrade path
    this.version(2).stores({
      profile:            '&id',
      gradingScales:      '&id, universityId',
      semesters:          '&id, number, isActive',
      subjects:           '&id, semesterId, type',
      attendanceRecords:  '&id, subjectId, semesterId, date, status',
      theoryMarks:        '&id, subjectId, semesterId',
      labMarks:           '&id, subjectId, semesterId',
      tasks:              '&id, semesterId, subjectId, status, dueDate, priority',
      exams:              '&id, semesterId, subjectId, type, date',
      timetableSlots:     '&id, semesterId, day, subjectId, [semesterId+day]',
      timetableOverrides: '&id, semesterId, originalSlotId, date',
      syllabusUnits:      '&id, subjectId',
      notes:              '&id, semesterId, subjectId, category, isPinned',
      studySets:          '&id, semesterId',
      holidays:           '&id, semesterId, date',
    })

    // v3 — adds updatedAt as an indexed field on all stamped tables
    this.version(3).stores({
      profile:            '&id, updatedAt',
      gradingScales:      '&id, universityId',
      semesters:          '&id, number, isActive, updatedAt',
      subjects:           '&id, semesterId, type, updatedAt',
      attendanceRecords:  '&id, subjectId, semesterId, date, status, updatedAt',
      theoryMarks:        '&id, subjectId, semesterId, updatedAt',
      labMarks:           '&id, subjectId, semesterId, updatedAt',
      tasks:              '&id, semesterId, subjectId, status, dueDate, priority, updatedAt',
      exams:              '&id, semesterId, subjectId, type, date, updatedAt',
      timetableSlots:     '&id, semesterId, day, subjectId, [semesterId+day], updatedAt',
      timetableOverrides: '&id, semesterId, originalSlotId, date, updatedAt',
      syllabusUnits:      '&id, subjectId, updatedAt',
      notes:              '&id, semesterId, subjectId, category, isPinned, updatedAt',
      studySets:          '&id, semesterId, updatedAt',
      holidays:           '&id, semesterId, date, updatedAt',
    }).upgrade(tx => {
      // Seed updatedAt on existing records so they're pushable on first sync
      const now = new Date().toISOString()
      const promises = STAMPED_TABLES.map(name =>
        tx.table(name).toCollection().modify((rec: Record<string, unknown>) => {
          if (!rec.updatedAt) {
            rec.updatedAt = (rec.createdAt as string | undefined) ?? now
          }
        })
      )
      return Promise.all(promises)
    })

    // ── Auto-stamp hooks ─────────────────────────────────────────────────
    // Runs on every write regardless of origin (stores, pages, portal scraper)
    for (const tableName of STAMPED_TABLES) {
      const table = this.table(tableName)

      table.hook('creating', (_primKey, obj: Record<string, unknown>) => {
        const now = new Date().toISOString()
        if (!obj.updatedAt) obj.updatedAt = now
        if (!obj.createdAt) obj.createdAt = now
      })

      table.hook('updating', (mods: Record<string, unknown>) => {
        mods.updatedAt = new Date().toISOString()
        return mods
      })
    }
  }
}

// Singleton instance — import this throughout the app
export const db = new AcadFlowDB()

// ─── Seed default grading scales on first run ─────────────────────────────
export async function seedGradingScales() {
  const count = await db.gradingScales.count()
  if (count > 0) return  // already seeded

  const { GRADING_SCALES } = await import('@/constants/grading')
  await db.gradingScales.bulkAdd(Object.values(GRADING_SCALES))
}
