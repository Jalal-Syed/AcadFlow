/**
 * scraper/types.ts
 * All shared types for the AcadFlow portal scraper.
 *
 * NEW APPROACH: WebView + AI extraction.
 * - User logs in to portal manually in a WebView
 * - App captures table HTML from the current page
 * - Gemini 2.0 Flash extracts structured data
 * - No portal-specific adapters needed
 */

// ─── Portal config ─────────────────────────────────────────────────────────────
// Simple registry entry — just a name and URL to open in the WebView.
// No adapter logic, no credential fields, no DOM selectors.

export interface PortalConfig {
  id: string
  name: string
  baseUrl: string
  description: string
}

// ─── Capture type ─────────────────────────────────────────────────────────────

/** What the user wants to extract from the current page */
export type CaptureType = 'attendance' | 'marks' | 'subjects' | 'auto'

// ─── Scraped data shapes ──────────────────────────────────────────────────────

export interface ScrapedSubject {
  code: string
  name: string
  credits: number
  type: 'Theory' | 'Lab' | 'NoCredit'
}

export interface ScrapedAttendanceEntry {
  subjectCode: string
  date: string  // ISO date string
  status: 'Present' | 'Absent'
}

export interface ScrapedAttendance {
  subjectCode: string
  subjectName?: string
  totalHeld: number
  totalAttended: number
  /**
   * Per-day records when available.
   * If the portal only shows aggregate counts, this is empty —
   * the orchestrator synthesises records from the totals.
   */
  records: ScrapedAttendanceEntry[]
}

export interface ScrapedMarkComponent {
  label: string
  marks: number | null
  maxMarks: number
}

export interface ScrapedMarks {
  subjectCode: string
  subjectName?: string
  type: 'Theory' | 'Lab'
  components: ScrapedMarkComponent[]
}

// ─── AI extraction result ─────────────────────────────────────────────────────

export type CaptureResult =
  | { type: 'attendance'; data: ScrapedAttendance[] }
  | { type: 'marks';      data: ScrapedMarks[] }
  | { type: 'subjects';   data: ScrapedSubject[] }
  | { type: 'unknown';    data: null }

// ─── Sync result ──────────────────────────────────────────────────────────────

export type SyncStatus =
  | 'idle'
  | 'opening'      // WebView is opening
  | 'waiting'      // WebView open, waiting for user to navigate + tap Capture
  | 'extracting'   // AI extraction in progress
  | 'saving'       // Writing to Dexie
  | 'success'
  | 'error'

export interface SyncResult {
  ok: boolean
  syncedAt: string           // ISO datetime
  captureType: CaptureType
  subjectsSynced: number
  attendanceSynced: number
  marksSynced: number
  error?: string
}

// ─── AI Provider types ────────────────────────────────────────────────────────

export type AIProviderId = 'gemini' | 'groq' | 'openrouter'

export interface AIProviderConfig {
  id: AIProviderId
  name: string
  description: string
  keyUrl: string              // where users get a free key
  keyPlaceholder: string      // e.g. "gsk_..."
  /** Validate key format before saving — return null if valid, error message if not */
  validateKey: (key: string) => string | null
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class ScraperNotSupportedError extends Error {
  constructor(message = 'WebView capture requires the Electron desktop app or Android app.') {
    super(message)
    this.name = 'ScraperNotSupportedError'
  }
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExtractionError'
  }
}

/** Thrown when a provider returns 429 — signals the failover engine to try the next provider */
export class ProviderRateLimitError extends Error {
  constructor(public providerId: AIProviderId, message?: string) {
    super(message ?? `${providerId} rate limit reached`)
    this.name = 'ProviderRateLimitError'
  }
}

export class ApiKeyMissingError extends Error {
  constructor() {
    super('No AI provider keys configured. Add at least one key in Portal Sync settings.')
    this.name = 'ApiKeyMissingError'
  }
}
