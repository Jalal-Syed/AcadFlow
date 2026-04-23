/**
 * scraper/index.ts
 * Orchestrator — saves AI-extracted portal data to Dexie.
 *
 * This is now purely a data-writing module.
 * The capture + extraction flow lives in pages/Import/index.tsx.
 *
 * saveToDb(result, semesterId) → SyncResult
 *   Takes a CaptureResult from ai-extractor.ts and writes it to:
 *   - Subjects   → useSemesterStore.addSubject / updateSubject
 *   - Attendance → db.attendanceRecords.bulkAdd (portal wins — clears existing)
 *   - Marks      → db.theoryMarks.put / db.labMarks.put
 */

import type { CaptureResult, SyncResult, ScrapedAttendance, ScrapedMarks, ScrapedSubject } from './types'
import { db } from '@/db/schema'
import { useSemesterStore } from '@/stores/useSemesterStore'
import type { Subject, AttendanceRecord } from '@/types'
import { SUBJECT_COLORS } from '@/constants/grading'
import dayjs from 'dayjs'

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Write a CaptureResult to the local database.
 * Conflict resolution: portal data always wins.
 */
export async function saveToDb(
  result: CaptureResult,
  semesterId: string,
): Promise<SyncResult> {
  const syncedAt = new Date().toISOString()
  const base = { ok: true, syncedAt, captureType: result.type as any }

  if (result.type === 'unknown' || result.data === null) {
    return { ...base, ok: false, subjectsSynced: 0, attendanceSynced: 0, marksSynced: 0, error: 'AI could not detect academic data on this page.' }
  }

  try {
    if (result.type === 'subjects') {
      const n = await syncSubjects(result.data, semesterId)
      return { ...base, subjectsSynced: n, attendanceSynced: 0, marksSynced: 0 }
    }
    if (result.type === 'attendance') {
      const n = await syncAttendance(result.data, semesterId)
      return { ...base, subjectsSynced: 0, attendanceSynced: n, marksSynced: 0 }
    }
    if (result.type === 'marks') {
      const n = await syncMarks(result.data, semesterId)
      return { ...base, subjectsSynced: 0, attendanceSynced: 0, marksSynced: n }
    }
    return { ...base, ok: false, subjectsSynced: 0, attendanceSynced: 0, marksSynced: 0, error: 'Unknown capture type.' }
  } catch (err: any) {
    return { ok: false, syncedAt, captureType: result.type as any, subjectsSynced: 0, attendanceSynced: 0, marksSynced: 0, error: err?.message ?? 'Unexpected error while saving.' }
  }
}

// ─── Subject sync ─────────────────────────────────────────────────────────────

async function syncSubjects(
  scraped: ScrapedSubject[],
  semesterId: string,
): Promise<number> {
  const store = useSemesterStore.getState()
  const existing = store.getSubjectsBySemester(semesterId)
  const byCode = new Map(existing.map(s => [s.code, s]))
  const usedColors = existing.map(s => s.color)
  let synced = 0

  for (const s of scraped) {
    const ex = byCode.get(s.code)
    if (ex) {
      // Subject exists — update name/credits, preserve user's local config
      store.updateSubject(ex.id, { name: s.name, credits: s.credits })
    } else {
      // New subject — auto-assign color
      const color = SUBJECT_COLORS.find(c => !usedColors.includes(c)) ?? SUBJECT_COLORS[0]
      usedColors.push(color)

      const newSubject: Subject = {
        id: crypto.randomUUID(),
        semesterId,
        name: s.name,
        code: s.code,
        credits: s.credits,
        type: s.type,
        color,
        isMidtermBonusEnabled: true,
        isODCountedPresent: true,
        isMedicalExcluded: false,
        order: existing.length + synced,
      }
      // Add to store and DB (BUG-016)
      store.addSubject(newSubject)
      await db.subjects.put(newSubject)
      byCode.set(s.code, newSubject)
    }
    synced++
  }
  return synced
}

// ─── Attendance sync ──────────────────────────────────────────────────────────

async function syncAttendance(
  scraped: ScrapedAttendance[],
  semesterId: string,
): Promise<number> {
  const store = useSemesterStore.getState()
  const subjects = store.getSubjectsBySemester(semesterId)

  // Handle special __AGGREGATE__ code from portals that only expose total counts
  const isAggregate = scraped.length === 1 && scraped[0].subjectCode === '__AGGREGATE__'
  if (isAggregate) {
    return syncAggregateAttendance(scraped[0], subjects, semesterId)
  }

  let synced = 0

  for (const att of scraped) {
    // Match by code or by partial name match
    const subject = subjects.find(s => s.code === att.subjectCode)
      ?? subjects.find(s => att.subjectName && s.name.toLowerCase().includes(att.subjectName.toLowerCase().slice(0, 8)))
    if (!subject) continue

    // Portal wins: clear existing records for this subject
    const existingIds = await db.attendanceRecords
      .where('semesterId').equals(semesterId)
      .and(r => r.subjectId === subject.id)
      .primaryKeys()
    if (existingIds.length > 0) await db.attendanceRecords.bulkDelete(existingIds as string[])

    const records = buildAttendanceRecords(att, subject.id, semesterId, store)
    if (records.length > 0) await db.attendanceRecords.bulkAdd(records)
    synced += records.length
  }

  return synced
}

async function syncAggregateAttendance(
  agg: ScrapedAttendance,
  subjects: Subject[],
  semesterId: string,
): Promise<number> {
  // Distribute aggregate counts proportionally across all subjects
  const n = subjects.length
  if (n === 0) return 0

  const heldPerSubject     = Math.round(agg.totalHeld / n)
  const attendedPerSubject = Math.round(agg.totalAttended / n)

  let synced = 0
  for (const subject of subjects) {
    const existingIds = await db.attendanceRecords
      .where('semesterId').equals(semesterId)
      .and(r => r.subjectId === subject.id)
      .primaryKeys()
    if (existingIds.length > 0) await db.attendanceRecords.bulkDelete(existingIds as string[])

    const syntheticAtt: ScrapedAttendance = {
      subjectCode: subject.code,
      totalHeld: heldPerSubject,
      totalAttended: attendedPerSubject,
      records: [],
    }
    const store = useSemesterStore.getState()
    const records = buildAttendanceRecords(syntheticAtt, subject.id, semesterId, store)
    if (records.length > 0) await db.attendanceRecords.bulkAdd(records)
    synced += records.length
  }
  return synced
}

function buildAttendanceRecords(
  att: ScrapedAttendance,
  subjectId: string,
  semesterId: string,
  store: ReturnType<typeof useSemesterStore.getState>,
): AttendanceRecord[] {
  // Use per-day records if available
  if (att.records.length > 0) {
    return att.records.map(entry => ({
      id: crypto.randomUUID(),
      subjectId,
      semesterId,
      date: entry.date,
      status: entry.status,
      isMidtermBonusDay: false,
    }))
  }

  // Synthesise approximate records from aggregate counts
  const sem = store.semesters.find(s => s.id === semesterId)
  const startDate = sem?.startDate ? dayjs(sem.startDate) : dayjs().subtract(90, 'day')

  return Array.from({ length: att.totalHeld }, (_, i) => ({
    id: crypto.randomUUID(),
    subjectId,
    semesterId,
    date: startDate.add(i * 2, 'day').toISOString(),  // ~every 2 days approximation
    status: (i < att.totalAttended ? 'Present' : 'Absent') as 'Present' | 'Absent',
    isMidtermBonusDay: false,
  }))
}

// ─── Marks sync ───────────────────────────────────────────────────────────────

async function syncMarks(
  scraped: ScrapedMarks[],
  semesterId: string,
): Promise<number> {
  const store = useSemesterStore.getState()
  const subjects = store.getSubjectsBySemester(semesterId)
  let synced = 0

  for (const m of scraped) {
    const subject = subjects.find(s => s.code === m.subjectCode)
      ?? subjects.find(s => m.subjectName && s.name.toLowerCase().includes(m.subjectName.toLowerCase().slice(0, 8)))
    if (!subject) continue

    const getComp = (...labels: string[]) => {
      for (const lbl of labels) {
        const found = m.components.find(c =>
          c.label.toLowerCase().replace(/[\s\-_]/g, '').includes(lbl.toLowerCase().replace(/[\s\-_]/g, ''))
        )
        if (found?.marks != null) return found.marks
      }
      return null
    }

    if (m.type === 'Theory') {
      const existing = await db.theoryMarks
        .where('subjectId').equals(subject.id)
        .and(r => r.semesterId === semesterId)
        .first()

      const marks = {
        id:       existing?.id ?? crypto.randomUUID(),
        subjectId: subject.id,
        semesterId,
        mt1PartA: getComp('mt1parta', 'm1a', 'mid1parta'),
        mt1PartB: getComp('mt1partb', 'm1b', 'mid1partb', 'mt1', 'imid', 'mid1'),
        mt2PartA: getComp('mt2parta', 'm2a', 'mid2parta'),
        mt2PartB: getComp('mt2partb', 'm2b', 'mid2partb', 'mt2', 'iimid', 'mid2'),
        hasCBT:   false,
        cbtMarks: getComp('cbt', 'online'),
        assign1:  getComp('assignment1', 'assign1', 'a1'),
        assign2:  getComp('assignment2', 'assign2', 'a2'),
        viva:     getComp('viva'),
        seeMarks: getComp('see', 'endsem', 'external', 'seemarked'),
        seeEntered: false,
        status: 'AwaitingSEE' as const,
      }
      marks.hasCBT = marks.cbtMarks !== null
      marks.seeEntered = marks.seeMarks !== null

      await db.theoryMarks.put(marks)
    } else {
      const existing = await db.labMarks
        .where('subjectId').equals(subject.id)
        .and(r => r.semesterId === semesterId)
        .first()

      const marks = {
        id:        existing?.id ?? crypto.randomUUID(),
        subjectId: subject.id,
        semesterId,
        dayToDay:       getComp('daytoday', 'd2d', 'daytday'),
        vivaInternal:   getComp('vivainternal', 'internalviva', 'viva'),
        internalExam:   getComp('internalexam', 'internal'),
        labReport:      getComp('labreport', 'report'),
        seeWriteup:     getComp('writeup', 'writeup'),
        seeExecution:   getComp('execution', 'conduct'),
        seeResults:     getComp('results', 'result'),
        seePresentation:getComp('presentation'),
        seeVivaVoce:    getComp('vivavoce', 'seeviva', 'voce'),
        seeEntered: false,
        status: 'AwaitingSEE' as const,
      }
      const seeFields = [marks.seeWriteup, marks.seeExecution, marks.seeResults, marks.seePresentation, marks.seeVivaVoce]
      marks.seeEntered = seeFields.some(f => f !== null)

      await db.labMarks.put(marks)
    }
    synced++
  }

  return synced
}
