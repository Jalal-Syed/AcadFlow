import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Auth is OPTIONAL in AcadFlow (local-first, no account required).
// This store tracks the current Supabase session for the sync feature only.
// ---------------------------------------------------------------------------

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: User | null
  session: Session | null
  status: AuthStatus
  // Set to the email address after a magic link is sent
  magicLinkSentTo: string | null

  // Call once in main.tsx — sets up the onAuthStateChange listener.
  // Returns an unsubscribe function.
  initialize: () => () => void

  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<{ requiresConfirmation: boolean }>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearMagicLinkSent: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  status: 'loading',
  magicLinkSentTo: null,

  // ── Initialise ────────────────────────────────────────────────────────────
  initialize: () => {
    // Hydrate from the existing Supabase session in localStorage (if any)
    supabase.auth.getSession().then(({ data }) => {
      set({
        session: data.session,
        user: data.session?.user ?? null,
        status: data.session ? 'authenticated' : 'unauthenticated',
      })
    })

    // Keep the store in sync as the session changes (sign-in, sign-out, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'authenticated' : 'unauthenticated',
      })
    })

    // Return the unsubscribe fn so main.tsx can clean up if needed
    return () => subscription.unsubscribe()
  },

  // ── Google OAuth ──────────────────────────────────────────────────────────
  signInWithGoogle: async () => {
    const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)

    if (isElectron) {
      // FIX NEW-BUG-04: use skipBrowserRedirect:true so Supabase returns the URL
      // instead of calling window.location.assign() which would navigate the
      // Electron BrowserWindow away from the app. We then open the URL in the
      // system browser via authBridge.openExternal (shell.openExternal in main.js).
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'acadflow://auth/callback',
          skipBrowserRedirect: true,
        },
      })
      if (error) throw error
      if (data.url) {
        // authBridge is exposed by electron/preload.js — not available on web/Android
        ;(window as unknown as { authBridge: { openExternal: (url: string) => void } })
          .authBridge.openExternal(data.url)
      }
    } else if (Capacitor.isNativePlatform()) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'acadflow://auth/callback' },
      })
    } else {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
    }
  },

  // ── Email magic link ──────────────────────────────────────────────────────
  signInWithEmail: async (email: string) => {
    const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)
    const redirectTo = isElectron || Capacitor.isNativePlatform()
      ? 'acadflow://auth/callback'
      : `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (error) throw error

    set({ magicLinkSentTo: email })
  },

  signUpWithEmail: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return { requiresConfirmation: !data.session }
  },

  signInWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  // ── Sign out ──────────────────────────────────────────────────────────────
  signOut: async () => {
    await supabase.auth.signOut()
    // onAuthStateChange will set user/session to null automatically
  },

  clearMagicLinkSent: () => set({ magicLinkSentTo: null }),
}))
