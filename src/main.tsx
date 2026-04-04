import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Capacitor core — no-op on web, activates native features on Android
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

import { createNotificationChannels } from './lib/notifications'

async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return
  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#0D0D14' })
  await SplashScreen.hide()
  await createNotificationChannels()
}

initCapacitor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
