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

export default function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const planParam = searchParams.get('plan')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) router.replace(next)
    })
  }, [router, next])

  const handleSubmit = async () => {
    if (!fullName.trim() || !email || !password || !confirm) return
    if (password !== confirm) {
      setError('Lozinke se ne poklapaju.')
      return
    }
    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 karaktera.')
      return
    }
    setLoading(true)
    setError('')
    setInfo('')
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim(), display_name: fullName.trim() },
      },
    })
    if (err) setError(err.message)
    else if (data.session) {
      router.replace('/dashboard')
    } else {
      setInfo('Proveri email za potvrdu registracije.')
    }
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
    <AuthShell title="Registracija" subtitle="Napravi nalog za Paušalac">
      {planParam === 'pro' ? (
        <p
          style={{
            margin: '0 0 16px 0',
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--accent-dim)',
            border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
            color: 'var(--text-primary)',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Biraš <strong>Pro</strong> plan. Posle registracije pretplatu ručno aktivira administrator u Supabase-u (plaćanje
          uskoro preko procesora).
        </p>
      ) : null}
      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>PODACI ZA NALOG</p>
      <input
        type="text"
        autoComplete="name"
        placeholder="Ime i prezime"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        style={authInputStyle}
      />
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
          autoComplete="new-password"
          placeholder="Lozinka"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...authInputStyle, marginBottom: 0, paddingRight: 44 }}
        />
        <button type="button" style={authEyeBtn} onClick={() => setShowPass(!showPass)} aria-label="Prikaži lozinku">
          <EyeIcon open={showPass} />
        </button>
      </div>
      <div style={authPassWrap}>
        <input
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Potvrdi lozinku"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={{ ...authInputStyle, marginBottom: 0, paddingRight: 44 }}
        />
        <button type="button" style={authEyeBtn} onClick={() => setShowConfirm(!showConfirm)} aria-label="Prikaži potvrdu lozinke">
          <EyeIcon open={showConfirm} />
        </button>
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
        {loading ? 'Učitavanje...' : 'Registruj se'}
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
        Registruj se sa Google-om
      </button>

      <p style={{ textAlign: 'center', margin: '20px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
        Već imaš nalog?{' '}
        <Link
          href={next !== '/dashboard' ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          style={{ color: 'var(--accent)', fontWeight: 600 }}
        >
          Prijavi se
        </Link>
      </p>
    </AuthShell>
  )
}
