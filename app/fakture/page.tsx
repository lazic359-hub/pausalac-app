'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BottomNav } from '@/components/BottomNav'

const SUPABASE_URL = 'https://ymiyqhblbqkkycpdnlaq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type StatusFakture = 'placena' | 'neplacena' | 'kasni'

type FakturaRow = {
  id: string
  user_id: string
  klijent: string | null
  iznos: number | null
  valuta: string | null
  iznos_rsd: number | null
  datum: string
  napomena: string | null
  broj_fakture: string | null
  status?: StatusFakture | null
}

const PreuzmiPDFDugme = dynamic(() => import('@/components/PreuzmiPDFDugme'), { ssr: false })

function formatIznos(n: number) {
  return new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function formatDatum(d: string) {
  const parts = d.split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}.${parts[1]}.${parts[0]}.`
}

const STATUS_ORDER: StatusFakture[] = ['neplacena', 'placena', 'kasni']
const STATUS_LABELS: Record<StatusFakture, string> = { neplacena: 'Neplaćena', placena: 'Plaćena', kasni: 'Kasni' }
const STATUS_STYLES: Record<StatusFakture, { bg: string; color: string; border: string }> = {
  placena: { bg: 'rgba(0, 200, 83, 0.2)', color: '#00c853', border: '1px solid #00c853' },
  neplacena: { bg: 'rgba(255, 193, 7, 0.25)', color: '#f9a825', border: '1px solid #f9a825' },
  kasni: { bg: 'rgba(244, 67, 54, 0.2)', color: '#f44336', border: '1px solid #f44336' },
}

export default function FakturePage() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [fakture, setFakture] = useState<FakturaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGodina, setSelectedGodina] = useState<number>(new Date().getFullYear())
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u ?? null)
      setAuthLoading(false)
      if (u) ucitajFakture(u.id)
    }
    init()
  }, [])

  const ucitajFakture = async (userId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('fakture')
      .select('*')
      .eq('user_id', userId)
      .order('datum', { ascending: false })
    if (!error && data) setFakture((data as FakturaRow[]) || [])
    setLoading(false)
  }

  const filtriranePoGodini = fakture.filter(f =>
    new Date(f.datum).getFullYear() === selectedGodina
  )

  const q = searchQuery.trim().toLowerCase()
  const filtriranePoPretrazi = q
    ? filtriranePoGodini.filter(f => {
        const klijent = (f.klijent ?? '').toLowerCase()
        const broj = (f.broj_fakture ?? '').toLowerCase()
        const godina = selectedGodina.toString()
        const autoBroj = broj ? '' : `${godina}-${String(filtriranePoGodini.indexOf(f) + 1).padStart(3, '0')}`.toLowerCase()
        return klijent.includes(q) || broj.includes(q) || autoBroj.includes(q)
      })
    : filtriranePoGodini

  const ukupnoRSD = filtriranePoGodini.reduce((sum, f) => sum + (f.iznos_rsd ?? 0), 0)

  const promeniStatus = async (f: FakturaRow, trenutni: StatusFakture) => {
    const idx = STATUS_ORDER.indexOf(trenutni)
    const sledeci = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
    setFakture(prev => prev.map(x => x.id === f.id ? { ...x, status: sledeci } : x))
    await supabase.from('fakture').update({ status: sledeci }).eq('id', f.id)

    // Kada korisnik označi fakturu kao Plaćena: kreiraj prihod (i time KPO unos)
    if (sledeci === 'placena' && user) {
      const iznosRsd = f.iznos_rsd ?? 0
      const datumPlacanja = f.datum
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
        const napomena = (f.napomena?.trim() ? f.napomena + ' ' : '') + (f.broj_fakture ? `[Faktura ${f.broj_fakture}]` : '[Plaćena faktura]')
        await supabase.from('prihodi').insert({
          user_id: user.id,
          klijent: f.klijent ?? '',
          iznos: f.iznos ?? 0,
          valuta: (f.valuta as 'RSD' | 'EUR' | 'USD') ?? 'RSD',
          iznos_rsd: iznosRsd,
          datum: datumPlacanja,
          napomena: napomena.trim() || null,
        })
      }
      setToast('Faktura označena kao plaćena ✅ — prihod i KPO automatski ažurirani')
      setTimeout(() => setToast(null), 4000)
    }
  }

  const godinaOptions = [new Date().getFullYear(), ...Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i - 1)]

  if (authLoading) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32 }}>🧾</span>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>🧾</p>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Prijavite se</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center' }}>Da biste videli listu faktura, morate biti prijavljeni.</p>
        <Link href="/" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, padding: '12px 24px', borderRadius: 12, textDecoration: 'none' }}>
          Nazad na početnu
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 24px',
          borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', textDecoration: 'none' }}>←</Link>
          <span style={{ fontSize: 18 }}>🧾</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>Fakture</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
        </div>
      </div>

      <div className="page-content" style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 100px 16px' }}>

        {/* Nova faktura */}
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/faktura"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px 20px', borderRadius: 12,
              textDecoration: 'none', border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340',
            }}
          >
            ＋ Nova faktura
          </Link>
        </div>

        {/* Filter po godini (kao na KPO) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Godina:</span>
          {godinaOptions.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGodina(g)}
              style={{
                background: selectedGodina === g ? 'var(--accent)' : 'var(--bg-card)',
                color: selectedGodina === g ? '#000' : 'var(--text-muted)',
                fontWeight: selectedGodina === g ? 700 : 400,
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 10,
                border: `1px solid ${selectedGodina === g ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Učitavanje...</div>
        ) : filtriranePoGodini.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Nema faktura za {selectedGodina}.</p>
            <Link href="/faktura" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Kreiraj prvu fakturu →</Link>
          </div>
        ) : (
          <>
            {/* Pretraga */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="search"
                placeholder="Pretraga po klijentu ili broju fakture..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: 360,
                  padding: '10px 14px',
                  fontSize: 14,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Tabela — horizontalni scroll na mobilnom/tabletu */}
            <div className="table-scroll-wrap" style={{ marginBottom: 20 }}>
              <table className="table-min-width" style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Broj fakture</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Klijent</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Datum</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Iznos</th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtriranePoPretrazi.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Nema rezultata za pretragu.</td></tr>
                  ) : (
                    filtriranePoPretrazi.map(f => {
                      const klijent = f.klijent?.trim() ? f.klijent : '—'
                      const iznosRSD = f.iznos_rsd ?? 0
                      const indexUGodini = filtriranePoGodini.findIndex(x => x.id === f.id)
                      const displayBroj = f.broj_fakture?.trim()
                        ? f.broj_fakture
                        : `${selectedGodina}-${String(indexUGodini + 1).padStart(3, '0')}`
                      const imaPodatkeZaPDF = !!f.klijent?.trim()
                      const status: StatusFakture = (f.status && STATUS_ORDER.includes(f.status)) ? f.status : 'neplacena'
                      const st = STATUS_STYLES[status]
                      return (
                        <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600 }}>{displayBroj}</td>
                          <td style={{ padding: '12px 8px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={klijent}>{klijent}</td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{formatDatum(f.datum)}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>
                            {formatIznos(iznosRSD)} RSD
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => promeniStatus(f, status)}
                              style={{
                                background: st.bg,
                                color: st.color,
                                border: st.border,
                                borderRadius: 8,
                                padding: '4px 10px',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {STATUS_LABELS[status]}
                            </button>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            {imaPodatkeZaPDF ? (
                              <PdfCel f={f} displayBroj={displayBroj} />
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Ukupan iznos */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 600 }}>Ukupan iznos ({selectedGodina}.):</span>
              <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 22 }}>{formatIznos(ukupnoRSD)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>RSD</span></span>
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

function PdfCel({ f, displayBroj }: { f: FakturaRow; displayBroj: string }) {
  const klijentNaziv = f.klijent?.trim() || ''
  if (!klijentNaziv) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>

  const profilRaw = typeof window !== 'undefined' ? localStorage.getItem('pausalac_profil') : null
  const profil = profilRaw ? JSON.parse(profilRaw) : { nazivFirme: '', pib: '', maticniBroj: '', brojRacuna: '' }
  const iznosRSD = f.iznos_rsd ?? 0
  const stavke = [{ opis: 'Iznos', iznos: String(iznosRSD) }]

  return (
    <PreuzmiPDFDugme
      brojFakture={displayBroj}
      datum={f.datum}
      izdavalac={profil}
      klijent={{ naziv: klijentNaziv, adresa: '' }}
      stavke={stavke}
      valuta={(f.valuta as 'RSD' | 'EUR' | 'USD') || 'RSD'}
      kurs={1}
      legalNotes={f.napomena ?? undefined}
      style={{ padding: '6px 12px', fontSize: 12 }}
      label="PDF"
    />
  )
}
