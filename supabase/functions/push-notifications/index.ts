/**
 * Dnevni cron: porez 7d/1d, dospele fakture.
 * Poziv: Authorization: Bearer <CRON_SECRET>
 *
 * Secrets (Dashboard → Edge Functions): CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY,
 * VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, opciono VAPID_SUBJECT (mailto:…)
 *
 * Zakazivanje: Dashboard → Edge Functions → Schedule, ili pg_cron + net.http_post.
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { isInvoiceOverdueForPush } from '../_shared/faktura-status.ts'
import { parsePushSubscriptionJson } from '../_shared/push-subscription.ts'
import {
  belgradeTodayYmdString,
  daysUntilTaxDeadlineBelgrade,
  nextTaxDeadlineRefKeyBelgrade,
} from '../_shared/tax-deadline.ts'

type AdminDb = SupabaseClient

type FakturaRow = {
  id: string
  user_id: string
  broj_fakture: string | null
  datum: string
  status: string | null
  rok_placanja: string | null
  payload: unknown
}

type ProfileTax = {
  id: string
  porez_na_prihod: number | null
  pio_doprinos: number | null
  zdravstveno: number | null
  nezaposleni: number | null
}

type SubRow = { id: string; user_id: string; subscription: unknown }

function authorizeCron(req: Request): boolean {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret) return false
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  return req.headers.get('x-cron-secret') === secret
}

function monthlyTaxTotalRsd(row: ProfileTax): number {
  const t = Number(row.porez_na_prihod) || 0
  const p = Number(row.pio_doprinos) || 0
  const h = Number(row.zdravstveno) || 0
  const u = Number(row.nezaposleni) || 0
  return t + p + h + u
}

function formatRsdAmount(n: number): string {
  return new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 }).format(n)
}

function configureWebPush(): void {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@localhost'
  if (!publicKey || !privateKey) {
    throw new Error('Nedostaju VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY')
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
}

async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/dashboard',
  })
  await webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    body,
    { TTL: 86400 }
  )
}

function pushErrorStatus(e: unknown): number | undefined {
  if (typeof e === 'object' && e !== null && 'statusCode' in e) {
    const sc = (e as { statusCode?: number }).statusCode
    return typeof sc === 'number' ? sc : undefined
  }
  return undefined
}

async function alreadyLogged(
  admin: AdminDb,
  userId: string,
  kind: string,
  refKey: string
): Promise<boolean> {
  const { data } = await admin
    .from('push_notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('ref_key', refKey)
    .maybeSingle()
  return Boolean(data)
}

async function markLogged(
  admin: AdminDb,
  userId: string,
  kind: string,
  refKey: string
): Promise<void> {
  const { error } = await admin.from('push_notification_log').insert({
    user_id: userId,
    kind,
    ref_key: refKey,
  })
  if (error && error.code !== '23505') {
    console.error('push_notification_log insert', error)
  }
}

async function sendToUserDevices(
  admin: AdminDb,
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<{ sent: number; removed: number }> {
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', userId)
  if (error || !subs?.length) return { sent: 0, removed: 0 }

  let sent = 0
  let removed = 0
  for (const s of subs as SubRow[]) {
    const keys = parsePushSubscriptionJson(s.subscription)
    if (!keys) {
      await admin.from('push_subscriptions').delete().eq('id', s.id)
      removed++
      continue
    }
    try {
      await sendPushToSubscription(keys, payload)
      sent++
    } catch (e: unknown) {
      const status = pushErrorStatus(e)
      if (status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', s.id)
        removed++
      } else {
        console.error('push send', userId, e)
      }
    }
  }
  return { sent, removed }
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'OPTIONS') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  if (!authorizeCron(req)) {
    return Response.json({ error: 'Neovlašćeno' }, { status: 401 })
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!serviceKey || !supabaseUrl) {
    return Response.json({ error: 'Nedostaje SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
  }

  try {
    configureWebPush()
  } catch {
    return Response.json({ error: 'Nedostaju VAPID ključevi' }, { status: 503 })
  }

  const admin = createClient(supabaseUrl, serviceKey) as AdminDb

  const { data: userRows, error: uErr } = await admin.from('push_subscriptions').select('user_id')
  if (uErr) {
    console.error('cron push user list', uErr)
    return Response.json({ error: uErr.message }, { status: 500 })
  }

  const userIds = [...new Set((userRows ?? []).map((r: { user_id: string }) => r.user_id))]
  if (userIds.length === 0) {
    return Response.json({ ok: true, users: 0, tax7: 0, tax1: 0, invoices: 0 })
  }

  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, porez_na_prihod, pio_doprinos, zdravstveno, nezaposleni')
    .in('id', userIds)
  if (pErr) {
    console.error('cron push profiles', pErr)
    return Response.json({ error: pErr.message }, { status: 500 })
  }

  const profileByUser = new Map<string, ProfileTax>()
  for (const p of (profiles ?? []) as ProfileTax[]) {
    profileByUser.set(p.id, p)
  }

  const days = daysUntilTaxDeadlineBelgrade()
  const taxRef = nextTaxDeadlineRefKeyBelgrade()
  let tax7 = 0
  let tax1 = 0

  for (const uid of userIds) {
    const prof = profileByUser.get(uid)
    const amount = prof ? monthlyTaxTotalRsd(prof) : 0
    const iznos = formatRsdAmount(amount)

    if (days === 7) {
      if (!(await alreadyLogged(admin, uid, 'tax_7d', taxRef))) {
        const { sent } = await sendToUserDevices(admin, uid, {
          title: 'Poreski rok',
          body: `Za 7 dana ističe rok za porez — ${iznos} RSD`,
          url: '/dashboard',
        })
        if (sent > 0) {
          await markLogged(admin, uid, 'tax_7d', taxRef)
          tax7++
        }
      }
    }

    if (days === 1) {
      if (!(await alreadyLogged(admin, uid, 'tax_1d', taxRef))) {
        const { sent } = await sendToUserDevices(admin, uid, {
          title: 'Poreski rok',
          body: `Sutra je rok za uplatu poreza i doprinosa (${iznos} RSD)`,
          url: '/dashboard',
        })
        if (sent > 0) {
          await markLogged(admin, uid, 'tax_1d', taxRef)
          tax1++
        }
      }
    }
  }

  const todayYmd = belgradeTodayYmdString()
  const { data: fakture, error: fErr } = await admin
    .from('fakture')
    .select('id, user_id, broj_fakture, datum, status, rok_placanja, payload')
    .in('user_id', userIds)
  if (fErr) {
    console.error('cron push fakture', fErr)
    return Response.json({ error: fErr.message }, { status: 500 })
  }

  let invoices = 0
  for (const f of (fakture ?? []) as FakturaRow[]) {
    if (!isInvoiceOverdueForPush(f, todayYmd)) continue
    const refKey = f.id
    if (await alreadyLogged(admin, f.user_id, 'invoice_overdue', refKey)) continue

    const displayBroj = (f.broj_fakture ?? '').trim() || f.id.slice(0, 8)

    const { sent } = await sendToUserDevices(admin, f.user_id, {
      title: 'Faktura',
      body: `Faktura #${displayBroj} je dospela — još uvek nije plaćena`,
      url: '/fakture',
    })
    if (sent > 0) {
      await markLogged(admin, f.user_id, 'invoice_overdue', refKey)
      invoices++
    }
  }

  return Response.json({
    ok: true,
    users: userIds.length,
    daysUntilTax: days,
    taxRef,
    tax7,
    tax1,
    invoices,
  })
})
