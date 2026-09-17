/**
 * stores/usePortalStore.ts
 * Manages portal capture state for the WebView + local table parser flow.
 *
 * Persisted fields: lastPortalUrl, syncLog
 * Transient fields: syncStatus, lastError, captureType (reset on hydration)
 *
 * Captured tables are parsed locally in the renderer.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyncResult, SyncStatus, CaptureType, CaptureResult } from '@/lib/scraper/types'

export interface SyncLogEntry extends SyncResult {
  id: string
}

interface PortalState {
  // Persisted
  lastPortalUrl: string | null
  syncLog: SyncLogEntry[]

  // Transient
  syncStatus: SyncStatus
  lastError: string | null
  captureType: CaptureType

  // Actions
  setLastPortalUrl: (url: string) => void
  setCaptureType: (type: CaptureType) => void
  setSyncStatus: (status: SyncStatus, error?: string) => void
  recordSync: (result: SyncResult) => void
  clearLog: () => void

  /**
   * Full capture flow — called from the Import page.
   * Opens WebView -> user taps Capture -> local parser extracts -> writes to Dexie.
   */
  runCapture: (portalUrl: string, captureType: CaptureType, semesterId: string) => Promise<void>
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set, get) => ({
      // Initial state
      lastPortalUrl: null,
      syncLog: [],
      syncStatus: 'idle',
      lastError: null,
      captureType: 'auto',

      // setLastPortalUrl
      setLastPortalUrl: url => set({ lastPortalUrl: url }),

      // setCaptureType
      setCaptureType: captureType => set({ captureType }),

      // setSyncStatus
      setSyncStatus: (syncStatus, error?) => set({ syncStatus, lastError: error ?? null }),

      // recordSync
      recordSync: result => {
        const entry: SyncLogEntry = { ...result, id: crypto.randomUUID() }
        set(s => ({
          syncStatus: result.ok ? 'success' : 'error',
          lastError: result.ok ? null : (result.error ?? 'Unknown error'),
          syncLog: [entry, ...s.syncLog].slice(0, 20),
        }))
      },

      // clearLog
      clearLog: () => set({ syncLog: [] }),

      // runCapture
      runCapture: async (portalUrl, captureType, semesterId) => {
        const { setSyncStatus, recordSync, setLastPortalUrl } = get()
        const status = get().syncStatus

        if (status === 'opening' || status === 'extracting' || status === 'saving') return

        setLastPortalUrl(portalUrl)
        setSyncStatus('opening')

        try {
          // 1. Open WebView + wait for user to tap Capture
          const { capturePortalPage } = await import('@/lib/scraper/webview')
          const page = await capturePortalPage(portalUrl)

          if (!page.tables.trim()) {
            setSyncStatus(
              'error',
              'No tables found on this page. Navigate to your attendance or marks page first.'
            )
            return
          }

          // 2. Parse captured tables locally without an inference engine.
          setSyncStatus('extracting')
          const { parseCapturedTables } = await import('@/lib/scraper/ai-extractor')
          const captureResult: CaptureResult = parseCapturedTables(page.tables, captureType)

          if (captureResult.type === 'unknown') {
            setSyncStatus(
              'error',
              'Could not identify academic data in these tables. Navigate to attendance, marks, or subjects and try again.'
            )
            return
          }

          // 3. Save to Dexie
          setSyncStatus('saving')
          const { saveToDb } = await import('@/lib/scraper/index')
          const result = await saveToDb(captureResult, semesterId)
          recordSync(result)
        } catch (err: any) {
          setSyncStatus('error', err?.message ?? 'Unexpected error during capture.')
        }
      },
    }),
    {
      name: 'acadflow-portal',
      partialize: s => ({
        lastPortalUrl: s.lastPortalUrl,
        syncLog: s.syncLog,
      }),
      // Drop legacy configuredProviders/apiKeySet fields from old persisted state
      merge: (persisted: any, current) => {
        const { configuredProviders: _, apiKeySet: __, ...rest } = persisted ?? {}
        return { ...current, ...rest }
      },
    }
  )
)
