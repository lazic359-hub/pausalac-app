'use client'

import { useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { urlBase64ToUint8Array } from '@/lib/push-client'

const supabase = getSupabaseBrowser()

/**
 * Sinhronizuje PushManager pretplatu sa serverom kad je dozvola već data (npr. posle uključivanja u podešavanjima).
 */
export function PushNotificationsSetup() {
  useEffect(() => {
    let cancelled = false
    async function sync() {
      if (typeof window === 'undefined') return
      if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return
      if (Notification.permission !== 'granted') return
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapid) return
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || cancelled) return
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
          })
        } catch {
          return
        }
      }
      const j = sub.toJSON()
      if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) return
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscription: j }),
      })
    }
    void sync()
    return () => {
      cancelled = true
    }
  }, [])
  return null
}
