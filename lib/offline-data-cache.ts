/**
 * Lokalni keš poslednjih učitanih podataka za offline PWA (localStorage).
 */

export type Timestamped<T> = { updatedAt: string; data: T }

const V = 'v1'

function keyDashboard(uid: string) {
  return `pausalac_offline_${V}_dashboard_${uid}`
}
function keyFakture(uid: string) {
  return `pausalac_offline_${V}_fakture_${uid}`
}
function keyKpo(uid: string) {
  return `pausalac_offline_${V}_kpo_${uid}`
}
function keyProfile(uid: string) {
  return `pausalac_offline_${V}_profile_${uid}`
}

function save<T>(storageKey: string, data: T): void {
  if (typeof window === 'undefined') return
  try {
    const payload: Timestamped<T> = { updatedAt: new Date().toISOString(), data }
    localStorage.setItem(storageKey, JSON.stringify(payload))
  } catch (e) {
    console.warn('offline-data-cache save:', e)
  }
}

function load<T>(storageKey: string): Timestamped<T> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    return JSON.parse(raw) as Timestamped<T>
  } catch {
    return null
  }
}

// ─── Dashboard (prihodi po godini + tekuća godina + poresni) ───

export type DashboardOfflinePayload = {
  godina: string
  fakturePrihodi: unknown[]
  prihodiTekucaGodina: unknown[]
  nemaNijednogPrihoda: boolean | null
  poresniPodaci: {
    porez_na_prihod: number | null
    pio_doprinos: number | null
    zdravstveno: number | null
    nezaposleni: number | null
  } | null
}

export function saveOfflineDashboard(userId: string, data: DashboardOfflinePayload) {
  save(keyDashboard(userId), data)
}

export function loadOfflineDashboard(userId: string): Timestamped<DashboardOfflinePayload> | null {
  return load<DashboardOfflinePayload>(keyDashboard(userId))
}

// ─── Fakture (puna lista) ───

export function saveOfflineFaktureList(userId: string, rows: unknown[]) {
  save(keyFakture(userId), { rows })
}

export function loadOfflineFaktureList(userId: string): Timestamped<{ rows: unknown[] }> | null {
  return load<{ rows: unknown[] }>(keyFakture(userId))
}

// ─── KPO (svi prihodi) ───

export function saveOfflineKpoPrihodi(userId: string, rows: unknown[]) {
  save(keyKpo(userId), { rows })
}

export function loadOfflineKpoPrihodi(userId: string): Timestamped<{ rows: unknown[] }> | null {
  return load<{ rows: unknown[] }>(keyKpo(userId))
}

// ─── Profil + porezi (za hydrate i prikaz offline) ───

export type ProfileOfflinePayload = {
  company: Record<string, unknown>
  onboarding_completed: boolean
  poresni_kalendar_placanja: Record<string, boolean>
  porez_na_prihod: number | null
  pio_doprinos: number | null
  zdravstveno: number | null
  nezaposleni: number | null
  plan?: string | null
  pro_until?: string | null
}

export function saveOfflineProfile(userId: string, data: ProfileOfflinePayload) {
  save(keyProfile(userId), data)
}

export function loadOfflineProfile(userId: string): Timestamped<ProfileOfflinePayload> | null {
  return load<ProfileOfflinePayload>(keyProfile(userId))
}

export function formatOfflineTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('sr-RS', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
