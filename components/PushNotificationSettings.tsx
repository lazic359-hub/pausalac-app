'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { urlBase64ToUint8Array } from '@/lib/push-client'

const supabase = getSupabaseBrowser()

export function PushNotificationSettings() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setSupported(false)
      return
    }
    setSupported(true)
    setPermission(Notification.permission)
    if (!('PushManager' in window)) {
      setSubscribed(false)
      return
    }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setSubscribed(!!sub)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh()
    })
    return () => subscription.unsubscribe()
  }, [refresh])

  async function enablePush() {
    if (!vapid) {
      setMsg('Push nije podešen na serveru (nedostaje NEXT_PUBLIC_VAPID_PUBLIC_KEY).')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setMsg('Prijavi se da uključiš obaveštenja.')
        return
      }
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setMsg('Dozvola za obaveštenja nije data.')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
      })
      const j = sub.toJSON()
      if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) {
        setMsg('Neuspešna pretplata na push.')
        return
      }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subscription: j }),
      })
      if (!res.ok) {
        const jerr = (await res.json().catch(() => ({}))) as { error?: string }
        setMsg(jerr.error ?? 'Čuvanje pretplate nije uspelo.')
        return
      }
      setSubscribed(true)
    } catch (e) {
      console.error(e)
      setMsg('Greška pri uključivanju push obaveštenja.')
    } finally {
      setBusy(false)
    }
  }

  async function disablePush() {
    setBusy(true)
    setMsg(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const j = sub.toJSON()
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint: j.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (e) {
      console.error(e)
      setMsg('Isključivanje nije uspelo.')
    } finally {
      setBusy(false)
    }
  }

  if (!supported) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
        Brauzer push obaveštenja nisu podržani na ovom uređaju.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, margin: '0 0 6px 0' }}>
        Browser obaveštenja (porez i dospela faktura)
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 14px 0', lineHeight: 1.5 }}>
        Podsetnik 7 i 1 dan pre poreskog roka (iznos iz profila) i kada faktura postane dospela. Radi kad je aplikacija
        zatvorena (PWA / podržani brauzer).
      </p>
      {!vapid && (
        <p style={{ color: 'var(--alert-danger-text)', fontSize: 12, margin: '0 0 10px 0' }}>
          Nedostaje NEXT_PUBLIC_VAPID_PUBLIC_KEY u konfiguraciji.
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        {subscribed ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void disablePush()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 14,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            <BellOff size={18} aria-hidden />
            {busy ? '…' : 'Isključi push'}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || !vapid}
            onClick={() => void enablePush()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--accent)',
              background: 'rgba(0, 255, 179, 0.08)',
              color: 'var(--accent)',
              fontWeight: 600,
              fontSize: 14,
              cursor: busy || !vapid ? 'not-allowed' : 'pointer',
              opacity: busy || !vapid ? 0.6 : 1,
            }}
          >
            <Bell size={18} aria-hidden />
            {busy ? '…' : 'Uključi push obaveštenja'}
          </button>
        )}
        {permission === 'denied' && (
          <span style={{ color: 'var(--alert-danger-text)', fontSize: 12 }}>
            Obaveštenja su blokirana u podešavanjima brauzera.
          </span>
        )}
      </div>
      {msg && (
        <p style={{ color: 'var(--alert-danger-text)', fontSize: 12, margin: '10px 0 0 0' }}>{msg}</p>
      )}
    </div>
  )
}
