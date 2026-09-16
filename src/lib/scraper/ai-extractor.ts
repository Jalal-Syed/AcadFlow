/**
 * scraper/ai-extractor.ts
 * Local HTML extraction for captured portal tables.
 *
 * Takes captured table HTML from any college portal page and extracts
 * structured academic data: attendance, marks, or subjects.
 *
 */

import type {
  CaptureType, CaptureResult,
  ScrapedAttendance, ScrapedMarks, ScrapedSubject,
} from './types'
import { ExtractionError } from './types'
import type { ProviderWithKey } from './providers'
import type { WebLLMProgressCallback } from './webllm-engine'

// ─── HTML pre-processing ──────────────────────────────────────────────────────

/**
 * Extract only table HTML from a captured page.
 * Sending just tables (not full page) dramatically reduces token usage
 * and focuses the AI on the relevant data.
 */
export function extractTablesFromHtml(rawHtml: string): string {
  if (typeof DOMParser === 'undefined') {
    // Node environment fallback — regex-based table extraction
    const matches = [...rawHtml.matchAll(/<table[\s\S]*?<\/table>/gi)]
    return matches.map(m => m[0]).join('\n')
  }

  const doc = new DOMParser().parseFromString(rawHtml, 'text/html')

  // Strip non-data elements to reduce noise
  const removals = ['script', 'style', 'nav', 'footer', 'header', 'svg', 'img', 'iframe', 'noscript']
  removals.forEach(sel => doc.querySelectorAll(sel).forEach(el => el.remove()))

  // Capture page context for the AI prompt
  const title   = doc.title?.trim() || ''
  const heading = doc.querySelector('h1, h2, h3')?.textContent?.trim() || ''

  // Extract table HTML only
  const tables = Array.from(doc.querySelectorAll('table'))
    .map(t => t.outerHTML)
    .join('\n')

  const ctx = [title, heading].filter(Boolean).join(' — ')
  return ctx ? `<!-- Page: ${ctx} -->\n${tables}` : tables
}

// Table parser

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
const textOf = (cell: Element) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? ''
const numberOf = (value: string): number | null => {
  if (!value || /^(ab|a|absent|-|na|n\/a)$/i.test(value.trim())) return null
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

const isSummary = (value: string) => /^(grand)?total|average|avg|percentage|overall$/i.test(value.trim())
const firstIndex = (headers: string[], patterns: string[]) =>
  headers.findIndex(header => patterns.some(pattern => header.includes(pattern)))

const componentMax = (label: string, type: 'Theory' | 'Lab') => {
  const value = normalize(label)
  if (value.includes('see') || value.includes('external')) return 60
  if (value.includes('cie') || value.includes('total')) return 40
  if (value.includes('assignment') || value.includes('assign') || value.includes('viva')) return 10
  if (type === 'Lab') return 10
  return 30
}

const componentPatterns = [
  'mt1parta', 'mt1partb', 'm1a', 'm1b', 'mid1parta', 'mid1partb', 'mt1', 'imid', 'mid1',
  'mt2parta', 'mt2partb', 'm2a', 'm2b', 'mid2parta', 'mid2partb', 'mt2', 'iimid', 'mid2',
  'cbt', 'online', 'assignment1', 'assign1', 'a1', 'assignment2', 'assign2', 'a2',
  'daytoday', 'd2d', 'daytday', 'vivainternal', 'internalviva', 'internalexam', 'internal',
  'labreport', 'report', 'writeup', 'execution', 'conduct', 'results', 'result',
  'presentation', 'vivavoce', 'seeviva', 'voce', 'viva', 'cie', 'see', 'endsem', 'external',
]

function parseTable(table: Element, requestedType: CaptureType): { type: CaptureType; data: ScrapedAttendance[] | ScrapedMarks[] | ScrapedSubject[] } | null {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (rows.length === 0) return null
  const headerRow = rows.find(row => row.querySelector('th')) ?? rows[0]
  const headers = Array.from(headerRow.querySelectorAll('th,td')).map(textOf)
  const normalizedHeaders = headers.map(normalize)
  const bodyRows = rows.slice(rows.indexOf(headerRow) + 1)
    .map(row => Array.from(row.querySelectorAll('th,td')).map(textOf))
    .filter(row => row.some(Boolean))
  const codeIndex = firstIndex(normalizedHeaders, ['subjectcode', 'coursecode', 'code'])
  const nameIndex = normalizedHeaders.findIndex((header, index) =>
    index !== codeIndex && ['subject', 'name', 'course'].some(pattern => header.includes(pattern)),
  )
  const subjectIndex = codeIndex >= 0 ? codeIndex : nameIndex
  const heldIndex = firstIndex(normalizedHeaders, ['held', 'conducted', 'totalclasses', 'total'])
  const attendedIndex = firstIndex(normalizedHeaders, ['present', 'attended'])
  const absentIndex = firstIndex(normalizedHeaders, ['absent'])
  const creditsIndex = firstIndex(normalizedHeaders, ['credit', 'credits'])
  const componentIndexes = normalizedHeaders
    .map((header, index) => componentPatterns.some(pattern => header.includes(pattern)) ? index : -1)
    .filter(index => index >= 0)

  const detectedType: CaptureType | 'unknown' = heldIndex >= 0 || attendedIndex >= 0 || absentIndex >= 0
    ? 'attendance'
    : componentIndexes.length > 0
      ? 'marks'
      : creditsIndex >= 0 || subjectIndex >= 0 ? 'subjects' : 'unknown'
  const type = requestedType === 'auto' ? detectedType : requestedType
  if (type === 'unknown' || subjectIndex < 0) return null

  if (type === 'attendance' && heldIndex >= 0) {
    const data: ScrapedAttendance[] = []
    for (const row of bodyRows) {
      const subject = row[subjectIndex]?.trim()
      if (!subject || isSummary(subject) || row.length <= Math.max(subjectIndex, heldIndex)) continue
      const held = numberOf(row[heldIndex])
      const absent = absentIndex >= 0 ? numberOf(row[absentIndex]) : null
      const attended = attendedIndex >= 0 ? numberOf(row[attendedIndex]) : (held != null && absent != null ? held - absent : null)
      if (held == null || attended == null) continue
      data.push({ subjectCode: subject, subjectName: nameIndex >= 0 && nameIndex !== codeIndex ? row[nameIndex] : undefined, totalHeld: Math.max(0, Math.round(held)), totalAttended: Math.max(0, Math.round(attended)), records: [] })
    }
    return { type, data }
  }

  if (type === 'marks' && componentIndexes.length > 0) {
    const data: ScrapedMarks[] = []
    for (const row of bodyRows) {
      const subject = row[subjectIndex]?.trim()
      if (!subject || isSummary(subject)) continue
      const name = nameIndex >= 0 && nameIndex !== codeIndex ? row[nameIndex] : undefined
      const type = /\b(lab|practical|workshop)\b/i.test(`${subject} ${name ?? ''}`) ? 'Lab' : 'Theory'
      const components = componentIndexes.map(index => ({ label: headers[index], marks: numberOf(row[index] ?? ''), maxMarks: componentMax(headers[index], type) }))
      if (components.some(component => component.marks !== null)) data.push({ subjectCode: subject, subjectName: name, type, components })
    }
    return { type: 'marks', data }
  }

  if (type === 'subjects') {
    const data: ScrapedSubject[] = []
    for (const row of bodyRows) {
      const subject = row[subjectIndex]?.trim()
      if (!subject || isSummary(subject)) continue
      const name = nameIndex >= 0 && nameIndex !== codeIndex ? row[nameIndex] : subject
      const noCredit = /\b(ncc|nss|pe|no\s*credit)\b/i.test(`${subject} ${name}`)
      const lab = /\b(lab|practical|workshop)\b/i.test(`${subject} ${name}`)
      data.push({ code: codeIndex >= 0 ? subject : name, name, credits: creditsIndex >= 0 ? numberOf(row[creditsIndex] ?? '') ?? (lab ? 1.5 : noCredit ? 0 : 3) : (lab ? 1.5 : noCredit ? 0 : 3), type: noCredit ? 'NoCredit' : lab ? 'Lab' : 'Theory' })
    }
    return { type, data }
  }
  return null
}

/** Parse captured portal tables without a network or inference provider. */
export function parseCapturedTables(tableHtml: string, captureType: CaptureType): CaptureResult {
  if (typeof DOMParser === 'undefined') throw new ExtractionError('HTML parsing is unavailable in this environment.')
  const doc = new DOMParser().parseFromString(tableHtml, 'text/html')
  const tables = Array.from(doc.querySelectorAll('table'))
  for (const table of tables) {
    const parsed = parseTable(table, captureType)
    if (parsed && parsed.data.length > 0) return parsed as CaptureResult
  }
  return captureType === 'auto' ? { type: 'unknown', data: null } : { type: captureType, data: [] } as CaptureResult
}

/**
 * Extract structured academic data from HTML tables.
 *
 * @param tableHtml        - Pre-extracted table HTML from the portal page
 * @param captureType      - What to extract: attendance, marks, subjects, or auto
 * @param providerOverride  - Optional: force a specific Ollama model by name
 * @param onWebLLMProgress  - Optional: progress callback during WebLLM inference
 */
export async function extractWithAI(
  tableHtml: string,
  captureType: CaptureType,
  providerOverride?: ProviderWithKey,
  onWebLLMProgress?: WebLLMProgressCallback,
): Promise<CaptureResult> {
  if (!tableHtml.trim()) {
    throw new ExtractionError(
      'No table content found on this page. Navigate to an attendance, marks, or subjects page first.',
    )
  }

  void providerOverride
  void onWebLLMProgress
  return parseCapturedTables(tableHtml, captureType)
}

/**
 * Extract using WebLLM explicitly — used when the user triggers a download
 * and wants to run inference immediately after, even before auto-routing kicks in.
 */
export async function extractWithWebLLMExplicit(
  tableHtml: string,
  captureType: CaptureType,
  modelId = '',
  onProgress?: WebLLMProgressCallback,
): Promise<CaptureResult> {
  if (!tableHtml.trim()) {
    throw new ExtractionError('No table content found.')
  }
  void modelId
  void onProgress
  return parseCapturedTables(tableHtml, captureType)
}
