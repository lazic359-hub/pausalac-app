'use client'
import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'

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

function generisiQR(profil: Profil, iznos: string, sifra: string): string {
  const racun = profil.brojRacuna || '000-0000000000000-00'
  const naziv = profil.nazivFirme || 'Naziv firme'
  const iznosFormatiran = parseFloat(iznos || '0').toFixed(2)
  const pozivNaBroj = '97-123456789'
  return `K:PR|V:01|C:1|R:${racun}|N:${naziv}|I:RSD${iznosFormatiran}|SF:${sifra}|RO:${pozivNaBroj}`
}

export default function MonthlyObligations() {
  const [profil, setProfil] = useState<Profil | null>(null)
  const [aktivniModal, setAktivniModal] = useState<Obaveza | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('pausalac_profil')
    if (saved) setProfil(JSON.parse(saved))
  }, [])

  if (!profil) return (
    <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 24, marginTop: 16 }}>
      <p style={{ color: '#555', fontSize: 11, margin: '0 0 12px 0' }}>MESEČNE OBAVEZE</p>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ color: '#333', fontSize: 13 }}>Unesi podatke u <a href="/settings" style={{ color: '#00ffb3' }}>Podešavanjima</a> da vidiš mesečne obaveze</p>
      </div>
    </div>
  )

  const ukupno = OBAVEZE.reduce((sum, o) => sum + (parseFloat(profil[o.kljuc] as string) || 0), 0)

  return (
    <>
      <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, padding: 24, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ color: '#555', fontSize: 11, margin: 0 }}>MESEČNE OBAVEZE</p>
          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>
            {ukupno.toLocaleString()} RSD
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OBAVEZE.map(obaveza => {
            const iznos = parseFloat(profil[obaveza.kljuc] as string) || 0
            return (
              <div
                key={obaveza.kljuc}
                style={{
                  background: '#111',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #1a2040',
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
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#ddd' }}>{obaveza.naziv}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#444' }}>{obaveza.opis}</p>
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
              background: '#0d1117',
              border: `1px solid ${aktivniModal.boja}40`,
              borderRadius: 20,
              padding: 28,
              maxWidth: 340,
              width: '100%',
              boxShadow: `0 0 40px ${aktivniModal.boja}20`,
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'white' }}>{aktivniModal.naziv}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#444' }}>NBS IPS QR kod za plaćanje</p>
              </div>
              <button
                onClick={() => setAktivniModal(null)}
                style={{ background: 'none', border: 'none', color: '#444', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}
              >
                ×
              </button>
            </div>

            {/* Iznos */}
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
              <span style={{ color: '#555', fontSize: 12 }}>Iznos za uplatu</span>
              <span style={{ color: aktivniModal.boja, fontWeight: 800, fontSize: 20 }}>
                {(parseFloat(profil[aktivniModal.kljuc] as string) || 0).toLocaleString()} RSD
              </span>
            </div>

            {/* QR kod */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 20,
              background: 'white',
              borderRadius: 16,
              marginBottom: 16,
            }}>
              <QRCodeSVG
                value={generisiQR(profil, profil[aktivniModal.kljuc] as string, aktivniModal.sifraPlacanja)}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>

            <p style={{ color: '#333', fontSize: 11, textAlign: 'center', margin: '0 0 16px 0' }}>
              Skeniraj QR kodom u svojoj bankarskoj aplikaciji
            </p>

            {/* Info */}
            <div style={{ borderTop: '1px solid #1a2040', paddingTop: 16 }}>
              {[
                { label: 'Primalac', value: profil.nazivFirme || '-' },
                { label: 'Račun', value: profil.brojRacuna || '-' },
                { label: 'Poziv na broj', value: '97-123456789' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#444', fontSize: 12 }}>{item.label}</span>
                  <span style={{ color: '#888', fontSize: 12, fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}