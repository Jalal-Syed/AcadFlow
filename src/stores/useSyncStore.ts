import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { syncNow } from '@/lib/sync'
import { useAuthStore } from '@/stores/useAuthStore'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SyncState {
  lastSyncAt: string | null
  syncStatus: SyncStatus
  lastError: string | null
  lastSyncedRecordCount: number
  isFirstSync: boolean

  sync: () => Promise<void>
  setLastSyncAt: (t: string) => void
  setSyncStatus: (s: SyncStatus, err?: string) => void
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      lastSyncAt: null,
      syncStatus: 'idle',
      lastError: null,
      lastSyncedRecordCount: 0,
      isFirstSync: true,

      sync: async () => {
        const { user } = useAuthStore.getState()
        if (!user) return

        const { syncStatus, lastSyncAt } = get()
        if (syncStatus === 'syncing') return  // already in flight

        set({ syncStatus: 'syncing', lastError: null })
        const syncStartedAt = new Date().toISOString()

        try {
          const { count } = await syncNow(user.id, lastSyncAt)
          set({
            syncStatus: 'success',
            lastSyncAt: syncStartedAt,
            lastSyncedRecordCount: count,
            isFirstSync: false,
          })
        } catch (err) {
          set({
            syncStatus: 'error',
            lastError: err instanceof Error ? err.message : 'Sync failed',
          })
        }
      },

      setLastSyncAt: (t) => set({ lastSyncAt: t }),
      setSyncStatus: (s, err) => set({ syncStatus: s, lastError: err ?? null }),
    }),
    { name: 'acadflow-sync' }
  )
)
