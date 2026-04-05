import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase-config'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Nisi prijavljen.' }, { status: 401 })
  }

  let body: { endpoint?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 })
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : ''
  if (!endpoint) {
    return NextResponse.json({ error: 'Nedostaje endpoint.' }, { status: 400 })
  }

  const { data: rows, error: selErr } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .eq('user_id', user.id)

  if (selErr) {
    console.error('push unsubscribe:', selErr)
    return NextResponse.json({ error: 'Brisanje pretplate nije uspelo.' }, { status: 500 })
  }

  const row = (rows ?? []).find(
    (r: { subscription?: { endpoint?: string } }) =>
      typeof r.subscription?.endpoint === 'string' && r.subscription.endpoint === endpoint
  )
  if (!row) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase.from('push_subscriptions').delete().eq('id', row.id)

  if (error) {
    console.error('push unsubscribe:', error)
    return NextResponse.json({ error: 'Brisanje pretplate nije uspelo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
