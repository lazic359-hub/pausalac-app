'use client'
import { useState, useEffect } from 'react'

type KpoUnos = {
  datum: string
  klijent: string
  iznos: number
  brojFakture: string
}

const KVARTALI = {
  Q1: ['01', '02', '03'],
  Q2: ['04', '05', '06'],
  Q3: ['07', '08', '09'],
  Q4: ['10', '11', '12'],
}

export default function KpoPage() {
  const [fakture, setFakture] = useState<KpoUnos[]>([])
  const [filter, setFilter] = useState<'sve' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('sve')
  const [brisanje, setBrisanje] = useState<number | null>(null)
  const [undoStavka, setUndoStavka] = useState<{ stavka: KpoUnos; index: number } | null>(null)
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ucitaj()
  }, [])

  const ucitaj = () => {
    const saved = localStorage.getItem('kpo_knjiga')
    if (saved) {
      const lista: KpoUnos[] = JSON.parse(saved)
      // Sortiranje po datumu
      lista.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
      setFakture(lista)
    }
  }

  const filtrirane = fakture.filter(f => {
    if (filter === 'sve') return true
    const mes = f.datum.split('-')[1]
    return KVARTALI[filter].includes(mes)
  })

  const ukupno = filtrirane.reduce((sum, f) => sum + f.iznos, 0)
  const ukupnoSve = fakture.reduce((sum, f) => sum + f.iznos, 0)

  const potvrdiDrisanje = (index: number) => {
    setBrisanje(index)
  }

  const obrisi = (index: number) => {
    const stavka = filtrirane[index]
    const globalIndex = fakture.findIndex(
      f => f.datum === stavka.datum && f.klijent === stavka.klijent && f.iznos === stavka.iznos
    )

    const novaLista = [...fakture]
    novaLista.splice(globalIndex, 1)
    setFakture(novaLista)
    localStorage.setItem('kpo_knjiga', JSON.stringify(novaLista))
    setBrisanje(null)

    // Undo opcija — 5 sekundi
    setUndoStavka({ stavka, index: globalIndex })
    if (undoTimer) clearTimeout(undoTimer)
    const t = setTimeout(() => setUndoStavka(null), 5000)
    setUndoTimer(t)
  }

  const undo = () => {
    if (!undoStavka) return
    const novaLista = [...fakture]
    novaLista.splice(undoStavka.index, 0, undoStavka.stavka)
    novaLista.sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
    setFakture(novaLista)
    localStorage.setItem('kpo_knjiga', JSON.stringify(novaLista))
    setUndoStavka(null)
    if (undoTimer) clearTimeout(undoTimer)
  }

  const formatDatum = (d: string) => {
    const [god, mes, dan] = d.split('-')
    return `${dan}.${mes}.${god}`
  }

  const godina = new Date().getFullYear()

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: 'white', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a2e', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: 18 }}>📒</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#00ffb3' }}>Arhiva i KPO</span>
        </div>
        <button
          onClick={() => alert('Funkcija u pripremi — uskoro možeš preuzeti KPO kao Excel ili PDF!')}
          style={{ background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 12, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ⬇️ Preuzmi KPO
        </button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 40px 16px' }}>

        {/* Ukupan promet */}
        <div style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0a0f1e 100%)', border: '1px solid #1a2040', borderRadius: 16, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 4px 0' }}>UKUPAN PROMET {godina}.</p>
            <p style={{ color: '#00ffb3', fontWeight: 800, fontSize: 28, margin: 0 }}>{ukupnoSve.toLocaleString()} <span style={{ fontSize: 14, color: '#444' }}>RSD</span></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#555', fontSize: 11, margin: '0 0 4px 0' }}>BROJ FAKTURA</p>
            <p style={{ color: '#00ffb3', fontWeight: 800, fontSize: 28, margin: 0 }}>{fakture.length}</p>
          </div>
        </div>

        {/* Kvartalni filteri */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['sve', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                flex: 1,
                background: filter === k ? '#00ffb3' : '#0d1117',
                color: filter === k ? '#000' : '#555',
                fontWeight: filter === k ? 700 : 400,
                fontSize: 13,
                padding: '8px 0',
                borderRadius: 10,
                border: `1px solid ${filter === k ? '#00ffb3' : '#1a2040'}`,
                cursor: 'pointer',
              }}
            >
              {k === 'sve' ? 'Sve' : k}
            </button>
          ))}
        </div>

        {/* Undo poruka */}
        {undoStavka && (
          <div style={{ background: '#1a2040', border: '1px solid #00ffb330', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Faktura obrisana</p>
            <button onClick={undo} style={{ background: '#00ffb3', color: '#000', fontWeight: 700, fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
              ↩ Vrati
            </button>
          </div>
        )}

        {/* Tabela */}
        {filtrirane.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#333' }}>
            <p style={{ fontSize: 40 }}>📒</p>
            <p>Nema faktura {filter !== 'sve' ? `za ${filter}` : ''}</p>
          </div>
        ) : (
          <div style={{ background: '#0d1117', border: '1px solid #1a2040', borderRadius: 16, overflow: 'hidden' }}>

            {/* Header tabele */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 90px 1fr 110px 40px', gap: 8, padding: '12px 16px', borderBottom: '1px solid #1a2040', background: '#111' }}>
              <p style={{ color: '#444', fontSize: 11, margin: 0 }}>BR.</p>
              <p style={{ color: '#444', fontSize: 11, margin: 0 }}>DATUM</p>
              <p style={{ color: '#444', fontSize: 11, margin: 0 }}>KUPAC</p>
              <p style={{ color: '#444', fontSize: 11, margin: 0, textAlign: 'right' }}>IZNOS</p>
              <div />
            </div>

            {/* Redovi */}
            {filtrirane.map((f, i) => (
              <div key={i}>
                {/* Potvda brisanja */}
                {brisanje === i ? (
                  <div style={{ padding: '14px 16px', background: '#1a0a0a', borderBottom: '1px solid #1a2040', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>Obrisati ovu fakturu?</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setBrisanje(null)} style={{ background: '#1a2040', border: 'none', color: '#888', fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
                        Otkaži
                      </button>
                      <button onClick={() => obrisi(i)} style={{ background: '#ff4d4d', border: 'none', color: 'white', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
                        Da, obriši
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 90px 1fr 110px 40px', gap: 8, padding: '14px 16px', borderBottom: '1px solid #111', alignItems: 'center' }}>
                    <p style={{ color: '#444', fontSize: 12, margin: 0 }}>{i + 1}.</p>
                    <p style={{ color: '#666', fontSize: 12, margin: 0 }}>{formatDatum(f.datum)}</p>
                    <p style={{ color: '#ddd', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.klijent}</p>
                    <p style={{ color: '#00ffb3', fontWeight: 700, fontSize: 13, margin: 0, textAlign: 'right' }}>{f.iznos.toLocaleString()} RSD</p>
                    <button
                      onClick={() => potvrdiDrisanje(i)}
                      style={{ background: 'none', border: 'none', color: '#333', fontSize: 18, cursor: 'pointer', textAlign: 'center' }}
                    >×</button>
                  </div>
                )}
              </div>
            ))}

            {/* Footer — ukupno za filter */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 90px 1fr 110px 40px', gap: 8, padding: '14px 16px', background: '#111', alignItems: 'center' }}>
              <div />
              <div />
              <p style={{ color: '#555', fontSize: 12, margin: 0, fontWeight: 700 }}>UKUPNO {filter !== 'sve' ? filter : ''}</p>
              <p style={{ color: '#f59e0b', fontWeight: 800, fontSize: 14, margin: 0, textAlign: 'right' }}>{ukupno.toLocaleString()} RSD</p>
              <div />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}