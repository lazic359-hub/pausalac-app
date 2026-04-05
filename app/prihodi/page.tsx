'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomNav } from '@/components/BottomNav'
import { IncomeDetailsModal } from '@/components/IncomeDetailsModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useRouter } from 'next/navigation'
import { isUnpaidInvoiceRow } from '@/lib/faktura-status'
import { buildPrihodRowForPaidFaktura } from '@/lib/kpo-prihod'

const supabase = getSupabaseBrowser()

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
  payload?: unknown
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
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [prihodi, setPrihodi] = useState<Prihod[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMonth, setFilterMonth] = useState<string>(() => String(new Date().getMonth() + 1))
  const [filterYear, setFilterYear] = useState<string>(() => String(new Date().getFullYear()))
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [forma, setForma] = useState({
    klijent: '',
    iznos: '',
    valuta: 'RSD' as Valuta,
    datum: new Date().toISOString().split('T')[0],
    napomena: '',
  })
  const [clientSelect, setClientSelect] = useState<string>('')
  const [newClient, setNewClient] = useState<string>('')
  const [brisanjeId, setBrisanjeId] = useState<string | null>(null)

  // Modal "Iz fakture"
  const [modalOpen, setModalOpen] = useState(false)
  const [neplaceneFakture, setNeplaceneFakture] = useState<FakturaInvoice[]>([])
  const [selectedFakturaId, setSelectedFakturaId] = useState<string | null>(null)
  const [datumPlacanja, setDatumPlacanja] = useState(() => new Date().toISOString().split('T')[0])
  const [modalLoading, setModalLoading] = useState(false)
  const [incomeDetailsOpen, setIncomeDetailsOpen] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<Prihod | null>(null)

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
        const neplacene = sve.filter(f => isUnpaidInvoiceRow(f))
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
    await supabase.from('fakture').update({ status: 'paid' }).eq('id', f.id)
    const { data: postojeca } = await supabase
      .from('prihodi')
      .select('id')
      .eq('user_id', user.id)
      .like('napomena', `%[faktura_id:${f.id}]%`)
      .limit(1)
    if (!postojeca?.length) {
      const row = await buildPrihodRowForPaidFaktura(
        {
          id: f.id,
          klijent: f.klijent,
          iznos: f.iznos,
          valuta: f.valuta,
          broj_fakture: f.broj_fakture,
          napomena: f.napomena,
          payload: f.payload,
        },
        datumPlacanja,
      )
      await supabase.from('prihodi').insert({
        user_id: user.id,
        ...row,
        datum: datumPlacanja,
      })
    }
    setModalOpen(false)
    setModalLoading(false)
    fetchPrihodi()
    setToast({ message: 'Prihod dodat ✅', tone: 'success' })
    setTimeout(() => setToast(null), 3000)
  }

  const dodajBezFakture = async () => {
    if (submitLoading) return
    if (!user) return
    const klijent = (clientSelect === '__new__' ? newClient : forma.klijent).trim()
    if (!klijent || !forma.iznos) return
    const iznosNum = parseFloat(forma.iznos)
    if (isNaN(iznosNum) || iznosNum <= 0) return
    setSubmitLoading(true)
    let iznos_rsd = forma.valuta === 'RSD' ? iznosNum : 0
    if (forma.valuta !== 'RSD') {
      try {
        const res = await fetch(`/api/kurs?datum=${encodeURIComponent(forma.datum)}&valuta=${forma.valuta}`)
        const data = await res.json()
        const kurs = data.rate ?? (forma.valuta === 'USD' ? 108 : 117)
        iznos_rsd = iznosNum * kurs
      } catch {}
    }
    const { error } = await supabase.from('prihodi').insert({
      user_id: user.id,
      klijent,
      iznos: iznosNum,
      valuta: forma.valuta,
      iznos_rsd,
      datum: forma.datum,
      napomena: forma.napomena.trim() || null,
    })
    if (!error) {
      await fetchPrihodi()
      setForma({ klijent: '', iznos: '', valuta: 'RSD', datum: new Date().toISOString().split('T')[0], napomena: '' })
      setClientSelect('')
      setNewClient('')
      setShowForm(false)
      setToast({ message: 'Prihod dodat ✅', tone: 'success' })
      setTimeout(() => setToast(null), 3000)
    } else {
      setToast({ message: 'Greška: ' + error.message, tone: 'danger' })
      setTimeout(() => setToast(null), 4500)
    }
    setSubmitLoading(false)
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
    router.replace('/login?next=/prihodi')
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Preusmeravam na prijavu…</span>
      </div>
    )
  }

  const inp = {
    width: '100%', boxSizing: 'border-box' as const, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', marginBottom: 12,
  }

  const monthLabels: Record<string, string> = {
    '1': 'Januar',
    '2': 'Februar',
    '3': 'Mart',
    '4': 'April',
    '5': 'Maj',
    '6': 'Jun',
    '7': 'Jul',
    '8': 'Avgust',
    '9': 'Septembar',
    '10': 'Oktobar',
    '11': 'Novembar',
    '12': 'Decembar',
  }

  const getYear = (d: string) => d?.split('-')?.[0] ?? ''
  const getMonth = (d: string) => (d?.split('-')?.[1] ?? '').replace(/^0/, '')

  const years = Array.from(
    new Set(prihodi.map(p => getYear(p.datum)).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a))

  const normalizedSearch = search.trim().toLowerCase()
  const prihodiFiltered = prihodi.filter(p => {
    if (filterYear !== 'all' && getYear(p.datum) !== filterYear) return false
    if (filterMonth !== 'all' && getMonth(p.datum) !== filterMonth) return false
    if (!normalizedSearch) return true
    const hay = `${p.klijent ?? ''} ${p.napomena ?? ''}`.toLowerCase()
    return hay.includes(normalizedSearch)
  })

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: toast.tone === 'success' ? '#22c55e' : 'var(--alert-danger-solid)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 24px',
          borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast.message}
        </div>
      )}

      {/* Modal: Iz fakture — overlay */}
      {modalOpen && (
        <div
          className="app-modal-overlay"
          style={{ zIndex: 9998 }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="app-modal-panel app-modal-panel--wide"
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

      <IncomeDetailsModal
        open={incomeDetailsOpen}
        income={selectedIncome}
        onClose={() => setIncomeDetailsOpen(false)}
      />

      <ConfirmModal
        open={brisanjeId != null}
        message="Da li si siguran da želiš da obrišeš ovaj prihod?"
        confirmText="Da, obriši"
        cancelText="Ne"
        onCancel={() => setBrisanjeId(null)}
        onConfirm={() => {
          if (!brisanjeId) return
          void obrisi(brisanjeId)
        }}
      />

      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/dashboard" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          ← Prihodi
        </Link>
        <ThemeToggle />
      </div>

      <div className="page-content dashboard-main-column" style={{ padding: '20px 16px 100px 16px' }}>
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
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>Klijent</label>
            <select
              value={clientSelect}
              onChange={e => {
                const v = e.target.value
                setClientSelect(v)
                if (v !== '__new__') {
                  setNewClient('')
                  setForma({ ...forma, klijent: v })
                } else {
                  setForma({ ...forma, klijent: '' })
                }
              }}
              style={inp}
            >
              <option value="">Izaberi klijenta…</option>
              {Array.from(new Set(prihodi.map(p => (p.klijent ?? '').trim()).filter(Boolean)))
                .sort((a, b) => a.localeCompare(b, 'sr'))
                .map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              <option value="__new__">➕ Novi klijent…</option>
            </select>
            {clientSelect === '__new__' && (
              <input
                type="text"
                placeholder="Unesi ime novog klijenta"
                value={newClient}
                onChange={e => setNewClient(e.target.value)}
                style={inp}
              />
            )}
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
            <button
              type="button"
              onClick={dodajBezFakture}
              disabled={submitLoading}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: '#000',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                cursor: submitLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                opacity: submitLoading ? 0.85 : 1,
              }}
            >
              {submitLoading && <span className="spinner" aria-hidden />}
              <span>{submitLoading ? 'Dodajem…' : 'Dodaj prihod'}</span>
            </button>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>RECENTNI PRIHODI</span>
                <button
                  type="button"
                  onClick={() => fetchPrihodi()}
                  style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
                >
                  Osveži
                </button>
              </div>
              {prihodi.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '10px 12px', border: '1px dashed var(--border)', borderRadius: 12, background: 'var(--bg-primary)' }}>
                  Još nema unetih prihoda.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {prihodi.slice(0, 5).map(p => (
                    <div
                      key={p.id}
                      className="interactive-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedIncome(p); setIncomeDetailsOpen(true) }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedIncome(p)
                          setIncomeDetailsOpen(true)
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                      }}
                      aria-label={`Skorašnji prihod: ${p.klijent}`}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.klijent}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDatum(p.datum)}</div>
                      </div>
                      <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{formatIznos(p.iznos_rsd)} RSD</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 12 }}>Lista prihoda</h2>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginBottom: 10 }}>
            <div style={{ flex: '1 1 140px' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>Mesec</label>
              <select
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                style={{ ...inp, marginBottom: 0 }}
              >
                <option value="all">Svi</option>
                {Object.keys(monthLabels).map(m => (
                  <option key={m} value={m}>{monthLabels[m]}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>Godina</label>
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                style={{ ...inp, marginBottom: 0 }}
              >
                <option value="all">Sve</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>Pretraga (klijent / opis)</label>
          <input
            type="text"
            placeholder="Npr. Acme, konsultacije…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, marginBottom: 0 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Prikazano: <b style={{ color: 'var(--text-primary)' }}>{prihodiFiltered.length}</b> / {prihodi.length}
            </span>
            <button
              type="button"
              onClick={() => { setFilterMonth('all'); setFilterYear('all'); setSearch('') }}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
            >
              Reset
            </button>
          </div>
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Učitavanje...</p>
        ) : prihodiFiltered.length === 0 ? (
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
            {prihodiFiltered.map(p => (
              <div key={p.id}>
                <div
                  className="interactive-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => { setSelectedIncome(p); setIncomeDetailsOpen(true) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedIncome(p)
                      setIncomeDetailsOpen(true)
                    }
                  }}
                  style={{ display: 'grid', gridTemplateColumns: '90px 1fr 120px 40px', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}
                  aria-label={`Detalji prihoda: ${p.klijent}`}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDatum(p.datum)}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.klijent}</span>
                  <span style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{formatIznos(p.iznos_rsd)} RSD</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setBrisanjeId(p.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}
                    aria-label="Obriši prihod"
                  >
                    ×
                  </button>
                </div>
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
