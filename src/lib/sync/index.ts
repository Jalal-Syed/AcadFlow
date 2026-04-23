/**
 * Sync orchestrator — delta sync, last-write-wins.
 * Push changed records to Supabase `records` table, then pull remote changes.
 */

import { supabase } from '@/lib/supabase'
import { db } from '@/db/schema'
import { useSemesterStore } from '@/stores/useSemesterStore'
import { useProfileStore } from '@/stores/useProfileStore'
import type { Semester, Subject, UserProfile } from '@/types'

// ── Constants ─────────────────────────────────────────────────────────────

const DEXIE_TABLES = [
  'attendanceRecords', 'theoryMarks', 'labMarks', 'tasks', 'exams',
  'timetableSlots', 'timetableOverrides', 'syllabusUnits', 'notes',
  'studySets', 'holidays',
] as const

type DexieTableName = typeof DEXIE_TABLES[number]

const BATCH_SIZE = 500

// ── Types ─────────────────────────────────────────────────────────────────

interface SupabaseRecord {
  id: string
  user_id: string
  table_name: string
  data: Record<string, unknown>
  updated_at: string
}

// ── Push helpers ──────────────────────────────────────────────────────────

async function upsertBatch(rows: SupabaseRecord[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const { error } = await supabase
      .from('records')
      .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: 'id,user_id,table_name' })
    if (error) throw error
  }
}

async function pushDexieTable(
  tableName: DexieTableName,
  userId: string,
  lastSyncAt: string | null,
): Promise<number> {
  const table = db.table(tableName)
  const records: Record<string, unknown>[] = lastSyncAt
    // FIX NEW-BUG-06: use aboveOrEqual so a record whose updatedAt exactly
    // equals lastSyncAt isn't silently dropped by the strict > comparison.
    ? await table.where('updatedAt').aboveOrEqual(lastSyncAt).toArray()
    : await table.toArray()

  if (!records.length) return 0

  const now = new Date().toISOString()
  const rows: SupabaseRecord[] = records.map(r => ({
    id: r.id as string,
    user_id: userId,
    table_name: tableName,
    data: r,
    updated_at: (r.updatedAt as string) ?? now,
  }))

  await upsertBatch(rows)
  return records.length
}

async function pushZustandData(userId: string, lastSyncAt: string | null): Promise<number> {
  const { profile } = useProfileStore.getState()
  const { semesters, subjects } = useSemesterStore.getState()
  const now = new Date().toISOString()
  const rows: SupabaseRecord[] = []

  if (profile && (!lastSyncAt || (profile.updatedAt ?? '') > lastSyncAt)) {
    rows.push({
      id: profile.id,
      user_id: userId,
      table_name: 'profile',
      data: profile as unknown as Record<string, unknown>,
      updated_at: profile.updatedAt ?? now,
    })
  }

  for (const s of semesters) {
    if (!lastSyncAt || (s.updatedAt ?? '') > lastSyncAt) {
      rows.push({
        id: s.id,
        user_id: userId,
        table_name: 'semesters',
        data: s as unknown as Record<string, unknown>,
        updated_at: s.updatedAt ?? now,
      })
    }
  }

  for (const s of subjects) {
    if (!lastSyncAt || (s.updatedAt ?? '') > lastSyncAt) {
      rows.push({
        id: s.id,
        user_id: userId,
        table_name: 'subjects',
        data: s as unknown as Record<string, unknown>,
        updated_at: s.updatedAt ?? now,
      })
    }
  }

  if (!rows.length) return 0
  await upsertBatch(rows)
  return rows.length
}

// ── Pull & merge ──────────────────────────────────────────────────────────

async function pullAndMerge(userId: string, lastSyncAt: string | null): Promise<number> {
  let query = supabase.from('records').select('*').eq('user_id', userId)
  if (lastSyncAt) query = query.gt('updated_at', lastSyncAt)

  const { data, error } = await query
  if (error) throw error
  if (!data?.length) return 0

  // Group by table_name
  const grouped = data.reduce<Record<string, SupabaseRecord[]>>((acc, row) => {
    ;(acc[row.table_name] ??= []).push(row as SupabaseRecord)
    return acc
  }, {})

  // Dexie tables
  for (const tableName of DEXIE_TABLES) {
    const rows = grouped[tableName]
    if (!rows?.length) continue
    const table = db.table(tableName)

    for (const row of rows) {
      const remoteData = row.data
      const local = await table.get(remoteData.id as string) as Record<string, unknown> | undefined
      if (!local || row.updated_at > ((local.updatedAt as string) ?? '')) {
        await table.put(remoteData)
      }
    }
  }

  // profile
  const profileRows = grouped['profile']
  if (profileRows?.length) {
    const row = profileRows[0]
    const { profile } = useProfileStore.getState()
    if (!profile || row.updated_at > (profile.updatedAt ?? '')) {
      useProfileStore.getState().setProfile(row.data as unknown as UserProfile)
    }
  }

  // semesters
  const semRows = grouped['semesters']
  if (semRows?.length) {
    const { semesters } = useSemesterStore.getState()
    for (const row of semRows) {
      const remote = row.data as unknown as Semester
      const local = semesters.find(s => s.id === remote.id)
      if (!local) {
        useSemesterStore.getState().addSemester(remote)
      } else if (row.updated_at > (local.updatedAt ?? '')) {
        useSemesterStore.getState().updateSemester(remote.id, remote)
      }
    }
  }

  // subjects
  const subRows = grouped['subjects']
  if (subRows?.length) {
    const { subjects } = useSemesterStore.getState()
    for (const row of subRows) {
      const remote = row.data as unknown as Subject
      const local = subjects.find(s => s.id === remote.id)
      if (!local) {
        useSemesterStore.getState().addSubject(remote)
      } else if (row.updated_at > (local.updatedAt ?? '')) {
        useSemesterStore.getState().updateSubject(remote.id, remote)
      }
    }
  }

  return data.length
}

// ── Main export ───────────────────────────────────────────────────────────

export async function syncNow(
  userId: string,
  lastSyncAt: string | null,
): Promise<{ count: number }> {
  let pushCount = 0

  for (const tableName of DEXIE_TABLES) {
    pushCount += await pushDexieTable(tableName, userId, lastSyncAt)
  }
  pushCount += await pushZustandData(userId, lastSyncAt)

  const pullCount = await pullAndMerge(userId, lastSyncAt)

  return { count: pushCount + pullCount }
}
