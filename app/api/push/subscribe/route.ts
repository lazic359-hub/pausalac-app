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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Neispravan JSON.' }, { status: 400 })
  }

  const subscription =
    body && typeof body === 'object' && 'subscription' in body
      ? (body as { subscription: unknown }).subscription
      : body

  const parsed =
    typeof subscription === 'object' && subscription !== null
      ? (subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } })
      : null
  if (
    !parsed ||
    typeof parsed.endpoint !== 'string' ||
    typeof parsed.keys?.p256dh !== 'string' ||
    typeof parsed.keys?.auth !== 'string'
  ) {
    return NextResponse.json({ error: 'Nedostaje subscription (endpoint i ključevi).' }, { status: 400 })
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      subscription: parsed as Record<string, unknown>,
    },
    { onConflict: 'user_id,subscription_endpoint' }
  )

  if (error) {
    console.error('push subscribe:', error)
    return NextResponse.json({ error: 'Čuvanje pretplate nije uspelo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
