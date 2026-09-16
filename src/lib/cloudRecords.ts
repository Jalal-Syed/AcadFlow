import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'

export type CloudTableName =
  | 'profile'
  | 'semesters'
  | 'subjects'
  | 'attendanceRecords'
  | 'theoryMarks'
  | 'labMarks'
  | 'tasks'
  | 'exams'
  | 'timetableSlots'
  | 'timetableOverrides'
  | 'syllabusUnits'
  | 'notes'
  | 'studySets'
  | 'holidays'

export const CLOUD_TABLES: CloudTableName[] = [
  'profile', 'semesters', 'subjects', 'attendanceRecords',
  'theoryMarks', 'labMarks', 'tasks', 'exams', 'timetableSlots',
  'timetableOverrides', 'syllabusUnits', 'notes', 'studySets', 'holidays',
]

export interface CloudRecord<T extends { id: string } = { id: string }> {
  id: string
  user_id: string
  table_name: CloudTableName
  data: T
  updated_at: string
  created_at?: string
}

function currentUserId(): string {
  const userId = useAuthStore.getState().user?.id
  if (!userId) throw new Error('Sign in to save AcadFlow data to the cloud.')
  return userId
}

export async function upsertCloudRecord<T extends { id: string }>(
  tableName: CloudTableName,
  data: T,
): Promise<void> {
  const userId = currentUserId()
  const updatedAtValue = (data as { updatedAt?: unknown }).updatedAt
  const updatedAt = typeof updatedAtValue === 'string' ? updatedAtValue : new Date().toISOString()
  const { error } = await supabase.from('records').upsert({
    id: data.id,
    user_id: userId,
    table_name: tableName,
    data,
    updated_at: updatedAt,
  }, { onConflict: 'id,user_id,table_name' })
  if (error) throw error
}

export async function deleteCloudRecord(
  tableName: CloudTableName,
  id: string,
): Promise<void> {
  const userId = currentUserId()
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .eq('table_name', tableName)
  if (error) throw error
}

export async function listCloudRecords<T extends { id: string }>(
  tableName: CloudTableName,
): Promise<T[]> {
  const userId = currentUserId()
  const { data, error } = await supabase
    .from('records')
    .select('data')
    .eq('user_id', userId)
    .eq('table_name', tableName)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(row => row.data as T)
}

export async function clearCloudRecords(): Promise<void> {
  for (const tableName of CLOUD_TABLES) {
    const records = await listCloudRecords<{ id: string }>(tableName)
    await Promise.all(records.map(record => deleteCloudRecord(tableName, record.id)))
  }
}
