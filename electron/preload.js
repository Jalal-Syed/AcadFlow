/**
 * electron/preload.js — AcadFlow Preload Script
 *
 * Runs in a privileged context before the renderer. Exposes a minimal,
 * safe API to the renderer via contextBridge if needed in the future.
 *
 * Currently empty — the app is fully self-contained (IndexedDB / Zustand).
 * Add IPC bridges here if you ever need to call native Node APIs from React.
 */

const { contextBridge, ipcRenderer } = require('electron')

// Example (uncomment when needed):
// contextBridge.exposeInMainWorld('electron', {
//   platform: process.platform,
//   send: (channel, data) => ipcRenderer.send(channel, data),
//   on: (channel, fn) => ipcRenderer.on(channel, (_, ...args) => fn(...args)),
// })
