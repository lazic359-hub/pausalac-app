'use client'
import DataManagement from "@/components/DataManagement"
import { useState, useEffect } from 'react'

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

const PRAZAN_PROFIL: Profil = {
  nazivFirme: '', pib: '', maticniBroj: '',
  mesecniPorez: '', mesecniPio: '', mesecniZdravstvo: '', mesecniNezaposlenost: '',
  brojRacuna: '', godisnjLimit: '6000000'
}

export default function SettingsPage() {
  const [profil, setProfil] = useState<Profil>(PRAZAN_PROFIL)
  const [sacuvano, setSacuvano] = useState(false)
  const [greske, setGreske] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('pausalac_profil')
    if (saved) setProfil(JSON.parse(saved))
  }, [])

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

  const inp: React.CSSProperties = {
    width: '100%', background: '#111', border: '1px solid #1a2040',
    borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14,
    boxSizing: 'border-box', outline: 'none'
  }

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 18 }}>⚙️</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#00ffb3' }}>Podešavanja profila</span>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 120px 16px' }}>

        {/* Podaci o firmi */}
        <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 20px 0' }}>■ PODACI O FIRMI</p>
          
          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>NAZIV FIRME</p>
          <input style={{ ...inp, marginBottom: 4, borderColor: greske.includes('nazivFirme') ? '#ff4d4d' : '#1a2040' }} placeholder="npr. Moje Preduzeće PR"
            value={profil.nazivFirme} onChange={e => { setProfil({ ...profil, nazivFirme: e.target.value }); setGreske(greske.filter(g => g !== 'nazivFirme')) }} />
          {greske.includes('nazivFirme') && <p style={{ color: '#ff4d4d', fontSize: 11, margin: '0 0 12px 0' }}>⚠️ Obavezno polje</p>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>PIB</p>
              <input style={{ ...inp, borderColor: greske.includes('pib') ? '#ff4d4d' : '#1a2040' }} placeholder="123456789"
                value={profil.pib} onChange={e => { setProfil({ ...profil, pib: e.target.value }); setGreske(greske.filter(g => g !== 'pib')) }} />
              {greske.includes('pib') && <p style={{ color: '#ff4d4d', fontSize: 11, margin: '4px 0 0 0' }}>⚠️ Obavezno polje</p>}
            </div>
            <div>
              <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>MATIČNI BROJ</p>
              <input style={{ ...inp, borderColor: greske.includes('maticniBroj') ? '#ff4d4d' : '#1a2040' }} placeholder="12345678"
                value={profil.maticniBroj} onChange={e => { setProfil({ ...profil, maticniBroj: e.target.value }); setGreske(greske.filter(g => g !== 'maticniBroj')) }} />
              {greske.includes('maticniBroj') && <p style={{ color: '#ff4d4d', fontSize: 11, margin: '4px 0 0 0' }}>⚠️ Obavezno polje</p>}
            </div>
          </div>
        </div>

        {/* Poreski podaci */}
        <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 4px 0' }}>■ PORESKI PODACI (IZ REŠENJA)</p>
          <p style={{ color: '#333', fontSize: 12, margin: '0 0 20px 0' }}>Unesi fiksne mesečne iznose iz svog poreskog rešenja</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'POREZ NA PRIHOD', key: 'mesecniPorez' },
              { label: 'PIO DOPRINOS', key: 'mesecniPio' },
              { label: 'ZDRAVSTVENO OSIGURANJE', key: 'mesecniZdravstvo' },
              { label: 'OSIGURANJE ZA NEZAPOSLENOST', key: 'mesecniNezaposlenost' },
            ].map(field => (
              <div key={field.key}>
                <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>{field.label}</p>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...inp, paddingRight: 45, borderColor: greske.includes(field.key) ? '#ff4d4d' : '#1a2040' }} placeholder="0" type="number"
                    value={profil[field.key as keyof Profil]}
                    onChange={e => { setProfil({ ...profil, [field.key]: e.target.value }); setGreske(greske.filter(g => g !== field.key)) }} />
                  {greske.includes(field.key) && <p style={{ color: '#ff4d4d', fontSize: 11, margin: '4px 0 0 0' }}>⚠️ Obavezno polje</p>}
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', fontSize: 12 }}>RSD</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bankovni podaci */}
        <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <p style={{ color: '#555', fontSize: 11, margin: '0 0 20px 0' }}>■ BANKOVNI PODACI</p>
          
          <p style={{ color: '#666', fontSize: 11, margin: '0 0 6px 0' }}>BROJ POSLOVNOG RAČUNA</p>
          <input style={{ ...inp, marginBottom: 4, borderColor: greske.includes('brojRacuna') ? '#ff4d4d' : '#1a2040' }} placeholder="205-123456789012-53"
            value={profil.brojRacuna} onChange={e => { setProfil({ ...profil, brojRacuna: e.target.value }); setGreske(greske.filter(g => g !== 'brojRacuna')) }} />
          {greske.includes('brojRacuna') && <p style={{ color: '#ff4d4d', fontSize: 11, margin: '0 0 6px 0' }}>⚠️ Obavezno polje</p>}
          <p style={{ color: '#333', fontSize: 11, margin: 0 }}>Format: XXX-XXXXXXXXXXXXX-XX</p>
        </div>

      </div>

      {/* Dugme za čuvanje */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: '#0a0a0f', borderTop: '1px solid #1a1a2e' }}>
        <button onClick={sacuvaj} style={{
          width: '100%', maxWidth: 680, display: 'block', margin: '0 auto',
          background: sacuvano ? '#00cc8f' : '#00ffb3', color: '#000',
          fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 12,
          border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340'
        }}>
          {sacuvano ? '✓ Sačuvano!' : 'Sačuvaj podešavanja'}
        </button>
        <DataManagement />
      </div>
    </div>
  )
}