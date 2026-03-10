'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ThemeToggle } from '@/components/ThemeToggle'

const SUPABASE_URL = "https://ymiyqhblbqkkycpdnlaq.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

type Kategorija = 'oprema' | 'softver' | 'zakup' | 'usluge' | 'ostalo'

type Rashod = {
  id: string
  user_id: string
  datum: string
  opis: string
  iznos: number
  kategorija: Kategorija
  broj_racuna: string
}

const KATEGORIJE: { key: Kategorija; label: string; boja: string; ikona: string }[] = [
  { key: 'oprema',  label: 'Oprema',  boja: '#3b82f6', ikona: '💻' },
  { key: 'softver', label: 'Softver', boja: '#a855f7', ikona: '📦' },
  { key: 'zakup',   label: 'Zakup',   boja: '#f59e0b', ikona: '🏠' },
  { key: 'usluge',  label: 'Usluge',  boja: '#00ffb3', ikona: '🔧' },
  { key: 'ostalo',  label: 'Ostalo',  boja: '#6b7280', ikona: '📎' },
]

const KVARTALI = {
  Q1: ['01','02','03'],
  Q2: ['04','05','06'],
  Q3: ['07','08','09'],
  Q4: ['10','11','12'],
}

export default function RashodiPage() {
  const [rashodi, setRashodi] = useState<Rashod[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'lista' | 'dodaj'>('lista')
  const [filter, setFilter] = useState<'sve' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('sve')
  const [selectedGodina, setSelectedGodina] = useState(new Date().getFullYear())
  const [brisanje, setBrisanje] = useState<string | null>(null)
  const [forma, setForma] = useState<{
    datum: string; opis: string; iznos: string;
    kategorija: Kategorija; broj_racuna: string
  }>({
    datum: new Date().toISOString().split('T')[0],
    opis: '', iznos: '', kategorija: 'oprema', broj_racuna: ''
  })
  const [greska, setGreska] = useState('')
  const [uspeh, setUspeh] = useState(false)

  useEffect(() => {
    fetchRashodi()
  }, [selectedGodina])

  const fetchRashodi = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('rashodi')
      .select('*')
      .gte('datum', `${selectedGodina}-01-01`)
      .lte('datum', `${selectedGodina}-12-31`)
      .order('datum', { ascending: false })
    if (!error && data) setRashodi(data as Rashod[])
    setLoading(false)
  }

  const dodaj = async () => {
    setGreska('')
    if (!forma.opis.trim()) { setGreska('Unesite opis rashoda'); return }
    if (!forma.iznos || parseFloat(forma.iznos) <= 0) { setGreska('Unesite ispravan iznos'); return }
    if (!forma.datum) { setGreska('Unesite datum'); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setGreska('Niste prijavljeni'); return }

    const novi = {
      user_id: user.id,
      datum: forma.datum,
      opis: forma.opis.trim(),
      iznos: parseFloat(forma.iznos),
      kategorija: forma.kategorija,
      broj_racuna: forma.broj_racuna.trim(),
    }

    const { data, error } = await supabase.from('rashodi').insert(novi).select().single()
    if (error) { setGreska('Greška: ' + error.message); return }

    setRashodi([data as Rashod, ...rashodi])
    setForma({ datum: new Date().toISOString().split('T')[0], opis: '', iznos: '', kategorija: 'oprema', broj_racuna: '' })
    setUspeh(true)
    setTimeout(() => { setUspeh(false); setTab('lista') }, 1200)
  }

  const obrisi = async (id: string) => {
    const { error } = await supabase.from('rashodi').delete().eq('id', id)
    if (!error) { setRashodi(rashodi.filter(r => r.id !== id)); setBrisanje(null) }
  }

  const rashodiPoGodini = rashodi
  const filtrirani = rashodiPoGodini.filter(r => {
    if (filter === 'sve') return true
    const mes = r.datum.split('-')[1]
    return KVARTALI[filter].includes(mes)
  })

  const ukupnoFilter = filtrirani.reduce((s, r) => s + r.iznos, 0)
  const ukupnoGodina = rashodiPoGodini.reduce((s, r) => s + r.iznos, 0)

  const poKategoriji = KATEGORIJE.map(k => ({
    ...k,
    iznos: rashodiPoGodini.filter(r => r.kategorija === k.key).reduce((s, r) => s + r.iznos, 0),
  })).filter(k => k.iznos > 0)

  const formatDatum = (d: string) => {
    const [g, m, dan] = d.split('-')
    return `${dan}.${m}.${g}`
  }
  const formatIznos = (n: number) =>
    new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)',
    fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 18 }}>💸</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#ff6b6b' }}>Rashodi</span>
        </div>
        <ThemeToggle />
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px 16px' }}>

        {/* Summary kartica */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>UKUPNI RASHODI {selectedGodina}.</p>
            <p style={{ color: '#ff6b6b', fontWeight: 800, fontSize: 28, margin: 0 }}>
              {formatIznos(ukupnoGodina)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>RSD</span>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>BROJ RASHODA</p>
            <p style={{ color: '#ff6b6b', fontWeight: 800, fontSize: 28, margin: 0 }}>{rashodiPoGodini.length}</p>
          </div>
        </div>

        {/* Kategorije breakdown */}
        {poKategoriji.length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 14px 0' }}>PO KATEGORIJAMA</p>
            {poKategoriji.map(k => (
              <div key={k.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{k.ikona}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{k.label}</span>
                </div>
                <span style={{ color: k.boja, fontWeight: 700, fontSize: 14 }}>{formatIznos(k.iznos)} RSD</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabovi */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['lista', 'dodaj'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, background: tab === t ? '#ff6b6b' : 'var(--bg-card)',
              color: tab === t ? '#fff' : 'var(--text-muted)',
              fontWeight: tab === t ? 700 : 400, fontSize: 14,
              padding: '10px 0', borderRadius: 10,
              border: `1px solid ${tab === t ? '#ff6b6b' : 'var(--border)'}`,
              cursor: 'pointer',
            }}>
              {t === 'lista' ? '📋 Lista rashoda' : '➕ Dodaj rashod'}
            </button>
          ))}
        </div>

        {/* ── DODAJ TAB ── */}
        {tab === 'dodaj' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>NOVI RASHOD</p>

            <input type="date" value={forma.datum} onChange={e => setForma({ ...forma, datum: e.target.value })} style={inp} />
            <input type="text" placeholder="Opis (npr. laptop, Adobe licenca...)" value={forma.opis}
              onChange={e => setForma({ ...forma, opis: e.target.value })} style={inp} />
            <input type="number" placeholder="Iznos u RSD" value={forma.iznos}
              onChange={e => setForma({ ...forma, iznos: e.target.value })} style={inp} />
            <input type="text" placeholder="Broj računa / fakture (opciono)" value={forma.broj_racuna}
              onChange={e => setForma({ ...forma, broj_racuna: e.target.value })} style={inp} />

            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 10px 0' }}>KATEGORIJA</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {KATEGORIJE.map(k => (
                <button key={k.key} onClick={() => setForma({ ...forma, kategorija: k.key })}
                  style={{
                    background: forma.kategorija === k.key ? k.boja + '22' : 'var(--bg-primary)',
                    border: `1px solid ${forma.kategorija === k.key ? k.boja : 'var(--border)'}`,
                    color: forma.kategorija === k.key ? k.boja : 'var(--text-muted)',
                    borderRadius: 10, padding: '8px 14px', fontSize: 13,
                    fontWeight: forma.kategorija === k.key ? 700 : 400, cursor: 'pointer',
                  }}>
                  {k.ikona} {k.label}
                </button>
              ))}
            </div>

            {greska && <p style={{ color: '#ff6b6b', fontSize: 13, margin: '0 0 12px 0' }}>⚠️ {greska}</p>}
            {uspeh && <p style={{ color: '#00ffb3', fontSize: 13, margin: '0 0 12px 0' }}>✅ Rashod dodat!</p>}

            <button onClick={dodaj} style={{
              width: '100%', background: '#ff6b6b', color: '#fff',
              fontWeight: 700, fontSize: 15, padding: '14px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
            }}>
              + Dodaj rashod
            </button>
          </div>
        )}

        {/* ── LISTA TAB ── */}
        {tab === 'lista' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Godina:</span>
              {[2022,2023,2024,2025,2026].map(g => (
                <button key={g} onClick={() => setSelectedGodina(g)} style={{
                  background: selectedGodina === g ? '#ff6b6b' : 'var(--bg-card)',
                  color: selectedGodina === g ? '#fff' : 'var(--text-muted)',
                  fontWeight: selectedGodina === g ? 700 : 400, fontSize: 13,
                  padding: '6px 12px', borderRadius: 10,
                  border: `1px solid ${selectedGodina === g ? '#ff6b6b' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}>{g}</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['sve','Q1','Q2','Q3','Q4'] as const).map(k => (
                <button key={k} onClick={() => setFilter(k)} style={{
                  flex: 1, background: filter === k ? '#ff6b6b' : 'var(--bg-card)',
                  color: filter === k ? '#fff' : 'var(--text-muted)',
                  fontWeight: filter === k ? 700 : 400, fontSize: 13,
                  padding: '8px 0', borderRadius: 10,
                  border: `1px solid ${filter === k ? '#ff6b6b' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}>
                  {k === 'sve' ? 'Sve' : k}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Učitavanje...</div>
            ) : filtrirani.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 40 }}>💸</p>
                <p>Nema rashoda {filter !== 'sve' ? `za ${filter}` : `za ${selectedGodina}.`}</p>
                <button onClick={() => setTab('dodaj')} style={{
                  marginTop: 12, background: '#ff6b6b', color: '#fff',
                  fontWeight: 700, fontSize: 14, padding: '10px 24px',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                }}>+ Dodaj prvi rashod</button>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 110px 40px', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>DATUM</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>OPIS</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, textAlign: 'right' }}>IZNOS</p>
                  <div />
                </div>

                {filtrirani.map(r => {
                  const kat = KATEGORIJE.find(k => k.key === r.kategorija)
                  return (
                    <div key={r.id}>
                      {brisanje === r.id ? (
                        <div style={{ padding: '14px 16px', background: '#1a0a0a', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>Obrisati ovaj rashod?</p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setBrisanje(null)} style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-muted)', fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>Otkaži</button>
                            <button onClick={() => obrisi(r.id)} style={{ background: '#ff4d4d', border: 'none', color: '#fff', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>Da, obriši</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 110px 40px', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{formatDatum(r.datum)}</p>
                          <div>
                            <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.opis}</p>
                            <p style={{ color: kat?.boja || 'var(--text-muted)', fontSize: 11, margin: 0 }}>{kat?.ikona} {kat?.label}{r.broj_racuna ? ` · ${r.broj_racuna}` : ''}</p>
                          </div>
                          <p style={{ color: '#ff6b6b', fontWeight: 700, fontSize: 13, margin: 0, textAlign: 'right' }}>{formatIznos(r.iznos)} RSD</p>
                          <button onClick={() => setBrisanje(r.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', textAlign: 'center' }}>×</button>
                        </div>
                      )}
                    </div>
                  )
                })}

                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 110px 40px', gap: 8, padding: '14px 16px', background: 'var(--bg-primary)', alignItems: 'center' }}>
                  <div /><div />
                  <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 14, margin: 0, textAlign: 'right' }}>{formatIznos(ukupnoFilter)} RSD</p>
                  <div />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}