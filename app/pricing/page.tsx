'use client'

import { useEffect } from 'react'

/** Preusmerava na javnu početnu stranu, sekcija cena (hash). */
export default function PricingRedirectPage() {
  useEffect(() => {
    window.location.replace('/#cena')
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
      }}
    >
      Otvaranje cenovnika…
    </div>
  )
}
