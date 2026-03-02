'use client'
import DataManagement from "@/components/DataManagement"
import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'

type Profil = {
  nazivFirme: string; pib: string; maticniBroj: string
  mesecniPorez: string; mesecniPio: string; mesecniZdravstvo: string
  mesecniNezaposlenost: string; brojRacuna: string; godisnjLimit: string
  iban: string; swift: string
}

const PRAZAN_PROFIL: Profil = {
  nazivFirme: '', pib: '', maticniBroj: '',
  mesecniPorez: '', mesecniPio: '', mesecniZdravstvo: '', mesecniNezaposlenost: '',
  brojRacuna: '', godisnjLimit: '6000000', iban: '', swift: ''
}

const kartica: React.CSSProperties = {
  background: '#0d1117', border: '1px solid #1a2040',
  borderRadius: 16, padding: 24, marginBottom: 16,
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

export default function SettingsPage() {
  const [profil, setProfil] = useState<Profil>(PRAZAN_PROFIL)
  const [sacuvano, setSacuvano] = useState(false)
  const [greske, setGreske] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('pausalac_profil')
    if (saved) setProfil({ ...PRAZAN_PROFIL, ...JSON.parse(saved) })
  }, [])

  const ocisti = (key: string) => setGreske(g => g.filter(x => x !== key))
  const set = (key: keyof Profil) => (v: string) => { setProfil(p => ({ ...p, [key]: v })); ocisti(key) }
  const ima = (key: string) => greske.includes(key)

  const sacuvaj = () => {
    const nova: string[] = []
    if (!profil.nazivFirme) nova.push('nazivFirme')
    if (!profil.pib) nova.push('pib')
    if (!profil.maticniBroj) nova.push('maticniBroj')
    if (!profil.mesecniPorez) nova.push('mesecniPorez')
    if (!profil.mesecniPio) nova.push('mesecniPio')
    if (!profil.mesecniZdravstvo) nova.push('mesecniZdravstvo')
    if (!profil.brojRacuna) nova.push('brojRacuna')
    setGreske(nova)
    if (nova.length > 0) return
    localStorage.setItem('pausalac_profil', JSON.stringify(profil))
    setSacuvano(true)
    setTimeout(() => setSacuvano(false), 2000)
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.back()}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = '#00ffb3'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >←</button>
        <span style={{ fontSize: 18 }}>⚙️</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#00ffb3' }}>Podešavanja profila</span>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 120px 16px' }}>

        {/* Podaci o firmi */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#00ffb3', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 20px 0' }}>■ PODACI O FIRMI</p>

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>NAZIV FIRME</p>
          <Input value={profil.nazivFirme} onChange={set('nazivFirme')} placeholder="npr. Moje Preduzeće PR" hasError={ima('nazivFirme')} style={{ marginBottom: 4 }} />
          {ima('nazivFirme') && <Greska tekst="Obavezno polje" />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
            <div>
              <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>PIB</p>
              <Input value={profil.pib} onChange={set('pib')} placeholder="123456789" hasError={ima('pib')} />
              {ima('pib') && <Greska tekst="Obavezno polje" />}
            </div>
            <div>
              <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>MATIČNI BROJ</p>
              <Input value={profil.maticniBroj} onChange={set('maticniBroj')} placeholder="12345678" hasError={ima('maticniBroj')} />
              {ima('maticniBroj') && <Greska tekst="Obavezno polje" />}
            </div>
          </div>
        </div>

        {/* Poreski podaci */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#f59e0b', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 4px 0' }}>■ PORESKI PODACI (IZ REŠENJA)</p>
          <p style={{ color: '#333', fontSize: 12, margin: '0 0 20px 0' }}>Fiksni mesečni iznosi iz poreskog rešenja</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'POREZ NA PRIHOD', key: 'mesecniPorez', boja: '#f59e0b' },
              { label: 'PIO DOPRINOS', key: 'mesecniPio', boja: '#3b82f6' },
              { label: 'ZDRAVSTVENO OSIGURANJE', key: 'mesecniZdravstvo', boja: '#a855f7' },
              { label: 'OSIGURANJE ZA NEZAPOSLENOST', key: 'mesecniNezaposlenost', boja: '#555' },
            ].map(field => (
              <div key={field.key}>
                <p style={{ color: field.boja, fontSize: 11, margin: '0 0 6px 0', opacity: 0.8 }}>{field.label}</p>
                <div style={{ position: 'relative' }}>
                  <Input type="number" value={profil[field.key as keyof Profil]} onChange={set(field.key as keyof Profil)} placeholder="0" hasError={ima(field.key)} style={{ paddingRight: 48 }} />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#444', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>RSD</span>
                </div>
                {ima(field.key) && <Greska tekst="Obavezno polje" />}
              </div>
            ))}
          </div>
        </div>

        {/* Bankovni podaci */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#3b82f6', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 20px 0' }}>■ BANKOVNI PODACI</p>

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>BROJ POSLOVNOG RAČUNA (DOMAĆI)</p>
          <Input value={profil.brojRacuna} onChange={set('brojRacuna')} placeholder="205-123456789012-53" hasError={ima('brojRacuna')} style={{ marginBottom: 4 }} />
          {ima('brojRacuna') && <Greska tekst="Obavezno polje" />}
          <p style={{ color: '#333', fontSize: 11, margin: '4px 0 0 0' }}>Format: XXX-XXXXXXXXXXXXX-XX</p>
        </div>

        {/* Devizni podaci */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#6677ff', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 4px 0' }}>🌍 DEVIZNO PLAĆANJE (OPCIONO)</p>
          <p style={{ color: '#333', fontSize: 12, margin: '0 0 20px 0' }}>
            Prikazuje se na PDF fakturama u EUR i USD
          </p>

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>IBAN</p>
          <Input
            value={profil.iban || ''}
            onChange={set('iban')}
            placeholder="RS35 1234 0000 0123 4567 89"
            style={{ marginBottom: 14 }}
          />

          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>SWIFT / BIC KOD</p>
          <Input
            value={profil.swift || ''}
            onChange={set('swift')}
            placeholder="npr. AABASRB"
          />

          <div style={{ marginTop: 12, background: '#6677ff10', border: '1px solid #6677ff20', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: '#3a3a7a', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
              💡 IBAN i SWIFT dobijaš od svoje banke. Potrebni su stranim klijentima da bi izvršili devizno plaćanje.
            </p>
          </div>
        </div>

        <DataManagement />

      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: '#0a0a0f', borderTop: '1px solid #1a1a2e' }}>
        <button onClick={sacuvaj}
          style={{ width: '100%', maxWidth: 680, display: 'block', margin: '0 auto', background: sacuvano ? '#00cc8f' : '#00ffb3', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340', transition: 'box-shadow 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 40px #00ffb370'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px #00ffb340'}
        >
          {sacuvano ? '✓ Sačuvano!' : 'Sačuvaj podešavanja'}
        </button>
      </div>
    </div>
  )
}
