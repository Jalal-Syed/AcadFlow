import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle2, Loader2, Zap, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// ---------------------------------------------------------------------------
// LoginPage — optional sign-in for cloud sync.
// The app works fully without an account; this page is reachable from
// Settings → "Sign in to sync" and from the /login route.
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const navigate = useNavigate()
  const { signInWithGoogle, signInWithEmail, magicLinkSentTo, clearMagicLinkSent } = useAuthStore()

  const [email, setEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const isElectron = typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent)

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      // On web/PWA: page will redirect to Google. No code after this runs.
      // On Electron: opens external browser. The Electron main process handles
      // the deep-link callback and restarts the app signed in.
    } catch {
      setError('Could not connect to Google. Check your internet and try again.')
      setGoogleLoading(false)
    }
  }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setEmailLoading(true)
    try {
      await signInWithEmail(email.trim())
      // magicLinkSentTo is now set in the store — renders the confirmation view
    } catch {
      setError('Failed to send magic link. Check your email address and try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleSkip = () => {
    navigate('/')
  }

  // ── Magic link sent confirmation view ────────────────────────────────────

  if (magicLinkSentTo) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div
          className="w-full max-w-sm rounded-2xl p-8 text-center space-y-4"
          style={{
            background: 'rgb(var(--color-card))',
            border: '1px solid rgba(108,99,255,0.2)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(46,213,115,0.15)' }}
            >
              <CheckCircle2 size={32} style={{ color: '#2ED573' }} />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>
              Check your inbox
            </h2>
            <p className="text-sm" style={{ color: 'rgb(var(--color-text) / 0.55)' }}>
              We sent a magic link to
            </p>
            <p
              className="text-sm font-semibold break-all"
              style={{ color: 'rgb(var(--color-primary))' }}
            >
              {magicLinkSentTo}
            </p>
          </div>

          <p className="text-xs" style={{ color: 'rgb(var(--color-text) / 0.4)' }}>
            Click the link in the email to sign in. It expires in 1 hour.
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { clearMagicLinkSent(); setEmail('') }}
            >
              Try a different email
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main login view ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-12">

      {/* Branding */}
      <div className="mb-8 text-center space-y-1">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #00F5D4)' }}
          >
            <Zap size={18} className="text-white" fill="white" />
          </div>
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--color-text))' }}
          >
            AcadFlow
          </span>
        </div>
        <p className="text-sm" style={{ color: 'rgb(var(--color-text) / 0.5)' }}>
          Sign in to sync your data across devices
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{
          background: 'rgb(var(--color-card))',
          border: '1px solid rgba(108,99,255,0.15)',
          backdropFilter: 'blur(12px)',
        }}
      >

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || emailLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgb(var(--color-text))',
          }}
        >
          {googleLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            // Google's own 'G' SVG — pixel-accurate colours
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.705A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.037l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.963L3.964 7.295C4.672 5.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-xs" style={{ color: 'rgb(var(--color-text) / 0.35)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Email magic link */}
        <form onSubmit={handleEmail} className="space-y-3">
          <Input
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={emailLoading || googleLoading}
            required
          />
          <Button
            type="submit"
            variant="secondary"
            fullWidth
            loading={emailLoading}
            disabled={googleLoading || !email.trim()}
          >
            {!emailLoading && <Mail size={16} />}
            Send magic link
          </Button>
        </form>

        {/* Electron note — OAuth redirect requires external browser */}
        {isElectron && (
          <p
            className="text-xs text-center rounded-lg px-3 py-2"
            style={{
              color: 'rgb(var(--color-text) / 0.45)',
              background: 'rgba(255,165,2,0.08)',
              border: '1px solid rgba(255,165,2,0.15)',
            }}
          >
            Google sign-in will open your browser. Come back to the app after completing sign-in.
          </p>
        )}

        {/* Inline error */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
            style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', color: '#FF4757' }}
          >
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* What they're signing up for */}
        <p className="text-xs text-center" style={{ color: 'rgb(var(--color-text) / 0.35)' }}>
          Used only for cross-device sync. Your data stays on your device unless you enable sync.
        </p>
      </div>

      {/* Skip */}
      <button
        onClick={handleSkip}
        className="mt-6 flex items-center gap-1.5 text-sm transition-opacity hover:opacity-80"
        style={{ color: 'rgb(var(--color-text) / 0.45)' }}
      >
        Skip for now
        <ArrowRight size={14} />
      </button>

      {/* Privacy note */}
      <p className="mt-3 text-xs" style={{ color: 'rgb(var(--color-text) / 0.25)' }}>
        AcadFlow works fully offline. An account is never required.
      </p>
    </div>
  )
}
