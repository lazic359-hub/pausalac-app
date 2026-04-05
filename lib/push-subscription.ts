/** Shape from PushSubscription.toJSON() / stored jsonb */
export type PushSubscriptionJson = {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

export function parsePushSubscriptionJson(
  raw: unknown
): { endpoint: string; p256dh: string; auth: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as PushSubscriptionJson
  const endpoint = typeof s.endpoint === 'string' ? s.endpoint.trim() : ''
  const p256dh = typeof s.keys?.p256dh === 'string' ? s.keys.p256dh : ''
  const auth = typeof s.keys?.auth === 'string' ? s.keys.auth : ''
  if (!endpoint || !p256dh || !auth) return null
  return { endpoint, p256dh, auth }
}
