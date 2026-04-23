import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Fill these in your .env file (never commit real values):
//   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[AcadFlow] Supabase env vars missing. Auth and sync will not work.\n' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
  )
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
  auth: {
    // Supabase manages its own localStorage key (sb-*-auth-token).
    // This does NOT conflict with AcadFlow's Zustand persist keys.
    persistSession: true,
    autoRefreshToken: true,
    // Parses the access_token / refresh_token from the URL hash after OAuth redirect.
    // Required for web and PWA. On Electron (file://) the AuthCallback page handles
    // the session manually via exchangeCodeForSession().
    detectSessionInUrl: true,
  },
})
