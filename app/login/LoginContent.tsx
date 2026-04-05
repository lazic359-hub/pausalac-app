'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import {
  AuthShell,
  authInputStyle,
  authPassWrap,
  authEyeBtn,
  EyeIcon,
  GoogleIcon,
} from '@/components/auth/AuthShell'
import { safeNextParam } from '@/lib/auth-safe-next'

const supabase = getSupabaseBrowser()

function oauthRedirectPath(next: string) {
  if (next.startsWith('/') && !next.startsWith('//')) return `${window.location.origin}${next}`
  return `${window.location.origin}/dashboard`
}

export default function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextParam(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace(next)
    })
  }, [router, next])

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    setInfo('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError('Pogrešan email ili lozinka.')
    else router.replace(next)
    setLoading(false)
  }

  const handleGoogle = async () => {
    setError('')
    setInfo('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: oauthRedirectPath(next) },
    })
    if (err) setError(err.message)
  }

  const divider = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '16px 0',
        color: 'var(--text-muted)',
        fontSize: 12,
      }}
    >
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      ili
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )

  return (
    <AuthShell title="Prijava" subtitle="Prijavi se da nastaviš">
      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>EMAIL I LOZINKA</p>
      <input
        type="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={authInputStyle}
      />
      <div style={authPassWrap}>
        <input
          type={showPass ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Lozinka"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{ ...authInputStyle, marginBottom: 0, paddingRight: 44 }}
        />
        <button type="button" style={authEyeBtn} onClick={() => setShowPass(!showPass)} aria-label="Prikaži lozinku">
          <EyeIcon open={showPass} />
        </button>
      </div>
      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <Link
          href="/reset-password"
          style={{
            color: 'var(--accent)',
            fontSize: 13,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Zaboravio si lozinku?
        </Link>
      </div>
      {error ? <p style={{ color: 'var(--alert-danger-text)', fontSize: 13, margin: '0 0 12px 0' }}>{error}</p> : null}
      {info ? <p style={{ color: 'var(--accent)', fontSize: 13, margin: '0 0 12px 0' }}>{info}</p> : null}
      <button
        type="button"
        onClick={handleSubmit}
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
          marginBottom: 4,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Učitavanje...' : 'Prijavi se'}
      </button>

      {divider}

      <button
        type="button"
        onClick={handleGoogle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontWeight: 600,
          padding: '12px 14px',
          borderRadius: 10,
          cursor: 'pointer',
        }}
      >
        <GoogleIcon />
        Prijavi se sa Google-om
      </button>

      <p style={{ textAlign: 'center', margin: '20px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
        Nemaš nalog?{' '}
        <Link href={next !== '/dashboard' ? `/register?next=${encodeURIComponent(next)}` : '/register'} style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Registruj se
        </Link>
      </p>
    </AuthShell>
  )
}
