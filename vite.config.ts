import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// When building for Electron, assets must use relative paths (./)
// because the app is loaded via file:// and absolute paths like /assets/
// resolve to the filesystem root instead of the dist/ folder.
// For web/PWA, base stays '/' so CDN-hosted deployments work normally.
const isElectronBuild = process.env.ELECTRON === 'true'

// For Capacitor (Android) and Electron builds the service worker must be
// disabled. In a Capacitor WebView the SW registers against https://localhost,
// enters a broken precache loop, and intercepts every asset request —
// returning nothing. Result: blank screen on Android.
// Electron loads via file:// where service workers are never supported anyway.
const isNativeBuild = isElectronBuild || process.env.CAPACITOR === 'true'

export default defineConfig({
  base: isElectronBuild ? './' : '/',

  build: {
    rollupOptions: {
      // These are Android-only Capacitor packages that must never be bundled
      // for Electron or web builds. They are loaded at runtime inside the APK
      // via dynamic import() guarded by isCapacitorNative(). Rollup can't
      // resolve them during the desktop/web build — externalizing them tells
      // Rollup to leave those import() calls alone instead of throwing.
      external: [
        '@capacitor/http',
        '@capacitor/preferences',
        '@capacitor-community/inappbrowser',
      ],
    },
  },

  optimizeDeps: {
    // These Capacitor packages are Android-only runtime plugins.
    // They don't exist in node_modules during web/Electron dev, so Vite's
    // pre-bundler must not attempt to resolve or pre-bundle them.
    exclude: [
      '@capacitor/http',
      '@capacitor/preferences',
      '@capacitor-community/inappbrowser',
    ],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // On native builds (Electron + Android), the service worker must be
      // completely disabled. On Android the Capacitor WebView registers the SW
      // against https://localhost, Workbox enters a broken precache loop, and
      // every asset request gets intercepted and returns nothing — blank screen.
      // selfDestroying removes any previously cached SW on the next page load.
      disable: isNativeBuild,
      selfDestroying: isNativeBuild,
      // Never register the SW during local development. It would intercept Vite's
      // HMR websocket and hot-reload requests, causing a blank screen in the
      // browser if a stale SW from a previous build is already cached.
      devOptions: { enabled: false },
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // API / Supabase calls — Network First
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            // Static assets — Cache First
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|woff2|woff)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'AcadFlow',
        short_name: 'AcadFlow',
        description: 'Your semester, under control.',
        theme_color: '#6C63FF',
        background_color: '#0D0D14',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
