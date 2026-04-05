/**
 * Pro plan i ograničenja za besplatni nivo.
 * TODO: integrisati procesor plaćanja (Stripe ili PaySpot za Srbiju) — sada admin ručno postavlja `plan` i `pro_until` u Supabase.
 */

export const FREE_INVOICES_PER_MONTH = 5

export type PlanRow = {
  plan?: string | null
  pro_until?: string | null
}

let planMemory: { plan: string; pro_until: string | null } | null = null

export function setPlanMemory(row: PlanRow | null) {
  if (!row) {
    planMemory = null
    return
  }
  planMemory = {
    plan: row.plan ?? 'free',
    pro_until: row.pro_until ?? null,
  }
}

export function clearPlanMemory() {
  planMemory = null
}

/** Da li je korisnik trenutno na aktivnom Pro nivou (iz keša posle hydrate). */
export function isProActiveFromCache(): boolean {
  if (typeof window === 'undefined') return false
  if (!planMemory) return false
  return isProFromRow(planMemory.plan, planMemory.pro_until)
}

export function isProFromRow(plan: string | null | undefined, proUntil: string | null | undefined): boolean {
  const p = plan ?? 'free'
  if (p !== 'pro') return false
  if (proUntil == null || proUntil === '') return true
  return new Date(proUntil).getTime() > Date.now()
}
