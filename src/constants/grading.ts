import type { GradingScale, AttendanceZone, DegreeClass } from '@/types'

// ─── JNTUH R-25 Grading Scale (Clause 10.3) ─────────────────────────────────
export const JNTUH_R25: GradingScale = {
  id: 'jntuh-r25',
  universityId: 'JNTUH',
  name: 'JNTUH R-25',
  seePassMin: 21,        // 35% of 60
  overallPassMin: 40,    // 40% of 100
  cgpaToPercentFormula: 'jntuh',
  grades: [
    { grade: 'O',  minMarks: 90, gradePoint: 10 },
    { grade: 'A+', minMarks: 80, gradePoint: 9  },
    { grade: 'A',  minMarks: 70, gradePoint: 8  },
    { grade: 'B+', minMarks: 60, gradePoint: 7  },
    { grade: 'B',  minMarks: 50, gradePoint: 6  },
    { grade: 'C',  minMarks: 40, gradePoint: 5  },
    { grade: 'F',  minMarks: 0,  gradePoint: 0  },
  ],
}

// ─── VTU Grading ─────────────────────────────────────────────────────────────
export const VTU: GradingScale = {
  id: 'vtu',
  universityId: 'VTU',
  name: 'VTU (2022 scheme)',
  seePassMin: 18,        // 30% of 60
  overallPassMin: 40,
  cgpaToPercentFormula: 'multiply10',
  grades: [
    { grade: 'O',  minMarks: 90, gradePoint: 10 },
    { grade: 'A+', minMarks: 80, gradePoint: 9  },
    { grade: 'A',  minMarks: 70, gradePoint: 8  },
    { grade: 'B+', minMarks: 60, gradePoint: 7  },
    { grade: 'B',  minMarks: 55, gradePoint: 6  },
    { grade: 'C',  minMarks: 50, gradePoint: 5  },
    { grade: 'P',  minMarks: 40, gradePoint: 4  },
    { grade: 'F',  minMarks: 0,  gradePoint: 0  },
  ],
}

// ─── Anna University ─────────────────────────────────────────────────────────
export const ANNA_UNIV: GradingScale = {
  id: 'anna-univ',
  universityId: 'AnnaUniv',
  name: 'Anna University (R-2021)',
  seePassMin: 18,
  overallPassMin: 40,
  cgpaToPercentFormula: 'multiply10',
  grades: [
    { grade: 'O',  minMarks: 91, gradePoint: 10 },
    { grade: 'A+', minMarks: 81, gradePoint: 9  },
    { grade: 'A',  minMarks: 71, gradePoint: 8  },
    { grade: 'B+', minMarks: 61, gradePoint: 7  },
    { grade: 'B',  minMarks: 51, gradePoint: 6  },
    { grade: 'C',  minMarks: 40, gradePoint: 5  },
    { grade: 'U',  minMarks: 0,  gradePoint: 0  },
  ],
}

// ─── JNTUA ───────────────────────────────────────────────────────────────────
export const JNTUA: GradingScale = {
  id: 'jntua',
  universityId: 'JNTUA',
  name: 'JNTUA R-20',
  seePassMin: 21,
  overallPassMin: 40,
  cgpaToPercentFormula: 'jntuh',
  grades: [
    { grade: 'O',  minMarks: 90, gradePoint: 10 },
    { grade: 'A+', minMarks: 80, gradePoint: 9  },
    { grade: 'A',  minMarks: 70, gradePoint: 8  },
    { grade: 'B+', minMarks: 60, gradePoint: 7  },
    { grade: 'B',  minMarks: 50, gradePoint: 6  },
    { grade: 'C',  minMarks: 40, gradePoint: 5  },
    { grade: 'F',  minMarks: 0,  gradePoint: 0  },
  ],
}

// ─── All scales map ───────────────────────────────────────────────────────────
export const GRADING_SCALES: Record<string, GradingScale> = {
  [JNTUH_R25.id]: JNTUH_R25,
  [VTU.id]:       VTU,
  [ANNA_UNIV.id]: ANNA_UNIV,
  [JNTUA.id]:     JNTUA,
}

// ─── Attendance Zone thresholds ───────────────────────────────────────────────
export const ATTENDANCE_ZONES: { zone: AttendanceZone; min: number; color: string; label: string }[] = [
  { zone: 'Safe',        min: 85, color: '#2ED573', label: 'Safe'        },
  { zone: 'Okay',        min: 75, color: '#00C9B1', label: 'Okay'        },
  { zone: 'Condonable',  min: 65, color: '#FFA502', label: 'Condonable'  },
  { zone: 'Critical',    min: 0,  color: '#FF4757', label: 'Detained Risk'},
]

// ─── Degree Classification (JNTUH R-25 Clause 17) ────────────────────────────
export interface DegreeClassEntry {
  class: DegreeClass
  label: string
  minCGPA: number
  maxCGPA: number
  requiresFirstAttempt?: boolean
  requiresNeverDetained?: boolean
}

export const DEGREE_CLASSES: DegreeClassEntry[] = [
  {
    class: 'FirstWithDistinction',
    label: 'First Class with Distinction',
    minCGPA: 7.5, maxCGPA: 10,
    requiresFirstAttempt: true,
    requiresNeverDetained: true,
  },
  { class: 'First',  label: 'First Class',  minCGPA: 6.5, maxCGPA: 10  },
  { class: 'Second', label: 'Second Class', minCGPA: 5.5, maxCGPA: 6.49 },
  { class: 'Pass',   label: 'Pass Class',   minCGPA: 5.0, maxCGPA: 5.49 },
  { class: 'NA',     label: 'Below Pass',   minCGPA: 0,   maxCGPA: 4.99 },
]

// ─── Subject colour palette (auto-assigned) ───────────────────────────────────
export const SUBJECT_COLORS = [
  '#6C63FF', '#00F5D4', '#FF4757', '#FFA502', '#2ED573',
  '#FF6B9D', '#4ECDC4', '#FFE66D', '#A78BFA', '#34D399',
  '#F97316', '#60A5FA', '#E879F9', '#FACC15', '#38BDF8',
]

// ─── JNTUH R-25 Best-160-Credits total ───────────────────────────────────────
export const JNTUH_TOTAL_CREDITS   = 164
export const JNTUH_BEST_CREDITS    = 160

// ─── Promotion rule: must earn ≥ 25% of credits registered each year ─────────
export const PROMOTION_CREDIT_GATE = 0.25
