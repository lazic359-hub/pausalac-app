import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase-config'

/**
 * Trajno brisanje naloga (auth.users). Zahteva server env SUPABASE_SERVICE_ROLE_KEY.
 * Klijent šalje lozinku ako korisnik ima email/password identitet; inače tačnu frazu potvrde.
 */
export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'Brisanje naloga nije omogućeno na serveru (nedostaje konfiguracija).' },
      { status: 503 }
    )
  }

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

  let body: { password?: string; confirmPhrase?: string }
  try {
    body = (await request.json()) as { password?: string; confirmPhrase?: string }
  } catch {
    body = {}
  }

  const password = typeof body.password === 'string' ? body.password : ''
  const confirmPhrase = typeof body.confirmPhrase === 'string' ? body.confirmPhrase : ''

  const hasEmailPasswordIdentity =
    user.identities?.some((i) => i.provider === 'email') ?? false

  if (hasEmailPasswordIdentity) {
    if (!user.email) {
      return NextResponse.json({ error: 'Nalog nema email adresu.' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'Unesi lozinku da potvrdiš brisanje.' }, { status: 400 })
    }
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (signErr) {
      return NextResponse.json({ error: 'Netačna lozinka.' }, { status: 403 })
    }
  } else {
    const t = confirmPhrase.trim()
    const ok = /^obriši$/iu.test(t) || /^obrisi$/iu.test(t)
    if (!ok) {
      return NextResponse.json(
        {
          error: 'Za potvrdu unesi tačno reč: OBRIŠI',
        },
        { status: 400 }
      )
    }
  }

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
