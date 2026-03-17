'use client'
import { useState, useEffect } from 'react'
import { createClient, User } from '@supabase/supabase-js'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomNav } from '@/components/BottomNav'

const SUPABASE_URL = 'https://ymiyqhblbqkkycpdnlaq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

type Valuta = 'RSD' | 'EUR' | 'USD'

type Prihod = {
  id: string
  user_id: string
  klijent: string
  iznos: number
  valuta: Valuta
  iznos_rsd: number
  datum: string
  napomena: string | null
}

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

function formatIznos(n: number) {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function formatDatum(d: string) {
  const p = d.split('-')
  if (p.length !== 3) return d
  return `${p[2]}.${p[1]}.${p[0]}.`
}

export default function PrihodiPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [prihodi, setPrihodi] = useState<Prihod[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [forma, setForma] = useState({
    klijent: '',
    iznos: '',
    valuta: 'RSD' as Valuta,
    datum: new Date().toISOString().split('T')[0],
    napomena: '',
  })
  const [brisanjeId, setBrisanjeId] = useState<string | null>(null)

  // Modal "Iz fakture"
  const [modalOpen, setModalOpen] = useState(false)
  const [neplaceneFakture, setNeplaceneFakture] = useState<FakturaInvoice[]>([])
  const [selectedFakturaId, setSelectedFakturaId] = useState<string | null>(null)
  const [datumPlacanja, setDatumPlacanja] = useState(() => new Date().toISOString().split('T')[0])
  const [modalLoading, setModalLoading] = useState(false)

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
    if (user) fetchPrihodi()
  }, [user])

  const fetchPrihodi = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('prihodi')
      .select('*')
      .eq('user_id', user.id)
      .order('datum', { ascending: false })
    if (!error && data) setPrihodi(data as Prihod[])
    setLoading(false)
  }

  // Učitaj sve fakture, zatim filtriraj one čiji status NIJE 'Plaćena' (bilo kako zapisano u bazi: neplacena, Neplaćena, kasni, null)
  useEffect(() => {
    if (!modalOpen || !user) return
    const load = async () => {
      const { data, error } = await supabase
        .from('fakture')
        .select('*')
        .eq('user_id', user.id)
        .order('datum', { ascending: false })
      if (!error && data) {
        const sve = data as FakturaInvoice[]
        const neplacene = sve.filter(f => {
          const s = f.status == null ? '' : String(f.status).toLowerCase().trim()
          return s !== 'placena' && s !== 'plaćena' && s !== 'paid'
        })
        setNeplaceneFakture(neplacene)
      } else {
        setNeplaceneFakture([])
      }
      setSelectedFakturaId(null)
      setDatumPlacanja(new Date().toISOString().split('T')[0])
    }
    load()
  }, [modalOpen, user])

  const oznaciKaoPlaceno = async () => {
    if (!user || !selectedFakturaId || !datumPlacanja) return
    const f = neplaceneFakture.find(x => x.id === selectedFakturaId)
    if (!f) return
    setModalLoading(true)
    const iznosRsd = f.iznos_rsd ?? 0
    const napomena = (f.napomena?.trim() ? f.napomena + ' ' : '') + (f.broj_fakture ? `[Faktura ${f.broj_fakture}]` : '[Plaćena faktura]')
    await supabase.from('fakture').update({ status: 'placena' }).eq('id', f.id)
    const { data: postojeca } = await supabase
      .from('prihodi')
      .select('id')
      .eq('user_id', user.id)
      .eq('klijent', f.klijent ?? '')
      .eq('datum', datumPlacanja)
      .gte('iznos_rsd', iznosRsd - 1)
      .lte('iznos_rsd', iznosRsd + 1)
      .limit(1)
    if (!postojeca?.length) {
      await supabase.from('prihodi').insert({
        user_id: user.id,
        klijent: f.klijent ?? '',
        iznos: f.iznos ?? 0,
        valuta: (f.valuta as Valuta) ?? 'RSD',
        iznos_rsd: iznosRsd,
        datum: datumPlacanja,
        napomena: napomena.trim() || null,
      })
    }
    setModalOpen(false)
    setModalLoading(false)
    fetchPrihodi()
    setToast('Prihod dodat ✅')
    setTimeout(() => setToast(null), 3000)
  }

  const dodajBezFakture = async () => {
    if (!user || !forma.klijent.trim() || !forma.iznos) return
    const iznosNum = parseFloat(forma.iznos)
    if (isNaN(iznosNum) || iznosNum <= 0) return
    let iznos_rsd = forma.valuta === 'RSD' ? iznosNum : 0
    if (forma.valuta !== 'RSD') {
      try {
        const res = await fetch(`/api/kurs?datum=${forma.datum}`)
        const data = await res.json()
        const kurs = data.rate ?? 117
        iznos_rsd = iznosNum * kurs
      } catch {}
    }
    const { error } = await supabase.from('prihodi').insert({
      user_id: user.id,
      klijent: forma.klijent.trim(),
      iznos: iznosNum,
      valuta: forma.valuta,
      iznos_rsd,
      datum: forma.datum,
      napomena: forma.napomena.trim() || null,
    })
    if (!error) {
      fetchPrihodi()
      setForma({ klijent: '', iznos: '', valuta: 'RSD', datum: new Date().toISOString().split('T')[0], napomena: '' })
      setShowForm(false)
      setToast('Prihod dodat ✅')
      setTimeout(() => setToast(null), 3000)
    } else {
      setToast('Greška: ' + error.message)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const obrisi = async (id: string) => {
    const { error } = await supabase.from('prihodi').delete().eq('id', id)
    if (!error) {
      setPrihodi(prev => prev.filter(p => p.id !== id))
      setBrisanjeId(null)
    }
  }

  if (authLoading) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32 }}>💼</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Prijavite se</p>
        <Link href="/" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>
          Nazad na početnu
        </Link>
      </div>
    )
  }

  const inp = {
    width: '100%', boxSizing: 'border-box' as const, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', marginBottom: 12,
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 24px',
          borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      {/* Modal: Iz fakture — overlay */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 480, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Prihod iz fakture</span>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 12px 0' }}>Neplaćene fakture — izaberite jednu i unesite datum plaćanja.</p>
              {neplaceneFakture.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '24px 0', textAlign: 'center' }}>Nema neplaćenih faktura.</p>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    {neplaceneFakture.map(fak => (
                      <div
                        key={fak.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedFakturaId(selectedFakturaId === fak.id ? null : fak.id)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedFakturaId(selectedFakturaId === fak.id ? null : fak.id) } }}
                        style={{
                          padding: '12px 14px', marginBottom: 8, background: selectedFakturaId === fak.id ? 'var(--accent)' : 'var(--bg-primary)',
                          border: `2px solid ${selectedFakturaId === fak.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer',
                          color: selectedFakturaId === fak.id ? '#000' : 'var(--text-primary)', fontSize: 14,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{fak.broj_fakture ?? '—'}</div>
                        <div style={{ color: selectedFakturaId === fak.id ? 'rgba(0,0,0,0.8)' : 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{fak.klijent ?? '—'}</div>
                        <div style={{ color: selectedFakturaId === fak.id ? 'rgba(0,0,0,0.7)' : 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                          {formatIznos(fak.iznos_rsd ?? 0)} RSD · {formatDatum(fak.datum)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Datum plaćanja</label>
                  <input
                    type="date"
                    value={datumPlacanja}
                    onChange={e => setDatumPlacanja(e.target.value)}
                    style={{ ...inp, marginBottom: 16 }}
                  />
                  <button
                    type="button"
                    onClick={oznaciKaoPlaceno}
                    disabled={!selectedFakturaId || modalLoading}
                    style={{
                      width: '100%', background: selectedFakturaId ? 'var(--accent)' : 'var(--bg-primary)', color: selectedFakturaId ? '#000' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: selectedFakturaId && !modalLoading ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {modalLoading ? 'Čuvanje...' : 'Označi kao plaćeno'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          ← Prihodi
        </Link>
        <ThemeToggle />
      </div>

      <div className="page-content" style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px 16px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              flex: 1, background: 'var(--accent)', color: 'var(--foreground)', fontWeight: 700, fontSize: 15,
              padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 2px 12px var(--accent-dim)', transition: 'transform 0.15s ease, opacity 0.15s ease',
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
            onClick={() => setShowForm(true)}
            style={{
              flex: 1, background: 'var(--bg-card)', color: 'var(--accent)', fontWeight: 700, fontSize: 15,
              padding: '14px 20px', borderRadius: 12, border: '2px solid var(--accent)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 2px 8px var(--shadow)', transition: 'transform 0.15s ease, opacity 0.15s ease',
            }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>💵</span>
            <span>+ Bez fakture</span>
          </button>
        </div>

        {showForm && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>NOVI PRIHOD (bez fakture)</p>
            <input type="text" placeholder="Ime klijenta" value={forma.klijent} onChange={e => setForma({ ...forma, klijent: e.target.value })} style={inp} />
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input type="number" placeholder="Iznos" value={forma.iznos} onChange={e => setForma({ ...forma, iznos: e.target.value })} style={{ flex: 1, ...inp, marginBottom: 0 }} />
              <select value={forma.valuta} onChange={e => setForma({ ...forma, valuta: e.target.value as Valuta })} style={{ ...inp, marginBottom: 0, minWidth: 80 }}>
                <option value="RSD">RSD</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <input type="date" value={forma.datum} onChange={e => setForma({ ...forma, datum: e.target.value })} style={inp} />
            <input type="text" placeholder="Napomena (opciono)" value={forma.napomena} onChange={e => setForma({ ...forma, napomena: e.target.value })} style={inp} />
            <button type="button" onClick={dodajBezFakture} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
              Dodaj prihod
            </button>
          </div>
        )}

        <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Lista prihoda</h2>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Učitavanje...</p>
        ) : prihodi.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Nema prihoda.</p>
        ) : (
          <div className="table-scroll-wrap" style={{ marginLeft: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }}>
          <div className="table-min-width" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', minWidth: 360 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 120px 40px', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>DATUM</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>KLIJENT</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'right' }}>IZNOS</span>
              <span />
            </div>
            {prihodi.map(p => (
              <div key={p.id}>
                {brisanjeId === p.id ? (
                  <div style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Obrisati?</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setBrisanjeId(null)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'pointer' }}>Ne</button>
                      <button type="button" onClick={() => obrisi(p.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#ff4d4d', color: '#fff', cursor: 'pointer' }}>Da</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 120px 40px', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDatum(p.datum)}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.klijent}</span>
                    <span style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{formatIznos(p.iznos_rsd)} RSD</span>
                    <button type="button" onClick={() => setBrisanjeId(p.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
