'use client'
import DataManagement from "@/components/DataManagement"
import { UputstvoModal } from "@/components/UputstvoZaPocetnike"
import { useState, useEffect } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { createClient } from '@supabase/supabase-js'
import { BookOpen, ChevronRight } from 'lucide-react'

const SUPABASE_URL = "https://ymiyqhblbqkkycpdnlaq.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaXlxaGJsYnFra3ljcGRubGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNTI0NzUsImV4cCI6MjA4NzYyODQ3NX0.0G7_IGfqFf7HgC-mKy9ehCt--WdnUUP--iPf-tW0Mvk"
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

type Profil = {
  nazivFirme: string; pib: string; maticniBroj: string
  sifraDelatnosti: string; godinaPrvePausalne: string
  mesecniPorez: string; mesecniPio: string; mesecniZdravstvo: string
  mesecniNezaposlenost: string; brojRacuna: string; godisnjLimit: string
  iban: string; swift: string; sediste: string
  reminder3Dana: boolean; reminder1Dan: boolean
}

const PRAZAN_PROFIL: Profil = {
  nazivFirme: '', pib: '', maticniBroj: '', sifraDelatnosti: '', godinaPrvePausalne: '',
  mesecniPorez: '', mesecniPio: '', mesecniZdravstvo: '', mesecniNezaposlenost: '',
  brojRacuna: '', godisnjLimit: '6000000', iban: '', swift: '', sediste: '',
  reminder3Dana: true, reminder1Dan: true
}

const kartica: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 16, padding: 24, marginBottom: 16,
  position: 'relative', overflow: 'hidden',
}

function Input({ value, onChange, placeholder, type = 'text', hasError = false, style = {}, disabled = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; hasError?: boolean; style?: React.CSSProperties; disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      disabled={disabled}
      readOnly={disabled}
      style={{
        width: '100%', background: disabled ? 'var(--bg-card)' : 'var(--bg-primary)',
        border: `1px solid ${hasError ? '#ff4d4d' : focused && !disabled ? '#00ffb360' : 'var(--border)'}`,
        borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14,
        boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s',
        boxShadow: focused && !disabled ? '0 0 0 3px #00ffb315' : 'none',
        cursor: disabled ? 'default' : 'text', opacity: disabled ? 0.95 : 1, ...style,
      }}
    />
  )
}

function Greska({ tekst }: { tekst: string }) {
  return <p style={{ color: '#ff4d4d', fontSize: 11, margin: '4px 0 8px 0' }}>⚠️ {tekst}</p>
}

export default function SettingsPage() {
  const [profil, setProfil] = useState<Profil>(PRAZAN_PROFIL)
  const [originalProfil, setOriginalProfil] = useState<Profil>(PRAZAN_PROFIL)
  const [editMode, setEditMode] = useState(false)
  const [showConfirmSave, setShowConfirmSave] = useState(false)
  const [sacuvano, setSacuvano] = useState(false)
  const [greske, setGreske] = useState<string[]>([])
  const [ucitavanje, setUcitavanje] = useState(true)
  const [showUputstvo, setShowUputstvo] = useState(false)

  useEffect(() => {
    ucitajPodatke()
  }, [])

  const ucitajPodatke = async () => {
    setUcitavanje(true)
    // Ucitaj iz localStorage (naziv firme, pib, racun itd.)
    const saved = localStorage.getItem('pausalac_profil')
    if (saved) {
      const parsed = { ...PRAZAN_PROFIL, ...JSON.parse(saved) }
      setProfil(parsed)
      setOriginalProfil(parsed)
    }
    // Ucitaj poreske podatke iz Supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('tax_amount, pio_amount, health_amount, unemployment_amount')
        .eq('user_id', user.id)
        .single()
      if (data) {
        const merge = (p: Profil) => ({
          ...p,
          mesecniPorez: data.tax_amount != null ? String(data.tax_amount) : p.mesecniPorez,
          mesecniPio: data.pio_amount != null ? String(data.pio_amount) : p.mesecniPio,
          mesecniZdravstvo: data.health_amount != null ? String(data.health_amount) : p.mesecniZdravstvo,
          mesecniNezaposlenost: data.unemployment_amount != null ? String(data.unemployment_amount) : p.mesecniNezaposlenost,
        })
        setProfil(p => merge(p))
        setOriginalProfil(p => merge(p))
      }
    }
    setUcitavanje(false)
  }

  const startEdit = () => {
    setOriginalProfil(profil)
    setEditMode(true)
  }
  const cancelEdit = () => {
    setProfil(originalProfil)
    setGreske([])
    setEditMode(false)
  }
  const openSaveConfirm = () => setShowConfirmSave(true)
  const doSave = async () => {
    setShowConfirmSave(false)
    await sacuvaj()
    setOriginalProfil(profil)
    setEditMode(false)
  }

  const ocisti = (key: string) => setGreske(g => g.filter(x => x !== key))
  const set = (key: keyof Profil) => (v: string) => { setProfil(p => ({ ...p, [key]: v })); ocisti(key) }
  const setBool = (key: 'reminder3Dana' | 'reminder1Dan') => () => setProfil(p => ({ ...p, [key]: !p[key] }))
  const ima = (key: string) => greske.includes(key)

  const sacuvaj = async () => {
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

    // Sacuvaj ostale podatke u localStorage
    localStorage.setItem('pausalac_profil', JSON.stringify(profil))

    // Sacuvaj poreske podatke u Supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          tax_amount: parseInt(profil.mesecniPorez) || 0,
          pio_amount: parseInt(profil.mesecniPio) || 0,
          health_amount: parseInt(profil.mesecniZdravstvo) || 0,
          unemployment_amount: parseInt(profil.mesecniNezaposlenost) || 0,
        }, { onConflict: 'user_id' })
    }

    setSacuvano(true)
    setTimeout(() => setSacuvano(false), 2000)
  }

  if (ucitavanje) return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--accent)', fontSize: 14 }}>Učitavanje...</span>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={() => window.history.back()}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >←</button>
        <span style={{ fontSize: 18 }}>⚙️</span>
        <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>Podešavanja profila</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {editMode ? (
            <>
              <button onClick={cancelEdit}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>
                Otkaži
              </button>
              <button onClick={openSaveConfirm}
                style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                Sačuvaj izmene
              </button>
            </>
          ) : (
            <button onClick={startEdit}
              style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>
              Izmeni podešavanja
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {showConfirmSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setShowConfirmSave(false)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>
            <p style={{ color: 'var(--text-primary)', fontSize: 16, margin: '0 0 20px 0' }}>Da li si siguran da želiš da sačuvaš izmene?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirmSave(false)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                Ne
              </button>
              <button onClick={doSave}
                style={{ background: 'var(--accent)', color: '#000', border: 'none', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
                Da, sačuvaj
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 120px 16px' }}>

        {/* Podaci o firmi */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>🏢 PODACI O FIRMI</p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>NAZIV FIRME</p>
          <Input value={profil.nazivFirme} onChange={set('nazivFirme')} placeholder="npr. Moje Preduzeće PR" hasError={ima('nazivFirme')} style={{ marginBottom: 4 }} disabled={!editMode} />
          {ima('nazivFirme') && <Greska tekst="Obavezno polje" />}

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>SEDIŠTE / ADRESA FIRME</p>
          <Input value={profil.sediste || ''} onChange={set('sediste')} placeholder="npr. Beograd, Ulica br. 1" style={{ marginBottom: 4 }} disabled={!editMode} />

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>ŠIFRA DELATNOSTI</p>
          <Input value={profil.sifraDelatnosti || ''} onChange={set('sifraDelatnosti')} placeholder="npr. 62.01" style={{ marginBottom: 4 }} disabled={!editMode} />

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '12px 0 6px 0' }}>GODINA PRVE PAUŠALNE GODINE</p>
          <Input type="number" value={profil.godinaPrvePausalne || ''} onChange={set('godinaPrvePausalne')} placeholder="npr. 2022" disabled={!editMode} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0 0' }}>Koristi se za računanje poreskog umanjenja</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>PIB</p>
              <Input value={profil.pib} onChange={set('pib')} placeholder="123456789" hasError={ima('pib')} disabled={!editMode} />
              {ima('pib') && <Greska tekst="Obavezno polje" />}
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>MATIČNI BROJ</p>
              <Input value={profil.maticniBroj} onChange={set('maticniBroj')} placeholder="12345678" hasError={ima('maticniBroj')} disabled={!editMode} />
              {ima('maticniBroj') && <Greska tekst="Obavezno polje" />}
            </div>
          </div>
        </div>

        {/* Poreski podaci */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#f59e0b', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>📋 PORESKI PODACI (IZ REŠENJA)</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 20px 0' }}>Fiksni mesečni iznosi iz poreskog rešenja</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'POREZ NA PRIHOD', key: 'mesecniPorez', boja: '#f59e0b' },
              { label: 'PIO DOPRINOS', key: 'mesecniPio', boja: '#3b82f6' },
              { label: 'ZDRAVSTVENO OSIGURANJE', key: 'mesecniZdravstvo', boja: '#a855f7' },
              { label: 'OSIGURANJE ZA NEZAPOSLENOST', key: 'mesecniNezaposlenost', boja: 'var(--text-muted)' },
            ].map(field => (
              <div key={field.key}>
                <p style={{ color: field.boja, fontSize: 11, margin: '0 0 6px 0', opacity: 0.8 }}>{field.label}</p>
                <div style={{ position: 'relative' }}>
                  <Input type="number" value={profil[field.key as keyof Profil]} onChange={set(field.key as keyof Profil)} placeholder="0" hasError={ima(field.key)} style={{ paddingRight: 48 }} disabled={!editMode} />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>RSD</span>
                </div>
                {ima(field.key) && <Greska tekst="Obavezno polje" />}
              </div>
            ))}
          </div>
        </div>

        {/* Bankovni podaci */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#3b82f6', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>🏦 BANKOVNI PODACI</p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>BROJ POSLOVNOG RAČUNA (DOMAĆI)</p>
          <Input value={profil.brojRacuna} onChange={set('brojRacuna')} placeholder="205-123456789012-53" hasError={ima('brojRacuna')} style={{ marginBottom: 4 }} disabled={!editMode} />
          {ima('brojRacuna') && <Greska tekst="Obavezno polje" />}
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0 0' }}>Format: XXX-XXXXXXXXXXXXX-XX</p>
        </div>

        {/* Devizni podaci */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#6677ff', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>🌍 DEVIZNO PLAĆANJE (OPCIONO)</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 20px 0' }}>
            Prikazuje se na PDF fakturama u EUR i USD
          </p>

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>IBAN</p>
          <Input value={profil.iban || ''} onChange={set('iban')} placeholder="RS35 1234 0000 0123 4567 89" style={{ marginBottom: 14 }} disabled={!editMode} />

          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 6px 0' }}>SWIFT / BIC KOD</p>
          <Input value={profil.swift || ''} onChange={set('swift')} placeholder="npr. AABASRB" disabled={!editMode} />

          <div style={{ marginTop: 12, background: 'var(--accent-dim)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, lineHeight: 1.6 }}>
              💡 IBAN i SWIFT dobijaš od svoje banke. Potrebni su stranim klijentima da bi izvršili devizno plaćanje.
            </p>
          </div>
        </div>

        {/* Notifikacije */}
        <div style={kartica}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: '#a855f7', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.07 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>🔔 NOTIFIKACIJE</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Podseti me 3 dana pre roka plaćanja</span>
              <button type="button" aria-pressed={profil.reminder3Dana} onClick={editMode ? setBool('reminder3Dana') : undefined}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: editMode ? 'pointer' : 'default',
                  background: profil.reminder3Dana ? 'var(--accent)' : 'var(--border)', position: 'relative',
                  opacity: editMode ? 1 : 0.7,
                }}>
                <span style={{ position: 'absolute', top: 2, left: profil.reminder3Dana ? 24 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>Podseti me 1 dan pre roka plaćanja</span>
              <button type="button" aria-pressed={profil.reminder1Dan} onClick={editMode ? setBool('reminder1Dan') : undefined}
                style={{
                  width: 48, height: 26, borderRadius: 13, border: 'none', cursor: editMode ? 'pointer' : 'default',
                  background: profil.reminder1Dan ? 'var(--accent)' : 'var(--border)', position: 'relative',
                  opacity: editMode ? 1 : 0.7,
                }}>
                <span style={{ position: 'absolute', top: 2, left: profil.reminder1Dan ? 24 : 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Uputstvo za početnike — blok u profilu */}
        {showUputstvo && <UputstvoModal onClose={() => setShowUputstvo(false)} />}
        <button
          type="button"
          onClick={() => setShowUputstvo(true)}
          style={{
            ...kartica,
            marginBottom: 16,
            cursor: 'pointer',
            border: '1px solid rgba(255, 153, 68, 0.35)',
            background: 'linear-gradient(135deg, rgba(255, 153, 68, 0.06) 0%, rgba(0, 255, 179, 0.04) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            textAlign: 'left',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 153, 68, 0.12)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'rgba(255, 153, 68, 0.15)',
            border: '1px solid rgba(255, 153, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <BookOpen size={26} color="#ff9944" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#ff9944', fontSize: 11, fontWeight: 700, letterSpacing: '1px', margin: '0 0 4px 0' }}>
              VODIČ ZA POČETNIKE
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, margin: '0 0 4px 0' }}>
              Uputstvo za početnike
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Osnovna pravila paušala, rokovi, KPO i limiti
            </p>
          </div>
          <ChevronRight size={22} color="#ff9944" style={{ flexShrink: 0, opacity: 0.8 }} />
        </button>

        <DataManagement />

      </div>

      {editMode && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={cancelEdit}
            style={{ flex: 1, minWidth: 140, maxWidth: 320, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 12, cursor: 'pointer' }}>
            Otkaži
          </button>
          <button onClick={openSaveConfirm}
            style={{ flex: 1, minWidth: 140, maxWidth: 320, background: sacuvano ? '#00cc8f' : 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00ffb340' }}>
            {sacuvano ? '✓ Sačuvano!' : 'Sačuvaj izmene'}
          </button>
        </div>
      )}
    </div>
  )
}