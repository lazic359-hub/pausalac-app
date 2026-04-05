'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isProtectedAppPath } from '@/lib/auth-paths'
import { getSupabaseBrowser, PAUSALAC_INTENTIONAL_SIGN_OUT_KEY } from '@/lib/supabase-browser'

const supabase = getSupabaseBrowser()

export function AuthSessionExpiry() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return

      const intentional =
        typeof window !== 'undefined' &&
        sessionStorage.getItem(PAUSALAC_INTENTIONAL_SIGN_OUT_KEY) === '1'
      if (intentional) {
        sessionStorage.removeItem(PAUSALAC_INTENTIONAL_SIGN_OUT_KEY)
      }

      const path = window.location.pathname
      if (path === '/login' || path === '/register') return
      if (!isProtectedAppPath(path)) return

      const nextPath = `${window.location.pathname}${window.location.search}`
      const params = new URLSearchParams()
      params.set('next', nextPath)
      if (!intentional) {
        params.set('session_expired', '1')
      }
      router.replace(`/login?${params.toString()}`)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
