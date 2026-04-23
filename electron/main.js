/**
 * electron/main.js — AcadFlow Desktop Main Process
 *
 * In dev:  loads http://localhost:5173 (Vite dev server must be running)
 * In prod: loads dist/index.html via file:// — React app uses HashRouter in
 *          Electron so all SPA routes resolve correctly (see src/main.tsx).
 */

const { app, BrowserWindow, shell, nativeTheme, ipcMain } = require('electron')
const path = require('path')
const { registerScraperBridge } = require('./scraper-bridge')

// Auto-updater — only active in production builds.
// In dev (isDev=true) the app is loaded from localhost and has no installer,
// so update checks are skipped to avoid confusing errors.
let autoUpdater = null
try {
  autoUpdater = require('electron-updater').autoUpdater
  autoUpdater.autoDownload = true          // silently download in background
  autoUpdater.autoInstallOnAppQuit = true  // install when user quits normally
} catch {
  // electron-updater not available (e.g. running raw `electron .` in dev
  // without installing the electron/ sub-package dependencies)
  autoUpdater = null
}

nativeTheme.themeSource = 'dark'

const isDev = process.env.NODE_ENV === 'development'

// ── Custom protocol (acadflow://) — used for OAuth deep-link callbacks ────────
// macOS: fires app.on('open-url')
// Windows / Linux: fires app.on('second-instance') with the URL in argv
//
// Register BEFORE app.whenReady so the protocol is known from first launch.
if (process.defaultApp && process.argv.length >= 2) {
  // Dev mode: associate only when invoked via `electron .`
  app.setAsDefaultProtocolClient('acadflow', process.execPath, [path.resolve(process.argv[1])])
} else {
  app.setAsDefaultProtocolClient('acadflow')
}

// Single-instance lock — required on Windows/Linux for second-instance deep links
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  // A second instance was launched (e.g. OS opened acadflow:// in a new process).
  // Just quit — the first instance will handle it via second-instance event.
  app.quit()
}

// Reference to the main BrowserWindow (set in createWindow, used by deep-link handler)
let mainWin = null

// ── Deep-link handler ─────────────────────────────────────────────────────────

function handleDeepLink(url) {
  if (!url || !url.startsWith('acadflow://')) return
  // Forward the full URL to the renderer so AuthCallbackPage can parse it
  if (mainWin && !mainWin.isDestroyed()) {
    mainWin.show()
    mainWin.focus()
    mainWin.webContents.send('auth:deep-link', url)
  }
}

// Windows / Linux: second instance receives the protocol URL in its argv
app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find(arg => arg.startsWith('acadflow://'))
  if (url) handleDeepLink(url)
  if (mainWin) { mainWin.show(); mainWin.focus() }
})

// macOS: protocol URL arrives via open-url (single instance)
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

// ── Auth IPC ──────────────────────────────────────────────────────────────────
// FIX NEW-BUG-04: renderer calls this to open the OAuth URL in the system
// browser WITHOUT navigating the app BrowserWindow away.
ipcMain.handle('auth:open-external', (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url)
  }
})

// ── Active portal WebView window ─────────────────────────────────────────────

/** The floating portal browser opened by webview:open. Null when not active. */
let _portalWin = null

/** IPC sender of the main renderer (to send capture results back). */
let _mainSender = null

// ── Main window ───────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 400,
    minHeight: 600,
    backgroundColor: '#0D0D14',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  })

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  mainWin = win

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  return win
}

// ── WebView IPC handlers ───────────────────────────────────────────────────────

/**
 * The capture button injected into the portal page stores its payload in
 * window._afCapturePayload. We poll for it every 800ms after the page settles.
 */
const INJECT_BUTTON_SCRIPT = `
(function() {
  if (document.getElementById('af-capture-btn')) return 'already_injected';
  var btn = document.createElement('button');
  btn.id = 'af-capture-btn';
  btn.innerHTML = '&#128229; Capture';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483647;background:#6C63FF;color:#fff;border:none;border-radius:24px;padding:12px 22px;font-size:15px;font-weight:700;font-family:system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 20px rgba(108,99,255,0.55);user-select:none;transition:opacity 0.2s;';
  btn.addEventListener('click', function() {
    btn.innerHTML = '&#8987; Capturing...';
    btn.disabled = true;
    try {
      var iframe = document.querySelector('iframe');
      var doc = (iframe && iframe.contentDocument) ? iframe.contentDocument : document;
      var tables = Array.prototype.map.call(doc.querySelectorAll('table'), function(t) { return t.outerHTML; }).join('\\n');
      window._afCapturePayload = JSON.stringify({ url: window.location.href, title: document.title, tables: tables });
      btn.innerHTML = '&#10003; Captured!';
      btn.style.background = '#2ED573';
    } catch(e) { btn.innerHTML = '&#128229; Capture'; btn.disabled = false; }
  });
  document.body.appendChild(btn);
  return 'injected';
})()
`

const POLL_SCRIPT = `(function(){ var p = window._afCapturePayload; window._afCapturePayload = null; return p || null; })()`

function registerWebViewHandlers(ipcMainRef) {
  // Open a portal in a new BrowserWindow (NOT sandboxed — needs executeJavaScript)
  ipcMainRef.handle('webview:open', async (_event, portalUrl) => {
    // Close any previous portal window
    if (_portalWin && !_portalWin.isDestroyed()) {
      _portalWin.close()
      _portalWin = null
    }

    _mainSender = _event.sender

    _portalWin = new BrowserWindow({
      width: 1100,
      height: 800,
      title: 'AcadFlow — Portal',
      autoHideMenuBar: true,
      webPreferences: {
        // sandbox must be FALSE for executeJavaScript to work
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Re-inject capture button on every page navigation
    _portalWin.webContents.on('did-finish-load', () => {
      _portalWin.webContents.executeJavaScript(INJECT_BUTTON_SCRIPT).catch(() => {})
      startCapturePolling()
    })

    _portalWin.on('closed', () => {
      stopCapturePolling()
      _portalWin = null
      // Notify renderer that the window was closed without capturing
      if (_mainSender && !_mainSender.isDestroyed()) {
        _mainSender.send('webview:closed')
      }
    })

    await _portalWin.loadURL(portalUrl)
    return { ok: true }
  })

  ipcMainRef.handle('webview:close', async () => {
    if (_portalWin && !_portalWin.isDestroyed()) {
      _portalWin.close()
      _portalWin = null
    }
    return { ok: true }
  })
}

// ── Capture polling ────────────────────────────────────────────────────────────
// After each page load we poll window._afCapturePayload every 800ms.
// When the user taps Capture, the payload is set and we forward it to the renderer.

let _pollInterval = null

function startCapturePolling() {
  stopCapturePolling()  // reset any existing interval
  _pollInterval = setInterval(async () => {
    if (!_portalWin || _portalWin.isDestroyed()) { stopCapturePolling(); return }
    try {
      const payload = await _portalWin.webContents.executeJavaScript(POLL_SCRIPT)
      if (payload && _mainSender && !_mainSender.isDestroyed()) {
        stopCapturePolling()
        _mainSender.send('webview:capture-result', payload)
        // Close the portal window after a short delay so the user sees the ✓
        setTimeout(() => {
          if (_portalWin && !_portalWin.isDestroyed()) {
            _portalWin.close()
            _portalWin = null
          }
        }, 1200)
      }
    } catch { /* page navigating — ignore */ }
  }, 800)
}

function stopCapturePolling() {
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  registerScraperBridge(ipcMain)
  registerWebViewHandlers(ipcMain)

  const win = createWindow()

  // Wire auto-updater after the window exists so it can send IPC events to it
  win.once('ready-to-show', () => setupAutoUpdater(win))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Auto-updater setup ────────────────────────────────────────────────────
// Called after the main window is ready. Skipped entirely in dev mode.
// Sends progress events to the renderer via IPC so the UI can show a banner.

function setupAutoUpdater(win) {
  if (!autoUpdater || isDev) return

  // Forward all update lifecycle events to the renderer
  const send = (channel, data) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, data)
  }

  autoUpdater.on('checking-for-update', () =>
    send('updater:status', { status: 'checking' }))

  autoUpdater.on('update-available', (info) =>
    send('updater:status', { status: 'available', version: info.version, releaseNotes: info.releaseNotes }))

  autoUpdater.on('update-not-available', () =>
    send('updater:status', { status: 'up-to-date' }))

  autoUpdater.on('download-progress', (progress) =>
    send('updater:status', { status: 'downloading', percent: Math.round(progress.percent) }))

  autoUpdater.on('update-downloaded', (info) =>
    send('updater:status', { status: 'downloaded', version: info.version }))

  autoUpdater.on('error', (err) =>
    send('updater:status', { status: 'error', message: err.message }))

  // Renderer can request install-and-relaunch (e.g. from an "Update now" button)
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true) // isSilent=false, isForceRunAfter=true
  })

  // Check on startup, then every 4 hours
  autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  setInterval(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 4 * 60 * 60 * 1000)
}
