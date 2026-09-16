/**
 * scraper/providers.ts
 * Local inference engine — Ollama only.
 *
 * All cloud providers (Gemini, Groq, OpenRouter) have been removed.
 * Extraction runs fully offline via a local Ollama instance.
 *
 * Preferred models (auto-picked in this order):
 *   gemma4 > gemma3 > gemma2 > gemma > first available model
 */

import type { AIProviderId, AIProviderConfig } from './types'
import { ExtractionError } from './types'

// Ollama local inference
export const OLLAMA_BASE = 'http://localhost:11434'
export const OLLAMA_DEFAULT_MODEL = 'gemma3:12b'

// Gemma model name prefixes, ordered by preference
const GEMMA_PATTERNS = ['gemma4', 'gemma3', 'gemma2', 'gemma']

// Provider registry — kept minimal, used by Settings UI and crypto key storage
export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Fully local inference — no API key needed, runs on your machine',
    keyUrl: 'https://ollama.com',
    keyPlaceholder: 'gemma3:12b',
    validateKey: (k) => k.trim().length === 0 ? 'Enter a model name, e.g. gemma3:12b' : null,
  },
]

export function getProviderConfig(id: AIProviderId): AIProviderConfig | undefined {
  return AI_PROVIDERS.find(p => p.id === id)
}

/**
 * Pick the best available Gemma model from an Ollama model list.
 * Prefers gemma4 > gemma3 > gemma2 > gemma > first available model.
 */
export function pickOllamaModel(models: string[]): string {
  for (const pattern of GEMMA_PATTERNS) {
    const found = models.find(m => m.toLowerCase().startsWith(pattern))
    if (found) return found
  }
  return models[0] ?? OLLAMA_DEFAULT_MODEL
}

/**
 * Call the local Ollama instance via its OpenAI-compatible endpoint.
 * modelName is the Ollama model tag, e.g. "gemma3:12b".
 */
export async function callOllama(prompt: string, modelName: string): Promise<string> {
  const model = modelName.trim() || OLLAMA_DEFAULT_MODEL
  let response: Response

  try {
    response = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
        stream: false,
      }),
    })
  } catch (err: any) {
    throw new ExtractionError(
      `Cannot reach Ollama. Make sure it is running:\n  ollama serve\n${err?.message ?? ''}`,
    )
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new ExtractionError(
        `Model "${model}" not found in Ollama. Pull it first:\n  ollama pull ${model}`,
      )
    }
    const errText = await response.text().catch(() => '')
    throw new ExtractionError(`Ollama error ${response.status}: ${errText.slice(0, 150)}`)
  }

  const data = await response.json()
  const text: string | undefined = data?.choices?.[0]?.message?.content
  if (!text) throw new ExtractionError('Empty response from Ollama. Try again.')
  return text
}

export interface ProviderWithKey {
  id: AIProviderId
  apiKey: string
}
