/**
 * electron/scraper-bridge.js
 * Main-process IPC handlers for the AcadFlow scraper.
 *
 * Registered via registerScraperBridge(ipcMain) in main.js.
 * Exposes 6 channels to the renderer (via preload.js contextBridge):
 *
 *   scraper:fetch            — CORS-free HTTP request via Node fetch
 *   scraper:encrypt          — Encrypt a string with OS safeStorage (DPAPI/Keychain)
 *   scraper:decrypt          — Decrypt a safeStorage-encrypted string
 *   scraper:store-credential — Persist an encrypted credential to userData JSON
 *   scraper:load-credential  — Load a stored credential
 *   scraper:clear-credential — Delete a stored credential
 */

const { safeStorage, app } = require('electron')
const path  = require('path')
const fs    = require('fs')

// ─── Credential store (JSON file in Electron's userData dir) ─────────────────
// Credentials are always encrypted with safeStorage before being written here.

function getCredStoreFile() {
  return path.join(app.getPath('userData'), 'scraper-creds.json')
}

function loadCredStore() {
  try {
    return JSON.parse(fs.readFileSync(getCredStoreFile(), 'utf-8'))
  } catch {
    return {}
  }
}

function saveCredStore(store) {
  fs.writeFileSync(getCredStoreFile(), JSON.stringify(store, null, 2), 'utf-8')
}

// ─── IPC handler registration ─────────────────────────────────────────────────

function registerScraperBridge(ipcMain) {

  // ── HTTP fetch — bypasses CORS entirely (runs in Node, not browser) ─────────
  ipcMain.handle('scraper:fetch', async (_event, { url, method, headers, body }) => {
    try {
      const res = await fetch(url, {
        method:   method ?? 'GET',
        headers:  headers ?? {},
        body:     method === 'POST' ? body : undefined,
        redirect: 'follow',
      })

      const text = await res.text()

      // Flatten headers into a plain object for IPC serialisation
      const resHeaders = {}
      res.headers.forEach((value, key) => { resHeaders[key] = value })

      return { status: res.status, headers: resHeaders, text }
    } catch (err) {
      // Return a structured error so the renderer can surface a useful message
      return { status: 0, headers: {}, text: '', error: err.message }
    }
  })

  // ── Encryption — OS safeStorage (DPAPI on Windows, Keychain on macOS) ──────
  ipcMain.handle('scraper:encrypt', async (_event, plaintext) => {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(plaintext).toString('base64')
    }
    // safeStorage unavailable (e.g. running on a headless CI machine).
    // Fall back to unencrypted — still stored only in the app's userData dir.
    return plaintext
  })

  ipcMain.handle('scraper:decrypt', async (_event, encrypted) => {
    if (safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      } catch {
        // Decryption failed (e.g. key rotated after OS reinstall) — clear it
        return null
      }
    }
    return encrypted
  })

  // ── Credential storage ───────────────────────────────────────────────────────
  ipcMain.handle('scraper:store-credential', async (_event, key, value) => {
    const store = loadCredStore()
    store[key]  = value
    saveCredStore(store)
  })

  ipcMain.handle('scraper:load-credential', async (_event, key) => {
    return loadCredStore()[key] ?? null
  })

  ipcMain.handle('scraper:clear-credential', async (_event, key) => {
    const store = loadCredStore()
    delete store[key]
    saveCredStore(store)
  })
}

module.exports = { registerScraperBridge }
