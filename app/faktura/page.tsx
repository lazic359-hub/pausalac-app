'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
const PreuzmiPDFDugme = dynamic(() => import('../../components/PreuzmiPDFDugme'), { ssr: false })

type Profil = {
  nazivFirme: string; pib: string; maticniBroj: string
  mesecniPorez: string; mesecniPio: string; mesecniZdravstvo: string
  mesecniNezaposlenost: string; brojRacuna: string; godisnjLimit: string
}

type Stavka = { id: number; opis: string; iznos: string }
type KpoUnos = { datum: string; klijent: string; iznos: number; brojFakture: string }

function generisiBrojFakture(): string {
  const sad = new Date()
  const god = sad.getFullYear()
  const mes = String(sad.getMonth() + 1).padStart(2, '0')
  const existing = JSON.parse(localStorage.getItem('kpo_knjiga') || '[]')
  return `${god}-${mes}-${String(existing.length + 1).padStart(3, '0')}`
}

const kartica: React.CSSProperties = {
  background: '#0d1117',
  border: '1px solid #1a2040',
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
  position: 'relative',
  overflow: 'hidden',
}

function Input({ value, onChange, placeholder, type = 'text', hasError = false, style = {} }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; hasError?: boolean; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', background: '#111',
        border: `1px solid ${hasError ? '#ff4d4d' : focused ? '#00ffb360' : '#1a2040'}`,
        borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14,
        boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s',
        boxShadow: focused ? '0 0 0 3px #00ffb315' : 'none', ...style,
      }}
    />
  )
}

function Greska({ tekst }: { tekst: string }) {
  return <p style={{ color: '#ff4d4d', fontSize: 11, margin: '4px 0 8px 0' }}>⚠️ {tekst}</p>
}

export default function FakturaPage() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [klijentNaziv, setKlijentNaziv] = useState('')
  const [klijentPib, setKlijentPib] = useState('')
  const [klijentAdresa, setKlijentAdresa] = useState('')
  const [stavke, setStavke] = useState<Stavka[]>([{ id: 1, opis: '', iznos: '' }])
  const [sacuvano, setSacuvano] = useState(false)
  const [brojFakture, setBrojFakture] = useState('')
  const [greske, setGreske] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('pausalac_profil')
    if (saved) setProfil(JSON.parse(saved))
  }, [])

  const ukupno = stavke.reduce((sum, s) => sum + (parseFloat(s.iznos) || 0), 0)

  const dodajStavku = () => setStavke([...stavke, { id: Date.now(), opis: '', iznos: '' }])
  const ukloniStavku = (id: number) => { if (stavke.length > 1) setStavke(stavke.filter(s => s.id !== id)) }
  const azurirajStavku = (id: number, polje: 'opis' | 'iznos', vrednost: string) => {
    setStavke(stavke.map(s => s.id === id ? { ...s, [polje]: vrednost } : s))
  }

  const ima = (key: string) => greske.includes(key)

  const sacuvajFakturu = () => {
    const g: string[] = []
    if (!klijentNaziv) g.push('klijentNaziv')
    if (!klijentAdresa) g.push('klijentAdresa')
    if (stavke.some(s => !s.opis || !s.iznos)) g.push('stavke')
    if (ukupno <= 0) g.push('iznos')
    setGreske(g)
    if (g.length > 0) return

    const novi = generisiBrojFakture()
    setBrojFakture(novi)
    const noviUnos: KpoUnos = { datum, klijent: klijentNaziv, iznos: ukupno, brojFakture: novi }
    const existing: KpoUnos[] = JSON.parse(localStorage.getItem('kpo_knjiga') || '[]')
    localStorage.setItem('kpo_knjiga', JSON.stringify([...existing, noviUnos]))
    setSacuvano(true)
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.back()}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#00ffb3'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >←</button>
        <span style={{ fontSize: 18 }}>🧾</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#00ffb3' }}>Nova faktura</span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 140px 16px' }}>

        {/* Upozorenje ako nema profila */}
        {!profil && (
          <div style={{ background: '#2a1a00', border: '1px solid #f59e0b40', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ color: '#f59e0b', fontSize: 13, margin: 0 }}>
              ⚠️ Nisi podesio profil firme.{' '}
              <a href="/settings" style={{ color: '#00ffb3', textDecoration: 'none', fontWeight: 600 }}>Idi na Podešavanja →</a>
            </p>
          </div>
        )}

        {/* Izdavalac */}
        {profil && (
          <div style={kartica}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#00ffb3', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 12px 0' }}>IZDAVALAC</p>
            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px 0', color: '#00ffb3', textShadow: '0 0 20px #00ffb330' }}>{profil.nazivFirme}</p>
            <p style={{ color: '#444', fontSize: 12, margin: '0 0 2px 0' }}>PIB: {profil.pib} · MB: {profil.maticniBroj}</p>
            <p style={{ color: '#444', fontSize: 12, margin: 0 }}>Račun: {profil.brojRacuna}</p>
          </div>
        )}

        {/* Datum */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: '#a855f7', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 12px 0' }}>DATUM FAKTURE</p>
          <Input type="date" value={datum} onChange={setDatum} />
        </div>

        {/* Klijent */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#3b82f6', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>PRIMALAC (KLIJENT)</p>

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>NAZIV KLIJENTA *</p>
          <Input value={klijentNaziv} onChange={v => { setKlijentNaziv(v); setGreske(g => g.filter(x => x !== 'klijentNaziv')) }}
            placeholder="npr. Firma DOO" hasError={ima('klijentNaziv')} style={{ marginBottom: 4 }} />
          {ima('klijentNaziv') && <Greska tekst="Obavezno polje" />}

          <p style={{ color: '#666', fontSize: 11, margin: '10px 0 6px 0' }}>PIB KLIJENTA</p>
          <Input value={klijentPib} onChange={setKlijentPib} placeholder="123456789 (opciono)" style={{ marginBottom: 10 }} />

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>ADRESA *</p>
          <Input value={klijentAdresa} onChange={v => { setKlijentAdresa(v); setGreske(g => g.filter(x => x !== 'klijentAdresa')) }}
            placeholder="npr. Bulevar Kralja Aleksandra 1, Beograd" hasError={ima('klijentAdresa')} />
          {ima('klijentAdresa') && <Greska tekst="Obavezno polje" />}
        </div>

        {/* Stavke */}
        <div style={{ ...kartica, border: `1px solid ${ima('stavke') ? '#ff4d4d40' : '#1a2040'}` }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#f59e0b', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>STAVKE FAKTURE</p>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: 8, marginBottom: 8 }}>
            <p style={{ color: '#333', fontSize: 11, margin: 0 }}>OPIS USLUGE</p>
            <p style={{ color: '#333', fontSize: 11, margin: 0 }}>IZNOS (RSD)</p>
            <div />
          </div>

          {stavke.map((stavka, i) => (
            <div key={stavka.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: 8, marginBottom: 8 }}>
              <Input
                placeholder={`Usluga ${i + 1}`}
                value={stavka.opis}
                onChange={v => { azurirajStavku(stavka.id, 'opis', v); setGreske(g => g.filter(x => x !== 'stavke')) }}
                hasError={ima('stavke') && !stavka.opis}
              />
              <Input
                type="number"
                placeholder="0"
                value={stavka.iznos}
                onChange={v => { azurirajStavku(stavka.id, 'iznos', v); setGreske(g => g.filter(x => x !== 'stavke')) }}
                hasError={ima('stavke') && !stavka.iznos}
              />
              <button
                onClick={() => ukloniStavku(stavka.id)}
                style={{ background: '#1a0a0a', border: '1px solid #ff4d4d30', borderRadius: 8, color: '#ff4d4d', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#2a1010'}
                onMouseLeave={e => e.currentTarget.style.background = '#1a0a0a'}
              >×</button>
            </div>
          ))}

          {ima('stavke') && <Greska tekst="Unesi opis i iznos za sve stavke" />}

          <button
            onClick={dodajStavku}
            style={{ background: '#0a1a10', border: '1px solid #00ffb330', borderRadius: 10, padding: '10px 16px', color: '#00ffb3', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0f2a1a'; e.currentTarget.style.borderColor = '#00ffb360' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0a1a10'; e.currentTarget.style.borderColor = '#00ffb330' }}
          >
            + Dodaj stavku
          </button>

          {/* Ukupno */}
          <div style={{ borderTop: '1px solid #1a2040', marginTop: 16, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#555', fontSize: 13 }}>UKUPNO</span>
            <span style={{ color: '#00ffb3', fontWeight: 800, fontSize: 24, textShadow: '0 0 20px #00ffb330' }}>
              {ukupno.toLocaleString()} <span style={{ fontSize: 14, color: '#444' }}>RSD</span>
            </span>
          </div>
        </div>

      </div>

      {/* Fiksno dugme */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: '#0a0a0f', borderTop: '1px solid #1a1a2e' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {sacuvano && profil ? (
            <PreuzmiPDFDugme
              brojFakture={brojFakture}
              datum={datum}
              izdavalac={profil}
              klijent={{ naziv: klijentNaziv, pib: klijentPib, adresa: klijentAdresa }}
              stavke={stavke}
              style={{ width: '100%' }}
            />
          ) : (
            <button
              onClick={sacuvajFakturu}
              style={{ width: '100%', background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 40px #00ffb370'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px #00ffb340'}
            >
              💾 Sačuvaj fakturu
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
