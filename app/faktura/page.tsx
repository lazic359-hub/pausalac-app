'use client'
import { useState, useEffect } from 'react'
import PreuzmiPDFDugme from '../../components/PreuzmiPDFDugme'

type Profil = {
  nazivFirme: string
  pib: string
  maticniBroj: string
  mesecniPorez: string
  mesecniPio: string
  mesecniZdravstvo: string
  mesecniNezaposlenost: string
  brojRacuna: string
  godisnjLimit: string
}

type Stavka = {
  id: number
  opis: string
  iznos: string
}

type KpoUnos = {
  datum: string
  klijent: string
  iznos: number
  brojFakture: string
}

function generisiBrojFakture(): string {
  const sad = new Date()
  const god = sad.getFullYear()
  const mes = String(sad.getMonth() + 1).padStart(2, '0')
  const existing = JSON.parse(localStorage.getItem('kpo_knjiga') || '[]')
  const broj = existing.length + 1
  return `${god}-${mes}-${String(broj).padStart(3, '0')}`
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

  const dodajStavku = () => {
    setStavke([...stavke, { id: Date.now(), opis: '', iznos: '' }])
  }

  const ukloniStavku = (id: number) => {
    if (stavke.length === 1) return
    setStavke(stavke.filter(s => s.id !== id))
  }

  const azurirajStavku = (id: number, polje: 'opis' | 'iznos', vrednost: string) => {
    setStavke(stavke.map(s => s.id === id ? { ...s, [polje]: vrednost } : s))
  }

  const validiraj = () => {
    const g: string[] = []
    if (!klijentNaziv) g.push('klijentNaziv')
    if (!klijentAdresa) g.push('klijentAdresa')
    if (stavke.some(s => !s.opis || !s.iznos)) g.push('stavke')
    if (ukupno <= 0) g.push('iznos')
    setGreske(g)
    return g.length === 0
  }

  const sacuvajFakturu = () => {
    if (!validiraj()) return

    const novi = generisiBrojFakture()
    setBrojFakture(novi)

    const noviUnos: KpoUnos = {
      datum,
      klijent: klijentNaziv,
      iznos: ukupno,
      brojFakture: novi,
    }

    const existing: KpoUnos[] = JSON.parse(localStorage.getItem('kpo_knjiga') || '[]')
    localStorage.setItem('kpo_knjiga', JSON.stringify([...existing, noviUnos]))

    setSacuvano(true)
  }

  const inp = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    background: '#111',
    border: `1px solid ${hasError ? '#ff4d4d' : '#1a2040'}`,
    borderRadius: 10,
    padding: '12px 16px',
    color: 'white',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  })

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 18 }}>🧾</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#00ffb3' }}>Nova faktura</span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 140px 16px' }}>

        {!profil && (
          <div style={{ background: '#2a1a00', border: '1px solid #f59e0b40', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ color: '#f59e0b', fontSize: 13, margin: 0 }}>
              ⚠️ Nisi podesio profil firme. <a href="/settings" style={{ color: '#00ffb3' }}>Idi na Podešavanja</a>
            </p>
          </div>
        )}

        {profil && (
          <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 12px 0' }}>IZDAVALAC</p>
            <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px 0', color: '#00ffb3' }}>{profil.nazivFirme}</p>
            <p style={{ color: '#555', fontSize: 12, margin: '0 0 2px 0' }}>PIB: {profil.pib} · MB: {profil.maticniBroj}</p>
            <p style={{ color: '#555', fontSize: 12, margin: 0 }}>Račun: {profil.brojRacuna}</p>
          </div>
        )}

        <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>DATUM FAKTURE</p>
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={inp(false)} />
        </div>

        <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>PRIMALAC (KLIJENT)</p>

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>NAZIV KLIJENTA *</p>
          <input style={{ ...inp(greske.includes('klijentNaziv')), marginBottom: 4 }}
            placeholder="npr. Firma DOO"
            value={klijentNaziv}
            onChange={e => { setKlijentNaziv(e.target.value); setGreske(greske.filter(g => g !== 'klijentNaziv')) }}
          />
          {greske.includes('klijentNaziv') && <p style={{ color: '#ff4d4d', fontSize: 11, margin: '0 0 10px 0' }}>⚠️ Obavezno polje</p>}

          <p style={{ color: '#666', fontSize: 11, margin: '10px 0 6px 0' }}>PIB KLIJENTA</p>
          <input style={{ ...inp(false), marginBottom: 10 }}
            placeholder="123456789 (opciono)"
            value={klijentPib}
            onChange={e => setKlijentPib(e.target.value)}
          />

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>ADRESA *</p>
          <input style={{ ...inp(greske.includes('klijentAdresa')), marginBottom: 4 }}
            placeholder="npr. Bulevar Kralja Aleksandra 1, Beograd"
            value={klijentAdresa}
            onChange={e => { setKlijentAdresa(e.target.value); setGreske(greske.filter(g => g !== 'klijentAdresa')) }}
          />
          {greske.includes('klijentAdresa') && <p style={{ color: '#ff4d4d', fontSize: 11, margin: '0 0 4px 0' }}>⚠️ Obavezno polje</p>}
        </div>

        <div style={{ background: '#0d1117', border: `1px solid ${greske.includes('stavke') ? '#ff4d4d' : '#1a2040'}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>STAVKE FAKTURE</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 36px', gap: 8, marginBottom: 8 }}>
            <p style={{ color: '#444', fontSize: 11, margin: 0 }}>OPIS USLUGE</p>
            <p style={{ color: '#444', fontSize: 11, margin: 0 }}>IZNOS (RSD)</p>
            <div />
          </div>

          {stavke.map((stavka, i) => (
            <div key={stavka.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 36px', gap: 8, marginBottom: 10 }}>
              <input
                style={inp(greske.includes('stavke') && !stavka.opis)}
                placeholder={`Usluga ${i + 1}`}
                value={stavka.opis}
                onChange={e => { azurirajStavku(stavka.id, 'opis', e.target.value); setGreske(greske.filter(g => g !== 'stavke')) }}
              />
              <input
                type="number"
                style={inp(greske.includes('stavke') && !stavka.iznos)}
                placeholder="0"
                value={stavka.iznos}
                onChange={e => { azurirajStavku(stavka.id, 'iznos', e.target.value); setGreske(greske.filter(g => g !== 'stavke')) }}
              />
              <button
                onClick={() => ukloniStavku(stavka.id)}
                style={{ background: '#1a0a0a', border: '1px solid #ff4d4d30', borderRadius: 8, color: '#ff4d4d', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>
          ))}

          {greske.includes('stavke') && <p style={{ color: '#ff4d4d', fontSize: 11, margin: '0 0 8px 0' }}>⚠️ Unesi opis i iznos za sve stavke</p>}

          <button
            onClick={dodajStavku}
            style={{ background: '#0a1a10', border: '1px solid #00ffb330', borderRadius: 10, padding: '10px 16px', color: '#00ffb3', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4 }}
          >
            + Dodaj stavku
          </button>

          <div style={{ borderTop: '1px solid #1a2040', marginTop: 16, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#555', fontSize: 13 }}>UKUPNO</span>
            <span style={{ color: '#00ffb3', fontWeight: 800, fontSize: 22 }}>{ukupno.toLocaleString()} RSD</span>
          </div>
        </div>

      </div>

      {/* Dugmad */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: '#0a0a0f', borderTop: '1px solid #1a1a2e', display: 'flex', gap: 10 }}>
        {sacuvano && profil ? (
          <PreuzmiPDFDugme
            brojFakture={brojFakture}
            datum={datum}
            izdavalac={profil}
            klijent={{ naziv: klijentNaziv, pib: klijentPib, adresa: klijentAdresa }}
            stavke={stavke}
            style={{ flex: 1 }}
          />
        ) : (
          <button
            onClick={sacuvajFakturu}
            style={{ flex: 1, background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340' }}
          >
            💾 Sačuvaj fakturu
          </button>
        )}
      </div>
    </div>
  )
}