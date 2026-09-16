/**
 * Platform detection utilities
 */

import type { OllamaStatus } from '@/lib/scraper/types'

export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && (!!(window as any).scraperBridge || !!(window as any).webviewBridge)
}

export const isCapacitorNative = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.isNativePlatform()
}

export const isAndroid = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  const { Capacitor } = await import('@capacitor/core')
  return Capacitor.getPlatform() === 'android'
}

// Probe local Ollama instance — 2 s timeout so it doesn't hang the UI
export const checkOllama = async (): Promise<OllamaStatus> => {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return { available: false, models: [] }
    const data = await res.json()
    const models: string[] = (data.models ?? []).map((m: any) => String(m.name))
    return { available: true, models }
  } catch {
    return { available: false, models: [] }
  }
}
