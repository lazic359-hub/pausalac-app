'use client'
import { useState, useEffect } from 'react'

type Valuta = 'RSD' | 'EUR' | 'USD'

type Faktura = {
  id: number
  klijent: string
  iznos: number
  valuta: Valuta
  iznosRSD: number
  datum: string
  napomena: string
}

const KURSEVI = { RSD: 1, EUR: 117, USD: 108 }
const LIMIT = 6000000

export default function Home() {
  const [fakture, setFakture] = useState<Faktura[]>([])
  const [forma, setForma] = useState({ klijent: '', iznos: '', valuta: 'EUR' as Valuta, datum: '', napomena: '' })
  const [tab, setTab] = useState<'dashboard' | 'dodaj' | 'fakture'>('dashboard')

  useEffect(() => {
    const saved = localStorage.getItem('fakture')
    if (saved) setFakture(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('fakture', JSON.stringify(fakture))
  }, [fakture])

  const ukupnoRSD = fakture.reduce((s, f) => s + f.iznosRSD, 0)
  const ukupnoEUR = Math.round(ukupnoRSD / KURSEVI.EUR)
  const procenat = Math.min((ukupnoRSD / LIMIT) * 100, 100)
  const porez = Math.round(ukupnoRSD * 0.1)
  const pio = Math.round(ukupnoRSD * 0.24)
  const zdravstvo = Math.round(ukupnoRSD * 0.103)
  const ukupanPorez = porez + pio + zdravstvo
  const neto = ukupnoRSD - ukupanPorez

  const dodajFakturu = () => {
    if (!forma.klijent || !forma.iznos) return
    const iznosRSD = parseFloat(forma.iznos) * KURSEVI[forma.valuta]
    setFakture([...fakture, { ...forma, id: Date.now(), iznos: parseFloat(forma.iznos), iznosRSD }])
    setForma({ klijent: '', iznos: '', valuta: 'EUR', datum: '', napomena: '' })
    setTab('dashboard')
  }

  const obrisi = (id: number) => setFakture(fakture.filter(f => f.id !== id))

  const bojaBar = procenat > 90 ? '#ff4d4d' : procenat > 70 ? '#ffcc00' : '#00ffb3'

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>💼</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#00ffb3' }}>Paušalac</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', background: '#111', padding: '4px 10px', borderRadius: 20, border: '1px solid #222' }}>
          {new Date().getFullYear()}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {tab === 'dashboard' && (
          <>
            {/* Glavni broj */}
            <div style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1e 100%)', border: '1px solid #1a2040', borderRadius: 16, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 150, height: 150, background: '#00ffb3', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.15 }} />
              <p style={{ color: '#555', fontSize: 12, marginBottom: 4 }}>UKUPNI PRIHOD</p>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#00ffb3', margin: '0 0 4px 0', textShadow: '0 0 30px #00ffb340' }}>
                {ukupnoRSD.toLocaleString()} <span style={{ fontSize: 16, color: '#444' }}>RSD</span>
              </p>
              <p style={{ color: '#444', fontSize: 14, margin: '0 0 20px 0' }}>≈ {ukupnoEUR.toLocaleString()} EUR</p>

              {/* Progress bar */}
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

            {/* Grid kartica */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              
              <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: '#a855f7', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.2 }} />
                <p style={{ color: '#555', fontSize: 11, margin: '0 0 8px 0' }}>NETO PRIHOD</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#a855f7', margin: 0, textShadow: '0 0 20px #a855f740' }}>{neto.toLocaleString()}</p>
                <p style={{ color: '#333', fontSize: 11, margin: '4px 0 0 0' }}>RSD</p>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: '#f59e0b', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.2 }} />
                <p style={{ color: '#555', fontSize: 11, margin: '0 0 8px 0' }}>UKUPAN POREZ</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b', margin: 0, textShadow: '0 0 20px #f59e0b40' }}>{ukupanPorez.toLocaleString()}</p>
                <p style={{ color: '#333', fontSize: 11, margin: '4px 0 0 0' }}>RSD</p>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: '#3b82f6', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.2 }} />
                <p style={{ color: '#555', fontSize: 11, margin: '0 0 8px 0' }}>PIO DOPRINOS</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6', margin: 0, textShadow: '0 0 20px #3b82f640' }}>{pio.toLocaleString()}</p>
                <p style={{ color: '#333', fontSize: 11, margin: '4px 0 0 0' }}>RSD (24%)</p>
              </div>

              <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: '#00ffb3', borderRadius: '50%', filter: 'blur(40px)', opacity: 0.15 }} />
                <p style={{ color: '#555', fontSize: 11, margin: '0 0 8px 0' }}>BROJ FAKTURA</p>
                <p style={{ fontSize: 36, fontWeight: 800, color: '#00ffb3', margin: 0, textShadow: '0 0 20px #00ffb340' }}>{fakture.length}</p>
                <p style={{ color: '#333', fontSize: 11, margin: '4px 0 0 0' }}>unetih</p>
              </div>
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
          </>
        )}

        {tab === 'dodaj' && (
          <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 24 }}>
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 20px 0' }}>NOVI PRIHOD</p>
            {[
              { placeholder: 'Ime klijenta', key: 'klijent', type: 'text' },
            ].map(field => (
              <input
                key={field.key}
                type={field.type}
                placeholder={field.placeholder}
                value={forma[field.key as keyof typeof forma]}
                onChange={e => setForma({...forma, [field.key]: e.target.value})}
                style={{ width: '100%', background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
              />
            ))}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input
                type="number"
                placeholder="Iznos"
                value={forma.iznos}
                onChange={e => setForma({...forma, iznos: e.target.value})}
                style={{ flex: 1, background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, outline: 'none' }}
              />
              <select
                value={forma.valuta}
                onChange={e => setForma({...forma, valuta: e.target.value as Valuta})}
                style={{ background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, outline: 'none' }}
              >
                <option>EUR</option>
                <option>USD</option>
                <option>RSD</option>
              </select>
            </div>
            <input
              type="date"
              value={forma.datum}
              onChange={e => setForma({...forma, datum: e.target.value})}
              style={{ width: '100%', background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            <input
              type="text"
              placeholder="Napomena (opciono)"
              value={forma.napomena}
              onChange={e => setForma({...forma, napomena: e.target.value})}
              style={{ width: '100%', background: '#111', border: '1px solid #1a2040', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, marginBottom: 20, boxSizing: 'border-box', outline: 'none' }}
            />
            <button
              onClick={dodajFakturu}
              style={{ width: '100%', background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340' }}
            >
              + Dodaj prihod
            </button>
          </div>
        )}

        {tab === 'fakture' && (
          <div>
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 16px 0' }}>UNESENI PRIHODI ({fakture.length})</p>
            {fakture.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#333' }}>
                <p style={{ fontSize: 40 }}>📋</p>
                <p>Još nema unetih prihoda</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...fakture].reverse().map(f => (
                  <div key={f.id} style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: 700, margin: '0 0 4px 0' }}>{f.klijent}</p>
                      <p style={{ color: '#444', fontSize: 12, margin: 0 }}>{f.datum || 'Bez datuma'}</p>
                      {f.napomena && <p style={{ color: '#333', fontSize: 12, margin: '4px 0 0 0' }}>{f.napomena}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: '#00ffb3', fontWeight: 700, margin: '0 0 2px 0' }}>{f.iznos} {f.valuta}</p>
                        <p style={{ color: '#333', fontSize: 12, margin: 0 }}>{f.iznosRSD.toLocaleString()} RSD</p>
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

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0a0a0f', borderTop: '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-around', padding: '12px 0 20px 0' }}>
        {[
          { key: 'dashboard', icon: '📊', label: 'Pregled' },
          { key: 'dodaj', icon: '＋', label: 'Dodaj' },
          { key: 'fakture', icon: '📋', label: 'Prihodi' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as any)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: tab === item.key ? '#00ffb3' : '#444', fontSize: 12, fontWeight: tab === item.key ? 700 : 400 }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ height: 80 }} />
    </div>
  )
}