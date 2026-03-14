'use client'
import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { daysLateForCurrentMonth, latePenaltyAmount } from '@/lib/tax-deadline'

export type MonthlyObligationsHandle = { openUplatniceModal: () => void }

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

type Obaveza = {
  naziv: string
  kljuc: keyof Profil
  opis: string
  boja: string
  sifraPlacanja: string
}

const OBAVEZE: Obaveza[] = [
  { naziv: 'Porez na prihod', kljuc: 'mesecniPorez', opis: 'Mesečna akontacija poreza', boja: '#f59e0b', sifraPlacanja: '289' },
  { naziv: 'PIO doprinos', kljuc: 'mesecniPio', opis: 'Penzijsko i invalidsko osiguranje', boja: '#3b82f6', sifraPlacanja: '290' },
  { naziv: 'Zdravstveno osiguranje', kljuc: 'mesecniZdravstvo', opis: 'Doprinos za zdravstveno', boja: '#a855f7', sifraPlacanja: '291' },
  { naziv: 'Osiguranje za nezaposlenost', kljuc: 'mesecniNezaposlenost', opis: 'Doprinos za slučaj nezaposlenosti', boja: '#00ffb3', sifraPlacanja: '292' },
]

function generisiQR(profil: Profil, iznos: string, sifra: string, addPenaltyRsd = 0): string {
  const racun = profil.brojRacuna || '000-0000000000000-00'
  const naziv = profil.nazivFirme || 'Naziv firme'
  const base = parseFloat(iznos || '0') || 0
  const total = base + addPenaltyRsd
  const iznosFormatiran = total.toFixed(2)
  const pozivNaBroj = '97-123456789'
  return `K:PR|V:01|C:1|R:${racun}|N:${naziv}|I:RSD${iznosFormatiran}|SF:${sifra}|RO:${pozivNaBroj}`
}

const MESIOCI_SR = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'November', 'Decembar']

function MonthlyObligationsInner(_: unknown, ref: React.Ref<MonthlyObligationsHandle>) {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [aktivniModal, setAktivniModal] = useState<Obaveza | null>(null)
  const [showUplatniceModal, setShowUplatniceModal] = useState(false)
  const [uplatniceIndex, setUplatniceIndex] = useState(0)
  const daysLate = daysLateForCurrentMonth()
  const now = new Date()
  const mesecLabel = `${MESIOCI_SR[now.getMonth()]} ${now.getFullYear()}`

  useImperativeHandle(ref, () => ({
    openUplatniceModal: () => { setShowUplatniceModal(true); setUplatniceIndex(0); },
  }), [])

  useEffect(() => {
    const saved = localStorage.getItem('pausalac_profil')
    if (saved) setProfil(JSON.parse(saved))
  }, [])

  if (!profil) return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginTop: 16 }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0' }}>MESEČNE OBAVEZE</p>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Unesi podatke u <a href="/settings" style={{ color: 'var(--accent)' }}>Podešavanjima</a> da vidiš mesečne obaveze</p>
      </div>
    </div>
  )

  const ukupno = OBAVEZE.reduce((sum, o) => sum + (parseFloat(profil[o.kljuc] as string) || 0), 0)

  return (
    <>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>MESEČNE OBAVEZE</p>
          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>
            {ukupno.toLocaleString()} RSD
          </span>
        </div>

        <button
          onClick={() => { setShowUplatniceModal(true); setUplatniceIndex(0); }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, var(--accent) 0%, #00cc8f 100%)',
            border: 'none',
            borderRadius: 12,
            padding: '14px 20px',
            color: '#000',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            marginBottom: 16,
            boxShadow: '0 4px 20px rgba(0,255,179,0.3)',
          }}
        >
          Generišite uplatnice za {mesecLabel}
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OBAVEZE.map(obaveza => {
            const iznos = parseFloat(profil[obaveza.kljuc] as string) || 0
            return (
              <div
                key={obaveza.kljuc}
                style={{
                  background: 'var(--bg-primary)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: obaveza.boja,
                    boxShadow: `0 0 8px ${obaveza.boja}`,
                    flexShrink: 0,
                  }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{obaveza.naziv}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{obaveza.opis}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: obaveza.boja, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
                    {iznos.toLocaleString()} RSD
                  </span>
                  <button
                    onClick={() => setAktivniModal(obaveza)}
                    style={{
                      background: `${obaveza.boja}15`,
                      border: `1px solid ${obaveza.boja}40`,
                      borderRadius: 8,
                      padding: '6px 14px',
                      color: obaveza.boja,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Plati
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL */}
      {aktivniModal && (
        <div
          onClick={() => setAktivniModal(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: `1px solid ${aktivniModal.boja}40`,
              borderRadius: 20,
              padding: 28,
              maxWidth: 340,
              width: '100%',
              boxShadow: `0 0 40px ${aktivniModal.boja}20`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{aktivniModal.naziv}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>NBS IPS QR kod za plaćanje</p>
              </div>
              <button
                onClick={() => setAktivniModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
              >
                ×
              </button>
            </div>

            {(() => {
              const baseIznos = parseFloat(profil[aktivniModal.kljuc] as string) || 0
              const penalty = daysLate > 0 ? latePenaltyAmount(baseIznos, daysLate) : 0
              const totalIznos = baseIznos + penalty
              return (
                <>
                  <div style={{
                    background: `${aktivniModal.boja}10`,
                    border: `1px solid ${aktivniModal.boja}30`,
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Iznos za uplatu</span>
                    <span style={{ color: aktivniModal.boja, fontWeight: 800, fontSize: 20 }}>
                      {totalIznos.toLocaleString()} RSD
                    </span>
                  </div>
                  {penalty > 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '-12px 0 12px 0' }}>
                      Uključeno {penalty.toLocaleString()} RSD kamate ({daysLate} dana kasno)
                    </p>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 20,
                    background: 'white',
                    borderRadius: 16,
                    marginBottom: 16,
                  }}>
                    <QRCodeSVG
                      value={generisiQR(profil, profil[aktivniModal.kljuc] as string, aktivniModal.sifraPlacanja, penalty)}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                </>
              )
            })()}

            <p style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', margin: '0 0 16px 0' }}>
              Skeniraj QR kodom u svojoj bankarskoj aplikaciji
            </p>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              {[
                { label: 'Primalac', value: profil.nazivFirme || '-' },
                { label: 'Račun', value: profil.brojRacuna || '-' },
                { label: 'Poziv na broj', value: '97-123456789' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.label}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: sve uplatnice za mesec (4 QR kodova) */}
      {showUplatniceModal && (
        <div
          onClick={() => setShowUplatniceModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1001, padding: 20,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 24,
              maxWidth: 360,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Uplatnice za {mesecLabel}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>NBS IPS · skeniraj u banci</p>
              </div>
              <button
                onClick={() => setShowUplatniceModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexShrink: 0 }}>
              {OBAVEZE.map((o, i) => (
                <button
                  key={o.kljuc}
                  onClick={() => setUplatniceIndex(i)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: 10,
                    border: uplatniceIndex === i ? `2px solid ${o.boja}` : '1px solid var(--border)',
                    background: uplatniceIndex === i ? `${o.boja}20` : 'var(--bg-primary)',
                    color: uplatniceIndex === i ? o.boja : 'var(--text-muted)',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {OBAVEZE.map((obaveza, i) => {
                if (i !== uplatniceIndex) return null
                const baseIznos = parseFloat(profil[obaveza.kljuc] as string) || 0
                const penalty = daysLate > 0 ? latePenaltyAmount(baseIznos, daysLate) : 0
                const totalIznos = baseIznos + penalty
                return (
                  <div key={obaveza.kljuc} style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{obaveza.naziv}</p>
                    <p style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 800, color: obaveza.boja }}>{totalIznos.toLocaleString()} RSD</p>
                    {penalty > 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px 0' }}>+ {penalty.toLocaleString()} RSD kamata</p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 16, background: 'white', borderRadius: 16, marginBottom: 16 }}>
                      <QRCodeSVG
                        value={generisiQR(profil, profil[obaveza.kljuc] as string, obaveza.sifraPlacanja, penalty)}
                        size={220}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', margin: '12px 0 0 0', flexShrink: 0 }}>
              {uplatniceIndex + 1} od 4 · pređi na sledeći za drugu uplatnicu
            </p>
          </div>
        </div>
      )}
    </>
  )
}

const MonthlyObligations = forwardRef<MonthlyObligationsHandle>(MonthlyObligationsInner)
export default MonthlyObligations