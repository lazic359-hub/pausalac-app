'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import {
  AuthShell,
  authInputStyle,
  authPassWrap,
  authEyeBtn,
  EyeIcon,
} from '@/components/auth/AuthShell'

const supabase = getSupabaseBrowser()

/** Dolazak sa linka iz emaila (Supabase recovery); ovde korisnik postavlja novu lozinku. */
export default function NovaLozinkaPage() {
  const router = useRouter()
  const [pass, setPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionOk, setSessionOk] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setSessionOk(true)
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      if (session) {
        setSessionOk(true)
        return
      }
      timeoutId = window.setTimeout(() => {
        void supabase.auth.getSession().then(({ data: { session: s2 } }) => {
          if (cancelled) return
          if (s2) setSessionOk(true)
          else {
            setSessionOk(false)
            setErrorMsg(
              'Sesija nije pronađena ili je link istekao. Zatraži novi link sa stranice za reset lozinke.'
            )
          }
        })
      }, 1200)
    })

    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const handleUpdate = async () => {
    if (pass !== confirmPass) {
      setErrorMsg('Lozinke se ne poklapaju.')
      setInfo('')
      return
    }
    if (pass.length < 6) {
      setErrorMsg('Lozinka mora imati najmanje 6 karaktera.')
      setInfo('')
      return
    }
    setLoading(true)
    setInfo('')
    setErrorMsg('')
    const { error } = await supabase.auth.updateUser({ password: pass })
    if (error) setErrorMsg(error.message)
    else {
      setInfo('Lozinka je promenjena. Preusmeravam...')
      setTimeout(() => router.replace('/dashboard'), 1800)
    }
    setLoading(false)
  }

  return (
    <AuthShell title="Nova lozinka" subtitle="Unesi i potvrdi novu lozinku">
      {sessionOk === null ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Učitavanje...</p>
      ) : null}
      {sessionOk === false ? (
        <>
          <p style={{ color: 'var(--alert-danger-text)', fontSize: 14, margin: '0 0 16px 0' }}>{errorMsg}</p>
          <p style={{ textAlign: 'center', margin: 0 }}>
            <Link href="/reset-password" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Zatraži novi link
            </Link>
          </p>
        </>
      ) : null}
      {sessionOk === true ? (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>NOVA LOZINKA</p>
          <div style={authPassWrap}>
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Nova lozinka"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
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
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              style={{ ...authInputStyle, marginBottom: 0, paddingRight: 44 }}
            />
            <button type="button" style={authEyeBtn} onClick={() => setShowConfirm(!showConfirm)} aria-label="Prikaži potvrdu">
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          {errorMsg ? (
            <p style={{ color: 'var(--alert-danger-text)', fontSize: 13, margin: '0 0 12px 0' }}>{errorMsg}</p>
          ) : null}
          {info ? (
            <p style={{ color: 'var(--accent)', fontSize: 13, margin: '0 0 12px 0' }}>{info}</p>
          ) : null}
          <button
            type="button"
            onClick={handleUpdate}
            disabled={loading || !pass || pass !== confirmPass}
            style={{
              width: '100%',
              padding: 14,
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 700,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              opacity: loading || !pass || pass !== confirmPass ? 0.5 : 1,
            }}
          >
            {loading ? 'Čuvanje...' : 'Sačuvaj lozinku'}
          </button>
        </>
      ) : null}
    </AuthShell>
  )
}
