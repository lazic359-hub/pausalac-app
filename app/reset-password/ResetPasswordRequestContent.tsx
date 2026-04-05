'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { AuthShell, authInputStyle } from '@/components/auth/AuthShell'

const supabase = getSupabaseBrowser()

/** Stranica za unos emaila; link iz mejla vodi na /auth/nova-lozinka (Supabase redirect). */
export default function ResetPasswordRequestContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const sendReset = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setInfo('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/nova-lozinka`,
    })
    if (err) setError(err.message)
    else setInfo('Link za reset lozinke je poslat na tvoj email.')
    setLoading(false)
  }

  return (
    <AuthShell title="Reset lozinke" subtitle="Unesi email i poslaćemo ti link za novu lozinku">
      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>EMAIL</p>
      <input
        type="email"
        autoComplete="email"
        placeholder="Tvoj email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendReset()}
        style={authInputStyle}
      />
      {error ? <p style={{ color: 'var(--alert-danger-text)', fontSize: 13, margin: '0 0 12px 0' }}>{error}</p> : null}
      {info ? <p style={{ color: 'var(--accent)', fontSize: 13, margin: '0 0 12px 0' }}>{info}</p> : null}
      <button
        type="button"
        onClick={sendReset}
        disabled={loading}
        style={{
          width: '100%',
          background: 'var(--accent)',
          color: '#000',
          fontWeight: 700,
          fontSize: 15,
          padding: '14px',
          borderRadius: 10,
          border: 'none',
          cursor: 'pointer',
          marginBottom: 16,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Slanje...' : 'Pošalji link za reset'}
      </button>
      <p style={{ textAlign: 'center', margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Nazad na prijavu
        </Link>
      </p>
    </AuthShell>
  )
}
