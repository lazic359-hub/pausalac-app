'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { urlBase64ToUint8Array } from '@/lib/push-client'

const supabase = getSupabaseBrowser()
const STORAGE_DONE = 'pausalac_push_login_prompt_done'
const SESSION_LOCK = 'pausalac_push_signin_prompt_lock'

/**
 * Posle uspešne prijave (SIGNED_IN): jednom po brauzeru traži dozvolu za obaveštenja i upisuje pretplatu.
 * Ne pokreće se na INITIAL_SESSION (osvežavanje stranice sa već ulogovanim korisnikom).
 */
export function PushPermissionAfterLogin() {
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current || event !== 'SIGNED_IN' || !session) return
      if (typeof window === 'undefined') return
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return
      if (localStorage.getItem(STORAGE_DONE)) return
      if (sessionStorage.getItem(SESSION_LOCK)) return
      sessionStorage.setItem(SESSION_LOCK, '1')

      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapid) return

      try {
        const perm = await Notification.requestPermission()
        localStorage.setItem(STORAGE_DONE, '1')
        if (perm !== 'granted') return

        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
          })
        }
        const j = sub.toJSON()
        if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subscription: j }),
        })
      } catch {
        localStorage.setItem(STORAGE_DONE, '1')
      }
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  return null
}
