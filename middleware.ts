import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase-config'
import { onboardingCompletedFromDb } from '@/lib/profile'

/** Zaštićene stranice aplikacije (npr. /profil, /settings i ostale glavne rute). */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/prihodi',
  '/faktura',
  '/fakture',
  '/kpo',
  '/settings',
  '/profil',
  '/rashodi',
  '/doo',
  '/onboarding',
] as const

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Javne rute dok je korisnik ulogovan (onboarding nije završen) — ne forsira se /onboarding. */
function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true
  if (pathname === '/login' || pathname === '/register' || pathname === '/reset-password') return true
  if (pathname === '/pricing') return true
  if (pathname.startsWith('/auth/')) return true
  return false
}

async function profileNeedsOnboarding(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.warn('middleware profileNeedsOnboarding:', error.message)
    return false
  }
  const raw = data?.onboarding_completed
  const complete = onboardingCompletedFromDb(raw)
  console.log('[middleware] profiles.onboarding_completed', { userId, raw, complete })
  return !complete
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value)
  })
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    const redirect = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirect)
    return redirect
  }

  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  if (!user) {
    return supabaseResponse
  }

  const needsOnboarding = await profileNeedsOnboarding(supabase, user.id)

  if (pathname === '/login' || pathname === '/register') {
    const url = request.nextUrl.clone()
    url.pathname = needsOnboarding ? '/onboarding' : '/dashboard'
    url.search = ''
    const redirect = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirect)
    return redirect
  }

  if (needsOnboarding && !isPublicPath(pathname) && pathname !== '/onboarding') {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    url.search = ''
    const redirect = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirect)
    return redirect
  }

  if (!needsOnboarding && pathname === '/onboarding') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    const redirect = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirect)
    return redirect
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
