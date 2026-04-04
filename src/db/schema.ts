import Dexie, { Table } from 'dexie'
import type {
  UserProfile, Semester, Subject,
  AttendanceRecord, TheoryMarks, LabMarks,
  Task, Exam, TimetableSlot, TimetableOverride,
  SyllabusUnit, Note, StudySet, Holiday,
  GradingScale,
} from '@/types'

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

    this.version(2).stores({
      // &id = primary key, other fields = indexed
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
