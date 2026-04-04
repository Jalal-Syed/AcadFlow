/**
 * electron/main.js — AcadFlow Desktop Main Process
 *
 * In dev:  loads http://localhost:5173 (Vite dev server must be running)
 * In prod: loads dist/index.html via file:// — React app uses HashRouter in
 *          Electron so all SPA routes resolve correctly (see src/main.tsx).
 */

const { app, BrowserWindow, shell, nativeTheme } = require('electron')
const path = require('path')

// Set dark mode on startup — matches AcadFlow default theme
nativeTheme.themeSource = 'dark'

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 400,
    minHeight: 600,
    backgroundColor: '#0D0D14',
    // macOS: hides the native title bar, keeps traffic lights
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,  // Windows/Linux: hide menu bar (Alt to show)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,     // security: no Node in renderer
      contextIsolation: true,     // security: isolated context
      sandbox: true,              // security: sandboxed renderer
    },
    show: false,  // show only once ready to prevent white flash
  })

  // No white flash on startup
  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  if (isDev) {
    // Dev: connect to Vite HMR server
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // Prod: load built SPA from dist/
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Open all <a target="_blank"> and shell.openExternal links in the
  // system browser, not inside Electron — keeps the renderer clean
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  return win
}

// ── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  // macOS: re-create window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Windows/Linux: quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
