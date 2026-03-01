'use client'

import { useRef, useState } from 'react'
import { Download, Upload, Trash2, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react'

// ─── Ključevi koje čuvamo ─────────────────────────────────────────────────────
const STORAGE_KEYS = ['pausalac_profil', 'kpo_knjiga', 'pausalac_placanja']

type ToastType = 'success' | 'error' | 'warning'

function Toast({ msg, type, onClose }: { msg: string; type: ToastType; onClose: () => void }) {
  const colors = {
    success: { bg: 'rgba(0,255,179,0.1)', border: 'rgba(0,255,179,0.3)', color: '#00ffb3', icon: <CheckCircle size={15} /> },
    error:   { bg: 'rgba(255,60,60,0.1)',  border: 'rgba(255,60,60,0.3)',  color: '#ff5555', icon: <AlertTriangle size={15} /> },
    warning: { bg: 'rgba(255,180,0,0.1)',  border: 'rgba(255,180,0,0.3)',  color: '#ffb400', icon: <AlertTriangle size={15} /> },
  }[type]

  return (
    <div style={{
      position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      background: colors.bg, border: `1px solid ${colors.border}`,
      color: colors.color, borderRadius: 12, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 14, fontWeight: 600, zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
    }}>
      {colors.icon}
      {msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: 8, fontSize: 16, opacity: 0.7 }}>×</button>
    </div>
  )
}

export default function DataManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null)

  const showToast = (msg: string, type: ToastType) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const backup: Record<string, unknown> = {
      _meta: {
        verzija: '1.0',
        datum: new Date().toISOString(),
        aplikacija: 'Paušalac',
      }
    }

    STORAGE_KEYS.forEach(key => {
      const val = localStorage.getItem(key)
      if (val) {
        try { backup[key] = JSON.parse(val) }
        catch { backup[key] = val }
      }
    })

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pausalac-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Rezervna kopija preuzeta!', 'success')
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      showToast('Fajl mora biti .json format!', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)

        // Validacija — mora biti objekat sa _meta poljem
        if (typeof data !== 'object' || !data._meta || data._meta.aplikacija !== 'Paušalac') {
          showToast('Nevažeći fajl — ovo nije Paušalac backup!', 'error')
          return
        }

        // Uvezi samo poznate ključeve
        let uvezeno = 0
        STORAGE_KEYS.forEach(key => {
          if (data[key] !== undefined) {
            localStorage.setItem(key, JSON.stringify(data[key]))
            uvezeno++
          }
        })

        if (uvezeno === 0) {
          showToast('Fajl je validan ali nema podataka za uvoz.', 'warning')
          return
        }

        showToast(`Uvezeno ${uvezeno} stavki! Stranica se osvežava...`, 'success')
        setTimeout(() => window.location.reload(), 1800)

      } catch {
        showToast('Greška: fajl nije validan JSON!', 'error')
      }
    }
    reader.readAsText(file)

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  const handleClear = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 5000) // auto-reset posle 5s
      return
    }
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
    showToast('Svi podaci su obrisani.', 'warning')
    setConfirmDelete(false)
    setTimeout(() => window.location.reload(), 1800)
  }

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Separator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '40px 0 28px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #1a2535)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={14} color="#00ffb3" />
          <span style={{ color: '#2a3a4a', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Sigurnost i Rezervna Kopija
          </span>
        </div>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #1a2535, transparent)' }} />
      </div>

      {/* Info box */}
      <div style={{
        background: 'rgba(0,255,179,0.04)',
        border: '1px solid rgba(0,255,179,0.12)',
        borderRadius: 14, padding: '14px 18px',
        marginBottom: 24,
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <ShieldCheck size={16} color="#00ffb3" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ color: '#4a6a58', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Tvoji podaci se čuvaju <strong style={{ color: '#5a8a70' }}>isključivo u ovom browseru</strong>. Preporučujemo da povremeno napraviš rezervnu kopiju kako ne bi izgubio podatke ako obrišeš cache ili promeniš uređaj.
        </p>
      </div>

      {/* Dugmad */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Export */}
        <ActionBtn
          icon={<Download size={17} />}
          label="Preuzmi Rezervnu Kopiju"
          sublabel="Čuva sve podatke kao .json fajl na tvoj računar"
          accent="#00ffb3"
          onClick={handleExport}
        />

        {/* Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />
        <ActionBtn
          icon={<Upload size={17} />}
          label="Uvezi Podatke"
          sublabel="Učitaj prethodno sačuvani .json backup fajl"
          accent="#6677ff"
          onClick={() => fileInputRef.current?.click()}
        />

        {/* Delete */}
        <ActionBtn
          icon={<Trash2 size={17} />}
          label={confirmDelete ? '⚠️ Klikni ponovo da POTVRDIŠ brisanje' : 'Obriši sve podatke'}
          sublabel={confirmDelete ? 'Ovo će trajno obrisati sve fakture, KPO i profil firme!' : 'Korisno ako koristiš tuđi računar · Traži potvrdu'}
          accent={confirmDelete ? '#ff3333' : '#ff5555'}
          danger
          confirmed={confirmDelete}
          onClick={handleClear}
        />

      </div>
    </>
  )
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({
  icon, label, sublabel, accent, danger = false, confirmed = false, onClick
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  accent: string
  danger?: boolean
  confirmed?: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        background: confirmed
          ? 'rgba(255,30,30,0.12)'
          : hovered
          ? `${accent}12`
          : '#0a0f18',
        border: `1px solid ${confirmed ? '#ff333360' : hovered ? accent + '50' : '#1a2535'}`,
        borderRadius: 14,
        padding: '16px 20px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        transition: 'all 0.2s',
        textAlign: 'left',
        transform: hovered ? 'translateX(4px)' : 'none',
        animation: confirmed ? 'pulse-danger 1s ease-in-out infinite' : 'none',
      }}
    >
      <style>{`
        @keyframes pulse-danger {
          0%, 100% { border-color: #ff333360; }
          50% { border-color: #ff3333cc; box-shadow: 0 0 16px #ff333330; }
        }
      `}</style>

      <div style={{
        width: 40, height: 40, flexShrink: 0,
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
        transition: 'all 0.2s',
      }}>
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ color: danger ? (confirmed ? '#ff5555' : '#cc4444') : '#d0dce8', fontWeight: 600, fontSize: 14, margin: '0 0 3px 0' }}>
          {label}
        </p>
        <p style={{ color: confirmed ? '#ff444488' : '#2a3a4a', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
          {sublabel}
        </p>
      </div>

      <div style={{ color: hovered ? accent : '#1a2535', fontSize: 18, transition: 'color 0.2s' }}>›</div>
    </button>
  )
}
