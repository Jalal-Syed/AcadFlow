/**
 * scraper/providers.ts
 * Multi-provider AI extraction engine with automatic failover.
 *
 * Supports:
 *   - Gemini 2.0 Flash (Google's native API format)
 *   - Groq Cloud (OpenAI-compatible, ultra-fast)
 *   - OpenRouter (OpenAI-compatible, model gateway)
 *
 * When one provider hits rate limits (429), the engine silently
 * tries the next configured provider. Users don't notice the switch.
 */

import type { AIProviderId, AIProviderConfig } from './types'
import { ExtractionError, ProviderRateLimitError } from './types'

// ─── Provider registry ────────────────────────────────────────────────────────

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google AI — 1M token context, 1500 req/day free',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'Your Gemini API key',
    validateKey: (k) => k.trim().length < 10 ? 'Key is too short' : null,
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference — 1000 req/day free',
    keyUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    validateKey: (k) => !k.trim().startsWith('gsk_') ? 'Groq keys start with "gsk_"' : null,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Multi-model gateway — 50 req/day free (no credits)',
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
    validateKey: (k) => !k.trim().startsWith('sk-or-') ? 'OpenRouter keys start with "sk-or-"' : null,
  },
]

export function getProviderConfig(id: AIProviderId): AIProviderConfig {
  return AI_PROVIDERS.find(p => p.id === id)!
}

// ─── Provider-specific API calls ──────────────────────────────────────────────

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    })
  } catch (err: any) {
    throw new ExtractionError(`Network error calling Gemini: ${err?.message ?? 'check your connection'}`)
  }

  if (!response.ok) {
    if (response.status === 429) throw new ProviderRateLimitError('gemini')
    if (response.status === 400) throw new ExtractionError('Invalid Gemini API key. Check your key in settings.')
    if (response.status === 403) throw new ExtractionError('Gemini API key unauthorised. Ensure it has Generative Language API access.')
    const errText = await response.text().catch(() => '')
    throw new ExtractionError(`Gemini API error ${response.status}: ${errText.slice(0, 150)}`)
  }

  const data = await response.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason
    throw new ExtractionError(
      reason === 'SAFETY'
        ? 'Gemini blocked the response due to safety filters. Try a different page.'
        : 'Empty response from Gemini. Try capturing again.'
    )
  }
  return text
}

async function callOpenAICompatible(
  endpoint: string,
  model: string,
  apiKey: string,
  prompt: string,
  providerId: AIProviderId,
  extraHeaders?: Record<string, string>,
): Promise<string> {
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
    })
  } catch (err: any) {
    throw new ExtractionError(`Network error calling ${providerId}: ${err?.message ?? 'check your connection'}`)
  }

  if (!response.ok) {
    if (response.status === 429) throw new ProviderRateLimitError(providerId)
    if (response.status === 401 || response.status === 403) {
      throw new ExtractionError(`${providerId} API key is invalid or unauthorised. Check your key in settings.`)
    }
    const errText = await response.text().catch(() => '')
    throw new ExtractionError(`${providerId} API error ${response.status}: ${errText.slice(0, 150)}`)
  }

  const data = await response.json()
  const text: string | undefined = data?.choices?.[0]?.message?.content

  if (!text) {
    throw new ExtractionError(`Empty response from ${providerId}. Try capturing again.`)
  }
  return text
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  return callOpenAICompatible(
    'https://api.groq.com/openai/v1/chat/completions',
    'llama-3.3-70b-versatile',
    apiKey,
    prompt,
    'groq',
  )
}

async function callOpenRouter(prompt: string, apiKey: string): Promise<string> {
  return callOpenAICompatible(
    'https://openrouter.ai/api/v1/chat/completions',
    'meta-llama/llama-3.3-70b-instruct:free',
    apiKey,
    prompt,
    'openrouter',
    {
      'HTTP-Referer': 'https://acadflow.app',
      'X-Title': 'AcadFlow Portal Sync',
    },
  )
}

// ─── Provider dispatcher ──────────────────────────────────────────────────────

const CALLERS: Record<AIProviderId, (prompt: string, apiKey: string) => Promise<string>> = {
  gemini: callGemini,
  groq: callGroq,
  openrouter: callOpenRouter,
}

export interface ProviderWithKey {
  id: AIProviderId
  apiKey: string
}

/**
 * Call providers in order. On 429 (rate limit), try the next one.
 * Returns the raw text response from the first provider that succeeds.
 * Throws if all providers are exhausted or a non-rate-limit error occurs.
 */
export async function callWithFailover(
  providers: ProviderWithKey[],
  prompt: string,
): Promise<{ text: string; providerId: AIProviderId }> {
  if (providers.length === 0) {
    throw new ExtractionError('No AI provider keys configured. Add at least one key in Portal Sync settings.')
  }

  const errors: string[] = []

  for (const { id, apiKey } of providers) {
    try {
      const caller = CALLERS[id]
      if (!caller) continue
      const text = await caller(prompt, apiKey)
      return { text, providerId: id }
    } catch (err) {
      if (err instanceof ProviderRateLimitError) {
        errors.push(`${id}: rate limited`)
        continue // try next provider
      }
      throw err // non-rate-limit errors are fatal
    }
  }

  throw new ExtractionError(
    `All AI providers hit rate limits. Try again in a few minutes.\n${errors.join(', ')}`
  )
}
