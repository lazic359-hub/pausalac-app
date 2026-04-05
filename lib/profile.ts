/** Ključevi i pomoćne funkcije za profil firme i prvi setup (izvor: Supabase + in-memory keš). */

export const STORAGE_PROFIL = 'pausalac_profil'
export const STORAGE_ONBOARDING_DONE = 'pausalac_onboarding_complete'
/** Vrednost = user id; postavlja se nakon uspešnog čuvanja onboardinga u istoj browser sesiji (zaštita od stale hydrate). */
export const SESSION_ONBOARDING_USER_KEY = 'pausalac_session_onboarding_user_id'

export const DEFAULT_GODISNJI_LIMIT_RSD = 6_000_000

export type PausalacProfilSlice = {
  godisnjLimit?: string
  datumRegistracije?: string
  pocetniPrihodRsd?: string
  pocetniPrihodGodina?: string
}

let profileMemory: Record<string, unknown> | null = null
let profileMemoryUserId: string | null = null
let onboardingMemory: boolean | null = null

export function setProfileMemory(userId: string, data: Record<string, unknown>) {
  profileMemoryUserId = userId
  profileMemory = data
}

export function clearProfileMemory() {
  profileMemory = null
  profileMemoryUserId = null
  onboardingMemory = null
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_ONBOARDING_USER_KEY)
    } catch {
      /* ignore */
    }
  }
}

export function markSessionOnboardingPersisted(userId: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_ONBOARDING_USER_KEY, userId)
  } catch {
    /* ignore */
  }
}

export function isSessionOnboardingPersistedForUser(userId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(SESSION_ONBOARDING_USER_KEY) === userId
  } catch {
    return false
  }
}

export function setOnboardingMemory(v: boolean) {
  onboardingMemory = v
}

/** Vrednost iz kolone `profiles.onboarding_completed` (REST/PostgREST). */
export function onboardingCompletedFromDb(v: unknown): boolean {
  if (v === true) return true
  if (v === false || v === null || v === undefined) return false
  if (typeof v === 'string' && v.toLowerCase() === 'true') return true
  return false
}

/** Izvor istine: `profiles.onboarding_completed` (hydrate postavlja memoriju). */
export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true
  if (onboardingMemory !== null) return onboardingMemory
  return false
}

/** @deprecated Koristi setOnboardingMemory nakon čuvanja u Supabase */
export function setOnboardingComplete(): void {
  onboardingMemory = true
}

/** Čita keš (posle hydrate) ili legacy localStorage. */
export function readProfilFromStorage(): Partial<PausalacProfilSlice> & Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  if (profileMemory && profileMemoryUserId) {
    return profileMemory
  }
  try {
    const raw = localStorage.getItem(STORAGE_PROFIL)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export function getKpoLimitRsdFromStorage(): number {
  const p = readProfilFromStorage()
  if (!p) return DEFAULT_GODISNJI_LIMIT_RSD
  const n = parseInt(String(p.godisnjLimit ?? DEFAULT_GODISNJI_LIMIT_RSD).replace(/\s/g, ''), 10)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_GODISNJI_LIMIT_RSD
  return n
}

/** Prihod ostvaren pre korišćenja aplikacije, računa se samo za izabranu kalendarsku godinu. */
export function getPocetniPrihodZaGodinu(year: number): number {
  const p = readProfilFromStorage()
  if (!p) return 0
  const y = parseInt(String(p.pocetniPrihodGodina ?? ''), 10)
  if (!Number.isFinite(y) || year !== y) return 0
  return parseInt(String(p.pocetniPrihodRsd ?? '').replace(/\s/g, ''), 10) || 0
}

export function getUkupnoPrihodZaGodinu(
  sumaIzBaze: number,
  godina: number
): number {
  return sumaIzBaze + getPocetniPrihodZaGodinu(godina)
}
