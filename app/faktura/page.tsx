'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@supabase/supabase-js'
import { ThemeToggle } from '@/components/ThemeToggle'
const PreuzmiPDFDugme = dynamic(() => import('../../components/PreuzmiPDFDugme'), { ssr: false })

const SUPABASE_URL = 'https://ymiyqhblbqkkycpdnlaq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

type Valuta = 'RSD' | 'EUR' | 'USD'
type Profil = {
  nazivFirme: string; pib: string; maticniBroj: string
  mesecniPorez: string; mesecniPio: string; mesecniZdravstvo: string
  mesecniNezaposlenost: string; brojRacuna: string; godisnjLimit: string
  iban?: string; swift?: string
}
type Stavka = { id: number; opis: string; iznos: string }
type KpoUnos = { datum: string; klijent: string; iznos: number; brojFakture: string; nacinPlacanja: string }

const KURSEVI: Record<Valuta, number> = { RSD: 1, EUR: 117, USD: 108 }

async function sledeciBrojFakture(userId: string): Promise<string> {
  const godina = new Date().getFullYear()
  const prefix = `${godina}-`
  const { data, error } = await supabase
    .from('fakture')
    .select('broj_fakture')
    .eq('user_id', userId)
    .like('broj_fakture', prefix + '%')
  if (error || !data) return `${godina}-001`
  const brojevi = data
    .map((r: { broj_fakture: string }) => r.broj_fakture)
    .filter((b: string) => /^\d{4}-\d{1,6}$/.test(b))
    .map((b: string) => parseInt(b.split('-')[1], 10))
    .filter((n: number) => !isNaN(n))
  const max = brojevi.length ? Math.max(...brojevi) : 0
  return `${godina}-${String(max + 1).padStart(3, '0')}`
}

const kartica: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 16, padding: 20, marginBottom: 16,
  position: 'relative', overflow: 'hidden',
}

function Input({ value, onChange, placeholder, type = 'text', hasError = false, style = {}, onBlur, onKeyDown }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; hasError?: boolean; style?: React.CSSProperties
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); onBlur?.() }}
      onKeyDown={onKeyDown}
      style={{
        width: '100%', background: 'var(--bg-primary)',
        border: `1px solid ${hasError ? '#ff4d4d' : focused ? '#00ffb360' : 'var(--border)'}`,
        borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14,
        boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s',
        boxShadow: focused ? '0 0 0 3px #00ffb315' : 'none', ...style,
      }}
    />
  )
}

function Greska({ tekst }: { tekst: string }) {
  return <p style={{ color: '#ff4d4d', fontSize: 11, margin: '4px 0 8px 0' }}>⚠️ {tekst}</p>
}

type ToastType = 'success' | 'error'
function Toast({ msg, type, onClose }: { msg: string; type: ToastType; onClose: () => void }) {
  const isSuccess = type === 'success'
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      background: isSuccess ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)',
      color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 20px', borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxWidth: 'min(92vw, 400px)',
    }}>
      {msg}
      <button onClick={onClose} style={{ marginLeft: 12, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, opacity: 0.9 }}>×</button>
    </div>
  )
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
            background: aktivan ? boje[v] + '18' : 'var(--bg-primary)',
            border: `1px solid ${aktivan ? boje[v] + '70' : 'var(--border)'}`,
            borderRadius: 10, color: aktivan ? boje[v] : 'var(--text-muted)',
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
  const [user, setUser] = useState<{ id: string } | null>(null)
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
  const [nacinPlacanja, setNacinPlacanja] = useState<string>('Prenos na račun')
  const [legalNotes, setLegalNotes] = useState<string>('domaci')
  const [klijentSuggestions, setKlijentSuggestions] = useState<string[]>([])
  const [showKlijentDropdown, setShowKlijentDropdown] = useState(false)
  const klijentDropdownRef = useRef<HTMLDivElement>(null)
  const [rokPlacanja, setRokPlacanja] = useState<'7' | '15' | '30' | '60' | 'custom'>('30')
  const [rokPlacanjaDatum, setRokPlacanjaDatum] = useState('')
  const [aprKlijentLoading, setAprKlijentLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null)
  const rokPlacanjaAktuelanDatum = (() => {
    if (rokPlacanja === 'custom') return rokPlacanjaDatum || ''
    const d = new Date(datum)
    d.setDate(d.getDate() + parseInt(rokPlacanja, 10))
    return d.toISOString().split('T')[0]
  })()
  const setRokPlacanjaWithDefault = (v: '7' | '15' | '30' | '60' | 'custom') => {
    setRokPlacanja(v)
    if (v === 'custom' && !rokPlacanjaDatum) {
      const d = new Date(datum)
      d.setDate(d.getDate() + 30)
      setRokPlacanjaDatum(d.toISOString().split('T')[0])
    }
  }

  const LEGAL_OPTIONS = [
    { value: 'domaci', label: '🇷🇸 Domaći klijent' },
    { value: 'inostrani', label: '🌍 Inostrani klijent (član 12 st. 4)' },
    { value: 'usluge', label: '📋 Usluge (oslobođeno PDV-a)' },
  ]

  const LEGAL_TEXTS: Record<string, string> = {
    domaci: 'Paušalni porez plaća poreski obveznik. Nije obveznik PDV-a u skladu sa članom 33. Zakona o porezu na dodatu vrednost.',
    inostrani: 'Nije obveznik PDV-a. Promet usluga izvršen u inostranstvu - ne podleže PDV-u u skladu sa članom 12, stav 4. Zakona o PDV-u Republike Srbije.',
    usluge: 'Obveznik nije u sistemu PDV-a. Usluge su oslobođene PDV-a u skladu sa Zakonom o porezu na dodatu vrednost Republike Srbije.',
  }

  useEffect(() => {
    const saved = localStorage.getItem('pausalac_profil')
    if (saved) setProfil(JSON.parse(saved))
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      let cancelled = false
      sledeciBrojFakture(user.id).then((next) => {
        if (!cancelled) setBrojFakture((prev) => (prev === '' ? next : prev))
      })
      return () => { cancelled = true }
    } else {
      setBrojFakture((prev) => (prev === '' ? `${new Date().getFullYear()}-001` : prev))
    }
  }, [user])

  useEffect(() => {
    if (valuta === 'EUR') setKurs('117')
    else if (valuta === 'USD') setKurs('108')
    setSacuvano(false)
  }, [valuta])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Zatvori autocomplete pri kliku van
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (klijentDropdownRef.current && !klijentDropdownRef.current.contains(e.target as Node))
        setShowKlijentDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Učitaj klijente za autocomplete: iz kpo_knjige (localStorage) i prihoda (Supabase)
  useEffect(() => {
    const fromKpo: string[] = []
    try {
      const kpo: KpoUnos[] = JSON.parse(localStorage.getItem('kpo_knjiga') || '[]')
      kpo.forEach(u => { if (u.klijent?.trim()) fromKpo.push(u.klijent.trim()) })
    } catch { /* ignore */ }
    if (!user) {
      setKlijentSuggestions([...new Set(fromKpo)].sort((a, b) => a.localeCompare(b)))
      return
    }
    const fetchPrihodi = async () => {
      const { data } = await supabase.from('prihodi').select('klijent').eq('user_id', user.id)
      const fromPrihodi = (data || []).map((r: { klijent: string }) => r.klijent).filter(Boolean)
      const merged = [...new Set([...fromKpo, ...fromPrihodi])].sort((a, b) => a.localeCompare(b))
      setKlijentSuggestions(merged)
    }
    fetchPrihodi()
  }, [user])

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

  const digitsOnly = (s: string) => (s || '').replace(/\D/g, '')
  const pickStr = (...vals: unknown[]) => {
    for (const v of vals) {
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
  }

  const preuzmiKlijentaIzApr = async () => {
    const pibDigits = digitsOnly(klijentPib)
    if (pibDigits.length !== 9) return
    setAprKlijentLoading(true)
    setToast(null)
    try {
      const res = await fetch(`/api/apr-subjekat?pib=${encodeURIComponent(pibDigits)}`, { method: 'GET', headers: { Accept: 'application/json' } })
      if (!res.ok) {
        if (res.status === 404) {
          setToast({ msg: 'PIB nije pronađen u APR registru', type: 'error' })
          return
        }
        if (res.status === 503) {
          setToast({ msg: 'APR servis trenutno nedostupan', type: 'error' })
          return
        }
        if (res.status === 504) {
          setToast({ msg: 'APR servis ne odgovara (timeout)', type: 'error' })
          return
        }
        setToast({ msg: 'Greška pri preuzimanju podataka sa APR', type: 'error' })
        return
      }
      const data = await res.json()
      const subj = data?.items?.[0] ?? data?.result?.[0] ?? data?.Results?.[0] ?? (Array.isArray(data) ? data[0] : null) ?? data?.data ?? data?.subject ?? data
      if (!subj || typeof subj !== 'object') {
        setToast({ msg: 'PIB nije pronađen u APR registru', type: 'error' })
        return
      }
      const naziv = pickStr(subj.naziv, subj.Naziv, subj.name, subj.subjectName, subj.naziv_firme, subj.businessName)
      let adresa = pickStr(subj.adresa, subj.Adresa, subj.address, subj.fullAddress, subj.adresa_sedista)
      if (!adresa && subj.Address != null && typeof subj.Address === 'object')
        adresa = pickStr((subj.Address as any).FullAddress, (subj.Address as any).Address, (subj.Address as any).adresa)
      if (!adresa && subj.sediste != null) {
        if (typeof subj.sediste === 'string') adresa = subj.sediste.trim()
        else if (typeof subj.sediste === 'object')
          adresa = pickStr((subj.sediste as any).adresa, (subj.sediste as any).Adresa, (subj.sediste as any).fullAddress, (subj.sediste as any).mesto, (subj.sediste as any).ulica)
      }
      if (!adresa) adresa = pickStr(subj.sediste, subj.Sediste)
      if (naziv) setKlijentNaziv(naziv)
      if (adresa) setKlijentAdresa(adresa)
      if (naziv || adresa) {
        setKlijentPib(pibDigits)
        setGreske(g => g.filter(x => x !== 'klijentNaziv' && x !== 'klijentAdresa'))
        setToast({ msg: 'Podaci preuzeti iz APR ✅', type: 'success' })
      } else {
        setToast({ msg: 'PIB nije pronađen u APR registru', type: 'error' })
      }
    } catch {
      setToast({ msg: 'Greška pri preuzimanju podataka sa APR', type: 'error' })
    } finally {
      setAprKlijentLoading(false)
    }
  }

  const sacuvajFakturu = async () => {
    const g: string[] = []
    if (!brojFakture.trim()) g.push('brojFakture')
    if (!klijentNaziv) g.push('klijentNaziv')
    if (!klijentAdresa) g.push('klijentAdresa')
    if (stavke.some(s => !s.opis || !s.iznos)) g.push('stavke')
    if (ukupnoValuta <= 0) g.push('iznos')
    setGreske(g)
    if (g.length > 0) return
    const br = brojFakture.trim()
    const payload = {
      klijent_naziv: klijentNaziv,
      klijent_adresa: klijentAdresa,
      klijent_pib: klijentPib || undefined,
      stavke: stavke.map(s => ({ id: s.id, opis: s.opis, iznos: s.iznos })),
      valuta,
      kurs: kursNum,
      iznos_rsd: ukupnoRSD,
      legal_notes: LEGAL_TEXTS[legalNotes],
    }
    if (user) {
      const { error } = await supabase.from('fakture').insert({ user_id: user.id, broj_fakture: br, datum, payload })
      if (error) {
        const fallback = await supabase.from('fakture').insert({ user_id: user.id, broj_fakture: br, datum })
        if (fallback.error) {
          setGreske(['brojFakture'])
          return
        }
      }
    }
    const noviUnos: KpoUnos = { datum, klijent: klijentNaziv, iznos: ukupnoRSD, brojFakture: br, nacinPlacanja }
    const existing: KpoUnos[] = JSON.parse(localStorage.getItem('kpo_knjiga') || '[]')
    localStorage.setItem('kpo_knjiga', JSON.stringify([...existing, noviUnos]))
    setSacuvano(true)
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.back()}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >←</button>
        <span style={{ fontSize: 18 }}>🧾</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>Nova faktura</span>
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
              <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Idi na Podešavanja →</a>
            </p>
          </div>
        )}

        {/* Izdavalac */}
        {profil && (
          <div style={kartica}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0' }}>
              {inostranstvo ? 'SELLER / IZDAVALAC' : 'IZDAVALAC'}
            </p>
            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 6px 0', color: '#00ffb3' }}>{profil.nazivFirme}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 2px 0' }}>PIB: {profil.pib} · MB: {profil.maticniBroj}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Račun: {profil.brojRacuna}</p>
            {inostranstvo && (profil.iban || profil.swift) && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {profil.iban && <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 2px 0' }}>IBAN: {profil.iban}</p>}
                {profil.swift && <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>SWIFT/BIC: {profil.swift}</p>}
              </div>
            )}
          </div>
        )}

        {/* Broj fakture */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0' }}>BROJ FAKTURE</p>
          <Input
            value={brojFakture}
            onChange={v => { setBrojFakture(v); setGreske(g => g.filter(x => x !== 'brojFakture')) }}
            placeholder="npr. 2026-001"
            hasError={ima('brojFakture')}
          />
          {ima('brojFakture') && <Greska tekst="Unesite broj fakture" />}
        </div>

        {/* Valuta */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: valutaBoja, borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07, transition: 'background 0.3s' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0' }}>VALUTA I DATUM</p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 0' }}>VALUTA FAKTURE</p>
          <ValutaPicker valuta={valuta} onChange={setValuta} />

          {inostranstvo && (
            <div style={{ marginTop: 12, background: valutaBoja + '08', border: `1px solid ${valutaBoja}20`, borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ color: valutaBoja, fontSize: 11, margin: '0 0 8px 0', fontWeight: 700 }}>
                KURS NBS — 1 {valuta} =
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Input type="number" value={kurs} onChange={setKurs}
                  placeholder={valuta === 'EUR' ? '117' : '108'} style={{ flex: 1 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 14, whiteSpace: 'nowrap' }}>RSD</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '6px 0 0 0' }}>
                Ručno unesi aktuelni kurs sa sajta NBS
              </p>
            </div>
          )}

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '14px 0 6px 0' }}>DATUM FAKTURE</p>
          <Input type="date" value={datum} onChange={setDatum} />
        </div>

        {/* Klijent */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#3b82f6', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>
            {inostranstvo ? 'BUYER / KUPAC' : 'PRIMALAC (KLIJENT)'}
          </p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>
            {inostranstvo ? 'COMPANY NAME / NAZIV *' : 'NAZIV KLIJENTA *'}
          </p>
          <div ref={klijentDropdownRef} style={{ position: 'relative', marginBottom: 4 }}>
            <Input value={klijentNaziv}
              onChange={v => { setKlijentNaziv(v); setGreske(g => g.filter(x => x !== 'klijentNaziv')); setShowKlijentDropdown(true) }}
              onFocus={() => setShowKlijentDropdown(true)}
              placeholder={inostranstvo ? 'Company Ltd / Firma DOO' : 'npr. Firma DOO'}
              hasError={ima('klijentNaziv')} />
            {showKlijentDropdown && klijentSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 50,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}>
                {(klijentNaziv.trim()
                  ? klijentSuggestions.filter(k => k.toLowerCase().includes(klijentNaziv.trim().toLowerCase()))
                  : klijentSuggestions
                ).slice(0, 15).map(k => (
                  <button key={k} type="button"
                    onMouseDown={e => { e.preventDefault(); setKlijentNaziv(k); setShowKlijentDropdown(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none',
                      background: 'transparent', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>
          {ima('klijentNaziv') && <Greska tekst="Obavezno polje" />}

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '10px 0 6px 0' }}>
            {inostranstvo ? 'TAX ID / PIB' : 'PIB KLIJENTA'}
          </p>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Input
              value={klijentPib}
              onChange={setKlijentPib}
              placeholder={inostranstvo ? 'VAT number (opciono)' : '123456789 (opciono)'}
              style={{ paddingRight: 40 }}
              onBlur={preuzmiKlijentaIzApr}
              onKeyDown={e => { if (e.key === 'Enter') preuzmiKlijentaIzApr() }}
            />
            {aprKlijentLoading && (
              <span
                aria-hidden
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  width: 18, height: 18, borderRadius: '50%',
                  border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
                  animation: 'apr-spin 0.8s linear infinite',
                }}
              />
            )}
          </div>
          <style>{`@keyframes apr-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>
            {inostranstvo ? 'ADDRESS / ADRESA *' : 'ADRESA *'}
          </p>
          <Input value={klijentAdresa}
            onChange={v => { setKlijentAdresa(v); setGreske(g => g.filter(x => x !== 'klijentAdresa')) }}
            placeholder={inostranstvo ? '123 Business St, City, Country' : 'Bulevar Kralja Aleksandra 1, Beograd'}
            hasError={ima('klijentAdresa')} />
          {ima('klijentAdresa') && <Greska tekst="Obavezno polje" />}
        </div>

        {/* Stavke */}
        <div style={{ ...kartica, border: `1px solid ${ima('stavke') ? '#ff4d4d40' : 'var(--border)'}` }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#f59e0b', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 16px 0' }}>
            {inostranstvo ? 'SERVICES / STAVKE' : 'STAVKE FAKTURE'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: 8, marginBottom: 8 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>
              {inostranstvo ? 'DESCRIPTION / OPIS' : 'OPIS USLUGE'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>IZNOS ({valuta})</p>
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
              {inostranstvo && stavka.iznos && parseFloat(stavka.iznos) > 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 4px' }}>
                  ≈ {Math.round(parseFloat(stavka.iznos) * kursNum).toLocaleString()} RSD
                </p>
              )}
            </div>
          ))}

          {ima('stavke') && <Greska tekst="Unesi opis i iznos za sve stavke" />}

          <button onClick={dodajStavku}
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 16px', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            + {inostranstvo ? 'Add item / Dodaj stavku' : 'Dodaj stavku'}
          </button>

          {/* Ukupno */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: inostranstvo && ukupnoValuta > 0 ? 10 : 0 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{inostranstvo ? 'TOTAL / UKUPNO' : 'UKUPNO'}</span>
              <span style={{ color: valutaBoja, fontWeight: 800, fontSize: 24, textShadow: `0 0 20px ${valutaBoja}30` }}>
                {ukupnoValuta.toLocaleString()} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{valuta}</span>
              </span>
            </div>

            {inostranstvo && ukupnoValuta > 0 && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, margin: '0 0 2px 0' }}>DINARSKA PROTIVVREDNOST</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: 0 }}>Upisuje se u KPO · kurs {kursNum} RSD/{valuta}</p>
                </div>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>
                  {ukupnoRSD.toLocaleString()} RSD
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Zakonska napomena */}
        <div style={kartica}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0' }}>ZAKONSKA NAPOMENA NA PDF-u</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LEGAL_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setLegalNotes(opt.value)}
                style={{
                  textAlign: 'left', padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  background: legalNotes === opt.value ? 'var(--accent-dim)' : 'var(--bg-primary)',
                  border: `1px solid ${legalNotes === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                  color: legalNotes === opt.value ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: legalNotes === opt.value ? 700 : 400, fontSize: 14,
                  transition: 'all 0.2s',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12, background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>TEKST KOJI ĆE BITI NA PDF-u:</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{LEGAL_TEXTS[legalNotes]}</p>
          </div>
        </div>

        {/* Način plaćanja */}
        <div style={kartica}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0' }}>NAČIN PLAĆANJA</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['Prenos na račun', 'Gotovina', 'Kartica', 'PayPal', 'Stripe'].map(opt => {
              const aktivan = nacinPlacanja === opt
              return (
                <button key={opt} onClick={() => setNacinPlacanja(opt)}
                  style={{
                    padding: '11px 0',
                    background: aktivan ? '#00ffb318' : 'var(--bg-primary)',
                    border: `1px solid ${aktivan ? '#00ffb370' : 'var(--border)'}`,
                    borderRadius: 10, color: aktivan ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: aktivan ? 700 : 400, fontSize: 14,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: aktivan ? '0 0 14px #00ffb318' : 'none',
                  }}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Rok plaćanja */}
        <div style={kartica}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0' }}>ROK PLAĆANJA</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {(['7', '15', '30', '60', 'custom'] as const).map(opt => {
              const aktivan = rokPlacanja === opt
              const label = opt === 'custom' ? 'Custom' : `${opt} dana`
              return (
                <button key={opt} onClick={() => setRokPlacanjaWithDefault(opt)}
                  style={{
                    padding: '11px 4px',
                    background: aktivan ? '#00ffb318' : 'var(--bg-primary)',
                    border: `1px solid ${aktivan ? '#00ffb370' : 'var(--border)'}`,
                    borderRadius: 10, color: aktivan ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: aktivan ? 700 : 400, fontSize: 13,
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: aktivan ? '0 0 14px #00ffb318' : 'none',
                  }}>
                  {label}
                </button>
              )
            })}
          </div>
          {rokPlacanja === 'custom' && (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>DATUM ROKA PLAĆANJA</p>
              <Input type="date" value={rokPlacanjaDatum} onChange={setRokPlacanjaDatum}
                placeholder="Izaberite datum" />
            </div>
          )}
        </div>

        {/* Upozorenje za IBAN */}
        {inostranstvo && profil && !profil.iban && (
          <div style={{ background: '#1a1500', border: '1px solid #f59e0b25', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ color: '#7a6020', fontSize: 13, margin: 0 }}>
              💡 Dodaj IBAN i SWIFT u{' '}
              <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Podešavanjima</a>
              {' '}za prikaz na PDF-u.
            </p>
          </div>
        )}

      </div>

      {/* Dugme */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {sacuvano && profil ? (
            <PreuzmiPDFDugme
              brojFakture={brojFakture} datum={datum} izdavalac={profil}
              klijent={{ naziv: klijentNaziv, pib: klijentPib, adresa: klijentAdresa }}
              stavke={stavke} valuta={valuta} kurs={kursNum}
              legalNotes={LEGAL_TEXTS[legalNotes]}
              style={{ width: '100%' }}
            />
          ) : (
            <button onClick={sacuvajFakturu}
              style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340', transition: 'box-shadow 0.2s' }}
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