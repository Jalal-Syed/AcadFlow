/**
 * stores/usePortalStore.ts
 * Manages portal capture state for the WebView + AI extraction flow.
 *
 * Persisted fields: lastPortalUrl, syncLog, configuredProviders
 * Transient fields: syncStatus, lastError, captureType (reset on hydration)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyncResult, SyncStatus, CaptureType, CaptureResult, AIProviderId } from '@/lib/scraper/types'

export interface SyncLogEntry extends SyncResult {
  id: string
}

interface PortalState {
  // ── Persisted ─────────────────────────────────────────────────────────────
  /** Last portal URL the user opened — pre-fills the portal picker next time */
  lastPortalUrl: string | null
  /** List of provider IDs that have keys saved (never the keys themselves) */
  configuredProviders: AIProviderId[]
  /** Last N capture results */
  syncLog: SyncLogEntry[]

  // ── Transient ─────────────────────────────────────────────────────────────
  syncStatus: SyncStatus
  lastError: string | null
  /** What the user selected to capture before opening the WebView */
  captureType: CaptureType

  // ── Backward compat ───────────────────────────────────────────────────────
  /** @deprecated — migrated to configuredProviders. Kept for hydration migration. */
  apiKeySet?: boolean

  // ── Actions ───────────────────────────────────────────────────────────────
  setConfiguredProviders: (providers: AIProviderId[]) => void
  addProvider: (id: AIProviderId) => void
  removeProvider: (id: AIProviderId) => void
  setLastPortalUrl: (url: string) => void
  setCaptureType: (type: CaptureType) => void
  setSyncStatus: (status: SyncStatus, error?: string) => void
  recordSync: (result: SyncResult) => void
  clearLog: () => void

  // ── Backward compat alias ─────────────────────────────────────────────────
  /** @deprecated — use configuredProviders.length > 0 instead */
  setApiKeySet: (set: boolean) => void

  /**
   * Full capture flow — called from the Import page.
   * Opens WebView → user taps Capture → AI extracts (with failover) → writes to Dexie.
   */
  runCapture: (portalUrl: string, captureType: CaptureType, semesterId: string) => Promise<void>
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────────────────
      lastPortalUrl: null,
      configuredProviders: [],
      syncLog: [],
      syncStatus: 'idle',
      lastError: null,
      captureType: 'auto',

      // ── setConfiguredProviders ─────────────────────────────────────────
      setConfiguredProviders: (providers) => set({ configuredProviders: providers }),

      // ── addProvider ────────────────────────────────────────────────────
      addProvider: (id) => set(s => ({
        configuredProviders: s.configuredProviders.includes(id)
          ? s.configuredProviders
          : [...s.configuredProviders, id],
      })),

      // ── removeProvider ─────────────────────────────────────────────────
      removeProvider: (id) => set(s => ({
        configuredProviders: s.configuredProviders.filter(p => p !== id),
      })),

      // ── setApiKeySet (backward compat) ────────────────────────────────
      setApiKeySet: (_set) => {
        // No-op — only kept so old code doesn't crash during migration
      },

      // ── setLastPortalUrl ─────────────────────────────────────────────────
      setLastPortalUrl: (url) => set({ lastPortalUrl: url }),

      // ── setCaptureType ────────────────────────────────────────────────────
      setCaptureType: (captureType) => set({ captureType }),

      // ── setSyncStatus ─────────────────────────────────────────────────────
      setSyncStatus: (syncStatus, error?) =>
        set({ syncStatus, lastError: error ?? null }),

      // ── recordSync ────────────────────────────────────────────────────────
      recordSync: (result) => {
        const entry: SyncLogEntry = { ...result, id: crypto.randomUUID() }
        set(s => ({
          syncStatus: result.ok ? 'success' : 'error',
          lastError:  result.ok ? null : (result.error ?? 'Unknown error'),
          syncLog:    [entry, ...s.syncLog].slice(0, 20),
        }))
      },

      // ── clearLog ──────────────────────────────────────────────────────────
      clearLog: () => set({ syncLog: [] }),

      // ── runCapture ────────────────────────────────────────────────────────
      runCapture: async (portalUrl, captureType, semesterId) => {
        const { setSyncStatus, recordSync, setLastPortalUrl, configuredProviders } = get()

        if (get().syncStatus === 'opening' || get().syncStatus === 'extracting' || get().syncStatus === 'saving') return

        if (configuredProviders.length === 0) {
          setSyncStatus('error', 'No AI provider keys configured. Add at least one API key (Gemini, Groq, or OpenRouter) in the settings above.')
          return
        }

        setLastPortalUrl(portalUrl)
        setSyncStatus('opening')

        try {
          // 1. Open WebView + wait for user to tap Capture
          const { capturePortalPage } = await import('@/lib/scraper/webview')
          const page = await capturePortalPage(portalUrl)

          if (!page.tables.trim()) {
            setSyncStatus('error', 'No tables found on this page. Navigate to your attendance or marks page first.')
            return
          }

          // 2. Extract with AI (multi-provider failover)
          setSyncStatus('extracting')
          const { extractWithAI } = await import('@/lib/scraper/ai-extractor')

          const captureResult: CaptureResult = await extractWithAI(page.tables, captureType)

          if (captureResult.type === 'unknown') {
            setSyncStatus('error', 'AI could not find academic data on this page. Navigate to attendance, marks, or subjects and try again.')
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
      partialize: (s) => ({
        lastPortalUrl:       s.lastPortalUrl,
        configuredProviders: s.configuredProviders,
        syncLog:             s.syncLog,
      }),
      // Migrate old apiKeySet → configuredProviders on hydration
      merge: (persisted: any, current) => {
        const merged = { ...current, ...persisted }
        // One-time migration: if old store had apiKeySet=true but no configuredProviders
        if (persisted?.apiKeySet === true && (!persisted?.configuredProviders || persisted.configuredProviders.length === 0)) {
          merged.configuredProviders = ['gemini']
          delete merged.apiKeySet
        }
        return merged
      },
    }
  )
)

// ── Derived helper ──────────────────────────────────────────────────────────
/** Backward compat: true if at least one provider is configured */
export const useHasAnyProvider = () => usePortalStore(s => s.configuredProviders.length > 0)
