// ─── Enums & Union Types ────────────────────────────────────────────────────

export type DegreeType = 'BTech' | 'Diploma' | 'MTech' | 'Integrated'
export type UniversityId = 'JNTUH' | 'VTU' | 'AnnaUniv' | 'JNTUA' | 'RTU' | 'GTU' | 'RGPV' | 'Custom'
export type SubjectType = 'Theory' | 'Lab' | 'NoCredit'
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'OD' | 'Medical' | 'Holiday' | 'Cancelled'
export type TaskType = 'Assignment' | 'LabRecord' | 'Project' | 'Presentation' | 'Viva' | 'Other'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TaskStatus = 'Pending' | 'InProgress' | 'Done' | 'Overdue'
export type ExamType = 'MidTerm1' | 'MidTerm2' | 'CBT' | 'SEE' | 'Supplementary' | 'LabSEE' | 'Viva' | 'FieldProject' | 'Internship' | 'ProjectViva'
export type SyllabusTopicStatus = 'NotStarted' | 'InProgress' | 'Completed' | 'RevisionDone'
export type NoteCategory = 'Notes' | 'PYQs' | 'Reference' | 'LabManual' | 'Other'
export type HolidayType = 'Gazetted' | 'University' | 'Local' | 'CollegeEvent'
export type AttendanceZone = 'Safe' | 'Okay' | 'Condonable' | 'Critical'
export type SubjectStatus = 'Passed' | 'AwaitingSEE' | 'Failed' | 'Supplementary'
export type DegreeClass = 'FirstWithDistinction' | 'First' | 'Second' | 'Pass' | 'NA'

// ─── User Profile ───────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  name: string
  college: string
  universityId: UniversityId
  degree: DegreeType
  branch: string
  rollNo?: string
  totalSemesters: number           // 8 for BTech, 6 for Diploma, 10 for Integrated
  currentSemester: number
  attendanceThreshold: number      // default 75
  gradingScaleId: string
  onboardingComplete: boolean      // true only after Done step — used as the app gate
  createdAt: string
  updatedAt: string
}

// ─── Grading ────────────────────────────────────────────────────────────────

export interface GradeEntry {
  grade: string                    // 'O' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F'
  minMarks: number
  gradePoint: number
}

export interface GradingScale {
  id: string
  universityId: UniversityId
  name: string
  grades: GradeEntry[]
  seePassMin: number               // JNTUH = 21 (35% of 60)
  overallPassMin: number           // JNTUH = 40
  cgpaToPercentFormula: 'jntuh' | 'multiply10' | 'custom'
}

// ─── Semester ───────────────────────────────────────────────────────────────

export interface Semester {
  id: string
  number: number                   // 1–10
  academicYear: string             // e.g. "2025-26"
  startDate: string                // ISO date
  endDate: string                  // ISO date
  isActive: boolean
  isArchived: boolean
  totalWorkingDays?: number
}

// ─── Subject ────────────────────────────────────────────────────────────────

export interface Subject {
  id: string
  semesterId: string
  name: string
  code: string                     // e.g. "CS301"
  credits: number
  type: SubjectType
  color: string                    // hex, auto-assigned from palette
  isMidtermBonusEnabled: boolean   // +2 hours per R-25 Clause 7.4
  isODCountedPresent: boolean
  isMedicalExcluded: boolean
  order: number                    // display order
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string
  subjectId: string
  semesterId: string
  date: string                     // ISO date
  status: AttendanceStatus
  isMidtermBonusDay: boolean       // true = this day adds bonus hour
  note?: string
}

export interface AttendanceSummary {
  subjectId: string
  totalHeld: number
  totalAttended: number
  bonusHours: number
  effectiveAttended: number        // attended + bonusHours
  percentage: number
  zone: AttendanceZone
  safeSkips: number                // how many more they can miss
  catchUpNeeded: number            // classes needed to recover (if negative budget)
}

export interface AggregateAttendance {
  totalHeld: number
  totalAttended: number
  aggregatePercentage: number
  zone: AttendanceZone
  aggregateSafeSkips: number
}

// ─── Marks — Theory ────────────────────────────────────────────────────────

export interface TheoryMarks {
  id: string
  subjectId: string
  semesterId: string
  // Mid-Term 1
  mt1PartA: number | null          // /10
  mt1PartB: number | null          // /20
  // Mid-Term 2
  mt2PartA: number | null          // /10
  mt2PartB: number | null          // /20
  // CBT
  hasCBT: boolean
  cbtMarks: number | null          // /30
  // CIE components
  assign1: number | null           // /5
  assign2: number | null           // /5
  viva: number | null              // /5
  // End Sem
  seeMarks: number | null          // /60
  seeEntered: boolean
  // Status
  status: SubjectStatus
}

// ─── Marks — Lab ───────────────────────────────────────────────────────────

export interface LabMarks {
  id: string
  subjectId: string
  semesterId: string
  // CIE (40 marks total, 4 × 10)
  dayToDay: number | null          // /10
  vivaInternal: number | null      // /10
  internalExam: number | null      // /10
  labReport: number | null         // /10
  // SEE (60 marks, 5 components)
  seeWriteup: number | null        // /10
  seeExecution: number | null      // /15
  seeResults: number | null        // /15
  seePresentation: number | null   // /10
  seeVivaVoce: number | null       // /10
  seeEntered: boolean
  status: SubjectStatus
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export interface SubTask {
  id: string
  title: string
  isDone: boolean
}

export interface Task {
  id: string
  semesterId: string
  subjectId?: string
  title: string
  type: TaskType
  dueDate: string                  // ISO datetime
  priority: TaskPriority
  status: TaskStatus
  description?: string
  subTasks: SubTask[]
  estimatedMinutes?: number
  isRecurring: boolean
  recurringPattern?: 'daily' | 'weekly' | 'biweekly'
  attachmentUrls: string[]
  createdAt: string
  updatedAt: string
}

// ─── Exams ──────────────────────────────────────────────────────────────────

export interface Exam {
  id: string
  semesterId: string
  subjectId: string
  name: string
  type: ExamType
  date: string                     // ISO datetime
  venue?: string
  syllabusUnitIds: string[]        // linked syllabus units
  notificationsScheduled: boolean
  createdAt: string
}

// ─── Timetable ──────────────────────────────────────────────────────────────

export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface TimetableSlot {
  id: string
  semesterId: string
  subjectId: string | null         // null = break/lunch
  day: WeekDay
  period: number                   // 1-indexed
  startTime: string                // "HH:MM"
  endTime: string                  // "HH:MM"
  room?: string
  isLab: boolean                   // lab = 2-hour block
  label?: string                   // e.g. "Lunch Break"
}

export interface TimetableOverride {
  id: string
  semesterId: string
  originalSlotId: string
  date: string                     // specific date this override applies to
  type: 'Cancelled' | 'Rescheduled' | 'Extra'
  newSubjectId?: string
  newStartTime?: string
  newEndTime?: string
  newRoom?: string
  note?: string
}

// ─── Syllabus ───────────────────────────────────────────────────────────────

export interface SyllabusTopic {
  id: string
  unitId: string
  name: string
  status: SyllabusTopicStatus
  order: number
}

export interface SyllabusUnit {
  id: string
  subjectId: string
  name: string                     // e.g. "Unit 1: Introduction to DBMS"
  order: number
  topics: SyllabusTopic[]
}

// ─── Notes ──────────────────────────────────────────────────────────────────

export interface Note {
  id: string
  semesterId: string
  subjectId: string
  title: string
  category: NoteCategory
  tags: string[]
  externalLink?: string
  richText?: string                // HTML string from editor
  isPinned: boolean
  studySetId?: string
  createdAt: string
  updatedAt: string
}

export interface StudySet {
  id: string
  semesterId: string
  name: string
  noteIds: string[]
  examId?: string
  createdAt: string
}

// ─── Calendar ───────────────────────────────────────────────────────────────

export interface Holiday {
  id: string
  semesterId?: string              // null = global
  date: string
  name: string
  type: HolidayType
}

// ─── Computed / UI State ────────────────────────────────────────────────────

export interface SubjectMarksComputed {
  subjectId: string
  mt1Total: number | null          // /30
  mt2Total: number | null          // /30
  midTermCIE: number | null        // best-2-of-3 average /30
  assignAvg: number | null         // /5
  ciTotal: number | null           // /40
  seeMarks: number | null          // /60
  totalMarks: number | null        // /100
  grade: string | null
  gradePoint: number | null
  status: SubjectStatus
  seeNeededToPass: number | null
  seeNeededForGrade: Record<string, number>  // { 'A+': 52, 'A': 42, ... }
}

export interface CGPAResult {
  sgpaPerSemester: { semesterId: string; sgpa: number; credits: number }[]
  cgpa: number
  percentage: number
  degreeClass: DegreeClass
  isDistinctionEligible: boolean
  totalCreditsRegistered: number
  totalCreditsEarned: number
}
