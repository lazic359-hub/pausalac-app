import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase-config'

export { SUPABASE_ANON_KEY, SUPABASE_URL }

/**
 * Jedna instanca + in-process red umesto Navigator LockManager-a: više klijenata
 * u istom tabu se takmiči za isti Web Lock i daje timeout (10s).
 *
 * createBrowserClient čuva sesiju u kolačićima (maxAge ~400 dana), u skladu sa
 * middleware-om — korisnik ostaje prijavljen i posle zatvaranja pregledača.
 */
let authOpChain = Promise.resolve()

function browserAuthLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const run = authOpChain.then(() => fn())
  authOpChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        lock: browserAuthLock,
      },
    })
  }
  return browserClient
}

/** SessionStorage ključ — čita ga AuthSessionExpiry da ne prikaže poruku o isteku sesije posle odjavljivanja. */
export const PAUSALAC_INTENTIONAL_SIGN_OUT_KEY = 'pausalac:intentional-sign-out'

export async function signOutIntentional() {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(PAUSALAC_INTENTIONAL_SIGN_OUT_KEY, '1')
  }
  return getSupabaseBrowser().auth.signOut()
}
