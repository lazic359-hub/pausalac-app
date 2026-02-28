'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient, User } from '@supabase/supabase-js'
import MonthlyObligations from '../components/MonthlyObligations'

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

  const inp: React.CSSProperties = { width: '100%', background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 40 }}>💼</span>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#00ffb3', margin: '8px 0 4px 0' }}>Paušalac</p>
          <p style={{ color: '#444', fontSize: 14 }}>Evidencija prihoda za paušalce</p>
        </div>
        <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 24 }}>
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 20px 0' }}>{isRegister ? 'REGISTRACIJA' : 'PRIJAVA'}</p>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
          <input type="password" placeholder="Lozinka" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={inp} />
          {error && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '0 0 12px 0' }}>⚠️ {error}</p>}
          {info && <p style={{ color: '#00ffb3', fontSize: 13, margin: '0 0 12px 0' }}>✉️ {info}</p>}
          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 12, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Učitavanje...' : isRegister ? 'Registruj se' : 'Prijavi se'}
          </button>
          <button onClick={() => { setIsRegister(!isRegister); setError(''); setInfo('') }} style={{ width: '100%', background: 'none', border: '1px solid #1a2040', color: '#555', fontSize: 14, padding: '12px', borderRadius: 10, cursor: 'pointer' }}>
            {isRegister ? 'Već imaš nalog? Prijavi se' : 'Nemaš nalog? Registruj se'}
          </button>
        </div>
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
    win.onload = () => {
      win.print()
    }
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

  useEffect(() => {
    if (user) fetchFakture()
  }, [user, godina])

  const fetchFakture = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('fakture')
      .select('*')
      .gte('datum', `${godina}-01-01`)
      .lte('datum', `${godina}-12-31`)
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

  const dodajFakturu = async () => {
    if (!forma.klijent || !forma.iznos || !user) return
    const iznos_rsd = parseFloat(forma.iznos) * KURSEVI[forma.valuta]
    const novaFaktura = {
      user_id: user.id,
      klijent: forma.klijent,
      iznos: parseFloat(forma.iznos),
      valuta: forma.valuta,
      iznos_rsd,
      datum: forma.datum || new Date().toISOString().split('T')[0],
      napomena: forma.napomena,
    }
    const { data, error } = await supabase.from('fakture').insert(novaFaktura).select().single()
    if (!error && data) {
      setFakture([data as Faktura, ...fakture])
      setForma({ klijent: '', iznos: '', valuta: 'EUR', datum: '', napomena: '' })
      setTab('dashboard')
    } else {
      alert('Greška pri dodavanju: ' + error?.message)
    }
  }

  const obrisi = async (id: string) => {
    const { error } = await supabase.from('fakture').delete().eq('id', id)
    if (!error) setFakture(fakture.filter(f => f.id !== id))
  }

  const bojaBar = procenat > 90 ? '#ff4d4d' : procenat > 70 ? '#ffcc00' : '#00ffb3'

  const godinaOptions = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

  if (authLoading) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#00ffb3', fontSize: 32 }}>💼</span>
    </div>
  )

  if (!user) return <LoginPage />

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>💼</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#00ffb3' }}>Paušalac</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Izbor godine */}
          <select
            value={godina}
            onChange={e => setGodina(e.target.value)}
            style={{ background: '#111', border: '1px solid #1a2040', borderRadius: 20, padding: '4px 12px', color: '#00ffb3', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
          >
            {godinaOptions.map(g => <option key={g} value={g}>{g}.</option>)}
          </select>
          <button onClick={logout} style={{ fontSize: 11, color: '#555', background: '#111', padding: '4px 10px', borderRadius: 20, border: '1px solid #222', cursor: 'pointer' }}>
            Odjavi se
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#444' }}>Učitavanje...</div>
        )}

        {!loading && tab === 'dashboard' && (
          <>
            {/* Glavni broj */}
            <div style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1e 100%)', border: '1px solid #1a2040', borderRadius: 16, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: '#00ffb3', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.15 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: '#555', fontSize: 12, marginBottom: 4 }}>UKUPNI PRIHOD · {godina}.</p>
                  <p style={{ fontSize: 36, fontWeight: 800, color: '#00ffb3', margin: '0 0 4px 0', textShadow: '0 0 30px #00ffb340' }}>
                    {ukupnoRSD.toLocaleString()} <span style={{ fontSize: 16, color: '#444' }}>RSD</span>
                  </p>
                  <p style={{ color: '#444', fontSize: 14, margin: '0 0 20px 0' }}>≈ {ukupnoEUR.toLocaleString()} EUR</p>
                </div>
                {/* PDF dugme */}
                <button
                  onClick={() => generatePDF(fakture, godina, user.email || '', { ukupnoRSD, porez, pio, zdravstvo, neto, procenat })}
                  style={{ background: '#0a1a10', border: '1px solid #00ffb340', borderRadius: 10, padding: '8px 14px', color: '#00ffb3', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                >
                  📄 Izvezi PDF
                </button>
              </div>

              <div style={{ background: '#111', borderRadius: 8, height: 8, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${procenat}%`, background: bojaBar, borderRadius: 8, boxShadow: `0 0 10px ${bojaBar}`, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#444' }}>
                <span>{procenat.toFixed(1)}% od limita</span>
                <span>6.000.000 RSD</span>
              </div>

              {procenat > 80 && (
                <div style={{ background: '#2a0a0a', border: '1px solid #ff4d4d40', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
                  <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>⚠️ Prešli ste {procenat.toFixed(0)}% godišnjeg limita!</p>
                </div>
              )}
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'NETO PRIHOD', value: neto, boja: '#a855f7', sub: 'RSD' },
                { label: 'UKUPAN POREZ', value: ukupanPorez, boja: '#f59e0b', sub: 'RSD' },
                { label: 'PIO DOPRINOS', value: pio, boja: '#3b82f6', sub: 'RSD (24%)' },
                { label: 'BROJ FAKTURA', value: fakture.length, boja: '#00ffb3', sub: 'unetih', big: true },
              ].map(item => (
                <div key={item.label} style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: item.boja, borderRadius: '50%', filter: 'blur(40px)', opacity: 0.2 }} />
                  <p style={{ color: '#555', fontSize: 11, margin: '0 0 8px 0' }}>{item.label}</p>
                  <p style={{ fontSize: item.big ? 36 : 22, fontWeight: item.big ? 800 : 700, color: item.boja, margin: 0 }}>{item.value.toLocaleString()}</p>
                  <p style={{ color: '#333', fontSize: 11, margin: '4px 0 0 0' }}>{item.sub}</p>
                </div>
              ))}
            </div>

            {/* Porez breakdown */}
            <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20 }}>
              <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>OBAVEZE PREMA DRŽAVI</p>
              {[
                { label: 'Porez na prihod', value: porez, procenat: '10%', boja: '#f59e0b' },
                { label: 'PIO doprinos', value: pio, procenat: '24%', boja: '#3b82f6' },
                { label: 'Zdravstveno', value: zdravstvo, procenat: '10.3%', boja: '#a855f7' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #111' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.boja, boxShadow: `0 0 6px ${item.boja}` }} />
                    <span style={{ color: '#888', fontSize: 14 }}>{item.label}</span>
                    <span style={{ color: '#333', fontSize: 12 }}>{item.procenat}</span>
                  </div>
                  <span style={{ color: item.boja, fontWeight: 700, fontSize: 15 }}>{item.value.toLocaleString()} RSD</span>
                </div>
              ))}
            </div>
            <MonthlyObligations />
          </>
        )}

        {!loading && tab === 'dodaj' && (
          <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 24 }}>
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 20px 0' }}>NOVI PRIHOD</p>
            {[
              { placeholder: 'Ime klijenta', key: 'klijent', type: 'text' },
            ].map(field => (
              <input key={field.key} type={field.type} placeholder={field.placeholder}
                value={forma[field.key as keyof typeof forma]}
                onChange={e => setForma({ ...forma, [field.key]: e.target.value })}
                style={{ width: '100%', background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
              />
            ))}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input type="number" placeholder="Iznos" value={forma.iznos} onChange={e => setForma({ ...forma, iznos: e.target.value })}
                style={{ flex: 1, background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, outline: 'none' }}
              />
              <select value={forma.valuta} onChange={e => setForma({ ...forma, valuta: e.target.value as Valuta })}
                style={{ background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, outline: 'none' }}>
                <option>EUR</option><option>USD</option><option>RSD</option>
              </select>
            </div>
            <input type="date" value={forma.datum} onChange={e => setForma({ ...forma, datum: e.target.value })}
              style={{ width: '100%', background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            <input type="text" placeholder="Napomena (opciono)" value={forma.napomena} onChange={e => setForma({ ...forma, napomena: e.target.value })}
              style={{ width: '100%', background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, marginBottom: 20, boxSizing: 'border-box', outline: 'none' }}
            />
            <button onClick={dodajFakturu} style={{ width: '100%', background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340' }}>
              + Dodaj prihod
            </button>
          </div>
        )}

        {!loading && tab === 'fakture' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ color: '#555', fontSize: 11, margin: 0 }}>PRIHODI {godina}. ({fakture.length})</p>
              {fakture.length > 0 && (
                <button
                  onClick={() => generatePDF(fakture, godina, user.email || '', { ukupnoRSD, porez, pio, zdravstvo, neto, procenat })}
                  style={{ background: '#0a1a10', border: '1px solid #00ffb340', borderRadius: 8, padding: '6px 12px', color: '#00ffb3', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  📄 Izvezi PDF
                </button>
              )}
            </div>
            {fakture.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#333' }}>
                <p style={{ fontSize: 40 }}>📋</p>
                <p>Nema prihoda za {godina}. godinu</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fakture.map(f => (
                  <div key={f.id} style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 700, margin: '0 0 4px 0' }}>{f.klijent}</p>
                      <p style={{ color: '#444', fontSize: 12, margin: 0 }}>{f.datum || 'Bez datuma'}</p>
                      {f.napomena && <p style={{ color: '#333', fontSize: 12, margin: '4px 0 0 0' }}>{f.napomena}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#00ffb3', fontWeight: 700, margin: '0 0 2px 0' }}>{f.iznos} {f.valuta}</p>
                        <p style={{ color: '#333', fontSize: 12, margin: 0 }}>{f.iznos_rsd.toLocaleString()} RSD</p>
                      </div>
                      <button onClick={() => obrisi(f.id)} style={{ background: 'none', border: 'none', color: '#333', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>×</button>
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
    <p style={{ color: '#444', fontSize: 14, marginBottom: 16 }}>Podešavanja profila</p>
    <a href="/settings" style={{ background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 12, textDecoration: 'none' }}>
      Otvori podešavanja →
    </a>
  </div>
)}

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a0a0f', borderTop: '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px 0' }}>
        {[
          { key: 'dashboard', icon: '📊', label: 'Pregled' },
          { key: 'fakture', icon: '📋', label: 'Prihodi' },
          { key: 'dodaj', icon: '＋', label: 'Dodaj' },
          { key: 'faktura', icon: '🧾', label: 'Faktura', href: '/faktura' },
          { key: 'kpo', icon: '📒', label: 'KPO', href: '/kpo' },
          { key: 'settings', icon: '⚙️', label: 'Profil', href: '/settings' },
        ].map(item => (
          <button key={item.key} onClick={() => (item as any).href ? window.location.href = (item as any).href : setTab(item.key as any)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: tab === item.key ? '#00ffb3' : '#444', fontSize: 12, fontWeight: tab === item.key ? 700 : 400 }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ height: 80 }} />
    </div>
  )
}