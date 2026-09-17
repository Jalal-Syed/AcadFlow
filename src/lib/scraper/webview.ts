/**
 * scraper/webview.ts
 * WebView management for portal capture.
 *
 * Opens the college portal in an in-app browser, injects a floating
 * "📥 Capture" button on every page load, and returns the table HTML
 * when the user taps it.
 *
 * Platform strategy:
 *   Electron  → new BrowserWindow via IPC (webview:open / webview:close)
 *               Main process polls executeJavaScript for capture payload.
 *   Android   → tracked Capacitor PortalCapture plugin with a native WebView bridge
 *   Web/PWA   → throws ScraperNotSupportedError
 */

import { ScraperNotSupportedError } from './types'
import { isCapacitorNative, isElectron } from '@/lib/utils/platform'
import { PortalCapture } from '@acadflow/portal-capture'

// ─── Platform detection ───────────────────────────────────────────────────────

export async function isWebViewSupported(): Promise<boolean> {
  if (isElectron()) return true
  return isCapacitorNative()
}

// ─── Captured page data ───────────────────────────────────────────────────────

export interface CapturedPage {
  url: string
  title: string
  tables: string // concatenated table HTML
}

// ─── Electron WebView ─────────────────────────────────────────────────────────

async function electronCapture(portalUrl: string): Promise<CapturedPage> {
  const bridge = (window as any).webviewBridge
  if (!bridge) throw new ScraperNotSupportedError()

  await bridge.open(portalUrl)

  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 10 * 60 * 1000 // 10 min — user may need time to navigate

    const timer = setTimeout(() => {
      bridge.close().catch(() => {})
      reject(new Error('Capture timed out. Close and try again.'))
    }, TIMEOUT_MS)

    // bridge.onCapture registers an IPC listener for 'webview:capture-result'
    // (wired in preload.js). Fires once when the main process receives the payload.
    bridge.onCapture((payload: string) => {
      clearTimeout(timer)
      try {
        if (!payload) {
          throw new Error('Portal window closed without capturing data.')
        }
        const page: CapturedPage = JSON.parse(payload) as CapturedPage
        resolve(page)
      } catch {
        reject(new Error('Capture payload was malformed. Try again.'))
      }
    })
  })
}

async function androidCapture(portalUrl: string): Promise<CapturedPage> {
  return new Promise(async (resolve, reject) => {
    let settled = false
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      void captureListener.remove()
      void closedListener.remove()
      void errorListener.remove()
      callback()
    }

    const captureListener = await PortalCapture.addListener('capture', payload => {
      finish(() => resolve(payload))
    })
    const closedListener = await PortalCapture.addListener('closed', () => {
      finish(() => reject(new Error('Portal window closed without capturing data.')))
    })
    const errorListener = await PortalCapture.addListener('error', payload => {
      finish(() => reject(new Error(payload.message)))
    })

    try {
      await PortalCapture.open({ url: portalUrl })
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error('Could not open portal.')))
    }
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Open `portalUrl` in a WebView, wait for the user to tap the Capture button,
 * and return the captured page data.
 *
 * Resolves when capture is complete; rejects on timeout or unsupported platform.
 */
export async function capturePortalPage(portalUrl: string): Promise<CapturedPage> {
  if (isElectron()) return electronCapture(portalUrl)
  if (await isCapacitorNative()) return androidCapture(portalUrl)
  throw new ScraperNotSupportedError()
}
