'use client'

import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const sync = () => {
      const off = typeof navigator !== 'undefined' && !navigator.onLine
      setOffline(off)
      document.body.classList.toggle('offline-app-active', off)
    }
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      document.body.classList.remove('offline-app-active')
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className="offline-app-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 11000,
        padding: '10px 16px',
        paddingTop: 'max(10px, env(safe-area-inset-top, 0px))',
        background: 'color-mix(in srgb, var(--accent) 18%, var(--bg-card))',
        borderBottom: '1px solid color-mix(in srgb, var(--accent) 35%, var(--border))',
        color: 'var(--text-primary)',
        fontSize: 13,
        fontWeight: 600,
        textAlign: 'center',
        lineHeight: 1.4,
      }}
    >
      Nisi povezan na internet — prikazuju se poslednji sačuvani podaci
    </div>
  )
}
