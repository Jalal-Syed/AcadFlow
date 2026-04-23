/**
 * scraper/crypto.ts
 * Credential and API key encryption/decryption for the AcadFlow portal scraper.
 *
 * Platform strategy:
 *   Electron  → window.scraperBridge.encrypt / .decrypt
 *               (IPC → electron.safeStorage — OS keychain / DPAPI)
 *   Android   → WebCrypto AES-GCM, derived key stored in
 *               @capacitor/preferences under a stable app-scoped key
 *   Web/PWA   → sessionStorage only (not persisted — user re-enters each time)
 *
 * NOTE: The @capacitor/preferences imports use /* @vite-ignore *\/ so Vite
 * skips static analysis on them. The package is only available (and only
 * needed) inside the Android APK; on Electron and web the isCapacitorNative()
 * guard ensures this code path is never reached.
 */

// ─── Platform helpers ─────────────────────────────────────────────────────────

import { isElectron } from '@/lib/utils/platform'

async function isCapacitorNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

// ─── WebCrypto helpers (used on Android) ─────────────────────────────────────

const AES_KEY_PREFS_KEY = 'acadflow-scraper-aes-key'

async function getOrCreateAESKey(): Promise<CryptoKey> {
  let rawBase64: string | null = null
  try {
    // @vite-ignore — Android-only package, never reached on Electron/web
    const { Preferences } = await import(/* @vite-ignore */ '@capacitor/preferences')
    const result = await Preferences.get({ key: AES_KEY_PREFS_KEY })
    rawBase64 = result.value
  } catch {
    // Preferences not available — fall back to in-memory (not persisted)
  }

  if (rawBase64) {
    const raw = Uint8Array.from(atob(rawBase64), c => c.charCodeAt(0))
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  }

  // Generate a new 256-bit AES-GCM key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const exported = await crypto.subtle.exportKey('raw', key)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)))

  try {
    // @vite-ignore — Android-only package, never reached on Electron/web
    const { Preferences } = await import(/* @vite-ignore */ '@capacitor/preferences')
    await Preferences.set({ key: AES_KEY_PREFS_KEY, value: base64 })
  } catch {
    // Preferences unavailable — key will be lost on reload
  }

  return key
}

async function webcryptoEncrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateAESKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(cipher)))
  return `${ivB64}:${ctB64}`
}

async function webcryptoDecrypt(encrypted: string): Promise<string> {
  const [ivB64, ctB64] = encrypted.split(':')
  if (!ivB64 || !ctB64) throw new Error('Invalid encrypted format')

  const key = await getOrCreateAESKey()
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))

  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plain)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function encryptCredential(plaintext: string): Promise<string> {
  if (isElectron()) {
    return (window as any).scraperBridge.encrypt(plaintext)
  }
  if (await isCapacitorNative()) {
    return webcryptoEncrypt(plaintext)
  }
  return plaintext
}

export async function decryptCredential(encrypted: string): Promise<string> {
  if (isElectron()) {
    return (window as any).scraperBridge.decrypt(encrypted)
  }
  if (await isCapacitorNative()) {
    return webcryptoDecrypt(encrypted)
  }
  return encrypted
}

export async function saveCredentials(
  adapterId: string,
  credentials: Record<string, string>
): Promise<void> {
  const isPersisted = isElectron() || (await isCapacitorNative())

  for (const [key, value] of Object.entries(credentials)) {
    const storageKey = `scraper-cred-${adapterId}-${key}`
    const encrypted = await encryptCredential(value)

    if (isPersisted) {
      if (isElectron()) {
        await (window as any).scraperBridge.storeCredential(storageKey, encrypted)
      } else {
        // @vite-ignore — Android-only package, never reached on Electron/web
        const { Preferences } = await import(/* @vite-ignore */ '@capacitor/preferences')
        await Preferences.set({ key: storageKey, value: encrypted })
      }
    } else {
      sessionStorage.setItem(storageKey, encrypted)
    }
  }
}

export async function loadCredentials(
  adapterId: string,
  fieldKeys: string[]
): Promise<Record<string, string> | null> {
  const result: Record<string, string> = {}

  for (const key of fieldKeys) {
    const storageKey = `scraper-cred-${adapterId}-${key}`
    let encrypted: string | null = null

    if (isElectron()) {
      encrypted = await (window as any).scraperBridge.loadCredential(storageKey)
    } else if (await isCapacitorNative()) {
      try {
        // @vite-ignore — Android-only package, never reached on Electron/web
        const { Preferences } = await import(/* @vite-ignore */ '@capacitor/preferences')
        const r = await Preferences.get({ key: storageKey })
        encrypted = r.value
      } catch {
        encrypted = null
      }
    } else {
      encrypted = sessionStorage.getItem(storageKey)
    }

    if (!encrypted) return null
    result[key] = await decryptCredential(encrypted)
  }

  return result
}

export async function clearCredentials(
  adapterId: string,
  fieldKeys: string[]
): Promise<void> {
  for (const key of fieldKeys) {
    const storageKey = `scraper-cred-${adapterId}-${key}`
    if (isElectron()) {
      await (window as any).scraperBridge.clearCredential(storageKey)
    } else if (await isCapacitorNative()) {
      try {
        // @vite-ignore — Android-only package, never reached on Electron/web
        const { Preferences } = await import(/* @vite-ignore */ '@capacitor/preferences')
        await Preferences.remove({ key: storageKey })
      } catch { /* ok */ }
    } else {
      sessionStorage.removeItem(storageKey)
    }
  }
}

// ─── AI Provider key helpers ──────────────────────────────────────────────────
// Reuses the same encrypted storage infrastructure above.
// Each provider's API key is stored under '__provider_{id}__' adapter ID.

import type { AIProviderId } from './types'

function providerAdapterId(providerId: AIProviderId): string {
  return `__provider_${providerId}__`
}

const PROVIDER_KEY_FIELD = 'apiKey'

/** Save an AI provider's API key, encrypted, to platform secure storage. */
export async function saveProviderKey(providerId: AIProviderId, key: string): Promise<void> {
  await saveCredentials(providerAdapterId(providerId), { [PROVIDER_KEY_FIELD]: key })
}

/** Load a saved AI provider's API key. Returns null if not set. */
export async function loadProviderKey(providerId: AIProviderId): Promise<string | null> {
  const creds = await loadCredentials(providerAdapterId(providerId), [PROVIDER_KEY_FIELD])
  return creds?.[PROVIDER_KEY_FIELD] ?? null
}

/** Remove a stored AI provider's API key. */
export async function clearProviderKey(providerId: AIProviderId): Promise<void> {
  await clearCredentials(providerAdapterId(providerId), [PROVIDER_KEY_FIELD])
}

// ─── Backward-compatible aliases (Gemini) ─────────────────────────────────────

/** @deprecated — use saveProviderKey('gemini', key) instead */
export const saveApiKey = (key: string) => saveProviderKey('gemini', key)
/** @deprecated — use loadProviderKey('gemini') instead */
export const loadApiKey = () => loadProviderKey('gemini')
/** @deprecated — use clearProviderKey('gemini') instead */
export const clearApiKey = () => clearProviderKey('gemini')
