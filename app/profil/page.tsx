'use client'

import { BottomNav } from '@/components/BottomNav'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getSupabaseBrowser, signOutIntentional } from '@/lib/supabase-browser'
import { readProfilFromStorage, setProfileMemory } from '@/lib/profile'
import { ChevronRight, Eye, EyeOff, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

const supabase = getSupabaseBrowser()

function notifyProfilUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('pausalac-profil-updated'))
}

const kartica: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  padding: 24,
  marginBottom: 16,
  position: 'relative',
  overflow: 'hidden',
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  hasError = false,
  style = {},
  disabled = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hasError?: boolean
  style?: React.CSSProperties
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      readOnly={disabled}
      style={{
        width: '100%',
        background: disabled ? 'var(--bg-card)' : 'var(--bg-primary)',
        border: `1px solid ${hasError ? 'var(--alert-danger-border)' : focused && !disabled ? '#00C89660' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '12px 16px',
        color: 'var(--text-primary)',
        fontSize: 14,
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxShadow: focused && !disabled ? '0 0 0 3px #00C89615' : 'none',
        cursor: disabled ? 'default' : 'text',
        opacity: disabled ? 0.95 : 1,
        ...style,
      }}
    />
  )
}

type ToastType = 'success' | 'error'
function Toast({ msg, type, onClose }: { msg: string; type: ToastType; onClose: () => void }) {
  const colors =
    type === 'success'
      ? { bg: 'rgba(0,255,179,0.1)', border: 'rgba(0,255,179,0.3)', color: 'var(--accent)' }
      : { bg: 'var(--alert-danger-bg)', border: 'var(--alert-danger-border)', color: 'var(--alert-danger-text)' }
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.color,
        borderRadius: 12,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 14,
        fontWeight: 700,
        zIndex: 9999,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        maxWidth: 'min(92vw, 560px)',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          marginLeft: 8,
          fontSize: 16,
          opacity: 0.75,
        }}
      >
        ×
      </button>
    </div>
  )
}

function formatRsd(n: number) {
  return new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 }).format(n)
}

export default function ProfilPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [savedFullName, setSavedFullName] = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [hasEmailPasswordIdentity, setHasEmailPasswordIdentity] = useState(true)

  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showCf, setShowCf] = useState(false)
  const [passBusy, setPassBusy] = useState(false)

  const [mesecniPorez, setMesecniPorez] = useState('')
  const [mesecniPio, setMesecniPio] = useState('')
  const [mesecniZdravstvo, setMesecniZdravstvo] = useState('')
  const [mesecniNezaposlenost, setMesecniNezaposlenost] = useState('')
  const [taxSaving, setTaxSaving] = useState(false)
  const [taxLoaded, setTaxLoaded] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)

  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null)
  const [logoutBusy, setLogoutBusy] = useState(false)

  const showToast = (msg: string, type: ToastType) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const ukupnoMesečno = useMemo(() => {
    const a = parseInt(mesecniPorez, 10) || 0
    const b = parseInt(mesecniPio, 10) || 0
    const c = parseInt(mesecniZdravstvo, 10) || 0
    const d = parseInt(mesecniNezaposlenost, 10) || 0
    return a + b + c + d
  }, [mesecniPorez, mesecniPio, mesecniZdravstvo, mesecniNezaposlenost])

  const loadUserAndTax = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    setUserEmail(user?.email ?? null)
    setAuthLoading(false)

    if (!user) return

    const meta = user.user_metadata as Record<string, unknown> | undefined
    const n = String(meta?.full_name ?? meta?.display_name ?? '').trim()
    setFullName(n)
    setSavedFullName(n)
    setHasEmailPasswordIdentity(user.identities?.some((i) => i.provider === 'email') ?? false)

    const { data } = await supabase
      .from('profiles')
      .select('company_data, porez_na_prihod, pio_doprinos, zdravstveno, nezaposleni')
      .eq('id', user.id)
      .maybeSingle()

    const fromDb = (data?.company_data as Record<string, unknown> | null) ?? {}
    const fromMem = readProfilFromStorage() ?? {}
    const merged = { ...fromMem, ...fromDb }

    setMesecniPorez(
      data?.porez_na_prihod != null ? String(data.porez_na_prihod) : String(merged.mesecniPorez ?? '')
    )
    setMesecniPio(data?.pio_doprinos != null ? String(data.pio_doprinos) : String(merged.mesecniPio ?? ''))
    setMesecniZdravstvo(
      data?.zdravstveno != null ? String(data.zdravstveno) : String(merged.mesecniZdravstvo ?? '')
    )
    setMesecniNezaposlenost(
      data?.nezaposleni != null
        ? String(data.nezaposleni)
        : String(merged.mesecniNezaposlenost ?? '')
    )
    setTaxLoaded(true)
  }, [])

  useEffect(() => {
    void loadUserAndTax()
  }, [loadUserAndTax])

  useEffect(() => {
    if (!authLoading && !userId) router.replace('/login?next=/profil')
  }, [authLoading, userId, router])

  const saveName = async () => {
    const t = fullName.trim()
    if (!t) {
      showToast('Unesi ime i prezime.', 'error')
      return
    }
    setNameSaving(true)
    const { data: u, error } = await supabase.auth.updateUser({
      data: { full_name: t, display_name: t },
    })
    setNameSaving(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    if (u?.user) {
      await supabase.from('profiles').upsert({ id: u.user.id, full_name: t }, { onConflict: 'id' })
    }
    setSavedFullName(t)
    showToast('Ime je sačuvano.', 'success')
  }

  const changePassword = async () => {
    if (newPass !== confirmPass) {
      showToast('Nove lozinke se ne poklapaju.', 'error')
      return
    }
    if (newPass.length < 6) {
      showToast('Nova lozinka mora imati najmanje 6 karaktera.', 'error')
      return
    }
    if (!userEmail) {
      showToast('Nalog nema email — kontaktiraj podršku.', 'error')
      return
    }
    setPassBusy(true)
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: oldPass,
    })
    if (signErr) {
      setPassBusy(false)
      showToast('Trenutna lozinka nije ispravna.', 'error')
      return
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPass })
    setPassBusy(false)
    if (updErr) {
      showToast(updErr.message, 'error')
      return
    }
    setOldPass('')
    setNewPass('')
    setConfirmPass('')
    showToast('Lozinka je promenjena.', 'success')
  }

  const saveTax = async () => {
    const n = (s: string) => {
      const x = parseInt(String(s).replace(/\s/g, ''), 10)
      return Number.isFinite(x) && x >= 0
    }
    if (!n(mesecniPorez) || !n(mesecniPio) || !n(mesecniZdravstvo) || !n(mesecniNezaposlenost)) {
      showToast('Unesi sve iznose (brojevi ≥ 0).', 'error')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    setTaxSaving(true)
    const { data: row } = await supabase
      .from('profiles')
      .select('company_data, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle()

    const existing = (row?.company_data as Record<string, unknown> | null) ?? readProfilFromStorage() ?? {}
    const merged: Record<string, unknown> = {
      ...existing,
      mesecniPorez,
      mesecniPio,
      mesecniZdravstvo,
      mesecniNezaposlenost,
    }

    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        company_data: merged,
        onboarding_completed: row?.onboarding_completed ?? true,
        porez_na_prihod: parseInt(mesecniPorez, 10) || 0,
        pio_doprinos: parseInt(mesecniPio, 10) || 0,
        zdravstveno: parseInt(mesecniZdravstvo, 10) || 0,
        nezaposleni: parseInt(mesecniNezaposlenost, 10) || 0,
      },
      { onConflict: 'id' }
    )
    setTaxSaving(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setProfileMemory(user.id, merged)
    notifyProfilUpdated()
    showToast('Iznosi iz poreskog rešenja su sačuvani.', 'success')
  }

  const odjava = async () => {
    setLogoutBusy(true)
    const { error } = await signOutIntentional()
    setLogoutBusy(false)
    if (error) {
      showToast('Odjava nije uspela.', 'error')
      return
    }
  }

  const deleteAccount = async () => {
    setDeleteBusy(true)
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(
        hasEmailPasswordIdentity
          ? { password: deletePassword }
          : { confirmPhrase: deletePhrase }
      ),
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    setDeleteBusy(false)
    if (!res.ok) {
      showToast(json.error || 'Brisanje nije uspelo.', 'error')
      return
    }
    await signOutIntentional()
    setDeleteOpen(false)
  }

  if (authLoading || !userId || !taxLoaded) {
    return (
      <div
        style={{
          background: 'var(--bg-primary)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Učitavanje…</span>
      </div>
    )
  }

  const nameDirty = fullName.trim() !== savedFullName.trim()

  return (
    <div
      style={{
        background: 'var(--bg-primary)',
        minHeight: '100vh',
        color: 'var(--text-primary)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => window.history.back()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 20,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          ←
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }} aria-hidden>
              👤
            </span>
            <span
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: 'var(--accent)',
                letterSpacing: '-0.02em',
              }}
            >
              Profil
            </span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, paddingLeft: 28 }}>
            Nalog, lozinka i iznosi iz poreskog rešenja
          </span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 120px 16px' }}>
        <div style={kartica}>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              margin: '0 0 14px 0',
            }}
          >
            LIČNI PODACI
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>IME I PREZIME</p>
          <Input value={fullName} onChange={setFullName} placeholder="npr. Marko Marković" />
          <button
            type="button"
            disabled={!nameDirty || nameSaving}
            onClick={() => void saveName()}
            style={{
              marginTop: 12,
              background: nameDirty && !nameSaving ? 'var(--accent)' : 'var(--border)',
              color: nameDirty ? '#000' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: 14,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              cursor: nameDirty && !nameSaving ? 'pointer' : 'default',
            }}
          >
            {nameSaving ? 'Čuvanje…' : 'Sačuvaj ime'}
          </button>
        </div>

        <div style={kartica}>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              margin: '0 0 14px 0',
            }}
          >
            EMAIL
          </p>
          <Input value={userEmail ?? ''} onChange={() => undefined} disabled placeholder="email" />
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '10px 0 0 0', lineHeight: 1.5 }}>
            Email se ovde ne menja. Za promenu adrese kontaktiraj podršku (npr. ako nemaš pristup pošti).
          </p>
        </div>

        <div style={kartica}>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              margin: '0 0 14px 0',
            }}
          >
            PROMENA LOZINKE
          </p>
          {!hasEmailPasswordIdentity ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0, lineHeight: 1.55 }}>
              Nalog je povezan preko Google-a. Lozinka aplikacije ne važi — upravljaj pristupom u Google nalogu.
            </p>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>TRENUTNA LOZINKA</p>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Input
                  type={showOld ? 'text' : 'password'}
                  value={oldPass}
                  onChange={setOldPass}
                  placeholder="••••••••"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  aria-label={showOld ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                  onClick={() => setShowOld(!showOld)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>NOVA LOZINKA</p>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPass}
                  onChange={setNewPass}
                  placeholder="Najmanje 6 karaktera"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  aria-label={showNew ? 'Sakrij' : 'Prikaži'}
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>POTVRDA NOVE LOZINKE</p>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Input
                  type={showCf ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={setConfirmPass}
                  placeholder="Ponovi novu lozinku"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  aria-label={showCf ? 'Sakrij' : 'Prikaži'}
                  onClick={() => setShowCf(!showCf)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  {showCf ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => void changePassword()}
                disabled={passBusy}
                style={{
                  background: 'var(--accent)',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: passBusy ? 'wait' : 'pointer',
                  opacity: passBusy ? 0.85 : 1,
                }}
              >
                {passBusy ? 'Menjam…' : 'Promeni lozinku'}
              </button>
            </>
          )}
        </div>

        <div style={kartica}>
          <div
            style={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 120,
              height: 120,
              background: '#f59e0b',
              borderRadius: '50%',
              filter: 'blur(60px)',
              opacity: 0.07,
            }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>
            PORESKO REŠENJE (MESEČNI IZNOSI)
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Iste stavke kao pri prvom podešavanju — prepiši iz rešenja Poreskog upravnika i ažuriraj kad stigne novo
            rešenje.
          </p>
          <div className="settings-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(
              [
                { label: 'POREZ NA PRIHOD', val: mesecniPorez, set: setMesecniPorez, boja: '#f59e0b' },
                { label: 'PIO DOPRINOS', val: mesecniPio, set: setMesecniPio, boja: '#3b82f6' },
                { label: 'ZDRAVSTVENO OSIGURANJE', val: mesecniZdravstvo, set: setMesecniZdravstvo, boja: '#a855f7' },
                {
                  label: 'OSIGURANJE ZA NEZAPOSLENOST',
                  val: mesecniNezaposlenost,
                  set: setMesecniNezaposlenost,
                  boja: 'var(--text-muted)',
                },
              ] as const
            ).map((field) => (
              <div key={field.label}>
                <p style={{ color: field.boja, fontSize: 11, margin: '0 0 6px 0', opacity: 0.85 }}>{field.label}</p>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="number"
                    value={field.val}
                    onChange={field.set}
                    placeholder="0"
                    style={{ paddingRight: 48 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    RSD
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 18,
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'var(--bg-primary)',
            }}
          >
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 11,
                margin: '0 0 8px 0',
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              UKUPNO MESEČNO
            </p>
            <span style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              {formatRsd(ukupnoMesečno)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>RSD</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void saveTax()}
            disabled={taxSaving}
            style={{
              marginTop: 16,
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 700,
              fontSize: 14,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              cursor: taxSaving ? 'wait' : 'pointer',
            }}
          >
            {taxSaving ? 'Čuvanje…' : 'Sačuvaj iznose'}
          </button>
        </div>

        <Link
          href="/settings"
          style={{
            ...kartica,
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, margin: '0 0 4px 0' }}>
              PODEŠAVANJA FIRME
            </p>
            <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px 0' }}>Podaci o firmi, KPO limit, banka…</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Otvori punu stranicu podešavanja</p>
          </div>
          <ChevronRight size={22} color="var(--accent)" style={{ flexShrink: 0 }} />
        </Link>

        <div style={kartica}>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              margin: '0 0 14px 0',
            }}
          >
            NALOG
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>Sesija</p>
            <button
              type="button"
              onClick={() => void odjava()}
              disabled={logoutBusy}
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
                cursor: logoutBusy ? 'wait' : 'pointer',
                opacity: logoutBusy ? 0.7 : 1,
              }}
            >
              <LogOut size={18} aria-hidden />
              {logoutBusy ? 'Odjavljivanje…' : 'Odjavi se'}
            </button>
          </div>
        </div>

        <div
          style={{
            ...kartica,
            borderColor: 'rgba(239, 68, 68, 0.45)',
            background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, var(--bg-card) 100%)',
          }}
        >
          <p style={{ color: '#ef4444', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
            OPASNA ZONA
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 14px 0', lineHeight: 1.5 }}>
            Trajno briše nalog i pristup podacima. Ova radnja se ne može poništiti.
          </p>
          <button
            type="button"
            onClick={() => {
              setDeletePassword('')
              setDeletePhrase('')
              setDeleteOpen(true)
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fecaca',
              fontWeight: 700,
              fontSize: 14,
              padding: '10px 18px',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Obriši nalog
          </button>
        </div>
      </div>

      <BottomNav />

      {deleteOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => !deleteBusy && setDeleteOpen(false)}
          role="presentation"
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 420,
              width: '100%',
              border: '1px solid var(--border)',
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
          >
            <p id="del-title" style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 800, margin: '0 0 8px 0' }}>
              Obrisati nalog?
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 18px 0', lineHeight: 1.5 }}>
              Svi podaci vezani za nalog biće uklonjeni. Ako si siguran,{' '}
              {hasEmailPasswordIdentity ? 'unesi lozinku' : 'ispod unesi tačno OBRIŠI'} da potvrdiš.
            </p>
            {hasEmailPasswordIdentity ? (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>LOZINKA</p>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={setDeletePassword}
                  placeholder="Trenutna lozinka"
                />
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>
                  UNESI TEKST <strong style={{ color: 'var(--text-primary)' }}>OBRIŠI</strong>
                </p>
                <Input value={deletePhrase} onChange={setDeletePhrase} placeholder="OBRIŠI" />
              </>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteOpen(false)}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '10px 18px',
                  borderRadius: 10,
                  cursor: deleteBusy ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Otkaži
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => void deleteAccount()}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: 10,
                  cursor: deleteBusy ? 'wait' : 'pointer',
                  fontWeight: 700,
                }}
              >
                {deleteBusy ? 'Brisanje…' : 'Trajno obriši'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
