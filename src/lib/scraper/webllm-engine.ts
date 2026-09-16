/**
 * scraper/webllm-engine.ts
 * On-device inference for Android via @mlc-ai/web-llm.
 *
 * WebLLM runs entirely inside the Capacitor WebView using WebGPU (Pixel 6+,
 * modern Snapdragons) or WASM as a fallback. The model is downloaded once and
 * cached in IndexedDB — no network needed after the first run.
 *
 * Setup:
 *   pnpm add @mlc-ai/web-llm
 *
 * Default model: gemma-2-2b-it-q4f16_1-MLC (~1.5 GB)
 * For lower-end devices: gemma-2-2b-it-q4f32_1-MLC (~800 MB, slower)
 */

import type { WebLLMStatus } from './types'
import { ExtractionError } from './types'

export const WEBLLM_DEFAULT_MODEL = 'gemma-2-2b-it-q4f16_1-MLC'

export type WebLLMProgressCallback = (update: {
  text: string
  progress: number
}) => void

// Singleton engine — initialised lazily on first extraction call
let _engine: any = null
let _engineModel: string | null = null
let _downloadProgress = 0
let _initError: string | null = null

// Track whether WebLLM / WebGPU is even available in this browser context
let _supported: boolean | null = null

export async function isWebLLMSupported(): Promise<boolean> {
  if (_supported !== null) return _supported
  // WebLLM requires at minimum a modern browser with WASM SIMD support.
  // WebGPU is preferred but not strictly required.
  try {
    _supported = typeof WebAssembly !== 'undefined'
    return _supported
  } catch {
    _supported = false
    return false
  }
}

export function getWebLLMStatus(): WebLLMStatus {
  return {
    ready: _engine !== null,
    modelId: _engineModel,
    downloadProgress: _downloadProgress,
    error: _initError ?? undefined,
  }
}

/**
 * Initialise (or re-use) the WebLLM engine with the given model.
 * Downloads the model on first call — this can take a while on mobile data.
 * Progress is reported via onProgress (0 → 1).
 */
export async function initWebLLMEngine(
  modelId = WEBLLM_DEFAULT_MODEL,
  onProgress?: WebLLMProgressCallback,
): Promise<void> {
  if (_engine && _engineModel === modelId) return

  _initError = null
  _downloadProgress = 0

  let CreateMLCEngine: any
  try {
    const mod = await import('@mlc-ai/web-llm')
    CreateMLCEngine = mod.CreateMLCEngine
  } catch {
    _initError = 'WebLLM package not installed. Run: pnpm add @mlc-ai/web-llm'
    throw new ExtractionError(_initError)
  }

  try {
    _engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report: any) => {
        _downloadProgress = report.progress ?? 0
        onProgress?.({ text: report.text ?? '', progress: _downloadProgress })
      },
    })
    _engineModel = modelId
    _downloadProgress = 1
  } catch (err: any) {
    _initError = err?.message ?? 'Failed to initialise WebLLM engine.'
    _engine = null
    _engineModel = null
    throw new ExtractionError(`WebLLM init failed: ${_initError}`)
  }
}

/**
 * Run inference with the loaded WebLLM engine.
 * Throws if the engine hasn't been initialised yet.
 */
export async function callWebLLM(
  prompt: string,
  modelId = WEBLLM_DEFAULT_MODEL,
  onProgress?: WebLLMProgressCallback,
): Promise<string> {
  if (!_engine || _engineModel !== modelId) {
    await initWebLLMEngine(modelId, onProgress)
  }

  let reply: any
  try {
    reply = await _engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2048,
    })
  } catch (err: any) {
    throw new ExtractionError(`WebLLM inference failed: ${err?.message ?? 'unknown error'}`)
  }

  const text: string | undefined = reply?.choices?.[0]?.message?.content
  if (!text) throw new ExtractionError('WebLLM returned an empty response. Try again.')
  return text
}

/**
 * Check whether a model is already cached in IndexedDB.
 * Avoids re-downloading if the user has already pulled the model.
 */
export async function isWebLLMModelCached(modelId = WEBLLM_DEFAULT_MODEL): Promise<boolean> {
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm')
    return hasModelInCache(modelId)
  } catch {
    return false
  }
}

/** Remove the cached model from IndexedDB to free space. */
export async function deleteWebLLMModelCache(modelId = WEBLLM_DEFAULT_MODEL): Promise<void> {
  try {
    const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm')
    await deleteModelAllInfoInCache(modelId)
    if (_engineModel === modelId) {
      _engine = null
      _engineModel = null
    }
  } catch (err: any) {
    throw new ExtractionError(`Failed to delete WebLLM cache: ${err?.message}`)
  }
}
