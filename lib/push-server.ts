import webpush from 'web-push'

export type PushPayload = { title: string; body: string; url?: string }

let vapidConfigured = false

export function configureWebPush(): void {
  if (vapidConfigured) return
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@localhost'
  if (!publicKey || !privateKey) {
    throw new Error('Nedostaju VAPID ključevi (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

export function monthlyTaxTotalRsd(row: {
  porez_na_prihod: number | null
  pio_doprinos: number | null
  zdravstveno: number | null
  nezaposleni: number | null
}): number {
  const t = Number(row.porez_na_prihod) || 0
  const p = Number(row.pio_doprinos) || 0
  const h = Number(row.zdravstveno) || 0
  const u = Number(row.nezaposleni) || 0
  return t + p + h + u
}

export function formatRsdAmount(n: number): string {
  return new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 }).format(n)
}

export async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<void> {
  configureWebPush()
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/dashboard',
  })
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    body,
    { TTL: 86400 }
  )
}
