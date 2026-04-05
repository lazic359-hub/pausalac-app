/** Dozvoljava samo relativne putanje na istom sajtu (bez open redirect). */
export function safeNextParam(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

/** Ime iz metapodataka (Google itd.) ili email za prikaz u headeru. */
export function authDisplayName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}): string {
  const meta = user.user_metadata ?? {}
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim())
  if (fromMeta) return fromMeta
  const em = user.email?.trim()
  if (em) return em
  return 'Korisnik'
}
