import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Service role klijent bez generisanih tipova za nove tabele */
type AdminDb = SupabaseClient<any, 'public', any>
import { NextResponse } from 'next/server'
import { isInvoiceOverdueForPush } from '@/lib/faktura-status'
import { parsePushSubscriptionJson } from '@/lib/push-subscription'
import {
  configureWebPush,
  formatRsdAmount,
  monthlyTaxTotalRsd,
  sendPushToSubscription,
} from '@/lib/push-server'
import { SUPABASE_URL } from '@/lib/supabase-config'
import {
  belgradeTodayYmdString,
  daysUntilTaxDeadlineBelgrade,
  nextTaxDeadlineRefKeyBelgrade,
} from '@/lib/tax-deadline'

export const runtime = 'nodejs'

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

type SubRow = {
  id: string
  subscription: unknown
}

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get('x-cron-secret') === secret
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

function pushErrorStatus(e: unknown): number | undefined {
  if (typeof e === 'object' && e !== null && 'statusCode' in e) {
    const sc = (e as { statusCode?: number }).statusCode
    return typeof sc === 'number' ? sc : undefined
  }
  return undefined
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

export async function GET(request: Request) {
  return runCron(request)
}

export async function POST(request: Request) {
  return runCron(request)
}

async function runCron(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Neovlašćeno' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Nedostaje SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
  }

  try {
    configureWebPush()
  } catch {
    return NextResponse.json({ error: 'Nedostaju VAPID ključevi' }, { status: 503 })
  }

  const admin = createClient(SUPABASE_URL, serviceKey) as AdminDb

  const { data: userRows, error: uErr } = await admin
    .from('push_subscriptions')
    .select('user_id')
  if (uErr) {
    console.error('cron push user list', uErr)
    return NextResponse.json({ error: uErr.message }, { status: 500 })
  }

  const userIds = [...new Set((userRows ?? []).map((r: { user_id: string }) => r.user_id))]
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, users: 0, tax7: 0, tax1: 0, invoices: 0 })
  }

  const { data: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id, porez_na_prihod, pio_doprinos, zdravstveno, nezaposleni')
    .in('id', userIds)
  if (pErr) {
    console.error('cron push profiles', pErr)
    return NextResponse.json({ error: pErr.message }, { status: 500 })
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
    return NextResponse.json({ error: fErr.message }, { status: 500 })
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

  return NextResponse.json({
    ok: true,
    users: userIds.length,
    daysUntilTax: days,
    taxRef,
    tax7,
    tax1,
    invoices,
  })
}
