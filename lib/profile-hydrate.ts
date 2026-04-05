import type { SupabaseClient } from '@supabase/supabase-js'
import {
  setOnboardingMemory,
  setProfileMemory,
  STORAGE_ONBOARDING_DONE,
  STORAGE_PROFIL,
} from '@/lib/profile'
import { setPlanMemory } from '@/lib/plan'
import { loadOfflineProfile, saveOfflineProfile } from '@/lib/offline-data-cache'

const LEGACY_PLACANJA_KEY = 'pausalac_poresni_kalendar_placanja_v1'

function clearLegacyLocalKeys() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_PROFIL)
  localStorage.removeItem(STORAGE_ONBOARDING_DONE)
  localStorage.removeItem(LEGACY_PLACANJA_KEY)
  localStorage.removeItem('kpo_knjiga')
  localStorage.removeItem('pausalac_placanja')
}

function emptyObj(o: unknown) {
  return !o || typeof o !== 'object' || Object.keys(o as object).length === 0
}

type ProfileRow = {
  id: string
  porez_na_prihod: number | null
  pio_doprinos: number | null
  zdravstveno: number | null
  nezaposleni: number | null
  company_data: Record<string, unknown> | null
  onboarding_completed: boolean | null
  poresni_kalendar_placanja: Record<string, boolean> | null
  plan?: string | null
  pro_until?: string | null
}

export async function hydrateUserProfile(supabase: SupabaseClient, userId: string) {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    const snap = loadOfflineProfile(userId)
    if (snap) {
      const d = snap.data
      setProfileMemory(userId, d.company)
      setOnboardingMemory(d.onboarding_completed)
      setPlanMemory({ plan: d.plan ?? 'free', pro_until: d.pro_until ?? null })
    } else {
      setPlanMemory({ plan: 'free', pro_until: null })
    }
    return
  }

  const { data: row, error } = await supabase
    .from('profiles')
    .select(
      'id, porez_na_prihod, pio_doprinos, zdravstveno, nezaposleni, company_data, onboarding_completed, poresni_kalendar_placanja, plan, pro_until'
    )
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('hydrateUserProfile:', error.message)
    if (typeof window !== 'undefined') {
      const snap = loadOfflineProfile(userId)
      if (snap) {
        const d = snap.data
        setProfileMemory(userId, d.company)
        setOnboardingMemory(d.onboarding_completed)
        setPlanMemory({ plan: d.plan ?? 'free', pro_until: d.pro_until ?? null })
      }
    }
    return
  }

  const lsProfilRaw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_PROFIL) : null
  const lsOnboard = typeof window !== 'undefined' && localStorage.getItem(STORAGE_ONBOARDING_DONE) === '1'
  const lsPlacanjaRaw = typeof window !== 'undefined' ? localStorage.getItem(LEGACY_PLACANJA_KEY) : null

  let parsedLsProfil: Record<string, unknown> = {}
  if (lsProfilRaw) {
    try {
      parsedLsProfil = JSON.parse(lsProfilRaw) as Record<string, unknown>
    } catch {
      parsedLsProfil = {}
    }
  }

  let parsedLsPlacanja: Record<string, boolean> = {}
  if (lsPlacanjaRaw) {
    try {
      const p = JSON.parse(lsPlacanjaRaw) as Record<string, unknown>
      if (p && typeof p === 'object') {
        parsedLsPlacanja = p as Record<string, boolean>
      }
    } catch {
      parsedLsPlacanja = {}
    }
  }

  const r = row as ProfileRow | null

  if (
    !r &&
    Object.keys(parsedLsProfil).length === 0 &&
    !lsOnboard &&
    Object.keys(parsedLsPlacanja).length === 0
  ) {
    setProfileMemory(userId, {})
    setOnboardingMemory(false)
    setPlanMemory({ plan: 'free', pro_until: null })
    return
  }

  let company: Record<string, unknown> = (r?.company_data as Record<string, unknown>) ?? {}
  if (emptyObj(company) && Object.keys(parsedLsProfil).length > 0) {
    company = parsedLsProfil
  }

  /** Migracija: legacy localStorage može podići `onboarding_completed` u Supabase pri upsertu, ne i keš pre čitanja iz baze. */
  const onboardingMigrated = (r?.onboarding_completed === true) || lsOnboard

  let poresni: Record<string, boolean> = (r?.poresni_kalendar_placanja as Record<string, boolean>) ?? {}
  if (emptyObj(poresni) && Object.keys(parsedLsPlacanja).length > 0) {
    poresni = parsedLsPlacanja
  }

  const companyNeedsPush =
    !r ||
    (!!r && emptyObj(r.company_data) && Object.keys(parsedLsProfil).length > 0)
  const onboardNeedsPush =
    !r || (!!r && r.onboarding_completed !== true && lsOnboard)
  const poresniNeedsPush =
    !r ||
    (!!r && emptyObj(r.poresni_kalendar_placanja) && Object.keys(parsedLsPlacanja).length > 0)

  const shouldUpsert = companyNeedsPush || onboardNeedsPush || poresniNeedsPush

  if (shouldUpsert) {
    const payload = {
      id: userId,
      porez_na_prihod: r?.porez_na_prihod ?? 0,
      pio_doprinos: r?.pio_doprinos ?? 0,
      zdravstveno: r?.zdravstveno ?? 0,
      nezaposleni: r?.nezaposleni ?? 0,
      company_data: company,
      onboarding_completed: onboardingMigrated,
      poresni_kalendar_placanja: poresni,
    }
    const { error: upErr } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    if (!upErr) {
      clearLegacyLocalKeys()
    }
    setProfileMemory(userId, company)
    setOnboardingMemory(onboardingMigrated)
    const planVal = r?.plan ?? 'free'
    const proUntilVal = r?.pro_until ?? null
    setPlanMemory({ plan: planVal, pro_until: proUntilVal })
    if (typeof window !== 'undefined') {
      saveOfflineProfile(userId, {
        company,
        onboarding_completed: onboardingMigrated,
        poresni_kalendar_placanja: poresni,
        porez_na_prihod: r?.porez_na_prihod ?? null,
        pio_doprinos: r?.pio_doprinos ?? null,
        zdravstveno: r?.zdravstveno ?? null,
        nezaposleni: r?.nezaposleni ?? null,
        plan: planVal,
        pro_until: proUntilVal,
      })
    }
  } else {
    company = (r?.company_data as Record<string, unknown>) ?? {}
    const onboarding = r?.onboarding_completed === true
    poresni = (r?.poresni_kalendar_placanja as Record<string, boolean>) ?? {}
    setProfileMemory(userId, company)
    setOnboardingMemory(onboarding)
    const planVal = r.plan ?? 'free'
    const proUntilVal = r.pro_until ?? null
    setPlanMemory({ plan: planVal, pro_until: proUntilVal })
    if (typeof window !== 'undefined' && r) {
      saveOfflineProfile(userId, {
        company,
        onboarding_completed: onboarding,
        poresni_kalendar_placanja: poresni,
        porez_na_prihod: r.porez_na_prihod,
        pio_doprinos: r.pio_doprinos,
        zdravstveno: r.zdravstveno,
        nezaposleni: r.nezaposleni,
        plan: planVal,
        pro_until: proUntilVal,
      })
    }
  }
}
