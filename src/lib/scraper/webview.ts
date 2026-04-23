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
 *   Android   → @capacitor-community/inappbrowser with executeScript + messageReceived
 *   Web/PWA   → throws ScraperNotSupportedError
 */

import { ScraperNotSupportedError } from './types'
import { isElectron, isCapacitorNative } from '@/lib/utils/platform'

// ─── Platform detection ───────────────────────────────────────────────────────

export async function isWebViewSupported(): Promise<boolean> {
  if (isElectron()) return true
  return isCapacitorNative()
}

// ─── Injected capture button script ──────────────────────────────────────────

/**
 * Injected into the portal WebView on every page load.
 * Creates a fixed "📥 Capture" button (AcadFlow indigo, bottom-right).
 *
 * On click:
 *   1. Extracts all <table> HTML from the page (or same-origin iframe)
 *   2. Stores the payload in window._afCapturePayload (polled by Electron)
 *   3. Also fires window.dispatchMessage for Capacitor InAppBrowser
 */
export const INJECT_CAPTURE_BUTTON = `
(function() {
  if (document.getElementById('af-capture-btn')) return 'already_injected';

  var btn = document.createElement('button');
  btn.id = 'af-capture-btn';
  btn.innerHTML = '&#128229; Capture';
  btn.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'z-index:2147483647',
    'background:#6C63FF',
    'color:#fff',
    'border:none',
    'border-radius:24px',
    'padding:12px 22px',
    'font-size:15px',
    'font-weight:700',
    'font-family:system-ui,-apple-system,sans-serif',
    'cursor:pointer',
    'box-shadow:0 4px 20px rgba(108,99,255,0.55)',
    'letter-spacing:0.02em',
    'user-select:none',
    '-webkit-tap-highlight-color:transparent',
    'transition:opacity 0.2s',
  ].join(';');

  btn.addEventListener('click', function() {
    btn.innerHTML = '&#8987; Capturing...';
    btn.disabled = true;

    try {
      // Try same-origin iframe first (some portals use frames)
      var iframe = document.querySelector('iframe');
      var doc = (iframe && iframe.contentDocument) ? iframe.contentDocument : document;

      // Extract table HTML — much smaller than full page HTML
      var tables = Array.prototype.map.call(
        doc.querySelectorAll('table'),
        function(t) { return t.outerHTML; }
      ).join('\\n');

      var payload = JSON.stringify({
        url:    window.location.href,
        title:  document.title,
        tables: tables
      });

      // Store for Electron polling
      window._afCapturePayload = payload;

      // Capacitor InAppBrowser message channel
      if (typeof window.dispatchMessage === 'function') {
        window.dispatchMessage({ type: 'af-capture', payload: payload });
      }

      btn.innerHTML = '&#10003; Captured!';
      btn.style.background = '#2ED573';
    } catch(e) {
      btn.innerHTML = '&#128229; Capture';
      btn.disabled = false;
    }
  });

  document.body.appendChild(btn);
  return 'injected';
})()
`

// ─── Captured page data ───────────────────────────────────────────────────────

export interface CapturedPage {
  url: string
  title: string
  tables: string  // concatenated table HTML
}

// ─── Electron WebView ─────────────────────────────────────────────────────────

async function electronCapture(portalUrl: string): Promise<CapturedPage> {
  const bridge = (window as any).webviewBridge
  if (!bridge) throw new ScraperNotSupportedError()

  await bridge.open(portalUrl)

  return new Promise((resolve, reject) => {
    const TIMEOUT_MS = 10 * 60 * 1000  // 10 min — user may need time to navigate

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

// ─── Android InAppBrowser ─────────────────────────────────────────────────────

async function androidCapture(_portalUrl: string): Promise<CapturedPage> {
  // TODO (SCRAPER-002): @capacitor-community/inappbrowser returns 404 on npm.
  // Evaluate alternatives before implementing Android WebView capture:
  //   - capacitor-inappbrowser (Ionic team fork, check executeScript support)
  //   - @capacitor/browser (official, but no executeScript — capture won't work)
  //   - @nickkelly1/capacitor-inappbrowser
  // Until a package is chosen, Android capture is not supported.
  throw new ScraperNotSupportedError(
    'Android WebView capture is not yet implemented. Use the desktop app to import data.'
  )
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
