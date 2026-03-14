'use client'
import SmartInsights from "@/components/SmartInsights";
import MonthlyObligations, { type MonthlyObligationsHandle } from '@/components/MonthlyObligations'
import { getEurToRsdRate } from '@/lib/exchange-rate'
import { useState, useEffect, useRef } from 'react'
import { createClient, User } from '@supabase/supabase-js'
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

/** Red iz tabele fakture (računi) — za modal "Iz fakture" */
type FakturaInvoice = {
  id: string
  user_id: string
  klijent: string | null
  iznos: number | null
  valuta: string | null
  iznos_rsd: number | null
  datum: string
  napomena: string | null
  broj_fakture: string | null
  status?: string | null
}

const KURSEVI = { RSD: 1, EUR: 117, USD: 108 }
const LIMIT = 6000000
const LIMIT_365 = 8000000

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

  const inp: React.CSSProperties = { width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }
  const passWrap: React.CSSProperties = { position: 'relative', marginBottom: 12 }
  const eyeBtn: React.CSSProperties = { position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 40 }}>💼</span>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', margin: '8px 0 4px 0' }}>Paušalac</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Evidencija prihoda za paušalce</p>
        </div>

        {ekran === 'login' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>{isRegister ? 'REGISTRACIJA' : 'PRIJAVA'}</p>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
            <div style={passWrap}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Lozinka"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ ...inp, marginBottom: 0, paddingRight: 44 }}
              />
              <button style={eyeBtn} onClick={() => setShowPass(!showPass)}>
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {!isRegister && (
              <div style={{ textAlign: 'right', marginBottom: 12 }}>
                <button onClick={() => { setEkran('zaboravio'); setError(''); setInfo('') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Zaboravio sam lozinku
                </button>
              </div>
            )}
            {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '0 0 12px 0' }}>⚠️ {error}</p>}
            {info && <p style={{ color: 'var(--accent)', fontSize: 13, margin: '0 0 12px 0' }}>✉️ {info}</p>}
            <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Učitavanje...' : isRegister ? 'Registruj se' : 'Prijavi se'}
            </button>
            <button onClick={() => { setIsRegister(!isRegister); setError(''); setInfo('') }} style={{ width: '100%', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}>
              {isRegister ? 'Već imaš nalog? Prijavi se' : 'Nemaš nalog? Registruj se'}
            </button>
          </div>
        )}

        {ekran === 'zaboravio' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <button onClick={() => { setEkran('login'); setError(''); setInfo('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              ← Nazad na prijavu
            </button>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0' }}>RESET LOZINKE</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px 0' }}>Unesite vaš email i poslaćemo vam link za reset lozinke.</p>
            <input type="email" placeholder="Vaš email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleResetEmail()} style={inp} />
            {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '0 0 12px 0' }}>⚠️ {error}</p>}
            {info && <p style={{ color: 'var(--accent)', fontSize: 13, margin: '0 0 12px 0' }}>✉️ {info}</p>}
            <button onClick={handleResetEmail} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Slanje...' : 'Pošalji link za reset'}
            </button>
          </div>
        )}

        {ekran === 'novaLozinka' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0' }}>NOVA LOZINKA</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 20px 0' }}>Unesite i potvrdite vašu novu lozinku.</p>
            <div style={passWrap}>
              <input type={showNova ? 'text' : 'password'} placeholder="Nova lozinka" value={novaLozinka} onChange={e => setNovaLozinka(e.target.value)} style={{ ...inp, marginBottom: 0, paddingRight: 44 }} />
              <button style={eyeBtn} onClick={() => setShowNova(!showNova)}>
                {showNova ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            <div style={{ ...passWrap, marginTop: 12 }}>
              <input type={showPotvrda ? 'text' : 'password'} placeholder="Potvrdi novu lozinku" value={potvrda} onChange={e => setPotvrda(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNovaLozinka()} style={{ ...inp, marginBottom: 0, paddingRight: 44 }} />
              <button style={eyeBtn} onClick={() => setShowPotvrda(!showPotvrda)}>
                {showPotvrda ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '12px 0 12px 0' }}>⚠️ {error}</p>}
            {info && <p style={{ color: 'var(--accent)', fontSize: 13, margin: '12px 0 12px 0' }}>✉️ {info}</p>}
            <button onClick={handleNovaLozinka} disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginTop: 16, opacity: loading ? 0.7 : 1 }}>
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
  <thead>
    <tr><th>Datum</th><th>Klijent</th><th>Iznos</th><th>Iznos RSD</th><th>Napomena</th></tr>
  </thead>
  <tbody>${redovi}</tbody>
</table>
<div class="footer">Paušalac · Evidencija prihoda za preduzetnike paušalce u Srbiji</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => { win.print() }
  }
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
  const [prihodiTekucaGodina, setPrihodiTekucaGodina] = useState<Faktura[]>([])
  const [klijentSuggestions, setKlijentSuggestions] = useState<string[]>([])
  const [showKlijentDropdown, setShowKlijentDropdown] = useState(false)
  const klijentDropdownRef = useRef<HTMLDivElement>(null)
  const monthlyObRef = useRef<MonthlyObligationsHandle>(null)
  const [poresniPodaci, setPoresniPodaci] = useState<{
    tax_amount: number | null
    pio_amount: number | null
    health_amount: number | null
    unemployment_amount: number | null
  } | null>(null)
  const [modalIzFaktureOpen, setModalIzFaktureOpen] = useState(false)
  const [neplaceneFakture, setNeplaceneFakture] = useState<FakturaInvoice[]>([])
  const [izFaktureSelectedId, setIzFaktureSelectedId] = useState<string | null>(null)
  const [izFaktureDatumPlacanja, setIzFaktureDatumPlacanja] = useState(() => new Date().toISOString().split('T')[0])
  const [izFaktureLoading, setIzFaktureLoading] = useState(false)

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
      fetchFakture()
      fetchPoresniPodaci()
    }
  }, [user, godina])

  // Učitaj jedinstvena imena klijenata iz prihoda za autocomplete
  useEffect(() => {
    if (!user) return
    const fetchKlijenti = async () => {
      const { data } = await supabase
        .from('prihodi')
        .select('klijent')
        .eq('user_id', user.id)
      const unique = [...new Set((data || []).map((r: { klijent: string }) => r.klijent).filter(Boolean))] as string[]
      setKlijentSuggestions(unique.sort((a, b) => a.localeCompare(b)))
    }
    fetchKlijenti()
  }, [user])

  useEffect(() => {
    if (!modalIzFaktureOpen || !user) return
    const load = async () => {
      const { data } = await supabase
        .from('fakture')
        .select('*')
        .eq('user_id', user.id)
        .order('datum', { ascending: false })
      const sve = (data as FakturaInvoice[]) ?? []
      const neplacene = sve.filter(f => {
        const s = f.status == null ? '' : String(f.status).toLowerCase().trim()
        return s !== 'placena' && s !== 'plaćena' && s !== 'paid'
      })
      setNeplaceneFakture(neplacene)
      setIzFaktureSelectedId(null)
      setIzFaktureDatumPlacanja(new Date().toISOString().split('T')[0])
    }
    load()
  }, [modalIzFaktureOpen, user])

  useEffect(() => {
    const fetchKurs = async () => {
      if (!forma.datum || forma.valuta === 'RSD') {
        setIznosRsdPrikaz('')
        setKursPrikaz('')
        return
      }
      try {
        const kurs = await getEurToRsdRate(forma.datum)
        setKursPrikaz(`1 ${forma.valuta} = ${kurs.toFixed(2)} RSD`)
        if (forma.iznos) {
          const rsd = parseFloat(forma.iznos) * kurs
          setIznosRsdPrikaz(Math.round(rsd).toLocaleString('sr-RS') + ' RSD')
        } else {
          setIznosRsdPrikaz('')
        }
      } catch {
        setIznosRsdPrikaz('')
        setKursPrikaz('')
      }
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

  const fetchFakture = async () => {
    if (!user) return
    setLoading(true)
    const tecucaGodina = new Date().getFullYear().toString()
    const [resGodina, resTekuca] = await Promise.all([
      supabase
        .from('prihodi')
        .select('*')
        .eq('user_id', user.id)
        .gte('datum', `${godina}-01-01`)
        .lte('datum', `${godina}-12-31`)
        .order('datum', { ascending: false }),
      supabase
        .from('prihodi')
        .select('*')
        .eq('user_id', user.id)
        .gte('datum', `${tecucaGodina}-01-01`)
        .lte('datum', `${tecucaGodina}-12-31`)
        .order('datum', { ascending: false }),
    ])
    if (!resGodina.error && resGodina.data) setFakture(resGodina.data as Faktura[])
    if (!resTekuca.error && resTekuca.data) setPrihodiTekucaGodina(resTekuca.data as Faktura[])
    setLoading(false)
  }

  const logout = async () => { await supabase.auth.signOut(); setFakture([]) }

  const ukupnoRSD = fakture.reduce((s, f) => s + (f.iznos_rsd ?? 0), 0)
  const ukupnoEUR = Math.round(ukupnoRSD / KURSEVI.EUR)
  const procenat = Math.min((ukupnoRSD / LIMIT) * 100, 100)
  const porez = Math.round(ukupnoRSD * 0.1)
  const pio = Math.round(ukupnoRSD * 0.24)
  const zdravstvo = Math.round(ukupnoRSD * 0.103)
  const ukupanPorez = porez + pio + zdravstvo
  const t = poresniPodaci?.tax_amount ?? 0
  const p = poresniPodaci?.pio_amount ?? 0
  const h = poresniPodaci?.health_amount ?? 0
  const u = poresniPodaci?.unemployment_amount ?? 0
  const ukupnoMesecnoObaveze = t + p + h + u
  const godisnjeObaveze = ukupnoMesecnoObaveze * 12
  const ukupniRashodi = ukupnoMesecnoObaveze > 0 ? godisnjeObaveze : ukupanPorez
  const neto = ukupnoRSD - ukupniRashodi
  const bojaBar = procenat > 90 ? '#ff4d4d' : procenat >= 70 ? '#ffcc00' : 'var(--accent)'
  const remainingLimit = Math.max(0, LIMIT - ukupnoRSD)

  const pre365 = new Date()
  pre365.setDate(pre365.getDate() - 365)
  const prihod365 = fakture.filter(f => new Date(f.datum) >= pre365).reduce((s, f) => s + (f.iznos_rsd ?? 0), 0)
  const procenat365 = Math.min((ukupnoRSD / LIMIT_365) * 100, 100)
  const bojaBar365 = procenat365 > 90 ? '#ff4d4d' : procenat365 >= 70 ? '#ffcc00' : 'var(--accent)'
  const remaining365 = Math.max(0, LIMIT_365 - prihod365)

  const dodajFakturu = async () => {
    if (!forma.klijent || !forma.iznos || !user) return
    let iznos_rsd = parseFloat(forma.iznos) * KURSEVI[forma.valuta]
    let kursKoriscen = KURSEVI[forma.valuta]
    if (forma.valuta !== 'RSD' && forma.datum) {
      try {
        const kurs = forma.valuta === 'EUR' ? await getEurToRsdRate(forma.datum) : KURSEVI.USD
        kursKoriscen = kurs
        iznos_rsd = parseFloat(forma.iznos) * kurs
      } catch {
        // ostaje fallback iz KURSEVI
      }
    }
    const datum = forma.datum || new Date().toISOString().split('T')[0]
    const klijentTrim = forma.klijent.trim()

    // Provera: da li već postoji plaćena faktura sa istim podacima?
    const { data: placeneFakture } = await supabase
      .from('fakture')
      .select('id, klijent, datum, iznos_rsd')
      .eq('user_id', user.id)
      .eq('status', 'placena')
    const mozdaDuplikat = (placeneFakture ?? []).some(
      (ff: { klijent: string | null; datum: string; iznos_rsd: number | null }) =>
        (ff.klijent ?? '').trim() === klijentTrim &&
        ff.datum === datum &&
        Math.abs((ff.iznos_rsd ?? 0) - iznos_rsd) < 1
    )
    if (mozdaDuplikat && !window.confirm('Ovaj prihod možda već postoji kao faktura — da li želiš da nastaviš?')) return

    const napomenaSaKursom = (forma.napomena || '').trim() +
      (forma.valuta !== 'RSD' ? ` [Kurs 1 ${forma.valuta} = ${kursKoriscen} RSD]` : '')
    const noviPrihod = {
      user_id: user.id,
      klijent: forma.klijent,
      iznos: parseFloat(forma.iznos),
      valuta: forma.valuta,
      iznos_rsd,
      datum,
      napomena: napomenaSaKursom || null,
    }
    const { data, error } = await supabase.from('prihodi').insert(noviPrihod).select().single()
    if (!error && data) {
      setFakture([data as Faktura, ...fakture])
      setForma({ klijent: '', iznos: '', valuta: 'EUR', datum: '', napomena: '' })
      setTab('dashboard')
    } else {
      alert('Greška pri dodavanju: ' + error?.message)
    }
  }

  const obrisi = async (id: string) => {
    const { error } = await supabase.from('prihodi').delete().eq('id', id)
    if (!error) setFakture(fakture.filter(f => f.id !== id))
  }

  const oznaciKaoPlacenoIzFakture = async () => {
    if (!user || !izFaktureSelectedId || !izFaktureDatumPlacanja) return
    const f = neplaceneFakture.find(x => x.id === izFaktureSelectedId)
    if (!f) return
    setIzFaktureLoading(true)
    const iznosRsd = f.iznos_rsd ?? 0
    const napomena = (f.napomena?.trim() ? f.napomena + ' ' : '') + (f.broj_fakture ? `[Faktura ${f.broj_fakture}]` : '[Plaćena faktura]')
    await supabase.from('fakture').update({ status: 'placena' }).eq('id', f.id)
    const { data: postojeca } = await supabase
      .from('prihodi')
      .select('id')
      .eq('user_id', user.id)
      .eq('klijent', f.klijent ?? '')
      .eq('datum', izFaktureDatumPlacanja)
      .gte('iznos_rsd', iznosRsd - 1)
      .lte('iznos_rsd', iznosRsd + 1)
      .limit(1)
    if (!postojeca?.length) {
      await supabase.from('prihodi').insert({
        user_id: user.id,
        klijent: f.klijent ?? '',
        iznos: f.iznos ?? 0,
        valuta: (f.valuta as 'RSD' | 'EUR' | 'USD') ?? 'RSD',
        iznos_rsd: iznosRsd,
        datum: izFaktureDatumPlacanja,
        napomena: napomena.trim() || null,
      })
    }
    setModalIzFaktureOpen(false)
    setIzFaktureLoading(false)
    fetchFakture()
    setTab('fakture')
  }

  const formatIznosDashboard = (n: number) => new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const godinaOptions = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // LoginPage ce prikazati novaLozinka ekran
      }
    })
  }, [])

  if (authLoading) return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--accent)', fontSize: 32 }}>💼</span>
    </div>
  )

  if (!user) return <LoginPage />

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* Modal: Iz fakture */}
      {modalIzFaktureOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setModalIzFaktureOpen(false)}
        >
          <div
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 440, width: '100%', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Prihod iz fakture</span>
              <button onClick={() => setModalIzFaktureOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 12px 0' }}>Izaberite neplaćenu fakturu i unesite datum plaćanja.</p>
              {neplaceneFakture.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '24px 0', textAlign: 'center' }}>Nema neplaćenih faktura.</p>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    {neplaceneFakture.map(fak => (
                      <div
                        key={fak.id}
                        onClick={() => setIzFaktureSelectedId(izFaktureSelectedId === fak.id ? null : fak.id)}
                        style={{
                          padding: '12px 14px', marginBottom: 8, background: izFaktureSelectedId === fak.id ? 'var(--accent)' : 'var(--bg-primary)',
                          border: `2px solid ${izFaktureSelectedId === fak.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer',
                          color: izFaktureSelectedId === fak.id ? '#000' : 'var(--text-primary)', fontSize: 14,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{fak.klijent ?? '—'}</div>
                        <div style={{ color: izFaktureSelectedId === fak.id ? 'rgba(0,0,0,0.7)' : 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                          {fak.broj_fakture ? `Br. ${fak.broj_fakture}` : fak.datum} · {formatIznosDashboard(fak.iznos_rsd ?? 0)} RSD
                        </div>
                      </div>
                    ))}
                  </div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Datum plaćanja</label>
                  <input
                    type="date"
                    value={izFaktureDatumPlacanja}
                    onChange={e => setIzFaktureDatumPlacanja(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, marginBottom: 16, outline: 'none' }}
                  />
                  <button
                    onClick={oznaciKaoPlacenoIzFakture}
                    disabled={!izFaktureSelectedId || izFaktureLoading}
                    style={{ width: '100%', background: izFaktureSelectedId ? 'var(--accent)' : 'var(--bg-primary)', color: izFaktureSelectedId ? '#000' : 'var(--text-muted)', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: izFaktureSelectedId && !izFaktureLoading ? 'pointer' : 'not-allowed' }}
                  >
                    {izFaktureLoading ? 'Čuvanje...' : 'Označi kao plaćeno'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>💼</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>Paušalac</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={godina}
            onChange={e => setGodina(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', color: 'var(--accent)', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
          >
            {godinaOptions.map(g => <option key={g} value={g}>{g}.</option>)}
          </select>
          <ThemeToggle />
          <button onClick={logout} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer' }}>
            Odjavi se
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Učitavanje...</div>
        )}

        {!loading && tab === 'dashboard' && (
          <>
            {/* Ukupni prihod kartica */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.08 }} />
              <button
                type="button"
                onClick={() => window.location.href = '/fakture'}
                style={{ position: 'absolute', top: 16, right: 16, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {fakture.length === 1 ? '1 faktura' : fakture.length >= 2 && fakture.length <= 4 ? `${fakture.length} fakture` : `${fakture.length} faktura`}
              </button>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>UKUPNI PRIHOD · {godina}.</p>
                <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', margin: '0 0 4px 0', textShadow: '0 0 30px #00ffb340' }}>
                  {ukupnoRSD.toLocaleString()} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>RSD</span>
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px 0' }}>≈ {ukupnoEUR.toLocaleString()} EUR</p>
              </div>

              {/* 6M bar */}
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>LIMIT KALENDARSKE GODINE (6.000.000 RSD)</p>
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, height: 8, marginBottom: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${procenat}%`, background: bojaBar, borderRadius: 8, boxShadow: `0 0 10px ${bojaBar}`, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                <span style={{ color: bojaBar }}>{ukupnoRSD.toLocaleString()} RSD ({procenat.toFixed(1)}%)</span>
                <span>Još {remainingLimit.toLocaleString()} RSD do limita</span>
                <span>6.000.000 RSD</span>
              </div>

              {/* 8M / 365 dana bar */}
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>LIMIT 365 DANA (8.000.000 RSD)</p>
              <div style={{ background: 'var(--bg-primary)', borderRadius: 8, height: 8, marginBottom: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${procenat365}%`, background: bojaBar365, borderRadius: 8, boxShadow: `0 0 10px ${bojaBar365}`, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ color: bojaBar365 }}>{prihod365.toLocaleString()} RSD ({procenat365.toFixed(1)}%)</span>
                <span>Još {remaining365.toLocaleString()} RSD do limita</span>
                <span>8.000.000 RSD</span>
              </div>

              {procenat > 80 && (
                <div style={{ background: '#2a0a0a', border: '1px solid #ff4d4d40', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
                  <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>⚠️ Prešli ste {procenat.toFixed(0)}% godišnjeg limita!</p>
                </div>
              )}
              {procenat365 > 80 && (
                <div style={{ background: '#2a0a0a', border: '1px solid #ff4d4d40', borderRadius: 8, padding: '10px 14px', marginTop: 8 }}>
                  <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>⚠️ Prešli ste {procenat365.toFixed(0)}% limita za 365 dana!</p>
                </div>
              )}
            </div>

            {/* Obaveze iz poreskog rešenja */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>OBAVEZE IZ PORESKOG REŠENJA</p>
              {!poresniPodaci || (!poresniPodaci.tax_amount && !poresniPodaci.pio_amount && !poresniPodaci.health_amount && !poresniPodaci.unemployment_amount) ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 12px 0' }}>
                    📋 Unesi svoje obaveze iz poreskog rešenja u Podešavanjima profila
                  </p>
                  <a href="/settings" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 10, textDecoration: 'none' }}>
                    Otvori podešavanja →
                  </a>
                </div>
              ) : (() => {
                const t = poresniPodaci.tax_amount || 0
                const p = poresniPodaci.pio_amount || 0
                const h = poresniPodaci.health_amount || 0
                const u = poresniPodaci.unemployment_amount || 0
                const ukupnoMesecno = t + p + h + u
                return (
                  <>
                    {[
                      { label: 'Porez na prihod', value: t, boja: '#f59e0b' },
                      { label: 'PIO doprinos', value: p, boja: '#3b82f6' },
                      { label: 'Zdravstveno osiguranje', value: h, boja: '#a855f7' },
                      { label: 'Osiguranje za nezaposlene', value: u, boja: '#ec4899' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.boja, boxShadow: `0 0 6px ${item.boja}` }} />
                          <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{item.label}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>mesečno</span>
                        </div>
                        <span style={{ color: item.boja, fontWeight: 700, fontSize: 15 }}>{item.value.toLocaleString()} RSD</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px 0' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 14 }}>UKUPNO MESEČNO</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16 }}>{ukupnoMesecno.toLocaleString()} RSD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>UKUPNO GODIŠNJE</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 14 }}>{(ukupnoMesecno * 12).toLocaleString()} RSD</span>
                    </div>
                  </>
                )
              })()}
            </div>

            <PoresniKalendar ukupnoRsd={ukupnoRSD} limit={LIMIT} />
            <MonthlyObligations ref={monthlyObRef} />
            <SmartInsights onOpenQRModal={() => monthlyObRef.current?.openUplatniceModal()} prihodi={fakture} prihodiTekucaGodina={prihodiTekucaGodina} godina={godina} />
          </>
        )}

        {!loading && tab === 'dodaj' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>NOVI PRIHOD</p>
            <div ref={klijentDropdownRef} style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Ime klijenta"
                value={forma.klijent}
                onChange={e => {
                  setForma({ ...forma, klijent: e.target.value })
                  setShowKlijentDropdown(true)
                }}
                onFocus={() => setShowKlijentDropdown(true)}
                onBlur={() => setTimeout(() => setShowKlijentDropdown(false), 200)}
                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              />
              {showKlijentDropdown && (() => {
                const q = (forma.klijent || '').trim().toLowerCase()
                const filtered = q
                  ? klijentSuggestions.filter(k => k.toLowerCase().includes(q))
                  : klijentSuggestions
                if (filtered.length === 0) return null
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      maxHeight: 220,
                      overflowY: 'auto',
                      zIndex: 50,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                  >
                    {filtered.map(k => (
                      <button
                        key={k}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setForma({ ...forma, klijent: k }); setShowKlijentDropdown(false) }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-primary)',
                          fontSize: 14,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input type="number" placeholder="Iznos" value={forma.iznos} onChange={e => setForma({ ...forma, iznos: e.target.value })}
                style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
              <select value={forma.valuta} onChange={e => setForma({ ...forma, valuta: e.target.value as Valuta })}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                <option>EUR</option><option>USD</option><option>RSD</option>
              </select>
            </div>
            <input type="date" value={forma.datum} onChange={e => setForma({ ...forma, datum: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, marginBottom: 4, boxSizing: 'border-box', outline: 'none' }}
            />
            {kursPrikaz && (
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 4px' }}>📈 NBS kurs: {kursPrikaz}</p>
            )}
            {iznosRsdPrikaz && forma.valuta !== 'RSD' && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 2px 0' }}>IZNOS U RSD</p>
                <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18, margin: 0 }}>≈ {iznosRsdPrikaz}</p>
              </div>
            )}
            <input type="text" placeholder="Napomena (opciono)" value={forma.napomena} onChange={e => setForma({ ...forma, napomena: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, marginBottom: 20, boxSizing: 'border-box', outline: 'none' }}
            />
            <button onClick={dodajFakturu} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340' }}>
              + Dodaj prihod
            </button>
          </div>
        )}

        {!loading && tab === 'fakture' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setModalIzFaktureOpen(true)}
                style={{
                  flex: 1, background: 'var(--accent)', color: 'var(--foreground)', fontWeight: 700, fontSize: 15,
                  padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 2px 12px var(--accent-dim)', transition: 'transform 0.15s ease',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>🧾</span>
                <span>+ Iz fakture</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('dodaj')}
                style={{
                  flex: 1, background: 'var(--bg-card)', color: 'var(--accent)', fontWeight: 700, fontSize: 15,
                  padding: '14px 20px', borderRadius: 12, border: '2px solid var(--accent)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 2px 8px var(--shadow)', transition: 'transform 0.15s ease',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>💵</span>
                <span>+ Bez fakture</span>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>PRIHODI {godina}. ({fakture.length})</p>
              {fakture.length > 0 && (
                <button
                  onClick={() => generatePDF(fakture, godina, user.email || '', { ukupnoRSD, porez, pio, zdravstvo, neto, procenat })}
                  style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 8, padding: '6px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
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
                      <button onClick={() => obrisi(f.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {tab === 'settings' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Podešavanja profila</p>
          <a href="/settings" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 12, textDecoration: 'none' }}>
            Otvori podešavanja →
          </a>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px 0' }}>
        {[
          { key: 'dashboard', icon: '📊', label: 'Pregled' },
          { key: 'fakture', icon: '📋', label: 'Prihodi' },
          { key: 'dodaj', icon: '＋', label: 'Dodaj' },
          { key: 'faktura', icon: '🧾', label: 'Faktura', href: '/fakture' },
          { key: 'kpo', icon: '📒', label: 'KPO', href: '/kpo' },
          { key: 'settings', icon: '⚙️', label: 'Profil', href: '/settings' },
        ].map(item => (
          <button key={item.key} onClick={() => (item as any).href ? window.location.href = (item as any).href : setTab(item.key as any)}
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