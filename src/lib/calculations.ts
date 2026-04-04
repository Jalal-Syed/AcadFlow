/**
 * calculations.ts
 * All academic computation logic for AcadFlow.
 * Pure functions — no side effects, fully testable with Vitest.
 */

import type {
  Subject, AttendanceRecord, TheoryMarks,
  AttendanceSummary, AggregateAttendance, SubjectMarksComputed,
  AttendanceZone, DegreeClass, GradingScale,
} from '@/types'
import {
  ATTENDANCE_ZONES, DEGREE_CLASSES,
  JNTUH_BEST_CREDITS, PROMOTION_CREDIT_GATE,
} from '@/constants/grading'

// ─── Attendance ──────────────────────────────────────────────────────────────

export function getAttendanceZone(percentage: number): AttendanceZone {
  for (const z of ATTENDANCE_ZONES) {
    if (percentage >= z.min) return z.zone
  }
  return 'Critical'
}

export function getAttendanceZoneColor(zone: AttendanceZone): string {
  return ATTENDANCE_ZONES.find(z => z.zone === zone)?.color ?? '#FF4757'
}

/**
 * Per-subject attendance summary.
 * Mid-term bonus: +2 hours per theory subject if isMidtermBonusDay is true.
 */
export function calcSubjectAttendance(
  subject: Subject,
  records: AttendanceRecord[]
): AttendanceSummary {
  const relevant = records.filter(r => r.subjectId === subject.id)

  // Classes held = everything except cancelled/holiday
  const held = relevant.filter(r => r.status !== 'Cancelled' && r.status !== 'Holiday').length

  // Attended = Present + Late + OD (if enabled) + Medical (if not excluded)
  const attended = relevant.filter(r => {
    if (r.status === 'Present') return true
    if (r.status === 'Late')    return true
    if (r.status === 'OD'      && subject.isODCountedPresent) return true
    if (r.status === 'Medical' && !subject.isMedicalExcluded)  return true
    return false
  }).length

  // Bonus hours (R-25 Clause 7.4)
  const bonusHours = subject.isMidtermBonusEnabled
    ? relevant.filter(r => r.isMidtermBonusDay).length * 2
    : 0

  const effectiveAttended = attended + bonusHours
  const percentage = held === 0 ? 100 : Math.round((effectiveAttended / held) * 100 * 10) / 10
  const zone = getAttendanceZone(percentage)

  // Per-subject skip budget is NOT the eligibility metric — JNTUH R-25 Clause 7 uses
  // AGGREGATE attendance across all subjects. These are zeroed here intentionally.
  // Use calcAggregateAttendance() for the real safe-skip budget and detention risk.
  const safeSkips = 0
  const catchUpNeeded = 0

  return { subjectId: subject.id, totalHeld: held, totalAttended: attended, bonusHours, effectiveAttended, percentage, zone, safeSkips, catchUpNeeded }
}

/**
 * Aggregate attendance (the real JNTUH eligibility metric — Clause 7).
 */
export function calcAggregateAttendance(
  subjects: Subject[],
  records: AttendanceRecord[]
): AggregateAttendance {
  let totalHeld = 0
  let totalAttended = 0

  for (const s of subjects) {
    const summary = calcSubjectAttendance(s, records)
    totalHeld     += summary.totalHeld
    totalAttended += summary.effectiveAttended
  }

  const aggregatePercentage = totalHeld === 0 ? 100 : Math.round((totalAttended / totalHeld) * 100 * 10) / 10
  const zone = getAttendanceZone(aggregatePercentage)
  // How many more classes can be missed while staying at ≥75%?
  // Derivation: attended/(held+x) ≥ 0.75  →  x ≤ attended/0.75 - held
  const aggregateSafeSkips = Math.max(0, Math.floor(totalAttended / 0.75 - totalHeld))

  return { totalHeld, totalAttended, aggregatePercentage, zone, aggregateSafeSkips }
}

// ─── Theory Marks ────────────────────────────────────────────────────────────

function safeNum(v: number | null | undefined): number | null {
  return v != null && !isNaN(v) ? v : null
}

/**
 * Best 2 of 3 (MT1, MT2, CBT) averaged → mid-term CIE /30.
 * If no CBT, simple average of MT1 and MT2.
 */
export function calcMidTermCIE(
  mt1: number | null,
  mt2: number | null,
  cbt: number | null,
  hasCBT: boolean
): number | null {
  const scores = [mt1, mt2, ...(hasCBT ? [cbt] : [])].filter(s => s !== null) as number[]
  if (scores.length < 2) return scores.length === 1 ? scores[0] / 2 : null  // partial
  scores.sort((a, b) => b - a)
  const best2 = scores.slice(0, 2)
  return Math.round((best2[0] + best2[1]) / 2 * 10) / 10
}

export function calcCIETheory(marks: TheoryMarks): number | null {
  const mt1 = safeNum(marks.mt1PartA) !== null && safeNum(marks.mt1PartB) !== null
    ? (marks.mt1PartA! + marks.mt1PartB!) : null
  const mt2 = safeNum(marks.mt2PartA) !== null && safeNum(marks.mt2PartB) !== null
    ? (marks.mt2PartA! + marks.mt2PartB!) : null
  const cbt = safeNum(marks.cbtMarks)

  const midTermCIE = calcMidTermCIE(mt1, mt2, cbt, marks.hasCBT)
  const assignAvg  = (safeNum(marks.assign1) !== null && safeNum(marks.assign2) !== null)
    ? Math.round((marks.assign1! + marks.assign2!) / 2 * 10) / 10 : null
  const viva       = safeNum(marks.viva)

  if (midTermCIE === null) return null
  return (midTermCIE) + (assignAvg ?? 0) + (viva ?? 0)
}

/**
 * SEE marks needed to pass or reach a target grade.
 * Pass: SEE ≥ 21 AND CIE+SEE ≥ 40
 */
export function calcSEENeeded(cie: number, scale: GradingScale): { toPass: number; forGrade: Record<string, number> } {
  const toPass = Math.max(scale.seePassMin, scale.overallPassMin - cie)

  const forGrade: Record<string, number> = {}
  for (const g of scale.grades) {
    if (g.gradePoint === 0) continue  // skip F
    const needed = Math.max(scale.seePassMin, g.minMarks - cie)
    forGrade[g.grade] = Math.min(needed, 60)  // cap at max SEE
  }

  return { toPass, forGrade }
}

export function getGradeFromMarks(total: number, scale: GradingScale): { grade: string; gradePoint: number } {
  for (const g of scale.grades) {
    if (total >= g.minMarks) return { grade: g.grade, gradePoint: g.gradePoint }
  }
  return { grade: 'F', gradePoint: 0 }
}

export function computeTheoryMarks(marks: TheoryMarks, scale: GradingScale): SubjectMarksComputed {
  const mt1Total = (marks.mt1PartA != null && marks.mt1PartB != null)
    ? marks.mt1PartA + marks.mt1PartB : null
  const mt2Total = (marks.mt2PartA != null && marks.mt2PartB != null)
    ? marks.mt2PartA + marks.mt2PartB : null
  const midTermCIE = calcMidTermCIE(mt1Total, mt2Total, marks.cbtMarks, marks.hasCBT)
  const assignAvg  = (marks.assign1 != null && marks.assign2 != null)
    ? Math.round((marks.assign1 + marks.assign2) / 2 * 10) / 10 : null
  const ciTotal    = midTermCIE !== null ? midTermCIE + (assignAvg ?? 0) + (marks.viva ?? 0) : null
  const see        = marks.seeEntered ? marks.seeMarks : null
  const totalMarks = ciTotal !== null && see !== null ? ciTotal + see : null

  const passCheck  = see !== null && see >= scale.seePassMin && totalMarks !== null && totalMarks >= scale.overallPassMin
  const status     = see !== null
    ? (passCheck ? 'Passed' : 'Failed')
    : 'AwaitingSEE'

  const { forGrade } = ciTotal !== null ? calcSEENeeded(ciTotal, scale) : { forGrade: {} }
  const seeNeededToPass = ciTotal !== null ? Math.max(scale.seePassMin, scale.overallPassMin - ciTotal) : null

  const { grade, gradePoint } = totalMarks !== null ? getGradeFromMarks(totalMarks, scale) : { grade: null, gradePoint: null }

  return {
    subjectId: marks.subjectId,
    mt1Total, mt2Total, midTermCIE, assignAvg,
    ciTotal, seeMarks: see, totalMarks,
    grade: grade as string | null, gradePoint: gradePoint as number | null,
    status: status as any,
    seeNeededToPass,
    seeNeededForGrade: forGrade,
  }
}

// ─── SGPA / CGPA ─────────────────────────────────────────────────────────────

export function calcSGPA(
  subjects: { credits: number; gradePoint: number }[]
): number {
  const totalCredits    = subjects.reduce((s, x) => s + x.credits, 0)
  const weightedPoints  = subjects.reduce((s, x) => s + x.credits * x.gradePoint, 0)
  if (totalCredits === 0) return 0
  return Math.round((weightedPoints / totalCredits) * 100) / 100
}

/**
 * CGPA using best 160 of 164 registered credits (JNTUH R-25 Clause 10.11).
 * For non-JNTUH universities, uses all credits.
 */
export function calcCGPA(
  allCourses: { credits: number; gradePoint: number }[],
  useBest160 = true
): number {
  let courses = [...allCourses]

  if (useBest160 && courses.length > 0) {
    // Sort by contribution (gradePoint) descending, pick best 160 credits worth
    courses.sort((a, b) => b.gradePoint - a.gradePoint)
    let remaining = JNTUH_BEST_CREDITS
    const selected: typeof courses = []
    for (const c of courses) {
      if (remaining <= 0) break
      if (c.credits <= remaining) {
        selected.push(c)
        remaining -= c.credits
      } else {
        selected.push({ credits: remaining, gradePoint: c.gradePoint })
        remaining = 0
      }
    }
    courses = selected
  }

  return calcSGPA(courses)
}

/** JNTUH R-25 Clause 19.1 */
export function cgpaToPercentage(cgpa: number): number {
  return Math.round((cgpa - 0.5) * 10 * 100) / 100
}

// ─── Degree Classification ───────────────────────────────────────────────────

export function getDegreeClass(
  cgpa: number,
  isFirstAttemptAll: boolean,
  neverDetained: boolean
): DegreeClass {
  for (const dc of DEGREE_CLASSES) {
    if (cgpa >= dc.minCGPA && cgpa <= dc.maxCGPA) {
      if (dc.class === 'FirstWithDistinction') {
        return isFirstAttemptAll && neverDetained ? 'FirstWithDistinction' : 'First'
      }
      return dc.class
    }
  }
  return 'NA'
}

// ─── Promotion Gate ──────────────────────────────────────────────────────────

export function getPromotionStatus(
  creditsEarned: number,
  creditsRegistered: number
): { eligible: boolean; needed: number; shortfall: number } {
  const needed   = Math.ceil(creditsRegistered * PROMOTION_CREDIT_GATE)
  const shortfall = Math.max(0, needed - creditsEarned)
  return { eligible: creditsEarned >= needed, needed, shortfall }
}

// ─── Backlog Impact ──────────────────────────────────────────────────────────

export function calcBacklogImpact(
  currentCGPA: number,
  totalCreditsInCGPA: number,
  failedSubjectCredits: number,
  targetGradePoint: number
): { cgpaWithBacklog: number; cgpaDelta: number } {
  // Simulate replacing 0 gradePoint (F) with targetGradePoint for the subject
  const newWeighted = currentCGPA * totalCreditsInCGPA
    - 0 * failedSubjectCredits
    + targetGradePoint * failedSubjectCredits
  const cgpaWithBacklog = Math.round((newWeighted / totalCreditsInCGPA) * 100) / 100
  const cgpaDelta        = Math.round((cgpaWithBacklog - currentCGPA) * 100) / 100
  return { cgpaWithBacklog, cgpaDelta }
}
