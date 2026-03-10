'use client'
import { useState, useEffect } from 'react'
import { createClient, User } from '@supabase/supabase-js'
import { ThemeToggle } from '@/components/ThemeToggle'
import MonthlyObligations from '@/components/MonthlyObligations'
import PoresniKalendar from '@/components/PoresniKalendar'
import SmartInsights from '@/components/SmartInsights'

const SUPABASE_URL = "https://ymiyqhblbqkkycpdnlaq.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

type Valuta = 'RSD' | 'EUR' | 'USD'
type Faktura = {
  id: string; user_id: string; klijent: string; iznos: number
  valuta: Valuta; iznos_rsd: number; datum: string; napomena: string
}
type Rashod = {
  id: string; user_id: string; datum: string; opis: string
  iznos: number; kategorija: string; broj_racuna: string
}
type Aktivnost = {
  id: string; datum: string; tip: 'prihod' | 'rashod'
  opis: string; kategorija: string; iznos: number
}
type PoresniPodaci = {
  tax_amount: number | null
  pio_amount: number | null
  health_amount: number | null
  unemployment_amount: number | null
}

const KURSEVI = { RSD: 1, EUR: 117, USD: 108 }
const LIMIT_6M = 6000000
const LIMIT_8M = 8000000

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [ekran, setEkran] = useState<'login' | 'zaboravio' | 'novaLozinka'>('login')
  const [resetEmail, setResetEmail] = useState('')
  const [novaLozinka, setNovaLozinka] = useState('')
  const [potvrda, setPotvrda] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [showPotvrda, setShowPotvrda] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) return
    setLoading(true); setError(''); setInfo('')
    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setInfo('Proveri email za potvrdu registracije!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Pogrešan email ili lozinka')
    }
    setLoading(false)
  }

  const handleResetEmail = async () => {
    if (!resetEmail) return
    setLoading(true); setError(''); setInfo('')
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '?reset=true',
    })
    if (error) setError(error.message)
    else setInfo('Link za reset lozinke je poslat na tvoj email!')
    setLoading(false)
  }

  const handleNovaLozinka = async () => {
    if (!novaLozinka || !potvrda) return
    if (novaLozinka !== potvrda) { setError('Lozinke se ne poklapaju!'); return }
    if (novaLozinka.length < 6) { setError('Lozinka mora imati najmanje 6 karaktera'); return }
    setLoading(true); setError(''); setInfo('')
    const { error } = await supabase.auth.updateUser({ password: novaLozinka })
    if (error) setError(error.message)
    else { setInfo('Lozinka uspešno promenjena!'); setEkran('login') }
    setLoading(false)
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)',
    fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none',
  }
  const passWrap: React.CSSProperties = { position: 'relative', marginBottom: 12 }
  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
  }
  const kartica: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 40 }}>💼</span>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', margin: '8px 0 4px 0' }}>Paušalac</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Evidencija prihoda za paušalce</p>
        </div>
        {ekran === 'login' && (
          <div style={kartica}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>{isRegister ? 'REGISTRACIJA' : 'PRIJAVA'}</p>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
            <div style={passWrap}>
              <input type={showPass ? 'text' : 'password'} placeholder="Lozinka" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ ...inp, marginBottom: 0, paddingRight: 44 }} />
              <button style={eyeBtn} onClick={() => setShowPass(!showPass)}><EyeIcon open={showPass} /></button>
            </div>
            {!isRegister && (
              <div style={{ textAlign: 'right', marginBottom: 12 }}>
                <button onClick={() => { setEkran('zaboravio'); setError(''); setInfo('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Zaboravio sam lozinku
                </button>
              </div>
            )}
            {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '0 0 12px 0' }}>⚠️ {error}</p>}
            {info && <p style={{ color: 'var(--accent)', fontSize: 13, margin: '0 0 12px 0' }}>✉️ {info}</p>}
            <button onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Učitavanje...' : isRegister ? 'Registruj se' : 'Prijavi se'}
            </button>
            <button onClick={() => { setIsRegister(!isRegister); setError(''); setInfo('') }}
              style={{ width: '100%', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}>
              {isRegister ? 'Već imaš nalog? Prijavi se' : 'Nemaš nalog? Registruj se'}
            </button>
          </div>
        )}
        {ekran === 'zaboravio' && (
          <div style={kartica}>
            <button onClick={() => { setEkran('login'); setError(''); setInfo('') }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              ← Nazad na prijavu
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0' }}>RESET LOZINKE</p>
            <input type="email" placeholder="Vaš email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResetEmail()} style={inp} />
            {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '0 0 12px 0' }}>⚠️ {error}</p>}
            {info && <p style={{ color: 'var(--accent)', fontSize: 13, margin: '0 0 12px 0' }}>✉️ {info}</p>}
            <button onClick={handleResetEmail} disabled={loading}
              style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Slanje...' : 'Pošalji link za reset'}
            </button>
          </div>
        )}
        {ekran === 'novaLozinka' && (
          <div style={kartica}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0' }}>NOVA LOZINKA</p>
            <div style={passWrap}>
              <input type={showNova ? 'text' : 'password'} placeholder="Nova lozinka" value={novaLozinka}
                onChange={e => setNovaLozinka(e.target.value)} style={{ ...inp, marginBottom: 0, paddingRight: 44 }} />
              <button style={eyeBtn} onClick={() => setShowNova(!showNova)}><EyeIcon open={showNova} /></button>
            </div>
            <div style={{ ...passWrap, marginTop: 12 }}>
              <input type={showPotvrda ? 'text' : 'password'} placeholder="Potvrdi novu lozinku" value={potvrda}
                onChange={e => setPotvrda(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNovaLozinka()}
                style={{ ...inp, marginBottom: 0, paddingRight: 44 }} />
              <button style={eyeBtn} onClick={() => setShowPotvrda(!showPotvrda)}><EyeIcon open={showPotvrda} /></button>
            </div>
            {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '12px 0' }}>⚠️ {error}</p>}
            {info && <p style={{ color: 'var(--accent)', fontSize: 13, margin: '12px 0' }}>✉️ {info}</p>}
            <button onClick={handleNovaLozinka} disabled={loading}
              style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginTop: 16, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Čuvanje...' : 'Sačuvaj novu lozinku'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'dashboard' | 'fakture' | 'settings' | 'izbor'>('dashboard')

  const [fakture, setFakture] = useState<Faktura[]>([])
  const [fakture365, setFakture365] = useState<Faktura[]>([])
  const [rashodi, setRashodi] = useState<Rashod[]>([])
  const [aktivnosti, setAktivnosti] = useState<Aktivnost[]>([])
  const [poresniPodaci, setPoresniPodaci] = useState<PoresniPodaci | null>(null)

  const [prihodiTab, setPrihodiTab] = useState<'lista' | 'dodaj'>('lista')
  const [filterKvartal, setFilterKvartal] = useState<'sve' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('sve')
  const [filterGodina, setFilterGodina] = useState(new Date().getFullYear())
  const [brisanjeFaktura, setBrisanjeFaktura] = useState<string | null>(null)
  const [forma, setForma] = useState({ klijent: '', iznos: '', valuta: 'EUR' as Valuta, datum: '', napomena: '' })
  const [iznosRsdPrikaz, setIznosRsdPrikaz] = useState('')
  const [kursPrikaz, setKursPrikaz] = useState('')

  const godina = new Date().getFullYear().toString()

  const KVARTALI = {
    Q1: ['01','02','03'], Q2: ['04','05','06'],
    Q3: ['07','08','09'], Q4: ['10','11','12'],
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetchSveData()
      fetchPoresniPodaci()
    }
  }, [user])

  useEffect(() => {
    const fetchKurs = async () => {
      if (!forma.datum || forma.valuta === 'RSD') { setIznosRsdPrikaz(''); setKursPrikaz(''); return }
      try {
        const res = await fetch(`/api/kurs?datum=${forma.datum}`)
        const data = await res.json()
        const kurs = data.rate || KURSEVI[forma.valuta]
        setKursPrikaz(`1 ${forma.valuta} = ${kurs.toFixed(2)} RSD`)
        if (forma.iznos) setIznosRsdPrikaz(Math.round(parseFloat(forma.iznos) * kurs).toLocaleString('sr-RS') + ' RSD')
        else setIznosRsdPrikaz('')
      } catch { setIznosRsdPrikaz(''); setKursPrikaz('') }
    }
    fetchKurs()
  }, [forma.datum, forma.iznos, forma.valuta])

  const fetchPoresniPodaci = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('tax_amount, pio_amount, health_amount, unemployment_amount')
      .eq('user_id', user!.id)
      .single()
    if (data) setPoresniPodaci(data)
  }

  const fetchSveData = async () => {
    setLoading(true)
    const godinaInt = new Date().getFullYear()
    const pre365 = new Date(); pre365.setDate(pre365.getDate() - 365)
    const pre365Str = pre365.toISOString().split('T')[0]

    const [{ data: f }, { data: f365 }, { data: r }, { data: fAkt }, { data: rAkt }] = await Promise.all([
      supabase.from('fakture').select('*').gte('datum', `${godinaInt}-01-01`).lte('datum', `${godinaInt}-12-31`).order('datum', { ascending: false }),
      supabase.from('fakture').select('*').gte('datum', pre365Str).order('datum', { ascending: false }),
      supabase.from('rashodi').select('*').gte('datum', `${godinaInt}-01-01`).lte('datum', `${godinaInt}-12-31`).order('datum', { ascending: false }),
      supabase.from('fakture').select('*').order('datum', { ascending: false }).limit(5),
      supabase.from('rashodi').select('*').order('datum', { ascending: false }).limit(5),
    ])

    if (f) setFakture(f as Faktura[])
    if (f365) setFakture365(f365 as Faktura[])
    if (r) setRashodi(r as Rashod[])

    const prihodiAkt: Aktivnost[] = (fAkt || []).map((fak: Faktura) => ({
      id: fak.id, datum: fak.datum, tip: 'prihod',
      opis: fak.klijent, kategorija: '-', iznos: fak.iznos_rsd,
    }))
    const rashodiAkt: Aktivnost[] = (rAkt || []).map((ras: Rashod) => ({
      id: ras.id, datum: ras.datum, tip: 'rashod',
      opis: ras.opis, kategorija: ras.kategorija, iznos: ras.iznos,
    }))
    const sve = [...prihodiAkt, ...rashodiAkt]
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
      .slice(0, 5)
    setAktivnosti(sve)
    setLoading(false)
  }

  const logout = async () => { await supabase.auth.signOut(); setFakture([]); setRashodi([]) }

  // ── Kalkulacije ──
  const ukupnoRSD = fakture.reduce((s, f) => s + f.iznos_rsd, 0)
  const ukupnoRSD365 = fakture365.reduce((s, f) => s + f.iznos_rsd, 0)
  // FIX 5: Svi rashodi se pravilno sabiraju
  const ukupnoRashodi = rashodi.reduce((s, r) => s + r.iznos, 0)
  // FIX 3+5: "Neto" (ne "Netto"), Neto = prihodi - rashodi
  const neto = ukupnoRSD - ukupnoRashodi
  const procenat6M = Math.min((ukupnoRSD / LIMIT_6M) * 100, 100)
  const procenat8M = Math.min((ukupnoRSD365 / LIMIT_8M) * 100, 100)
  const boja6M = procenat6M > 90 ? '#ff4d4d' : procenat6M > 70 ? '#ffcc00' : '#00ffb3'
  const boja8M = procenat8M > 90 ? '#ff4d4d' : procenat8M > 70 ? '#ffcc00' : '#00ffb3'
  const danDanas = new Date().getDate()

  const imaPorescePodatke = poresniPodaci &&
    (poresniPodaci.tax_amount || poresniPodaci.pio_amount || poresniPodaci.health_amount || poresniPodaci.unemployment_amount)
  const t = poresniPodaci?.tax_amount || 0
  const p = poresniPodaci?.pio_amount || 0
  const h = poresniPodaci?.health_amount || 0
  const u = poresniPodaci?.unemployment_amount || 0
  const ukupnoMesecno = t + p + h + u

  const fakturePoGodini = fakture.filter(f => new Date(f.datum).getFullYear() === filterGodina)
  const filtriraneFakture = fakturePoGodini.filter(f => {
    if (filterKvartal === 'sve') return true
    return KVARTALI[filterKvartal].includes(f.datum.split('-')[1])
  })
  const ukupnoFilter = filtriraneFakture.reduce((s, f) => s + f.iznos_rsd, 0)

  const formatIznos = (n: number) =>
    new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  // FIX 1: Ispravan format datuma DD.MM.
  const formatDatumKratak = (d: string) => {
    const parts = d.split('-')
    return `${parts[2]}.${parts[1]}.`
  }

  const dodajFakturu = async () => {
    if (!forma.klijent || !forma.iznos || !user) return
    let iznos_rsd = parseFloat(forma.iznos) * KURSEVI[forma.valuta]
    if (forma.valuta !== 'RSD' && forma.datum) {
      try {
        const res = await fetch(`/api/kurs?datum=${forma.datum}`)
        const data = await res.json()
        iznos_rsd = parseFloat(forma.iznos) * (data.rate || KURSEVI[forma.valuta])
      } catch {}
    }
    const novaFaktura = {
      user_id: user.id, klijent: forma.klijent, iznos: parseFloat(forma.iznos),
      valuta: forma.valuta, iznos_rsd,
      datum: forma.datum || new Date().toISOString().split('T')[0],
      napomena: forma.napomena,
    }
    const { data, error } = await supabase.from('fakture').insert(novaFaktura).select().single()
    if (!error && data) {
      setFakture([data as Faktura, ...fakture])
      setForma({ klijent: '', iznos: '', valuta: 'EUR', datum: '', napomena: '' })
      setPrihodiTab('lista')
      fetchSveData()
    } else alert('Greška: ' + error?.message)
  }

  const obrisiFakturu = async (id: string) => {
    const { error } = await supabase.from('fakture').delete().eq('id', id)
    if (!error) { setFakture(fakture.filter(f => f.id !== id)); setBrisanjeFaktura(null); fetchSveData() }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)',
    fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none',
  }

  if (authLoading) return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 32 }}>💼</span>
    </div>
  )
  if (!user) return <LoginPage />

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>💼</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>Paušalac</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <button onClick={logout}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer' }}>
            Odjavi se
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px 16px' }}>

        {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Učitavanje...</div>}

        {/* ── DASHBOARD ── */}
        {!loading && tab === 'dashboard' && (
          <>
            {/* Glavni blok */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.15 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>UKUPNI PRIHOD · {godina}.</p>
                  <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', margin: '0 0 4px 0' }}>
                    {formatIznos(ukupnoRSD)} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>RSD</span>
                  </p>
                  {/* FIX 3: "Neto" umesto "Netto" */}
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                    Neto: <span style={{ color: neto >= 0 ? 'var(--accent)' : '#ff6b6b', fontWeight: 700 }}>{formatIznos(neto)} RSD</span>
                  </p>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>LIMIT KALENDARSKE GODINE (6.000.000 RSD)</p>
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, height: 8, marginBottom: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${procenat6M}%`, background: boja6M, borderRadius: 8, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                <span style={{ color: boja6M }}>{formatIznos(ukupnoRSD)} RSD ({procenat6M.toFixed(1)}%)</span>
                <span>6.000.000 RSD</span>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>LIMIT 365 DANA (8.000.000 RSD)</p>
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, height: 8, marginBottom: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${procenat8M}%`, background: boja8M, borderRadius: 8, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ color: boja8M }}>{formatIznos(ukupnoRSD365)} RSD ({procenat8M.toFixed(1)}%)</span>
                <span>8.000.000 RSD</span>
              </div>
            </div>

            {/* FIX 4: Kartice — Ukupni rashodi + Neto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: '0 0 6px 0' }}>UKUPNI RASHODI · {godina}.</p>
                <p style={{ color: '#ff6b6b', fontWeight: 800, fontSize: 20, margin: 0 }}>
                  -{formatIznos(ukupnoRashodi)} <span style={{ fontSize: 12, fontWeight: 400 }}>RSD</span>
                </p>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: '0 0 6px 0' }}>NETO · {godina}.</p>
                <p style={{ color: neto >= 0 ? 'var(--accent)' : '#ff6b6b', fontWeight: 800, fontSize: 20, margin: 0 }}>
                  {formatIznos(neto)} <span style={{ fontSize: 12, fontWeight: 400 }}>RSD</span>
                </p>
              </div>
            </div>

            {/* Upozorenja */}
            {(procenat6M > 80 || procenat8M > 80 || danDanas === 14) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {procenat6M >= 100 && (
                  <div style={{ background: 'rgba(255,77,77,0.15)', border: '1px solid rgba(255,77,77,0.4)', borderRadius: 12, padding: '12px 16px' }}>
                    <p style={{ color: '#ff4d4d', fontSize: 13, fontWeight: 700, margin: 0 }}>🚨 PREKORAČIO SI LIMIT 6M! Hitno se javi knjigovođi!</p>
                  </div>
                )}
                {procenat8M >= 100 && (
                  <div style={{ background: 'rgba(255,77,77,0.15)', border: '1px solid rgba(255,77,77,0.4)', borderRadius: 12, padding: '12px 16px' }}>
                    <p style={{ color: '#ff4d4d', fontSize: 13, fontWeight: 700, margin: 0 }}>🚨 PREKORAČIO SI LIMIT 8M! Hitno se javi knjigovođi!</p>
                  </div>
                )}
                {procenat6M > 80 && procenat6M < 100 && (
                  <div style={{ background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.3)', borderRadius: 12, padding: '12px 16px' }}>
                    <p style={{ color: '#ffcc00', fontSize: 13, margin: 0 }}>⚠️ Bližiš se limitu od 6M — {procenat6M.toFixed(0)}% iskorišćeno</p>
                  </div>
                )}
                {procenat8M > 80 && procenat8M < 100 && (
                  <div style={{ background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.3)', borderRadius: 12, padding: '12px 16px' }}>
                    <p style={{ color: '#ffcc00', fontSize: 13, margin: 0 }}>⚠️ Bližiš se limitu od 8M — {procenat8M.toFixed(0)}% iskorišćeno</p>
                  </div>
                )}
                {danDanas === 14 && (
                  <div style={{ background: 'rgba(0,255,179,0.1)', border: '1px solid rgba(0,255,179,0.3)', borderRadius: 12, padding: '12px 16px' }}>
                    <p style={{ color: 'var(--accent)', fontSize: 13, margin: 0 }}>🧾 Sutra je 15. — ne zaboravi da platiš porez!</p>
                  </div>
                )}
              </div>
            )}

            {/* Brze akcije */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <button onClick={() => { setTab('fakture'); setPrihodiTab('dodaj') }}
                style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 13, padding: '14px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 20 }}>💰</span>+ Prihod
              </button>
              <button onClick={() => window.location.href = '/rashodi'}
                style={{ background: '#ff6b6b', color: '#fff', fontWeight: 700, fontSize: 13, padding: '14px 8px', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 20 }}>💸</span>+ Rashod
              </button>
              <button onClick={() => window.location.href = '/kpo'}
                style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 13, padding: '14px 8px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 20 }}>📒</span>KPO
              </button>
            </div>

            {/* FIX 2: OBAVEZE IZ PORESKOG REŠENJA */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>OBAVEZE IZ PORESKOG REŠENJA</p>
              {!imaPorescePodatke ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 12px 0' }}>
                    📋 Unesi svoje obaveze iz poreskog rešenja u Podešavanjima profila
                  </p>
                  <a href="/settings" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>
                    Otvori podešavanja →
                  </a>
                </div>
              ) : (
                <>
                  {[
                    { label: 'Porez na prihod', value: t, boja: '#f59e0b' },
                    { label: 'PIO doprinos', value: p, boja: '#3b82f6' },
                    { label: 'Zdravstveno osiguranje', value: h, boja: '#a855f7' },
                    { label: 'Osiguranje za nezaposlene', value: u, boja: '#ec4899' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.boja }} />
                        <span style={{ fontSize: 14 }}>{item.label}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>mesečno</span>
                      </div>
                      <span style={{ color: item.boja, fontWeight: 700 }}>{item.value.toLocaleString()} RSD</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px 0' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>UKUPNO MESEČNO</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16 }}>{ukupnoMesecno.toLocaleString()} RSD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 0 0' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>UKUPNO GODIŠNJE</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 14 }}>{(ukupnoMesecno * 12).toLocaleString()} RSD</span>
                  </div>
                </>
              )}
            </div>

            {/* FIX 1 + 6: Poslednje aktivnosti — ispravne kolone i stilizovana tabela */}
            {aktivnosti.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>POSLEDNJE AKTIVNOSTI</p>
                </div>
                {/* Header tabele */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 80px 1fr 110px',
                  gap: 8,
                  padding: '8px 16px',
                  background: 'var(--bg-primary)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>DATUM</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>TIP</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }}>OPIS</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textAlign: 'right' }}>IZNOS</span>
                </div>
                {aktivnosti.map((a, idx) => (
                  <div key={a.tip + a.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '52px 80px 1fr 110px',
                    gap: 8,
                    padding: '11px 16px',
                    borderBottom: idx < aktivnosti.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center',
                  }}>
                    {/* Datum: DD.MM. */}
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                      {formatDatumKratak(a.datum)}
                    </span>
                    {/* Tip: zelena/crvena */}
                    <span style={{
                      background: a.tip === 'prihod' ? 'rgba(0,255,179,0.15)' : 'rgba(255,107,107,0.15)',
                      color: a.tip === 'prihod' ? 'var(--accent)' : '#ff6b6b',
                      fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 20,
                      textAlign: 'center', display: 'inline-block',
                      width: 'fit-content',
                    }}>
                      {a.tip === 'prihod' ? 'PRIHOD' : 'RASHOD'}
                    </span>
                    {/* Opis: skraćen na 20 karaktera */}
                    <span style={{
                      color: 'var(--text-primary)', fontSize: 13,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {a.opis.length > 20 ? a.opis.slice(0, 20) + '…' : a.opis}
                    </span>
                    {/* Iznos sa + ili - */}
                    <span style={{
                      color: a.tip === 'prihod' ? 'var(--accent)' : '#ff6b6b',
                      fontWeight: 700, fontSize: 13,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {a.tip === 'prihod' ? '+' : '-'}{Math.round(a.iznos).toLocaleString('sr-RS')}
                    </span>
                  </div>
                ))}
                <div style={{ padding: '12px 20px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                  <button onClick={() => window.location.href = '/kpo'}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Pogledaj sve →
                  </button>
                </div>
              </div>
            )}

            <PoresniKalendar ukupnoRsd={ukupnoRSD} limit={LIMIT_6M} />
            <MonthlyObligations />
            <SmartInsights onOpenQRModal={() => {}} />
          </>
        )}

        {/* ── IZBOR ── */}
        {!loading && tab === 'izbor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0', textAlign: 'center' }}>ŠTA ŽELIŠ DA DODAŠ?</p>
            <button onClick={() => { setTab('fakture'); setPrihodiTab('dodaj') }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}>
              <span style={{ fontSize: 36 }}>💰</span>
              <div>
                <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16, margin: '0 0 4px 0' }}>Prihod</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Faktura od klijenta, uplata...</p>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 20 }}>›</span>
            </button>
            <button onClick={() => window.location.href = '/rashodi'}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left' }}>
              <span style={{ fontSize: 36 }}>💸</span>
              <div>
                <p style={{ color: '#ff6b6b', fontWeight: 700, fontSize: 16, margin: '0 0 4px 0' }}>Rashod</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Oprema, softver, zakup...</p>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 20 }}>›</span>
            </button>
          </div>
        )}

        {/* ── PRIHODI ── */}
        {!loading && tab === 'fakture' && (
          <>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>UKUPNI PRIHODI {filterGodina}.</p>
                <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 28, margin: 0 }}>
                  {formatIznos(fakturePoGodini.reduce((s,f) => s + f.iznos_rsd, 0))} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>RSD</span>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>BROJ FAKTURA</p>
                <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 28, margin: 0 }}>{fakturePoGodini.length}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['lista', 'dodaj'] as const).map(tt => (
                <button key={tt} onClick={() => setPrihodiTab(tt)} style={{
                  flex: 1, background: prihodiTab === tt ? 'var(--accent)' : 'var(--bg-card)',
                  color: prihodiTab === tt ? '#000' : 'var(--text-muted)',
                  fontWeight: prihodiTab === tt ? 700 : 400, fontSize: 14,
                  padding: '10px 0', borderRadius: 10,
                  border: `1px solid ${prihodiTab === tt ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}>
                  {tt === 'lista' ? '📋 Lista prihoda' : '➕ Dodaj prihod'}
                </button>
              ))}
            </div>

            {prihodiTab === 'dodaj' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>NOVI PRIHOD</p>
                <input type="text" placeholder="Ime klijenta" value={forma.klijent}
                  onChange={e => setForma({ ...forma, klijent: e.target.value })} style={inp} />
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <input type="number" placeholder="Iznos" value={forma.iznos}
                    onChange={e => setForma({ ...forma, iznos: e.target.value })}
                    style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
                  <select value={forma.valuta} onChange={e => setForma({ ...forma, valuta: e.target.value as Valuta })}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                    <option>EUR</option><option>USD</option><option>RSD</option>
                  </select>
                </div>
                <input type="date" value={forma.datum} onChange={e => setForma({ ...forma, datum: e.target.value })}
                  style={{ ...inp, marginBottom: 4 }} />
                {kursPrikaz && <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 4px' }}>📈 NBS kurs: {kursPrikaz}</p>}
                {iznosRsdPrikaz && forma.valuta !== 'RSD' && (
                  <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 2px 0' }}>IZNOS U RSD</p>
                    <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18, margin: 0 }}>≈ {iznosRsdPrikaz}</p>
                  </div>
                )}
                <input type="text" placeholder="Napomena (opciono)" value={forma.napomena}
                  onChange={e => setForma({ ...forma, napomena: e.target.value })} style={{ ...inp, marginBottom: 20 }} />
                <button onClick={dodajFakturu}
                  style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                  + Dodaj prihod
                </button>
              </div>
            )}

            {prihodiTab === 'lista' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Godina:</span>
                  {[2022,2023,2024,2025,2026].map(g => (
                    <button key={g} onClick={() => setFilterGodina(g)} style={{
                      background: filterGodina === g ? 'var(--accent)' : 'var(--bg-card)',
                      color: filterGodina === g ? '#000' : 'var(--text-muted)',
                      fontWeight: filterGodina === g ? 700 : 400, fontSize: 13,
                      padding: '6px 12px', borderRadius: 10,
                      border: `1px solid ${filterGodina === g ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>{g}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {(['sve','Q1','Q2','Q3','Q4'] as const).map(k => (
                    <button key={k} onClick={() => setFilterKvartal(k)} style={{
                      flex: 1, background: filterKvartal === k ? 'var(--accent)' : 'var(--bg-card)',
                      color: filterKvartal === k ? '#000' : 'var(--text-muted)',
                      fontWeight: filterKvartal === k ? 700 : 400, fontSize: 13,
                      padding: '8px 0', borderRadius: 10,
                      border: `1px solid ${filterKvartal === k ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}>{k === 'sve' ? 'Sve' : k}</button>
                  ))}
                </div>
                {filtriraneFakture.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: 40 }}>📋</p>
                    <p>Nema prihoda za ovaj period</p>
                    <button onClick={() => setPrihodiTab('dodaj')} style={{ marginTop: 12, background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                      + Dodaj prvi prihod
                    </button>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 40px', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>DATUM</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>KLIJENT</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, textAlign: 'right' }}>IZNOS</p>
                      <div />
                    </div>
                    {filtriraneFakture.map(f => (
                      <div key={f.id}>
                        {brisanjeFaktura === f.id ? (
                          <div style={{ padding: '14px 16px', background: '#1a0a0a', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>Obrisati ovaj prihod?</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setBrisanjeFaktura(null)} style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-muted)', fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>Otkaži</button>
                              <button onClick={() => obrisiFakturu(f.id)} style={{ background: '#ff4d4d', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>Da, obriši</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 40px', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{f.datum}</p>
                            <div>
                              <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.klijent}</p>
                              {f.napomena && <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>{f.napomena}</p>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13, margin: '0 0 2px 0' }}>{f.iznos} {f.valuta}</p>
                              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>{formatIznos(f.iznos_rsd)} RSD</p>
                            </div>
                            <button onClick={() => setBrisanjeFaktura(f.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', textAlign: 'center' }}>×</button>
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 130px 40px', gap: 8, padding: '14px 16px', background: 'var(--bg-primary)', alignItems: 'center' }}>
                      <div /><div />
                      <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 14, margin: 0, textAlign: 'right' }}>{formatIznos(ukupnoFilter)} RSD</p>
                      <div />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Podešavanja profila</p>
            <a href="/settings" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 12, textDecoration: 'none' }}>
              Otvori podešavanja →
            </a>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px 0' }}>
        {[
          { key: 'dashboard', icon: '📊', label: 'Pregled' },
          { key: 'fakture', icon: '📋', label: 'Prihodi' },
          { key: 'izbor', icon: '＋', label: 'Dodaj' },
          { key: 'faktura', icon: '🧾', label: 'Faktura', href: '/faktura' },
          { key: 'kpo', icon: '📒', label: 'KPO', href: '/kpo' },
          { key: 'settings', icon: '⚙️', label: 'Profil', href: '/settings' },
        ].map(item => (
          <button key={item.key}
            onClick={() => (item as any).href ? window.location.href = (item as any).href : setTab(item.key as any)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: tab === item.key ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontWeight: tab === item.key ? 700 : 400 }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ height: 80 }} />
    </div>
  )
}