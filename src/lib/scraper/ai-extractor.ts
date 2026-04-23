/**
 * scraper/ai-extractor.ts
 * AI-powered data extraction with multi-provider failover.
 *
 * Takes captured table HTML from any college portal page and extracts
 * structured academic data: attendance, marks, or subjects.
 *
 * Supported providers (all free tier):
 *   - Gemini 2.0 Flash — 1M context, 1500 req/day
 *   - Groq (Llama 3.3 70B) — ultra-fast, 1000 req/day
 *   - OpenRouter (Llama 3.3 70B free) — model gateway, 50 req/day
 *
 * On 429 rate limit, automatically tries the next configured provider.
 */

import type {
  CaptureType, CaptureResult,
  ScrapedAttendance, ScrapedMarks, ScrapedSubject,
} from './types'
import { ExtractionError } from './types'
import { callWithFailover, AI_PROVIDERS } from './providers'
import type { ProviderWithKey } from './providers'
import { loadProviderKey } from './crypto'

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

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(tableHtml: string, captureType: CaptureType): string {
  const systemContext = `You are extracting academic data from an Indian engineering college student portal.
The institution uses JNTUH (Jawaharlal Nehru Technological University Hyderabad) or a similar university system.
Subject codes follow formats like: CS301, MA301BS, 22EC501PC, 23W1AT0101, PH1, etc.
You will receive HTML table content extracted from the portal page.`

  const schemas: Record<string, string> = {
    attendance: `Extract per-subject attendance data. Return ONLY this JSON:
{
  "subjects": [
    {
      "code": "subject code string",
      "name": "full subject name string",
      "totalHeld": <integer — total classes conducted>,
      "totalAttended": <integer — classes attended by student>
    }
  ]
}
Look for columns like: Subject/Code/Name, Total/Held/Conducted, Present/Attended, Absent, Percentage.
If the page only shows aggregate attendance (not per-subject), return one entry with code "__AGGREGATE__".
Derive totalAttended from: totalHeld - absences, or from a "Present" column directly.`,

    marks: `Extract internal assessment / CIE marks. Return ONLY this JSON:
{
  "subjects": [
    {
      "code": "subject code string",
      "name": "full subject name string",
      "type": "Theory" or "Lab",
      "components": [
        { "label": "component name", "marks": <number or null>, "maxMarks": <number> }
      ]
    }
  ]
}
Common component labels: MT1, MT2, CBT, Assignment1, Assignment2, Viva, CIE Total, SEE, Mid-1, Mid-2, I Mid, II Mid.
For Lab subjects: Day-to-Day, Internal Viva, Internal Exam, Lab Report, SEE Execution, SEE Results, SEE Writeup.
Use null for marks when the cell is blank, "-", "AB", "A", or absent. Never substitute 0 for a missing mark.
maxMarks: 30 for mid-terms, 10 for assignments/viva, 40 for CIE total, 60 for SEE.`,

    subjects: `Extract the subject/course registration list. Return ONLY this JSON:
{
  "subjects": [
    {
      "code": "subject code string",
      "name": "full subject name string",
      "credits": <number>,
      "type": "Theory" or "Lab" or "NoCredit"
    }
  ]
}
Infer type from name keywords: "lab", "practical", "workshop" → Lab. "NCC", "NSS", "PE", "no credit" → NoCredit. Default → Theory.
Credits are usually 1–5. If credits column is absent, use 3 for Theory, 1.5 for Lab, 0 for NoCredit.`,

    auto: `Detect what type of academic data is on this page and extract it.
Return ONLY this JSON:
{
  "detectedType": "attendance" or "marks" or "subjects" or "unknown",
  "subjects": [ <appropriate structure for detectedType> ]
}
For attendance: each subject needs code, name, totalHeld, totalAttended.
For marks: each subject needs code, name, type, components[].
For subjects: each subject needs code, name, credits, type.
Return detectedType "unknown" and empty subjects array if no recognisable academic data is found.`,
  }

  const schema = schemas[captureType] ?? schemas.auto

  // Cap HTML at ~80K chars — well within Gemini 2.0 Flash's 1M token window,
  // but generous enough to capture even large portal tables.
  const cappedHtml = tableHtml.length > 80_000
    ? tableHtml.slice(0, 80_000) + '\n<!-- [truncated] -->'
    : tableHtml

  return `${systemContext}

TASK: ${schema}

RULES:
- Return ONLY valid JSON. No markdown fences, no explanation, no preamble.
- If a subject code is not visible in the table, use the subject name as the code.
- Ignore header rows, totals/average rows, and navigation elements.
- Subject names should be the full name, not abbreviations.
- All numeric values must be plain numbers (not strings).
- Deduplicate subjects — if the same code appears multiple times, merge or keep the richer entry.

HTML TABLE CONTENT:
${cappedHtml}`
}

// ─── Multi-provider AI call ───────────────────────────────────────────────────

/**
 * Load all configured provider keys from secure storage.
 * Returns them in the default priority order: gemini → groq → openrouter.
 */
async function loadConfiguredProviders(): Promise<ProviderWithKey[]> {
  const providers: ProviderWithKey[] = []
  for (const p of AI_PROVIDERS) {
    const key = await loadProviderKey(p.id)
    if (key) providers.push({ id: p.id, apiKey: key })
  }
  return providers
}

/**
 * Extract structured academic data from HTML tables using AI.
 * Automatically tries all configured providers in order (failover on 429).
 *
 * @param tableHtml - Pre-extracted table HTML from the portal page
 * @param captureType - What to extract: attendance, marks, subjects, or auto-detect
 * @param providerOverrides - Optional: supply specific provider keys instead of loading from storage
 */
export async function extractWithAI(
  tableHtml: string,
  captureType: CaptureType,
  providerOverrides?: ProviderWithKey[],
): Promise<CaptureResult> {
  if (!tableHtml.trim()) {
    throw new ExtractionError('No table content found on this page. Navigate to an attendance, marks, or subjects page first.')
  }

  const prompt = buildPrompt(tableHtml, captureType)
  const providers = providerOverrides ?? await loadConfiguredProviders()

  const { text } = await callWithFailover(providers, prompt)

  let parsed: any
  try {
    // Strip markdown fences defensively (some providers add them despite JSON mode)
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    throw new ExtractionError('AI returned invalid JSON. Try capturing again.')
  }

  return mapToResult(parsed, captureType)
}

// ─── Response mapping ─────────────────────────────────────────────────────────

function mapToResult(parsed: any, captureType: CaptureType): CaptureResult {
  const rawSubjects: any[] = parsed?.subjects ?? []

  const effectiveType: CaptureType =
    captureType === 'auto'
      ? (parsed?.detectedType ?? 'unknown')
      : captureType

  if (effectiveType === 'attendance') {
    const data: ScrapedAttendance[] = rawSubjects
      .filter((s: any) => s && (s.code || s.name))
      .map((s: any) => ({
        subjectCode:   String(s.code  ?? s.name ?? 'UNKNOWN'),
        subjectName:   s.name ? String(s.name) : undefined,
        totalHeld:     Math.max(0, Math.round(Number(s.totalHeld)     || 0)),
        totalAttended: Math.max(0, Math.round(Number(s.totalAttended) || 0)),
        records:       [],
      }))
    return { type: 'attendance', data }
  }

  if (effectiveType === 'marks') {
    const data: ScrapedMarks[] = rawSubjects
      .filter((s: any) => s && (s.code || s.name) && Array.isArray(s.components))
      .map((s: any) => ({
        subjectCode: String(s.code ?? s.name ?? 'UNKNOWN'),
        subjectName: s.name ? String(s.name) : undefined,
        type: s.type === 'Lab' ? 'Lab' : 'Theory',
        components: (s.components as any[]).map(c => ({
          label:    String(c.label   ?? 'Unknown'),
          marks:    c.marks != null && !isNaN(Number(c.marks)) ? Number(c.marks) : null,
          maxMarks: Number(c.maxMarks) || 30,
        })),
      }))
    return { type: 'marks', data }
  }

  if (effectiveType === 'subjects') {
    const data: ScrapedSubject[] = rawSubjects
      .filter((s: any) => s && (s.code || s.name))
      .map((s: any) => ({
        code:    String(s.code ?? s.name),
        name:    String(s.name ?? s.code),
        credits: Number(s.credits) || 3,
        type:    s.type === 'Lab' ? 'Lab' : s.type === 'NoCredit' ? 'NoCredit' : 'Theory',
      }))
    return { type: 'subjects', data }
  }

  return { type: 'unknown', data: null }
}
