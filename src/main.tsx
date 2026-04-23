import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Electron loads from file:// — BrowserRouter's pushState doesn't work there.
// HashRouter uses #/route syntax which works with any base URL.
// Web and Android (Capacitor, uses https://) continue to use BrowserRouter.
const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)
const Router = isElectron ? HashRouter : BrowserRouter

// Capacitor core — no-op on web, activates native features on Android
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

import { createNotificationChannels } from './lib/notifications'
import { useAuthStore } from './stores/useAuthStore'
import { useSyncStore } from './stores/useSyncStore'

async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return
  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#0D0D14' })
  await SplashScreen.hide()
  await createNotificationChannels()

  // Android: deep-link listener for OAuth callback (acadflow://auth/callback)
  const { App: CapApp } = await import('@capacitor/app')
  CapApp.addListener('appUrlOpen', ({ url }) => {
    if (url.startsWith('acadflow://auth/callback')) {
      // Extract the fragment/query Supabase appended and navigate to the callback route.
      // BrowserRouter is in use on Android, so we push to the history directly.
      const hash = url.split('acadflow://auth/callback').pop() ?? ''
      window.location.href = `/auth/callback${hash}`
    }
  })
  CapApp.addListener('appStateChange', (_state) => {
    // Future: trigger background sync or refresh when app resumes
  })
}

initCapacitor()

// Initialise Supabase auth — starts the onAuthStateChange listener and
// hydrates the store from any existing session in localStorage.
// After auth resolves, trigger a sync if authenticated.
useAuthStore.getState().initialize()

// Auto-sync on app start once auth status settles
;(async () => {
  // Wait briefly for the auth session to hydrate from localStorage
  await new Promise<void>(resolve => {
    const check = () => {
      const status = useAuthStore.getState().status
      if (status !== 'loading') { resolve(); return }
      setTimeout(check, 100)
    }
    check()
  })
  if (useAuthStore.getState().status === 'authenticated') {
    useSyncStore.getState().sync()
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
)
