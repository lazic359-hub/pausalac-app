'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { ThemeToggle } from '@/components/ThemeToggle'
const PreuzmiPDFDugme = dynamic(() => import('../../components/PreuzmiPDFDugme'), { ssr: false })

type Valuta = 'RSD' | 'EUR' | 'USD'
type Profil = {
  nazivFirme: string; pib: string; maticniBroj: string
  mesecniPorez: string; mesecniPio: string; mesecniZdravstvo: string
  mesecniNezaposlenost: string; brojRacuna: string; godisnjLimit: string
  iban?: string; swift?: string
}
type Stavka = { id: number; opis: string; iznos: string }
type KpoUnos = { datum: string; klijent: string; iznos: number; brojFakture: string }

const KURSEVI: Record<Valuta, number> = { RSD: 1, EUR: 117, USD: 108 }

function generisiBrojFakture(): string {
  const sad = new Date()
  const god = sad.getFullYear()
  const mes = String(sad.getMonth() + 1).padStart(2, '0')
  const existing = JSON.parse(localStorage.getItem('kpo_knjiga') || '[]')
  return `${god}-${mes}-${String(existing.length + 1).padStart(3, '0')}`
}

const kartica: React.CSSProperties = {
  background: '#0d1117', border: '1px solid #1a2040',
  borderRadius: 16, padding: 20, marginBottom: 16,
  position: 'relative', overflow: 'hidden',
}

function Input({ value, onChange, placeholder, type = 'text', hasError = false, style = {} }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; hasError?: boolean; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input type={type} placeholder={placeholder} value={value}
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

function ValutaPicker({ valuta, onChange }: { valuta: Valuta; onChange: (v: Valuta) => void }) {
  const boje: Record<Valuta, string> = { RSD: '#00ffb3', EUR: '#3b82f6', USD: '#f59e0b' }
  const oznake: Record<Valuta, string> = { RSD: '🇷🇸 RSD', EUR: '🇪🇺 EUR', USD: '🇺🇸 USD' }
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {(['RSD', 'EUR', 'USD'] as Valuta[]).map(v => {
        const aktivan = valuta === v
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            flex: 1, padding: '11px 0',
            background: aktivan ? boje[v] + '18' : '#111',
            border: `1px solid ${aktivan ? boje[v] + '70' : '#1a2040'}`,
            borderRadius: 10, color: aktivan ? boje[v] : '#555',
            fontWeight: aktivan ? 700 : 400, fontSize: 14,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: aktivan ? `0 0 14px ${boje[v]}18` : 'none',
          }}>
            {oznake[v]}
          </button>
        )
      })}
    </div>
  )
}

export default function FakturaPage() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [valuta, setValuta] = useState<Valuta>('RSD')
  const [kurs, setKurs] = useState('117')
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

  useEffect(() => {
    if (valuta === 'EUR') setKurs('117')
    else if (valuta === 'USD') setKurs('108')
    setSacuvano(false)
  }, [valuta])

  const kursNum = parseFloat(kurs) || KURSEVI[valuta]
  const ukupnoValuta = stavke.reduce((sum, s) => sum + (parseFloat(s.iznos) || 0), 0)
  const ukupnoRSD = valuta === 'RSD' ? ukupnoValuta : Math.round(ukupnoValuta * kursNum)
  const inostranstvo = valuta !== 'RSD'
  const valutaBoja = valuta === 'EUR' ? '#3b82f6' : valuta === 'USD' ? '#f59e0b' : '#00ffb3'

  const dodajStavku = () => setStavke([...stavke, { id: Date.now(), opis: '', iznos: '' }])
  const ukloniStavku = (id: number) => { if (stavke.length > 1) setStavke(stavke.filter(s => s.id !== id)) }
  const azurirajStavku = (id: number, polje: 'opis' | 'iznos', v: string) =>
    setStavke(stavke.map(s => s.id === id ? { ...s, [polje]: v } : s))
  const ima = (key: string) => greske.includes(key)

  const sacuvajFakturu = () => {
    const g: string[] = []
    if (!klijentNaziv) g.push('klijentNaziv')
    if (!klijentAdresa) g.push('klijentAdresa')
    if (stavke.some(s => !s.opis || !s.iznos)) g.push('stavke')
    if (ukupnoValuta <= 0) g.push('iznos')
    setGreske(g)
    if (g.length > 0) return
    const novi = generisiBrojFakture()
    setBrojFakture(novi)
    const noviUnos: KpoUnos = { datum, klijent: klijentNaziv, iznos: ukupnoRSD, brojFakture: novi }
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {inostranstvo && (
            <span style={{ background: valutaBoja + '15', border: `1px solid ${valutaBoja}40`, color: valutaBoja, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20 }}>
              🌍 Devizna faktura
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 140px 16px' }}>

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
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 12px 0' }}>
              {inostranstvo ? 'SELLER / IZDAVALAC' : 'IZDAVALAC'}
            </p>
            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px 0', color: '#00ffb3' }}>{profil.nazivFirme}</p>
            <p style={{ color: '#444', fontSize: 12, margin: '0 0 2px 0' }}>PIB: {profil.pib} · MB: {profil.maticniBroj}</p>
            <p style={{ color: '#444', fontSize: 12, margin: 0 }}>Račun: {profil.brojRacuna}</p>
            {inostranstvo && (profil.iban || profil.swift) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1a2040' }}>
                {profil.iban && <p style={{ color: '#3a6a55', fontSize: 12, margin: '0 0 2px 0' }}>IBAN: {profil.iban}</p>}
                {profil.swift && <p style={{ color: '#3a6a55', fontSize: 12, margin: 0 }}>SWIFT/BIC: {profil.swift}</p>}
              </div>
            )}
          </div>
        )}

        {/* Valuta */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: valutaBoja, borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07, transition: 'background 0.3s' }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 12px 0' }}>VALUTA I DATUM</p>

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 8px 0' }}>VALUTA FAKTURE</p>
          <ValutaPicker valuta={valuta} onChange={setValuta} />

          {/* Kurs */}
          {inostranstvo && (
            <div style={{ marginTop: 12, background: valutaBoja + '08', border: `1px solid ${valutaBoja}20`, borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ color: valutaBoja, fontSize: 11, margin: '0 0 8px 0', fontWeight: 700 }}>
                KURS NBS — 1 {valuta} =
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Input type="number" value={kurs} onChange={setKurs}
                  placeholder={valuta === 'EUR' ? '117' : '108'} style={{ flex: 1 }} />
                <span style={{ color: '#555', fontSize: 14, whiteSpace: 'nowrap' }}>RSD</span>
              </div>
              <p style={{ color: '#2a3a2a', fontSize: 11, margin: '6px 0 0 0' }}>
                Ručno unesi aktuelni kurs sa sajta NBS
              </p>
            </div>
          )}

          <p style={{ color: '#666', fontSize: 11, margin: '14px 0 6px 0' }}>DATUM FAKTURE</p>
          <Input type="date" value={datum} onChange={setDatum} />
        </div>

        {/* Klijent */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#3b82f6', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>
            {inostranstvo ? 'BUYER / KUPAC' : 'PRIMALAC (KLIJENT)'}
          </p>

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>
            {inostranstvo ? 'COMPANY NAME / NAZIV *' : 'NAZIV KLIJENTA *'}
          </p>
          <Input value={klijentNaziv}
            onChange={v => { setKlijentNaziv(v); setGreske(g => g.filter(x => x !== 'klijentNaziv')) }}
            placeholder={inostranstvo ? 'Company Ltd / Firma DOO' : 'npr. Firma DOO'}
            hasError={ima('klijentNaziv')} style={{ marginBottom: 4 }} />
          {ima('klijentNaziv') && <Greska tekst="Obavezno polje" />}

          <p style={{ color: '#666', fontSize: 11, margin: '10px 0 6px 0' }}>
            {inostranstvo ? 'TAX ID / PIB' : 'PIB KLIJENTA'}
          </p>
          <Input value={klijentPib} onChange={setKlijentPib}
            placeholder={inostranstvo ? 'VAT number (opciono)' : '123456789 (opciono)'}
            style={{ marginBottom: 10 }} />

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>
            {inostranstvo ? 'ADDRESS / ADRESA *' : 'ADRESA *'}
          </p>
          <Input value={klijentAdresa}
            onChange={v => { setKlijentAdresa(v); setGreske(g => g.filter(x => x !== 'klijentAdresa')) }}
            placeholder={inostranstvo ? '123 Business St, City, Country' : 'Bulevar Kralja Aleksandra 1, Beograd'}
            hasError={ima('klijentAdresa')} />
          {ima('klijentAdresa') && <Greska tekst="Obavezno polje" />}
        </div>

        {/* Stavke */}
        <div style={{ ...kartica, border: `1px solid ${ima('stavke') ? '#ff4d4d40' : '#1a2040'}` }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#f59e0b', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>
            {inostranstvo ? 'SERVICES / STAVKE' : 'STAVKE FAKTURE'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: 8, marginBottom: 8 }}>
            <p style={{ color: '#333', fontSize: 11, margin: 0 }}>
              {inostranstvo ? 'DESCRIPTION / OPIS' : 'OPIS USLUGE'}
            </p>
            <p style={{ color: '#333', fontSize: 11, margin: 0 }}>IZNOS ({valuta})</p>
            <div />
          </div>

          {stavke.map((stavka, i) => (
            <div key={stavka.id}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: 8, marginBottom: 4 }}>
                <Input
                  placeholder={inostranstvo ? `Service ${i + 1}` : `Usluga ${i + 1}`}
                  value={stavka.opis}
                  onChange={v => { azurirajStavku(stavka.id, 'opis', v); setGreske(g => g.filter(x => x !== 'stavke')) }}
                  hasError={ima('stavke') && !stavka.opis}
                />
                <Input type="number" placeholder="0"
                  value={stavka.iznos}
                  onChange={v => { azurirajStavku(stavka.id, 'iznos', v); setGreske(g => g.filter(x => x !== 'stavke')) }}
                  hasError={ima('stavke') && !stavka.iznos}
                />
                <button onClick={() => ukloniStavku(stavka.id)}
                  style={{ background: '#1a0a0a', border: '1px solid #ff4d4d30', borderRadius: 8, color: '#ff4d4d', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#2a1010'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1a0a0a'}
                >×</button>
              </div>
              {/* Konverzija po stavci */}
              {inostranstvo && stavka.iznos && parseFloat(stavka.iznos) > 0 && (
                <p style={{ color: '#2a4a3a', fontSize: 11, margin: '0 0 8px 4px' }}>
                  ≈ {Math.round(parseFloat(stavka.iznos) * kursNum).toLocaleString()} RSD
                </p>
              )}
            </div>
          ))}

          {ima('stavke') && <Greska tekst="Unesi opis i iznos za sve stavke" />}

          <button onClick={dodajStavku}
            style={{ background: '#0a1a10', border: '1px solid #00ffb330', borderRadius: 10, padding: '10px 16px', color: '#00ffb3', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#0f2a1a'; e.currentTarget.style.borderColor = '#00ffb360' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#0a1a10'; e.currentTarget.style.borderColor = '#00ffb330' }}
          >
            + {inostranstvo ? 'Add item / Dodaj stavku' : 'Dodaj stavku'}
          </button>

          {/* Ukupno */}
          <div style={{ borderTop: '1px solid #1a2040', marginTop: 16, paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: inostranstvo && ukupnoValuta > 0 ? 10 : 0 }}>
              <span style={{ color: '#555', fontSize: 13 }}>{inostranstvo ? 'TOTAL / UKUPNO' : 'UKUPNO'}</span>
              <span style={{ color: valutaBoja, fontWeight: 800, fontSize: 24, textShadow: `0 0 20px ${valutaBoja}30` }}>
                {ukupnoValuta.toLocaleString()} <span style={{ fontSize: 14, color: '#444' }}>{valuta}</span>
              </span>
            </div>

            {inostranstvo && ukupnoValuta > 0 && (
              <div style={{ background: '#00ffb308', border: '1px solid #00ffb320', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#2a5a45', fontSize: 11, fontWeight: 700, margin: '0 0 2px 0' }}>DINARSKA PROTIVVREDNOST</p>
                  <p style={{ color: '#1a3a2a', fontSize: 10, margin: 0 }}>Upisuje se u KPO · kurs {kursNum} RSD/{valuta}</p>
                </div>
                <span style={{ color: '#00ffb3', fontWeight: 700, fontSize: 18 }}>
                  {ukupnoRSD.toLocaleString()} RSD
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Upozorenje za IBAN */}
        {inostranstvo && profil && !profil.iban && (
          <div style={{ background: '#1a1500', border: '1px solid #f59e0b25', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ color: '#7a6020', fontSize: 13, margin: 0 }}>
              💡 Dodaj IBAN i SWIFT u{' '}
              <a href="/settings" style={{ color: '#00ffb3', textDecoration: 'none', fontWeight: 600 }}>Podešavanjima</a>
              {' '}za prikaz na PDF-u.
            </p>
          </div>
        )}

      </div>

      {/* Dugme */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: '#0a0a0f', borderTop: '1px solid #1a1a2e' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {sacuvano && profil ? (
            <PreuzmiPDFDugme
              brojFakture={brojFakture} datum={datum} izdavalac={profil}
              klijent={{ naziv: klijentNaziv, pib: klijentPib, adresa: klijentAdresa }}
              stavke={stavke} valuta={valuta} kurs={kursNum}
              style={{ width: '100%' }}
            />
          ) : (
            <button onClick={sacuvajFakturu}
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
