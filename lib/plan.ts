/**
 * Keš plana iz Supabase (hydrate) — za buduću integraciju naplate.
 */

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
