import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

// ---------------------------------------------------------------------------
// AuthCallbackPage — handles three distinct OAuth return paths:
//
// 1. Web / PWA (BrowserRouter):
//    Supabase redirects to https://<origin>/auth/callback#access_token=...
//    detectSessionInUrl:true in supabase.ts parses the hash automatically.
//    We just wait for onAuthStateChange to fire.
//
// 2. Electron (HashRouter, file://):
//    Google auth opens in the system browser. The OS deep-links back via
//    acadflow://auth/callback?code=... (PKCE) or #access_token=... (implicit).
//    main.js intercepts this, sends 'auth:deep-link' IPC to the renderer,
//    preload.js forwards it as window.authBridge.onDeepLink(url).
//    We extract the code and call supabase.auth.exchangeCodeForSession().
//
// 3. Android (BrowserRouter, Capacitor):
//    appUrlOpen listener in main.tsx rewrites the deep link to
//    /auth/callback?code=... — standard BrowserRouter handles routing.
//    From here it falls through to the same PKCE exchange as Electron.
// ---------------------------------------------------------------------------

type Status = 'loading' | 'success' | 'error'

// Type-safe access to the Electron bridge exposed by preload.js
declare global {
  interface Window {
    authBridge?: {
      onDeepLink: (callback: (url: string | null) => void) => void
      removeDeepLinkListener: () => void
    }
  }
}

async function exchangeCodeFromUrl(urlString: string): Promise<void> {
  // Handle both:
  //   ?code=<pkce_code>  — Supabase PKCE flow (default for OAuth)
  //   #access_token=...  — Supabase implicit flow (older)
  const parsed = new URL(urlString.replace(/^acadflow:\/\//, 'https://dummy/'))
  const code = parsed.searchParams.get('code')

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw new Error(error.message)
    return
  }

  // Implicit flow: tokens are already in the hash — Supabase parses them
  // automatically via detectSessionInUrl on the web. On Electron we set them
  // manually by re-invoking setSession with what's in the hash fragment.
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  const accessToken  = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
    if (error) throw new Error(error.message)
    return
  }

  throw new Error('No authentication code or token found in the callback URL.')
}

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)

  useEffect(() => {
    const onSuccess = () => {
      setStatus('success')
      setTimeout(() => navigate('/', { replace: true }), 1200)
    }

    const onError = (msg: string) => {
      setStatus('error')
      setErrorMessage(msg)
    }

    // ── Electron path ───────────────────────────────────────────────────────
    // window.authBridge is exposed by electron/preload.js only in Electron.
    if (isElectron && window.authBridge) {
      window.authBridge.onDeepLink(async (url) => {
        if (!url) {
          onError('Sign-in was cancelled. Please try again.')
          return
        }
        try {
          await exchangeCodeFromUrl(url)
          onSuccess()
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Authentication failed.')
        }
      })

      // 60-second timeout — if the user never completes Google auth in the browser
      const timeout = setTimeout(() => {
        window.authBridge?.removeDeepLinkListener()
        onError('Sign-in timed out. Complete the sign-in in your browser and try again.')
      }, 60_000)

      return () => {
        clearTimeout(timeout)
        window.authBridge?.removeDeepLinkListener()
      }
    }

    // ── Android / Web path ──────────────────────────────────────────────────
    // Check URL search params first — Capacitor rewrites the deep link to
    // /auth/callback?code=... (see appUrlOpen in main.tsx).
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) onError(error.message)
          else onSuccess()
        })
      return
    }

    // Web/PWA: detectSessionInUrl:true already parsed the hash — just wait
    // for onAuthStateChange to confirm the session is live.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) onSuccess()
    })

    // 8-second fallback — check if the session is already set (race condition)
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.auth.getSession()
      if (data.session) onSuccess()
      else onError(error?.message ?? 'The link may have expired. Please try signing in again.')
    }, 8_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate, isElectron])

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 gap-6">

      {/* Wordmark */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #00F5D4)' }}
        >
          <Zap size={15} className="text-white" fill="white" />
        </div>
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: 'rgb(var(--color-text))' }}
        >
          AcadFlow
        </span>
      </div>

      {/* Status card */}
      <div
        className="w-full max-w-xs rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
        style={{
          background: 'rgb(var(--color-card))',
          border: '1px solid rgba(108,99,255,0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {status === 'loading' && (
          <>
            <Loader2 size={36} className="animate-spin" style={{ color: '#6C63FF' }} />
            <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>
              {isElectron ? 'Waiting for sign-in…' : 'Signing you in…'}
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text) / 0.4)' }}>
              {isElectron
                ? 'Complete sign-in in your browser, then come back here.'
                : 'This only takes a moment.'}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(46,213,115,0.15)' }}
            >
              <CheckCircle2 size={32} style={{ color: '#2ED573' }} />
            </div>
            <p className="text-base font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              You're signed in!
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--color-text) / 0.45)' }}>
              Taking you to the app…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,71,87,0.15)' }}
            >
              <XCircle size={32} style={{ color: '#FF4757' }} />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold" style={{ color: 'rgb(var(--color-text))' }}>
                Sign-in failed
              </p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text) / 0.5)' }}>
                {errorMessage}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/login', { replace: true })}
            >
              Back to sign-in
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
