'use client'
import DataManagement from "@/components/DataManagement"
import { UputstvoModal } from "@/components/UputstvoZaPocetnike"
import { useState, useEffect, useMemo } from 'react'
import { PushNotificationSettings } from '@/components/PushNotificationSettings'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomNav } from '@/components/BottomNav'
import TestSamostalnosti from "@/components/TestSamostalnosti"
import { getSupabaseBrowser, signOutIntentional } from '@/lib/supabase-browser'
import { readProfilFromStorage, setProfileMemory } from '@/lib/profile'
import { identityColumnsPayload, mergeCompanyWithIdentityColumns, type ProfileIdentityRow } from '@/lib/profile-identity-columns'
import {
  BookOpen, Building2, ChevronRight, LayoutDashboard, FileSpreadsheet, Wallet, FileText, LogOut, Landmark,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = getSupabaseBrowser()

type Profil = {
  nazivFirme: string; pib: string; maticniBroj: string
  sifraDelatnosti: string; godinaPrvePausalne: string
  /** Ime i prezime poreskog obveznika (KPO zaglavlje) */
  obveznik: string
  /** Šifra poreskog obveznika (JIB/kod iz PUP) */
  sifraPoreskogObveznika: string
  mesecniPorez: string; mesecniPio: string; mesecniZdravstvo: string
  mesecniNezaposlenost: string; brojRacuna: string; godisnjLimit: string
  iban: string; swift: string; sediste: string
  /** ISO yyyy-mm-dd — iz onboardinga / podešavanja */
  datumRegistracije: string
  /** Prihod ostvaren pre evidencije u aplikaciji, za jednu godinu */
  pocetniPrihodRsd: string
  pocetniPrihodGodina: string
  reminder3Dana: boolean; reminder1Dan: boolean
}

const PRAZAN_PROFIL: Profil = {
  nazivFirme: '', pib: '', maticniBroj: '', sifraDelatnosti: '', godinaPrvePausalne: '',
  obveznik: '', sifraPoreskogObveznika: '',
  mesecniPorez: '', mesecniPio: '', mesecniZdravstvo: '', mesecniNezaposlenost: '',
  brojRacuna: '', godisnjLimit: '6000000', iban: '', swift: '', sediste: '',
  datumRegistracije: '', pocetniPrihodRsd: '', pocetniPrihodGodina: '',
  reminder3Dana: true, reminder1Dan: true
}

const kartica: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 16, padding: 24, marginBottom: 16,
  position: 'relative', overflow: 'hidden',
}

function Input({ value, onChange, placeholder, type = 'text', hasError = false, style = {}, disabled = false, inputMode }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; hasError?: boolean; style?: React.CSSProperties; disabled?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input type={type} placeholder={placeholder} value={value}
      inputMode={inputMode}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false) }}
      disabled={disabled}
      readOnly={disabled}
      style={{
        width: '100%', background: disabled ? 'var(--bg-card)' : 'var(--bg-primary)',
        border: `1px solid ${hasError ? 'var(--alert-danger-border)' : focused && !disabled ? '#00C89660' : 'var(--border)'}`,
        borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14,
        boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s',
        boxShadow: focused && !disabled ? '0 0 0 3px #00C89615' : 'none',
        cursor: disabled ? 'default' : 'text', opacity: disabled ? 0.95 : 1, ...style,
      }}
    />
  )
}

function Greska({ tekst }: { tekst: string }) {
  return <p style={{ color: 'var(--alert-danger-text)', fontSize: 11, margin: '4px 0 8px 0' }}>⚠️ {tekst}</p>
}

function formatRsd(n: number) {
  return new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 0 }).format(n)
}

function humanizeSaveErrorMessage(msg: string): string {
  const m = (msg || '').toLowerCase()
  if (!m) return 'Čuvanje nije uspelo. Pokušaj ponovo.'
  if (m.includes('failed to fetch') || m.includes('could not fetch')) {
    return 'Čuvanje nije uspelo (mrežna greška). Proveri internet i pokušaj ponovo.'
  }
  if (m.includes('network') || m.includes('timeout')) {
    return 'Čuvanje nije uspelo (problem sa mrežom). Pokušaj ponovo.'
  }
  if (m.includes('jwt') || m.includes('session') || m.includes('not authenticated')) {
    return 'Sesija nije važeća. Osveži stranu i prijavi se ponovo.'
  }
  return msg
}

function notifyProfilUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('pausalac-profil-updated'))
}

const BRZI_LINKOVI: { href: string; label: string; sub: string; Icon: typeof LayoutDashboard }[] = [
  { href: '/dashboard', label: 'Kontrolna tabla', sub: 'Pregled, kalendar, obaveze', Icon: LayoutDashboard },
  { href: '/prihodi', label: 'Prihodi', sub: 'Evidencija i grafikon', Icon: Wallet },
  { href: '/kpo', label: 'KPO', sub: 'Limit i knjiga prometa', Icon: FileSpreadsheet },
  { href: '/fakture', label: 'Fakture', sub: 'Izdavanje i arhiva', Icon: FileText },
  { href: '/rashodi', label: 'Rashodi', sub: 'Troškovi poslovanja', Icon: Landmark },
  { href: '/doo', label: 'DOO kalkulator', sub: 'Paušal vs DOO (procena)', Icon: Building2 },
]

type ToastType = 'success' | 'error'
function Toast({ msg, type, onClose }: { msg: string; type: ToastType; onClose: () => void }) {
  const colors = type === 'success'
    ? { bg: 'rgba(0,255,179,0.1)', border: 'rgba(0,255,179,0.3)', color: 'var(--accent)' }
    : { bg: 'var(--alert-danger-bg)', border: 'var(--alert-danger-border)', color: 'var(--alert-danger-text)' }
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color,
      borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, fontWeight: 700, zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      maxWidth: 'min(92vw, 560px)',
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 8, fontSize: 16, opacity: 0.75 }}>×</button>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [profil, setProfil] = useState<Profil>(PRAZAN_PROFIL)
  const [originalProfil, setOriginalProfil] = useState<Profil>(PRAZAN_PROFIL)
  const [editMode, setEditMode] = useState(false)
  const [showConfirmSave, setShowConfirmSave] = useState(false)
  const [sacuvano, setSacuvano] = useState(false)
  const [greske, setGreske] = useState<string[]>([])
  const [ucitavanje, setUcitavanje] = useState(true)
  const [showUputstvo, setShowUputstvo] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [logoutBusy, setLogoutBusy] = useState(false)

  const ukupnoMesečno = useMemo(() => {
    const a = parseInt(profil.mesecniPorez, 10) || 0
    const b = parseInt(profil.mesecniPio, 10) || 0
    const c = parseInt(profil.mesecniZdravstvo, 10) || 0
    const d = parseInt(profil.mesecniNezaposlenost, 10) || 0
    return a + b + c + d
  }, [profil.mesecniPorez, profil.mesecniPio, profil.mesecniZdravstvo, profil.mesecniNezaposlenost])

  useEffect(() => {
    ucitajPodatke()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (ucitavanje) return
    if (window.location.hash !== '#poresko') return
    const el = document.getElementById('poresko-podaci')
    if (!el) return
    setTimeout(() => {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } catch {
        el.scrollIntoView()
      }
    }, 50)
  }, [ucitavanje])

  const ucitajPodatke = async () => {
    setUcitavanje(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    setUserEmail(user?.email ?? null)
    setAuthLoading(false)

    if (!user) {
      setUcitavanje(false)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select(
        'company_data, porez_na_prihod, pio_doprinos, zdravstveno, nezaposleni, pib, firma_naziv, sediste, sifra_delatnosti, obveznik, sifra_poreskog_obveznika'
      )
      .eq('id', user.id)
      .maybeSingle()

    const fromDbRaw = (data?.company_data as Partial<Profil> | null) ?? {}
    const fromDb = data
      ? mergeCompanyWithIdentityColumns(fromDbRaw as Record<string, unknown>, data as ProfileIdentityRow)
      : (fromDbRaw as Record<string, unknown>)
    const fromMem = readProfilFromStorage() ?? {}
    const parsed: Profil = {
      ...PRAZAN_PROFIL,
      ...fromDb,
      ...fromMem,
    } as Profil

    if (data) {
      parsed.mesecniPorez = data.porez_na_prihod != null ? String(data.porez_na_prihod) : parsed.mesecniPorez
      parsed.mesecniPio = data.pio_doprinos != null ? String(data.pio_doprinos) : parsed.mesecniPio
      parsed.mesecniZdravstvo = data.zdravstveno != null ? String(data.zdravstveno) : parsed.mesecniZdravstvo
      parsed.mesecniNezaposlenost =
        data.nezaposleni != null ? String(data.nezaposleni) : parsed.mesecniNezaposlenost
    }

    setProfil(parsed)
    setOriginalProfil(parsed)
    setProfileMemory(user.id, parsed as unknown as Record<string, unknown>)

    setUcitavanje(false)
  }

  useEffect(() => {
    if (!authLoading && !userId) router.replace('/login?next=/settings')
  }, [authLoading, userId, router])

  const startEdit = () => {
    setOriginalProfil(profil)
    setEditMode(true)
  }
  const cancelEdit = () => {
    setProfil(originalProfil)
    setGreske([])
    setEditMode(false)
  }
  const openSaveConfirm = () => setShowConfirmSave(true)
  const doSave = async () => {
    setShowConfirmSave(false)
    const saved = await sacuvaj()
    if (saved) {
      setOriginalProfil(saved)
      setEditMode(false)
    }
  }

  const ocisti = (key: string) => setGreske(g => g.filter(x => x !== key))
  const set = (key: keyof Profil) => (v: string) => {
    setProfil(p => ({ ...p, [key]: v }))
    ocisti(key)
    if (key === 'pib') ocisti('pib_format')
    if (key === 'maticniBroj') ocisti('mb_format')
  }
  const setBool = (key: 'reminder3Dana' | 'reminder1Dan') => () => setProfil(p => ({ ...p, [key]: !p[key] }))
  const ima = (key: string) => greske.includes(key)

  const showToast = (msg: string, type: ToastType) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const odjava = async () => {
    setLogoutBusy(true)
    const { error } = await signOutIntentional()
    setLogoutBusy(false)
    if (error) {
      showToast('Odjava nije uspela. Pokušaj ponovo.', 'error')
      return
    }
  }

  const sacuvaj = async (): Promise<Profil | null> => {
    const nova: string[] = []
    if (!profil.nazivFirme.trim()) nova.push('nazivFirme')
    const pibDigits = profil.pib.replace(/\D/g, '')
    if (!profil.pib.trim()) nova.push('pib')
    else if (pibDigits.length !== 9) nova.push('pib_format')
    const mbDigits = profil.maticniBroj.replace(/\D/g, '')
    if (!profil.maticniBroj.trim()) nova.push('maticniBroj')
    else if (mbDigits.length !== 8) nova.push('mb_format')
    const limitN = parseInt(String(profil.godisnjLimit).replace(/\s/g, ''), 10)
    if (!Number.isFinite(limitN) || limitN <= 0) nova.push('godisnjLimit')

    // Poreski iznosi iz rešenja su opcioni (korisnik može da ih unese kasnije).
    // Ako je korisnik uneo bilo koji iznos, zahtevaj da svi budu validni brojevi (≥0).
    const anyPoreskiEntered = [
      profil.mesecniPorez,
      profil.mesecniPio,
      profil.mesecniZdravstvo,
      profil.mesecniNezaposlenost,
    ].some(v => String(v).trim() !== '')
    const isNonNegIntOrEmpty = (v: string) => {
      const t = String(v).trim()
      if (!t) return true
      const n = parseInt(t.replace(/\s/g, ''), 10)
      return Number.isFinite(n) && n >= 0
    }
    if (anyPoreskiEntered) {
      if (!isNonNegIntOrEmpty(profil.mesecniPorez)) nova.push('mesecniPorez')
      if (!isNonNegIntOrEmpty(profil.mesecniPio)) nova.push('mesecniPio')
      if (!isNonNegIntOrEmpty(profil.mesecniZdravstvo)) nova.push('mesecniZdravstvo')
      if (!isNonNegIntOrEmpty(profil.mesecniNezaposlenost)) nova.push('mesecniNezaposlenost')
    }
    setGreske(nova)
    if (nova.length > 0) return null

    const profilZaCuvanje: Profil = {
      ...profil,
      pib: pibDigits,
      maticniBroj: mbDigits,
      godisnjLimit: String(limitN),
    }

    setProfil(profilZaCuvanje)
    notifyProfilUpdated()

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: user.id,
          company_data: profilZaCuvanje as unknown as Record<string, unknown>,
          porez_na_prihod: parseInt(profilZaCuvanje.mesecniPorez) || 0,
          pio_doprinos: parseInt(profilZaCuvanje.mesecniPio) || 0,
          zdravstveno: parseInt(profilZaCuvanje.mesecniZdravstvo) || 0,
          nezaposleni: parseInt(profilZaCuvanje.mesecniNezaposlenost) || 0,
          ...identityColumnsPayload(profilZaCuvanje as unknown as Record<string, unknown>),
        },
        { onConflict: 'id' }
      )
      if (error) {
        console.warn('[SettingsPage] profiles.upsert:', error.message)
        showToast(humanizeSaveErrorMessage(error.message), 'error')
        return null
      }
      setProfileMemory(user.id, profilZaCuvanje as unknown as Record<string, unknown>)
    }

    setSacuvano(true)
    setTimeout(() => setSacuvano(false), 2000)
    return profilZaCuvanje
  }

  if (authLoading || !userId || ucitavanje) return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{authLoading ? 'Učitavanje…' : !userId ? 'Preusmeravam na prijavu…' : 'Učitavanje…'}</span>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => window.history.back()}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >←</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }} aria-hidden>⚙️</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)', letterSpacing: '-0.02em' }}>Podešavanja</span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, paddingLeft: 28 }}>
            Firma, poresko rešenje, limit i račun — sve za paušal u Srbiji
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {editMode ? (
            <>
              <button onClick={cancelEdit}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>
                Otkaži
              </button>
              <button onClick={openSaveConfirm}
                style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                Sačuvaj izmene
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
              Izmeni podešavanja
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {showConfirmSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowConfirmSave(false)}
          role="presentation">
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-save-title">
            <p id="settings-save-title" style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, margin: '0 0 8px 0' }}>Sačuvati izmene?</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px 0', lineHeight: 1.45 }}>
              Podaci će se koristiti za fakture, KPO i obračun obaveza. Proveri da li su iznosi iz poreskog rešenja tačni.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmSave(false)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                Ne
              </button>
              <button onClick={doSave}
                style={{ background: 'var(--accent)', color: '#000', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
                Da, sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-content" style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 120px 16px' }}>

        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Tvoj paušal na jednom mestu
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.55, margin: 0 }}>
            Ovde unosiš podatke koje koristi aplikacija za KPO, fakture, uplatnice i podsetnike. Iznose prepiši iz rešenja Poreskog upravnika i redovno ih ažuriraj kad dobiješ novo rešenje.
          </p>
        </div>

        {/* Brzi pristup */}
        <div style={{ ...kartica, padding: 18, marginBottom: 16 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 14px 0' }}>BRZI PRISTUP</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
            {BRZI_LINKOVI.map(({ href, label, sub, Icon }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px',
                  borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-primary)',
                  textDecoration: 'none', color: 'inherit', transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                <Icon size={20} color="var(--accent)" strokeWidth={2} aria-hidden />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35 }}>{sub}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Nalog */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.06 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', margin: '0 0 14px 0' }}>NALOG</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Prijavljen kao</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 15, fontWeight: 600, wordBreak: 'break-all' }}>{userEmail ?? '—'}</p>
            </div>
            <button
              type="button"
              onClick={() => void odjava()}
              disabled={logoutBusy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)',
                fontWeight: 600, fontSize: 14, cursor: logoutBusy ? 'wait' : 'pointer', opacity: logoutBusy ? 0.7 : 1,
              }}
            >
              <LogOut size={18} aria-hidden />
              {logoutBusy ? 'Odjavljivanje…' : 'Odjavi se'}
            </button>
          </div>
        </div>

        {/* Podaci o firmi */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>🏢 PODACI O FIRMI</p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>NAZIV FIRME</p>
          <Input value={profil.nazivFirme} onChange={set('nazivFirme')} placeholder="npr. Moje Preduzeće PR" hasError={ima('nazivFirme')} style={{ marginBottom: 4 }} disabled={!editMode} />
          {ima('nazivFirme') && <Greska tekst="Obavezno polje" />}

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>SEDIŠTE / ADRESA FIRME</p>
          <Input value={profil.sediste || ''} onChange={set('sediste')} placeholder="npr. Beograd, Ulica br. 1" style={{ marginBottom: 4 }} disabled={!editMode} />

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>ŠIFRA DELATNOSTI</p>
          <Input value={profil.sifraDelatnosti || ''} onChange={set('sifraDelatnosti')} placeholder="npr. 62.01" style={{ marginBottom: 4 }} disabled={!editMode} />

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>OBVEZNIK (IME I PREZIME)</p>
          <Input value={profil.obveznik || ''} onChange={set('obveznik')} placeholder="Kao u poreskom kartonu" style={{ marginBottom: 4 }} disabled={!editMode} />

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>ŠIFRA PORESKOG OBVEZNIKA</p>
          <Input value={profil.sifraPoreskogObveznika || ''} onChange={set('sifraPoreskogObveznika')} placeholder="Kod iz Poreskog upravnika" style={{ marginBottom: 4 }} disabled={!editMode} />

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>GODINA PRVE PAUŠALNE GODINE</p>
          <Input type="number" value={profil.godinaPrvePausalne || ''} onChange={set('godinaPrvePausalne')} placeholder="npr. 2022" disabled={!editMode} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0 0' }}>Koristi se za računanje poreskog umanjenja</p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>DATUM POČETKA PAUŠALNOG OPOREZIVANJA</p>
          <Input type="date" value={profil.datumRegistracije || ''} onChange={set('datumRegistracije')} disabled={!editMode} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0 0' }}>U praksi često piše u rešenju (početak važenja) — koristi se u pregledima i podsetnicima.</p>

          <div className="settings-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>POČETNI PRIHOD (PRE APLIKACIJE)</p>
              <div style={{ position: 'relative' }}>
                <Input type="number" value={profil.pocetniPrihodRsd || ''} onChange={set('pocetniPrihodRsd')} placeholder="0" style={{ paddingRight: 48 }} disabled={!editMode} />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>RSD</span>
              </div>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>ZA KALENDARSKU GODINU</p>
              <Input type="number" value={profil.pocetniPrihodGodina || ''} onChange={set('pocetniPrihodGodina')} placeholder={String(new Date().getFullYear())} disabled={!editMode} />
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '8px 0 0 0', lineHeight: 1.45 }}>Ako si već ostvario promet u toj godini pre evidencije u aplikaciji, unesi zbir da bi KPO i limit bili tačni.</p>

          <div className="settings-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>PIB (9 cifara)</p>
              <Input value={profil.pib} onChange={set('pib')} placeholder="123456789" hasError={ima('pib') || ima('pib_format')} disabled={!editMode} inputMode="numeric" />
              {ima('pib') && <Greska tekst="Obavezno polje" />}
              {ima('pib_format') && <Greska tekst="PIB mora imati tačno 9 cifara" />}
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>MATIČNI BROJ (8 cifara)</p>
              <Input value={profil.maticniBroj} onChange={set('maticniBroj')} placeholder="12345678" hasError={ima('maticniBroj') || ima('mb_format')} disabled={!editMode} inputMode="numeric" />
              {ima('maticniBroj') && <Greska tekst="Obavezno polje" />}
              {ima('mb_format') && <Greska tekst="Matični broj mora imati tačno 8 cifara" />}
            </div>
          </div>
        </div>

        {/* Poreski podaci */}
        <div id="poresko-podaci" style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#f59e0b', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>📋 PORESKI PODACI (IZ REŠENJA)</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Fiksne mesečne akontacije i doprinosi — prepiši iz rešenja o utvrđivanju obaveze (Poresko upravstvo). Ažuriraj kad stigne novo rešenje.
          </p>
          <div style={{
            marginBottom: 12, padding: '10px 12px', borderRadius: 12,
            background: 'var(--alert-info-bg)', border: '1px solid var(--alert-info-border)',
          }}>
            <p style={{ color: 'var(--alert-info-text)', fontSize: 12, fontWeight: 700, margin: 0 }}>
              Opciono: možeš uneti kasnije (ali bez ovoga podsetnici i prikaz obaveza nisu tačni).
            </p>
          </div>

          <div style={{
            marginBottom: 18, padding: '14px 16px', borderRadius: 12,
            background: 'var(--alert-info-bg)', border: '1px solid var(--alert-info-border)',
          }}>
            <p style={{ color: 'var(--alert-info-text)', fontSize: 12, fontWeight: 700, margin: '0 0 6px 0' }}>Godišnji limit prihoda (paušal)</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 12px 0', lineHeight: 1.5 }}>
              Na ovaj iznos pratiš ostvareni promet u KPO. Uobičajeno je 6.000.000 RSD godišnje; proveri važeći propis ili rešenje ako sumnjaš.
            </p>
            <div style={{ position: 'relative' }}>
              <Input
                type="number"
                value={profil.godisnjLimit}
                onChange={set('godisnjLimit')}
                placeholder="6000000"
                hasError={ima('godisnjLimit')}
                style={{ paddingRight: 48 }}
                disabled={!editMode}
              />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>RSD</span>
            </div>
            {ima('godisnjLimit') && <Greska tekst="Unesi pozitivan iznos (npr. 6000000)" />}
          </div>

          <div className="settings-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              { label: 'POREZ NA PRIHOD', key: 'mesecniPorez', boja: '#f59e0b' },
              { label: 'PIO DOPRINOS', key: 'mesecniPio', boja: '#3b82f6' },
              { label: 'ZDRAVSTVENO OSIGURANJE', key: 'mesecniZdravstvo', boja: '#a855f7' },
              { label: 'OSIGURANJE ZA NEZAPOSLENOST', key: 'mesecniNezaposlenost', boja: 'var(--text-muted)' },
            ] as const satisfies ReadonlyArray<{
              label: string
              key: 'mesecniPorez' | 'mesecniPio' | 'mesecniZdravstvo' | 'mesecniNezaposlenost'
              boja: string
            }>).map(field => (
              <div key={field.key}>
                <p style={{ color: field.boja, fontSize: 11, margin: '0 0 6px 0', opacity: 0.8 }}>{field.label}</p>
                <div style={{ position: 'relative' }}>
                  <Input type="number" value={profil[field.key]} onChange={set(field.key)} placeholder="0" hasError={ima(field.key)} style={{ paddingRight: 48 }} disabled={!editMode} />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>RSD</span>
                </div>
                {ima(field.key) && (
                  <Greska tekst="Unesi broj (0 ako nema obaveze)" />
                )}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 18, padding: '16px 18px', borderRadius: 12,
            border: '1px solid var(--border)', background: 'var(--bg-primary)',
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', fontWeight: 700, letterSpacing: '0.06em' }}>KONTROLA ZBIRA</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>Ukupno mesečno (porez + svi doprinosi)</span>
              <span style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {formatRsd(ukupnoMesečno)} <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>RSD</span>
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '10px 0 0 0', lineHeight: 1.45 }}>
              Uporedi sa rešenjem: zbir bi trebalo da se poklopi sa ukupnim mesečnim obavezama.
            </p>
          </div>
        </div>

        {/* Bankovni podaci */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#3b82f6', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>🏦 BANKOVNI PODACI</p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>BROJ POSLOVNOG RAČUNA (DOMAĆI)</p>
          <Input value={profil.brojRacuna} onChange={set('brojRacuna')} placeholder="205-123456789012-53" hasError={ima('brojRacuna')} style={{ marginBottom: 4 }} disabled={!editMode} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0 0' }}>Format: XXX-XXXXXXXXXXXXX-XX</p>
        </div>

        {/* Devizni podaci */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#6677ff', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>🌍 DEVIZNO PLAĆANJE (OPCIONO)</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 20px 0' }}>
            Prikazuje se na PDF fakturama u EUR i USD
          </p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>IBAN</p>
          <Input value={profil.iban || ''} onChange={set('iban')} placeholder="RS35 1234 0000 0123 4567 89" style={{ marginBottom: 14 }} disabled={!editMode} />

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>SWIFT / BIC KOD</p>
          <Input value={profil.swift || ''} onChange={set('swift')} placeholder="npr. AABASRB" disabled={!editMode} />

          <div style={{ marginTop: 12, background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
              💡 IBAN i SWIFT dobijaš od svoje banke. Potrebni su stranim klijentima da bi izvršili devizno plaćanje.
            </p>
          </div>
        </div>

        {/* Notifikacije */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#a855f7', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>🔔 NOTIFIKACIJE</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 18px 0', lineHeight: 1.5 }}>
            Podsetnici za mesečne obaveze (porez i doprinosi) pre roka plaćanja — u skladu sa poreskim kalendarom u aplikaciji.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Podseti me 3 dana pre roka plaćanja</span>
              <button type="button" aria-pressed={profil.reminder3Dana} onClick={editMode ? setBool('reminder3Dana') : undefined}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: editMode ? 'pointer' : 'default',
                  background: profil.reminder3Dana ? 'var(--accent)' : 'var(--border)', position: 'relative',
                  opacity: editMode ? 1 : 0.7,
                }}>
                <span style={{ position: 'absolute', top: 2, left: profil.reminder3Dana ? 24 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Podseti me 1 dan pre roka plaćanja</span>
              <button type="button" aria-pressed={profil.reminder1Dan} onClick={editMode ? setBool('reminder1Dan') : undefined}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: editMode ? 'pointer' : 'default',
                  background: profil.reminder1Dan ? 'var(--accent)' : 'var(--border)', position: 'relative',
                  opacity: editMode ? 1 : 0.7,
                }}>
                <span style={{ position: 'absolute', top: 2, left: profil.reminder1Dan ? 24 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>

          <PushNotificationSettings />
        </div>

        {/* Test samostalnosti — u profilu */}
        <TestSamostalnosti />

        {/* Uputstvo za početnike — blok u profilu */}
        {showUputstvo && <UputstvoModal onClose={() => setShowUputstvo(false)} />}
        <button
          type="button"
          onClick={() => setShowUputstvo(true)}
          style={{
            ...kartica,
            marginBottom: 16,
            cursor: 'pointer',
            border: '1px solid rgba(255, 153, 68, 0.35)',
            background: 'linear-gradient(135deg, rgba(255, 153, 68, 0.06) 0%, rgba(0, 255, 179, 0.04) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            textAlign: 'left',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 153, 68, 0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'rgba(255, 153, 68, 0.15)',
            border: '1px solid rgba(255, 153, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BookOpen size={26} color="#ff9944" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#ff9944', fontSize: 11, fontWeight: 700, letterSpacing: '1px', margin: '0 0 4px 0' }}>
              VODIČ ZA POČETNIKE
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>
              Uputstvo za početnike
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Osnovna pravila paušala, rokovi, KPO i limiti
            </p>
          </div>
          <ChevronRight size={22} color="#ff9944" style={{ flexShrink: 0, opacity: 0.8 }} />
        </button>

        <DataManagement />

      </div>

      <BottomNav />

      {editMode && (
        <div style={{ position: 'fixed', bottom: 'var(--bottom-nav-height)', left: 0, right: 0, padding: '16px 20px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', zIndex: 999 }}>
          <button onClick={cancelEdit}
            style={{ flex: 1, minWidth: 140, maxWidth: 320, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 12, cursor: 'pointer' }}>
            Otkaži
          </button>
          <button onClick={openSaveConfirm}
            style={{ flex: 1, minWidth: 140, maxWidth: 320, background: sacuvano ? '#00b884' : 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00C89640' }}>
            {sacuvano ? '✓ Sačuvano!' : 'Sačuvaj izmene'}
          </button>
        </div>
      )}
    </div>
  )
}