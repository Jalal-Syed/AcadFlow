/**
 * electron/preload.js — AcadFlow Preload Script
 *
 * Exposes two bridge objects to the renderer via contextBridge:
 *
 *   window.scraperBridge  — credential encryption/storage (unchanged)
 *   window.webviewBridge  — portal WebView open/close + capture result listener
 *
 * contextIsolation: true  — renderer cannot access Node globals directly
 * sandbox: true           — renderer is fully sandboxed; only these bridges exist
 */

const { contextBridge, ipcRenderer } = require('electron')

// ─── scraperBridge (credential storage — unchanged) ───────────────────────────

contextBridge.exposeInMainWorld('scraperBridge', {
  /** CORS-free HTTP request via Node in the main process. */
  fetch: (opts) => ipcRenderer.invoke('scraper:fetch', opts),

  /** Encrypt a plaintext string using OS safeStorage (DPAPI / macOS Keychain). */
  encrypt: (plaintext) => ipcRenderer.invoke('scraper:encrypt', plaintext),

  /** Decrypt a base64 safeStorage-encrypted string back to plaintext. */
  decrypt: (encrypted) => ipcRenderer.invoke('scraper:decrypt', encrypted),

  /** Persist an encrypted credential value under a named key. */
  storeCredential: (key, value) => ipcRenderer.invoke('scraper:store-credential', key, value),

  /** Load a previously stored credential by key. Returns null if not found. */
  loadCredential: (key) => ipcRenderer.invoke('scraper:load-credential', key),

  /** Remove a stored credential by key. */
  clearCredential: (key) => ipcRenderer.invoke('scraper:clear-credential', key),
})

// ─── authBridge (OAuth deep-link callback) ───────────────────────────────────
// When the OS opens acadflow://auth/callback?... after Google/email auth,
// main.js forwards the URL here via 'auth:deep-link'.
// AuthCallbackPage listens with onDeepLink() and processes the session.

contextBridge.exposeInMainWorld('authBridge', {
  /**
   * Register a one-time listener for the OAuth deep-link URL.
   * Called by AuthCallbackPage on mount.
   */
  onDeepLink: (callback) => {
    ipcRenderer.once('auth:deep-link', (_event, url) => callback(url))
  },
  /** Remove the listener (called on unmount to avoid leaks). */
  removeDeepLinkListener: () => {
    ipcRenderer.removeAllListeners('auth:deep-link')
  },
  /**
   * FIX NEW-BUG-04: open a URL in the system browser without navigating
   * the app BrowserWindow. Used by signInWithGoogle() in Electron.
   */
  openExternal: (url) => {
    ipcRenderer.invoke('auth:open-external', url)
  },
})

contextBridge.exposeInMainWorld('webviewBridge', {
  /**
   * Open the portal URL in a separate BrowserWindow.
   * The Capture button is injected automatically on every page load.
   * Returns { ok: true } when the window has opened.
   */
  open: (portalUrl) => ipcRenderer.invoke('webview:open', portalUrl),

  /**
   * Programmatically close the portal window (e.g. on timeout).
   */
  close: () => ipcRenderer.invoke('webview:close'),

  /**
   * Register a one-time callback that fires when the user taps 📥 Capture.
   * The callback receives the raw JSON payload string from the portal page.
   *
   * Also cleans up the 'webview:closed' listener to prevent memory leaks
   * if the window is closed before capture.
   */
  onCapture: (callback) => {
    const handler = (_event, payload) => {
      ipcRenderer.removeAllListeners('webview:capture-result')
      ipcRenderer.removeAllListeners('webview:closed')
      callback(payload)
    }
    const closedHandler = () => {
      ipcRenderer.removeAllListeners('webview:capture-result')
      ipcRenderer.removeAllListeners('webview:closed')
      // Resolve with null payload to let the promise in webview.ts reject/timeout
      callback(null)
    }
    ipcRenderer.once('webview:capture-result', handler)
    ipcRenderer.once('webview:closed', closedHandler)
  },
})

// ─── updateBridge (auto-updater) ──────────────────────────────────────────────
// Lets the renderer listen for update events and trigger install-and-relaunch.
// main.js sends 'updater:status' IPC events with a typed status payload.

contextBridge.exposeInMainWorld('updateBridge', {
  /**
   * Register a persistent listener for update status events.
   * The callback is called with: { status, version?, percent?, message?, releaseNotes? }
   * status values: 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error'
   */
  onStatus: (callback) => {
    ipcRenderer.on('updater:status', (_event, data) => callback(data))
  },
  /** Remove all update status listeners (call on component unmount). */
  removeStatusListener: () => {
    ipcRenderer.removeAllListeners('updater:status')
  },
  /** Quit the app and install the downloaded update immediately. */
  installAndRelaunch: () => {
    ipcRenderer.invoke('updater:install')
  },
})
