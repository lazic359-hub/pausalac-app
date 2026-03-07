'use client'
import SmartInsights from "@/components/SmartInsights";
import { getEurToRsdRate } from '@/lib/exchange-rate'
import { useState, useEffect, useRef } from 'react'
import { createClient, User } from '@supabase/supabase-js'
import MonthlyObligations from '../../components/MonthlyObligations'
import PoresniKalendar from "@/components/PoresniKalendar";
import { ThemeToggle } from '@/components/ThemeToggle'

const SUPABASE_URL = "https://ymiyqhblbqkkycpdnlaq.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

type Valuta = 'RSD' | 'EUR' | 'USD'

type Faktura = {
  id: string
  user_id: string
  klijent: string
  iznos: number
  valuta: Valuta
  iznos_rsd: number
  datum: string
  napomena: string
}

const KURSEVI = { RSD: 1, EUR: 117, USD: 108 }
const LIMIT = 6000000

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
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
    else { setInfo('Lozinka uspešno promenjena! Možeš se prijaviti.'); setEkran('login') }
    setLoading(false)
  }

  const inp: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box',
    outline: 'none',
  }
  const passWrap: React.CSSProperties = { position: 'relative', marginBottom: 12 }
  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
  }

  const kartica: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 24,
  }

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
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
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
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px 0' }}>Unesite vaš email i poslaćemo vam link za reset lozinke.</p>
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
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px 0' }}>Unesite i potvrdite vašu novu lozinku.</p>
            <div style={passWrap}>
              <input type={showNova ? 'text' : 'password'} placeholder="Nova lozinka" value={novaLozinka}
                onChange={e => setNovaLozinka(e.target.value)} style={{ ...inp, marginBottom: 0, paddingRight: 44 }} />
              <button style={eyeBtn} onClick={() => setShowNova(!showNova)}><EyeIcon open={showNova} /></button>
            </div>
            <div style={{ ...passWrap, marginTop: 12 }}>
              <input type={showPotvrda ? 'text' : 'password'} placeholder="Potvrdi novu lozinku" value={potvrda}
                onChange={e => setPotvrda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNovaLozinka()}
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

// ─────────────────────────────────────────────
// PDF GENERATOR
// ─────────────────────────────────────────────
function generatePDF(fakture: Faktura[], godina: string, email: string, stats: { ukupnoRSD: number, porez: number, pio: number, zdravstvo: number, neto: number, procenat: number }) {
  const { ukupnoRSD, porez, pio, zdravstvo, neto, procenat } = stats
  const ukupnoEUR = Math.round(ukupnoRSD / KURSEVI.EUR)

  const redovi = fakture.map(f => `
    <tr>
      <td>${f.datum || '-'}</td>
      <td>${f.klijent}</td>
      <td>${f.iznos} ${f.valuta}</td>
      <td>${f.iznos_rsd.toLocaleString()} RSD</td>
      <td>${f.napomena || '-'}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1a1a2e; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #00c896; padding-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 900; color: #00c896; }
  .meta { text-align: right; color: #666; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .card { background: #f8fffe; border: 1px solid #e0f5f0; border-radius: 10px; padding: 16px; }
  .card-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .card-value { font-size: 20px; font-weight: 800; color: #00c896; }
  .card-sub { font-size: 11px; color: #aaa; margin-top: 2px; }
  .section-title { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .obaveze { background: #f8fffe; border: 1px solid #e0f5f0; border-radius: 10px; padding: 16px; margin-bottom: 28px; }
  .obaveza-red { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
  .obaveza-red:last-child { border-bottom: none; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #00c896; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 32px; text-align: center; color: #bbb; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
  .bar-wrap { background: #e8f8f4; border-radius: 20px; height: 10px; margin: 8px 0; overflow: hidden; }
  .bar-fill { height: 100%; background: #00c896; border-radius: 20px; width: ${Math.min(procenat, 100).toFixed(1)}%; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">💼 Paušalac</div>
    <div style="color:#888; margin-top:4px; font-size:12px">Izveštaj prihoda — ${godina}. godina</div>
  </div>
  <div class="meta">
    <div>${email}</div>
    <div>Generisano: ${new Date().toLocaleDateString('sr-RS')}</div>
  </div>
</div>
<div class="grid">
  <div class="card">
    <div class="card-label">Ukupni prihod</div>
    <div class="card-value">${ukupnoRSD.toLocaleString()}</div>
    <div class="card-sub">RSD · ≈ ${ukupnoEUR.toLocaleString()} EUR</div>
    <div class="bar-wrap"><div class="bar-fill"></div></div>
    <div style="font-size:10px; color:#aaa">${procenat.toFixed(1)}% od limita (6.000.000 RSD)</div>
  </div>
  <div class="card">
    <div class="card-label">Neto prihod</div>
    <div class="card-value">${neto.toLocaleString()}</div>
    <div class="card-sub">RSD (posle poreza)</div>
  </div>
  <div class="card">
    <div class="card-label">Broj faktura</div>
    <div class="card-value">${fakture.length}</div>
    <div class="card-sub">u ${godina}. godini</div>
  </div>
</div>
<div class="obaveze">
  <div class="section-title">Obaveze prema državi</div>
  <div class="obaveza-red"><span>Porez na prihod (10%)</span><span>${porez.toLocaleString()} RSD</span></div>
  <div class="obaveza-red"><span>PIO doprinos (24%)</span><span>${pio.toLocaleString()} RSD</span></div>
  <div class="obaveza-red"><span>Zdravstveno (10.3%)</span><span>${zdravstvo.toLocaleString()} RSD</span></div>
  <div class="obaveza-red"><span>Ukupne obaveze</span><span>${(porez+pio+zdravstvo).toLocaleString()} RSD</span></div>
</div>
<div class="section-title">Pregled faktura</div>
<table>
  <thead><tr><th>Datum</th><th>Klijent</th><th>Iznos</th><th>Iznos RSD</th><th>Napomena</th></tr></thead>
  <tbody>${redovi}</tbody>
</table>
<div class="footer">Paušalac · Evidencija prihoda za preduzetnike paušalce u Srbiji</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) win.onload = () => win.print()
}

// ─────────────────────────────────────────────
// GLAVNA APLIKACIJA
// ─────────────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [fakture, setFakture] = useState<Faktura[]>([])
  const [loading, setLoading] = useState(false)
  const [forma, setForma] = useState({ klijent: '', iznos: '', valuta: 'EUR' as Valuta, datum: '', napomena: '' })
  const [iznosRsdPrikaz, setIznosRsdPrikaz] = useState('')
  const [kursPrikaz, setKursPrikaz] = useState('')
  const [tab, setTab] = useState<'dashboard' | 'dodaj' | 'fakture' | 'settings'>('dashboard')
  const [godina, setGodina] = useState(new Date().getFullYear().toString())

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

  useEffect(() => { if (user) fetchFakture() }, [user, godina])

  useEffect(() => {
    const fetchKurs = async () => {
      if (!forma.datum || forma.valuta === 'RSD') { setIznosRsdPrikaz(''); setKursPrikaz(''); return }
      try {
        const kurs = await getEurToRsdRate(forma.datum)
        setKursPrikaz(`1 ${forma.valuta} = ${kurs.toFixed(2)} RSD`)
        if (forma.iznos) setIznosRsdPrikaz(Math.round(parseFloat(forma.iznos) * kurs).toLocaleString('sr-RS') + ' RSD')
        else setIznosRsdPrikaz('')
      } catch { setIznosRsdPrikaz(''); setKursPrikaz('') }
    }
    fetchKurs()
  }, [forma.datum, forma.iznos, forma.valuta])

  const fetchFakture = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('fakture').select('*')
      .gte('datum', `${godina}-01-01`).lte('datum', `${godina}-12-31`)
      .order('datum', { ascending: false })
    if (!error && data) setFakture(data as Faktura[])
    setLoading(false)
  }

  const logout = async () => { await supabase.auth.signOut(); setFakture([]) }

  const ukupnoRSD = fakture.reduce((s, f) => s + f.iznos_rsd, 0)
  const ukupnoEUR = Math.round(ukupnoRSD / KURSEVI.EUR)
  const procenat = Math.min((ukupnoRSD / LIMIT) * 100, 100)
  const porez = Math.round(ukupnoRSD * 0.1)
  const pio = Math.round(ukupnoRSD * 0.24)
  const zdravstvo = Math.round(ukupnoRSD * 0.103)
  const ukupanPorez = porez + pio + zdravstvo
  const neto = ukupnoRSD - ukupanPorez
  const bojaBar = procenat > 90 ? '#ff4d4d' : procenat > 70 ? '#ffcc00' : 'var(--accent)'
  const godinaOptions = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

  const dodajFakturu = async () => {
    if (!forma.klijent || !forma.iznos || !user) return
    let iznos_rsd = parseFloat(forma.iznos) * KURSEVI[forma.valuta]
    if (forma.valuta !== 'RSD' && forma.datum) {
      try { const kurs = await getEurToRsdRate(forma.datum); iznos_rsd = parseFloat(forma.iznos) * kurs } catch {}
    }
    const novaFaktura = { user_id: user.id, klijent: forma.klijent, iznos: parseFloat(forma.iznos), valuta: forma.valuta, iznos_rsd, datum: forma.datum || new Date().toISOString().split('T')[0], napomena: forma.napomena }
    const { data, error } = await supabase.from('fakture').insert(novaFaktura).select().single()
    if (!error && data) { setFakture([data as Faktura, ...fakture]); setForma({ klijent: '', iznos: '', valuta: 'EUR', datum: '', napomena: '' }); setTab('dashboard') }
    else alert('Greška pri dodavanju: ' + error?.message)
  }

  const obrisi = async (id: string) => {
    const { error } = await supabase.from('fakture').delete().eq('id', id)
    if (!error) setFakture(fakture.filter(f => f.id !== id))
  }

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {}
    })
  }, [])

  const kartica: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  }

  const inp: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box',
    outline: 'none',
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
          <select value={godina} onChange={e => setGodina(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', color: 'var(--accent)', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
            {godinaOptions.map(g => <option key={g} value={g}>{g}.</option>)}
          </select>
          <ThemeToggle />
          <button onClick={logout}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer' }}>
            Odjavi se
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Učitavanje...</div>}

        {/* ── DASHBOARD ── */}
        {!loading && tab === 'dashboard' && (
          <>
            <div style={kartica}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.15 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>UKUPNI PRIHOD · {godina}.</p>
                  <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', margin: '0 0 4px 0' }}>
                    {ukupnoRSD.toLocaleString()} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>RSD</span>
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px 0' }}>≈ {ukupnoEUR.toLocaleString()} EUR</p>
                </div>
                <button onClick={() => generatePDF(fakture, godina, user.email || '', { ukupnoRSD, porez, pio, zdravstvo, neto, procenat })}
                  style={{ background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  📄 Izvezi PDF
                </button>
              </div>

              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, height: 8, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${procenat}%`, background: bojaBar, borderRadius: 8, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>{procenat.toFixed(1)}% od limita</span>
                <span>6.000.000 RSD</span>
              </div>

              {procenat > 80 && (
                <div style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
                  <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>⚠️ Prešli ste {procenat.toFixed(0)}% godišnjeg limita!</p>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'NETO PRIHOD', value: neto, boja: '#a855f7', sub: 'RSD' },
                { label: 'UKUPAN POREZ', value: ukupanPorez, boja: '#f59e0b', sub: 'RSD' },
                { label: 'PIO DOPRINOS', value: pio, boja: '#3b82f6', sub: 'RSD (24%)' },
                { label: 'BROJ FAKTURA', value: fakture.length, boja: 'var(--accent)', sub: 'unetih', big: true },
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: item.boja, borderRadius: '50%', filter: 'blur(40px)', opacity: 0.2 }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0' }}>{item.label}</p>
                  <p style={{ fontSize: item.big ? 36 : 22, fontWeight: item.big ? 800 : 700, color: item.boja, margin: 0 }}>{item.value.toLocaleString()}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0 0' }}>{item.sub}</p>
                </div>
              ))}
            </div>

            <div style={kartica}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>OBAVEZE PREMA DRŽAVI</p>
              {[
                { label: 'Porez na prihod', value: porez, procenat: '10%', boja: '#f59e0b' },
                { label: 'PIO doprinos', value: pio, procenat: '24%', boja: '#3b82f6' },
                { label: 'Zdravstveno', value: zdravstvo, procenat: '10.3%', boja: '#a855f7' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.boja }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{item.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.procenat}</span>
                  </div>
                  <span style={{ color: item.boja, fontWeight: 700, fontSize: 15 }}>{item.value.toLocaleString()} RSD</span>
                </div>
              ))}
            </div>

            <PoresniKalendar ukupnoRsd={ukupnoRSD} limit={LIMIT} />
            <MonthlyObligations />
            <SmartInsights onOpenQRModal={() => {}} />
          </>
        )}

        {/* ── DODAJ ── */}
        {!loading && tab === 'dodaj' && (
          <div style={kartica}>
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

        {/* ── FAKTURE ── */}
        {!loading && tab === 'fakture' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>PRIHODI {godina}. ({fakture.length})</p>
              {fakture.length > 0 && (
                <button onClick={() => generatePDF(fakture, godina, user.email || '', { ukupnoRSD, porez, pio, zdravstvo, neto, procenat })}
                  style={{ background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  📄 Izvezi PDF
                </button>
              )}
            </div>
            {fakture.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 40 }}>📋</p>
                <p>Nema prihoda za {godina}. godinu</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fakture.map(f => (
                  <div key={f.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{f.klijent}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{f.datum || 'Bez datuma'}</p>
                      {f.napomena && <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0 0' }}>{f.napomena}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: 'var(--accent)', fontWeight: 700, margin: '0 0 2px 0' }}>{f.iznos} {f.valuta}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{f.iznos_rsd.toLocaleString()} RSD</p>
                      </div>
                      <button onClick={() => obrisi(f.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          { key: 'dodaj', icon: '＋', label: 'Dodaj' },
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