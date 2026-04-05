'use client'
import { Alert } from '@/components/Alert'
import dynamic from 'next/dynamic'
import { AnalyticsPanelSkeleton, DashboardMainSkeleton } from '@/components/DashboardSkeletons'
import { getNbsToRsdRate } from '@/lib/exchange-rate'
import { buildPrihodRowForPaidFaktura } from '@/lib/kpo-prihod'
import { useState, useEffect, useRef, Suspense } from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowser, signOutIntentional } from '@/lib/supabase-browser'
import PoresniKalendar from "@/components/PoresniKalendar";
import { ThemeToggle } from '@/components/ThemeToggle'
import { FloatingAddPrihod } from '@/components/FloatingAddPrihod'
import { NavDodajFabPlus } from '@/components/NavDodajFabPlus'
import { IncomeDetailsModal } from '@/components/IncomeDetailsModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileDown, Info } from 'lucide-react'
import { getKpoLimitRsdFromStorage, getUkupnoPrihodZaGodinu } from '@/lib/profile'
import { formatOfflineTimestamp, loadOfflineDashboard, saveOfflineDashboard } from '@/lib/offline-data-cache'
import { authDisplayName } from '@/lib/auth-safe-next'
import { isUnpaidInvoiceRow } from '@/lib/faktura-status'

const supabase = getSupabaseBrowser()

const SmartInsightsLazy = dynamic(() => import('@/components/SmartInsights'), {
  ssr: false,
  loading: () => <AnalyticsPanelSkeleton />,
})

type Valuta = 'RSD' | 'EUR' | 'USD'

type Faktura = {
  id: string
  user_id: string
  klijent: string
  iznos: number
  valuta: Valuta
  iznos_rsd: number
  datum: string
  napomena: string
}

/** Red iz tabele fakture (računi) — za modal "Iz fakture" */
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

const KURSEVI = { RSD: 1, EUR: 117, USD: 108 }
const LIMIT_365 = 8000000

// ─────────────────────────────────────────────
// PDF GENERATOR
// ─────────────────────────────────────────────
function generatePDF(fakture: Faktura[], godina: string, email: string, stats: { ukupnoRSD: number, porez: number, pio: number, zdravstvo: number, neto: number, procenat: number }) {
  const { ukupnoRSD, porez, pio, zdravstvo, neto, procenat } = stats
  const ukupnoEUR = Math.round(ukupnoRSD / KURSEVI.EUR)

  const redovi = fakture.map(f => `
    <tr>
      <td>${f.datum || '-'}</td>
      <td>${f.klijent}</td>
      <td>${f.iznos} ${f.valuta}</td>
      <td>${f.iznos_rsd.toLocaleString()} RSD</td>
      <td>${f.napomena || '-'}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1a1a2e; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #00c896; padding-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 900; color: #00c896; }
  .meta { text-align: right; color: #666; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .card { background: #f8fffe; border: 1px solid #e0f5f0; border-radius: 10px; padding: 16px; }
  .card-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .card-value { font-size: 20px; font-weight: 800; color: #00c896; }
  .card-sub { font-size: 11px; color: #aaa; margin-top: 2px; }
  .section-title { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .obaveze { background: #f8fffe; border: 1px solid #e0f5f0; border-radius: 10px; padding: 16px; margin-bottom: 28px; }
  .obaveza-red { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
  .obaveza-red:last-child { border-bottom: none; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #00c896; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 32px; text-align: center; color: #bbb; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
  .bar-wrap { background: #e8f8f4; border-radius: 20px; height: 10px; margin: 8px 0; overflow: hidden; }
  .bar-fill { height: 100%; background: #00c896; border-radius: 20px; width: ${Math.min(procenat, 100).toFixed(1)}%; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">💼 Paušo</div>
    <div style="color:#888; margin-top:4px; font-size:12px">Izveštaj prihoda — ${godina}. godina</div>
  </div>
  <div class="meta">
    <div>${email}</div>
    <div>Generisano: ${new Date().toLocaleDateString('sr-RS')}</div>
  </div>
</div>
<div class="grid">
  <div class="card">
    <div class="card-label">Ukupni prihod</div>
    <div class="card-value">${ukupnoRSD.toLocaleString()}</div>
    <div class="card-sub">RSD · ≈ ${ukupnoEUR.toLocaleString()} EUR</div>
    <div class="bar-wrap"><div class="bar-fill"></div></div>
    <div style="font-size:10px; color:#aaa">${procenat.toFixed(1)}% od limita</div>
  </div>
  <div class="card">
    <div class="card-label">Neto prihod</div>
    <div class="card-value">${neto.toLocaleString()}</div>
    <div class="card-sub">RSD (posle poreza)</div>
  </div>
  <div class="card">
    <div class="card-label">Broj faktura</div>
    <div class="card-value">${fakture.length}</div>
    <div class="card-sub">u ${godina}. godini</div>
  </div>
</div>
<div class="obaveze">
  <div class="section-title">Obaveze prema državi</div>
  <div class="obaveza-red"><span>Porez na prihod (10%)</span><span>${porez.toLocaleString()} RSD</span></div>
  <div class="obaveza-red"><span>PIO doprinos (24%)</span><span>${pio.toLocaleString()} RSD</span></div>
  <div class="obaveza-red"><span>Zdravstveno (10.3%)</span><span>${zdravstvo.toLocaleString()} RSD</span></div>
  <div class="obaveza-red"><span>Ukupne obaveze</span><span>${(porez+pio+zdravstvo).toLocaleString()} RSD</span></div>
</div>
<div class="section-title">Pregled faktura</div>
<table>
  <thead>
    <tr><th>Datum</th><th>Klijent</th><th>Iznos</th><th>Iznos RSD</th><th>Napomena</th></tr>
  </thead>
  <tbody>${redovi}</tbody>
</table>
<div class="footer">Paušo · Evidencija prihoda za preduzetnike paušalce u Srbiji</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win) {
    win.onload = () => { win.print() }
  }
}

// ─────────────────────────────────────────────
// GLAVNA APLIKACIJA
// ─────────────────────────────────────────────
function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [fakture, setFakture] = useState<Faktura[]>([])
  const [loading, setLoading] = useState(false)
  const [forma, setForma] = useState({ klijent: '', iznos: '', valuta: 'EUR' as Valuta, datum: '', napomena: '' })
  const [iznosRsdPrikaz, setIznosRsdPrikaz] = useState('')
  const [kursPrikaz, setKursPrikaz] = useState('')
  const [tab, setTab] = useState<'dashboard' | 'dodaj' | 'fakture' | 'settings'>('dashboard')
  const [godina, setGodina] = useState(new Date().getFullYear().toString())
  const [prihodiTekucaGodina, setPrihodiTekucaGodina] = useState<Faktura[]>([])
  const [klijentSuggestions, setKlijentSuggestions] = useState<string[]>([])
  const [showKlijentDropdown, setShowKlijentDropdown] = useState(false)
  const klijentDropdownRef = useRef<HTMLDivElement>(null)
  const [poresniPodaci, setPoresniPodaci] = useState<{
    porez_na_prihod: number | null
    pio_doprinos: number | null
    zdravstveno: number | null
    nezaposleni: number | null
  } | null>(null)
  const [modalIzFaktureOpen, setModalIzFaktureOpen] = useState(false)
  const [neplaceneFakture, setNeplaceneFakture] = useState<FakturaInvoice[]>([])
  const [izFaktureSelectedId, setIzFaktureSelectedId] = useState<string | null>(null)
  const [izFaktureDatumPlacanja, setIzFaktureDatumPlacanja] = useState(() => new Date().toISOString().split('T')[0])
  const [izFaktureLoading, setIzFaktureLoading] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [poresniResenjeModalOpen, setPoresniResenjeModalOpen] = useState(false)
  const [incomeDetailsOpen, setIncomeDetailsOpen] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<Faktura | null>(null)
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null)
  /** Nula redova u `prihodi` — onboarding za potpuno nove korisnike */
  const [nemaNijednogPrihoda, setNemaNijednogPrihoda] = useState<boolean | null>(null)
  const [limitRsd, setLimitRsd] = useState(getKpoLimitRsdFromStorage)
  /** Poslednje učitavanje / offline keš */
  const [dataAsOf, setDataAsOf] = useState<string | null>(null)

  useEffect(() => {
    const syncLimit = () => setLimitRsd(getKpoLimitRsdFromStorage())
    syncLimit()
    window.addEventListener('pausalac-profil-updated', syncLimit)
    return () => window.removeEventListener('pausalac-profil-updated', syncLimit)
  }, [])

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
    const t = searchParams.get('tab')
    if (t === 'dodaj') setTab('dodaj')
    if (!t) setTab('dashboard')
  }, [searchParams])

  useEffect(() => {
    if (user) {
      void fetchFakture()
    }
  }, [user, godina])

  // Učitaj jedinstvena imena klijenata iz prihoda za autocomplete
  useEffect(() => {
    if (!user) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const fetchKlijenti = async () => {
      const { data } = await supabase
        .from('prihodi')
        .select('klijent')
        .eq('user_id', user.id)
      const unique = [...new Set((data || []).map((r: { klijent: string }) => r.klijent).filter(Boolean))] as string[]
      setKlijentSuggestions(unique.sort((a, b) => a.localeCompare(b)))
    }
    void fetchKlijenti()
  }, [user])

  useEffect(() => {
    if (!modalIzFaktureOpen || !user) return
    const load = async () => {
      const { data } = await supabase
        .from('fakture')
        .select('*')
        .eq('user_id', user.id)
        .order('datum', { ascending: false })
      const sve = (data as FakturaInvoice[]) ?? []
      const neplacene = sve.filter(f => isUnpaidInvoiceRow(f))
      setNeplaceneFakture(neplacene)
      setIzFaktureSelectedId(null)
      setIzFaktureDatumPlacanja(new Date().toISOString().split('T')[0])
    }
    load()
  }, [modalIzFaktureOpen, user])

  useEffect(() => {
    const fetchKurs = async () => {
      if (!forma.datum || forma.valuta === 'RSD') {
        setIznosRsdPrikaz('')
        setKursPrikaz('')
        return
      }
      try {
        const kurs = await getNbsToRsdRate(forma.valuta as 'EUR' | 'USD', forma.datum)
        setKursPrikaz(`1 ${forma.valuta} = ${kurs.toFixed(2)} RSD`)
        if (forma.iznos) {
          const rsd = parseFloat(forma.iznos) * kurs
          setIznosRsdPrikaz(Math.round(rsd).toLocaleString('sr-RS') + ' RSD')
        } else {
          setIznosRsdPrikaz('')
        }
      } catch {
        setIznosRsdPrikaz('')
        setKursPrikaz('')
      }
    }
    fetchKurs()
  }, [forma.datum, forma.iznos, forma.valuta])

  const fetchFakture = async () => {
    if (!user) return
    if (typeof window !== 'undefined' && !navigator.onLine) {
      const snap = loadOfflineDashboard(user.id)
      if (snap && snap.data.godina === godina) {
        setFakture(snap.data.fakturePrihodi as Faktura[])
        setPrihodiTekucaGodina(snap.data.prihodiTekucaGodina as Faktura[])
        setNemaNijednogPrihoda(snap.data.nemaNijednogPrihoda)
        if (snap.data.poresniPodaci) setPoresniPodaci(snap.data.poresniPodaci)
        setDataAsOf(snap.updatedAt)
      } else {
        setFakture([])
        setPrihodiTekucaGodina([])
        setNemaNijednogPrihoda(null)
        setDataAsOf(null)
      }
      setLoading(false)
      return
    }
    setLoading(true)
    setDataAsOf(null)
    const tecucaGodina = new Date().getFullYear().toString()
    try {
      const [resGodina, resTekuca, resCount, profRes] = await Promise.all([
        supabase
          .from('prihodi')
          .select('*')
          .eq('user_id', user.id)
          .gte('datum', `${godina}-01-01`)
          .lte('datum', `${godina}-12-31`)
          .order('datum', { ascending: false }),
        supabase
          .from('prihodi')
          .select('*')
          .eq('user_id', user.id)
          .gte('datum', `${tecucaGodina}-01-01`)
          .lte('datum', `${tecucaGodina}-12-31`)
          .order('datum', { ascending: false }),
        supabase.from('prihodi').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('porez_na_prihod, pio_doprinos, zdravstveno, nezaposleni')
          .eq('id', user.id)
          .maybeSingle(),
      ])
      const fakturePrihodi = (!resGodina.error && resGodina.data ? resGodina.data : []) as Faktura[]
      const prihodiTek = (!resTekuca.error && resTekuca.data ? resTekuca.data : []) as Faktura[]
      const nema = (resCount.count ?? 0) === 0
      if (!resGodina.error && resGodina.data) setFakture(fakturePrihodi)
      if (!resTekuca.error && resTekuca.data) setPrihodiTekucaGodina(prihodiTek)
      setNemaNijednogPrihoda(nema)
      let poresni: {
        porez_na_prihod: number | null
        pio_doprinos: number | null
        zdravstveno: number | null
        nezaposleni: number | null
      } | null = null
      if (profRes.data) {
        poresni = {
          porez_na_prihod: profRes.data.porez_na_prihod,
          pio_doprinos: profRes.data.pio_doprinos,
          zdravstveno: profRes.data.zdravstveno,
          nezaposleni: profRes.data.nezaposleni,
        }
        setPoresniPodaci(poresni)
      }
      const now = new Date().toISOString()
      saveOfflineDashboard(user.id, {
        godina,
        fakturePrihodi,
        prihodiTekucaGodina: prihodiTek,
        nemaNijednogPrihoda: nema,
        poresniPodaci: poresni,
      })
      setDataAsOf(now)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await signOutIntentional()
    setFakture([])
  }

  const ukupnoRSD = fakture.reduce((s, f) => s + (f.iznos_rsd ?? 0), 0)
  const prihodGodina = getUkupnoPrihodZaGodinu(ukupnoRSD, parseInt(godina, 10))
  const ukupnoEUR = Math.round(prihodGodina / KURSEVI.EUR)
  const procenat = limitRsd > 0 ? Math.min((prihodGodina / limitRsd) * 100, 100) : 0
  const porez = Math.round(prihodGodina * 0.1)
  const pio = Math.round(prihodGodina * 0.24)
  const zdravstvo = Math.round(prihodGodina * 0.103)
  const ukupanPorez = porez + pio + zdravstvo
  const t = poresniPodaci?.porez_na_prihod ?? 0
  const p = poresniPodaci?.pio_doprinos ?? 0
  const h = poresniPodaci?.zdravstveno ?? 0
  const u = poresniPodaci?.nezaposleni ?? 0
  const ukupnoMesecnoObaveze = t + p + h + u
  const godisnjeObaveze = ukupnoMesecnoObaveze * 12
  const ukupniRashodi = ukupnoMesecnoObaveze > 0 ? godisnjeObaveze : ukupanPorez
  const neto = prihodGodina - ukupniRashodi
  const bojaBar =
    procenat > 90
      ? 'var(--alert-danger-solid)'
      : procenat >= 70
        ? 'var(--alert-warning-solid)'
        : 'var(--accent)'
  const remainingLimit = Math.max(0, limitRsd - prihodGodina)

  const pre365 = new Date()
  pre365.setDate(pre365.getDate() - 365)
  const prihod365 = fakture.filter(f => new Date(f.datum) >= pre365).reduce((s, f) => s + (f.iznos_rsd ?? 0), 0)
  const procenat365 = Math.min((prihod365 / LIMIT_365) * 100, 100)
  const remaining365 = Math.max(0, LIMIT_365 - prihod365)

  const dodajFakturu = async () => {
    if (!forma.klijent || !forma.iznos || !user) return
    let iznos_rsd = parseFloat(forma.iznos) * KURSEVI[forma.valuta]
    let kursKoriscen = KURSEVI[forma.valuta]
    if (forma.valuta !== 'RSD' && forma.datum) {
      try {
        const kurs = await getNbsToRsdRate(forma.valuta as 'EUR' | 'USD', forma.datum)
        kursKoriscen = kurs
        iznos_rsd = parseFloat(forma.iznos) * kurs
      } catch {
        // ostaje fallback iz KURSEVI
      }
    }
    const datum = forma.datum || new Date().toISOString().split('T')[0]
    const klijentTrim = forma.klijent.trim()

    // Provera: da li već postoji plaćena faktura sa istim podacima?
    const { data: placeneFakture } = await supabase
      .from('fakture')
      .select('id, klijent, datum, iznos_rsd')
      .eq('user_id', user.id)
      .eq('status', 'placena')
    const mozdaDuplikat = (placeneFakture ?? []).some(
      (ff: { klijent: string | null; datum: string; iznos_rsd: number | null }) =>
        (ff.klijent ?? '').trim() === klijentTrim &&
        ff.datum === datum &&
        Math.abs((ff.iznos_rsd ?? 0) - iznos_rsd) < 1
    )
    if (mozdaDuplikat && !window.confirm('Ovaj prihod možda već postoji kao faktura — da li želiš da nastaviš?')) return

    const napomenaSaKursom = (forma.napomena || '').trim() +
      (forma.valuta !== 'RSD' ? ` [Kurs 1 ${forma.valuta} = ${kursKoriscen} RSD]` : '')
    const noviPrihod = {
      user_id: user.id,
      klijent: forma.klijent,
      iznos: parseFloat(forma.iznos),
      valuta: forma.valuta,
      iznos_rsd,
      datum,
      napomena: napomenaSaKursom || null,
    }
    const { data, error } = await supabase.from('prihodi').insert(noviPrihod).select().single()
    if (!error && data) {
      setFakture([data as Faktura, ...fakture])
      setNemaNijednogPrihoda(false)
      setForma({ klijent: '', iznos: '', valuta: 'EUR', datum: '', napomena: '' })
      setTab('dashboard')
    } else {
      alert('Greška pri dodavanju: ' + error?.message)
    }
  }

  const obrisi = async (id: string) => {
    if (!user) return
    const { error } = await supabase.from('prihodi').delete().eq('id', id)
    if (!error) {
      setFakture(fakture.filter(f => f.id !== id))
      const { count } = await supabase.from('prihodi').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      setNemaNijednogPrihoda((count ?? 0) === 0)
    }
  }

  const oznaciKaoPlacenoIzFakture = async () => {
    if (!user || !izFaktureSelectedId || !izFaktureDatumPlacanja) return
    const f = neplaceneFakture.find(x => x.id === izFaktureSelectedId)
    if (!f) return
    setIzFaktureLoading(true)
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
        izFaktureDatumPlacanja,
      )
      await supabase.from('prihodi').insert({
        user_id: user.id,
        ...row,
        datum: izFaktureDatumPlacanja,
      })
    }
    setModalIzFaktureOpen(false)
    setIzFaktureLoading(false)
    fetchFakture()
    setTab('fakture')
  }

  const formatIznosDashboard = (n: number) => new Intl.NumberFormat('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const godinaOptions = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // LoginPage ce prikazati novaLozinka ekran
      }
    })
  }, [])

  if (authLoading) return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--accent)', fontSize: 32 }}>💼</span>
    </div>
  )

  if (!user) {
    router.replace('/login?next=/dashboard')
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Preusmeravam na prijavu…</span>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* Modal: Iz fakture */}
      {modalIzFaktureOpen && (
        <div
          className="app-modal-overlay"
          style={{ zIndex: 9998 }}
          onClick={() => setModalIzFaktureOpen(false)}
        >
          <div
            className="app-modal-panel app-modal-panel--narrow"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Prihod iz fakture</span>
              <button onClick={() => setModalIzFaktureOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 12px 0' }}>Izaberite neplaćenu fakturu i unesite datum plaćanja.</p>
              {neplaceneFakture.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '24px 0', textAlign: 'center' }}>Nema neplaćenih faktura.</p>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    {neplaceneFakture.map(fak => (
                      <div
                        key={fak.id}
                        onClick={() => setIzFaktureSelectedId(izFaktureSelectedId === fak.id ? null : fak.id)}
                        style={{
                          padding: '12px 14px', marginBottom: 8, background: izFaktureSelectedId === fak.id ? 'var(--accent)' : 'var(--bg-primary)',
                          border: `2px solid ${izFaktureSelectedId === fak.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer',
                          color: izFaktureSelectedId === fak.id ? '#000' : 'var(--text-primary)', fontSize: 14,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{fak.klijent ?? '—'}</div>
                        <div style={{ color: izFaktureSelectedId === fak.id ? 'rgba(0,0,0,0.7)' : 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                          {fak.broj_fakture ? `Br. ${fak.broj_fakture}` : fak.datum} · {formatIznosDashboard(fak.iznos_rsd ?? 0)} RSD
                        </div>
                      </div>
                    ))}
                  </div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Datum plaćanja</label>
                  <input
                    type="date"
                    value={izFaktureDatumPlacanja}
                    onChange={e => setIzFaktureDatumPlacanja(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, marginBottom: 16, outline: 'none' }}
                  />
                  <button
                    onClick={oznaciKaoPlacenoIzFakture}
                    disabled={!izFaktureSelectedId || izFaktureLoading}
                    style={{ width: '100%', background: izFaktureSelectedId ? 'var(--accent)' : 'var(--bg-primary)', color: izFaktureSelectedId ? '#000' : 'var(--text-muted)', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: izFaktureSelectedId && !izFaktureLoading ? 'pointer' : 'not-allowed' }}
                  >
                    {izFaktureLoading ? 'Čuvanje...' : 'Označi kao plaćeno'}
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
        open={deleteIncomeId != null}
        message="Da li si siguran da želiš da obrišeš ovaj prihod?"
        confirmText="Da, obriši"
        cancelText="Ne"
        onCancel={() => setDeleteIncomeId(null)}
        onConfirm={() => {
          if (!deleteIncomeId) return
          void obrisi(deleteIncomeId)
          setDeleteIncomeId(null)
        }}
      />

      {poresniResenjeModalOpen && (
        <div
          className="app-modal-overlay"
          style={{ zIndex: 9998 }}
          onClick={() => setPoresniResenjeModalOpen(false)}
        >
          <div
            className="app-modal-panel app-modal-panel--narrow"
            style={{ maxWidth: 420 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)' }}>Iznosi iz poreskog rešenja</span>
              <button type="button" onClick={() => setPoresniResenjeModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', lineHeight: 1 }} aria-label="Zatvori">×</button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              {!poresniPodaci || (!poresniPodaci.porez_na_prihod && !poresniPodaci.pio_doprinos && !poresniPodaci.zdravstveno && !poresniPodaci.nezaposleni) ? (
                <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 14px 0' }}>
                    Unesi obaveze iz poreskog rešenja na stranici Profil.
                  </p>
                  <a href="/profil" onClick={() => setPoresniResenjeModalOpen(false)} style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 13, padding: '10px 18px', borderRadius: 10, textDecoration: 'none', display: 'inline-block' }}>
                    Profil →
                  </a>
                </div>
              ) : (() => {
                const tm = poresniPodaci.porez_na_prihod || 0
                const pm = poresniPodaci.pio_doprinos || 0
                const hm = poresniPodaci.zdravstveno || 0
                const um = poresniPodaci.nezaposleni || 0
                const ukupnoMesecno = tm + pm + hm + um
                return (
                  <>
                    {[
                      { label: 'Porez na prihod', value: tm, boja: '#f59e0b' },
                      { label: 'PIO doprinos', value: pm, boja: '#3b82f6' },
                      { label: 'Zdravstveno osiguranje', value: hm, boja: '#a855f7' },
                      { label: 'Osiguranje za nezaposlene', value: um, boja: '#ec4899' },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.boja, boxShadow: `0 0 4px ${item.boja}` }} />
                          <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{item.label}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>mesečno</span>
                        </div>
                        <span style={{ color: item.boja, fontWeight: 700, fontSize: 14 }}>{item.value.toLocaleString()} RSD</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px 0' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 13 }}>Ukupno mesečno</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 15 }}>{ukupnoMesecno.toLocaleString()} RSD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0 0 0' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Ukupno godišnje</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 13 }}>{(ukupnoMesecno * 12).toLocaleString()} RSD</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="app-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>💼</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)' }}>Paušo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <select
            value={godina}
            onChange={e => setGodina(e.target.value)}
            className="dashboard-year-select"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '4px 12px', color: 'var(--accent)', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
          >
            {godinaOptions.map(g => <option key={g} value={g}>{g}.</option>)}
          </select>
          <span
            className="app-header-mobile-hide"
            title={user.email ?? authDisplayName(user)}
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {authDisplayName(user)}
          </span>
          <span className="app-header-mobile-hide">
            <ThemeToggle />
          </span>
          <button type="button" className="app-header-mobile-hide" onClick={() => void logout()} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer' }}>
            Odjavi se
          </button>
        </div>
      </div>

      <div className="page-content dashboard-main-column" style={{ padding: '12px 12px 100px' }}>
        {dataAsOf && (
          <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 10px 0', fontWeight: 600 }}>
            Poslednje ažuriranje: {formatOfflineTimestamp(dataAsOf)}
          </p>
        )}

        {loading && tab === 'dashboard' && <DashboardMainSkeleton />}
        {loading && tab !== 'dashboard' && (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 14 }}>Učitavanje...</div>
        )}

        {!loading && tab === 'dashboard' && nemaNijednogPrihoda === true && (
          <section
            style={{
              marginTop: 8,
              marginBottom: 24,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 16 }} aria-hidden>💼</div>
            <p style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 600, margin: '0 0 24px 0', lineHeight: 1.45 }}>
              Počni tako što ćeš dodati svoj prvi prihod.
            </p>
            <button
              type="button"
              onClick={() => setTab('dodaj')}
              style={{
                background: 'var(--accent)',
                color: '#000',
                fontWeight: 700,
                fontSize: 16,
                padding: '14px 28px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(0, 255, 179, 0.25)',
                fontFamily: 'inherit',
              }}
            >
              Dodaj prihod
            </button>
          </section>
        )}

        {!loading && tab === 'dashboard' && nemaNijednogPrihoda === false && (
          <>
            {/* 1. Sažetak — prihod i limit */}
            <section style={{ marginBottom: 14 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', margin: '0 0 8px 0' }}>SAŽETAK</p>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -36, right: -36, width: 120, height: 120, background: 'var(--accent)', borderRadius: '50%', filter: 'blur(72px)', opacity: 0.07 }} />
                <button
                  type="button"
                  onClick={() => window.location.href = '/fakture'}
                  style={{ position: 'absolute', top: 12, right: 12, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 16, padding: '4px 10px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {fakture.length === 1 ? '1 faktura' : fakture.length >= 2 && fakture.length <= 4 ? `${fakture.length} fakture` : `${fakture.length} faktura`}
                </button>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Ukupni prihod · {godina}.</p>
                  <p style={{ fontSize: 34, fontWeight: 800, color: 'var(--accent)', margin: '0 0 2px 0', textShadow: '0 0 24px #00C89630', lineHeight: 1.15 }}>
                    {prihodGodina.toLocaleString()} <span style={{ fontSize: 15, color: 'var(--text-muted)', fontWeight: 700 }}>RSD</span>
                  </p>
                  {prihodGodina !== ukupnoRSD && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 4px 0' }}>
                      U aplikaciji: {ukupnoRSD.toLocaleString()} RSD · uključen početni prihod za godinu
                    </p>
                  )}
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 12px 0' }}>≈ {ukupnoEUR.toLocaleString()} EUR</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Ukupno mesečno (iz poreskog rešenja)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 15 }}>{ukupnoMesecnoObaveze.toLocaleString()} RSD</span>
                    <button
                      type="button"
                      onClick={() => setPoresniResenjeModalOpen(true)}
                      aria-label="Detalji iznosa iz poreskog rešenja"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>ℹ</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 4px 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 10, margin: 0 }}>Limit kalendarske godine ({limitRsd.toLocaleString('sr-RS')} RSD)</p>
                  <span
                    title={`Limit 365 dana (8.000.000 RSD): prihod u poslednjih 365 dana ${prihod365.toLocaleString()} RSD (${procenat365.toFixed(1)}%), preostalo ${remaining365.toLocaleString()} RSD`}
                    aria-label={`Limit 365 dana: prihod ${prihod365.toLocaleString()} RSD, ${procenat365.toFixed(1)} procenata, preostalo ${remaining365.toLocaleString()} RSD`}
                    style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)', cursor: 'help', flexShrink: 0 }}
                  >
                    <Info size={14} strokeWidth={2} aria-hidden />
                  </span>
                </div>
                <div style={{ background: 'var(--bg-primary)', borderRadius: 6, height: 6, marginBottom: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${procenat}%`, background: bojaBar, borderRadius: 6, boxShadow: `0 0 8px ${bojaBar}`, transition: 'width 0.5s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, fontSize: 10, color: 'var(--text-muted)', marginBottom: 0 }}>
                  <span style={{ color: bojaBar }}>{procenat.toFixed(1)}% limita</span>
                  <span>Još {remainingLimit.toLocaleString()} RSD</span>
                  <span>{limitRsd.toLocaleString('sr-RS')}</span>
                </div>

                {procenat > 80 && (
                  <Alert
                    variant={procenat >= 100 ? 'danger' : 'warning'}
                    style={{ marginTop: 10, fontSize: 12, padding: '8px 10px' }}
                  >
                    {procenat >= 100
                      ? `Prekoračili ste godišnji limit (${procenat.toFixed(0)}%). Proveri obaveze sa računovođom.`
                      : `Prešli ste ${procenat.toFixed(0)}% godišnjeg limita — prati prihod.`}
                  </Alert>
                )}
                {procenat365 > 80 && (
                  <Alert
                    variant={procenat365 >= 100 ? 'danger' : 'warning'}
                    style={{ marginTop: procenat > 80 ? 6 : 10, fontSize: 12, padding: '8px 10px' }}
                  >
                    {procenat365 >= 100
                      ? `Prekoračili ste limit za 365 dana (${procenat365.toFixed(0)}%).`
                      : `Prešli ste ${procenat365.toFixed(0)}% limita za 365 dana — prati rolling prihod.`}
                  </Alert>
                )}
              </div>
            </section>

            {/* 2. Predstojeće obaveze — kalendar */}
            <section style={{ marginBottom: 14 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', margin: '0 0 8px 0' }}>PREDSTOJEĆE OBAVEZE</p>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 }}>Rokovi i napomene</span>
                  <span style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,255,179,0.2)', color: 'var(--accent)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{new Date().getFullYear()}</span>
                </div>
                <PoresniKalendar ukupnoRsd={prihodGodina} limit={limitRsd} embedded userId={user?.id} />
              </div>
            </section>

            {/* 3. Analitika — skupljivo */}
            <section>
              <button
                type="button"
                aria-expanded={analyticsOpen}
                onClick={() => setAnalyticsOpen(o => !o)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  marginBottom: analyticsOpen ? 8 : 0,
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em' }}>ANALITIKA</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1 }} aria-hidden>{analyticsOpen ? '▼' : '▶'}</span>
              </button>
              {analyticsOpen && (
                <SmartInsightsLazy prihodi={fakture} prihodiTekucaGodina={prihodiTekucaGodina} godina={godina} hideOuterTitle limitRsd={limitRsd} />
              )}
            </section>
          </>
        )}

        {!loading && tab === 'dodaj' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 20px 0' }}>NOVI PRIHOD</p>
            <div ref={klijentDropdownRef} style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Ime klijenta"
                value={forma.klijent}
                onChange={e => {
                  setForma({ ...forma, klijent: e.target.value })
                  setShowKlijentDropdown(true)
                }}
                onFocus={() => setShowKlijentDropdown(true)}
                onBlur={() => setTimeout(() => setShowKlijentDropdown(false), 200)}
                style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              />
              {showKlijentDropdown && (() => {
                const q = (forma.klijent || '').trim().toLowerCase()
                const filtered = q
                  ? klijentSuggestions.filter(k => k.toLowerCase().includes(q))
                  : klijentSuggestions
                if (filtered.length === 0) return null
                return (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      maxHeight: 220,
                      overflowY: 'auto',
                      zIndex: 50,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}
                  >
                    {filtered.map(k => (
                      <button
                        key={k}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setForma({ ...forma, klijent: k }); setShowKlijentDropdown(false) }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 16px',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-primary)',
                          fontSize: 14,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input type="number" placeholder="Iznos" value={forma.iznos} onChange={e => setForma({ ...forma, iznos: e.target.value })}
                style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
              />
              <select value={forma.valuta} onChange={e => setForma({ ...forma, valuta: e.target.value as Valuta })}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                <option>EUR</option><option>USD</option><option>RSD</option>
              </select>
            </div>
            <input type="date" value={forma.datum} onChange={e => setForma({ ...forma, datum: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, marginBottom: 4, boxSizing: 'border-box', outline: 'none' }}
            />
            {kursPrikaz && (
              <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 8px 4px' }}>📈 NBS kurs: {kursPrikaz}</p>
            )}
            {iznosRsdPrikaz && forma.valuta !== 'RSD' && (
              <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 2px 0' }}>IZNOS U RSD</p>
                <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18, margin: 0 }}>≈ {iznosRsdPrikaz}</p>
              </div>
            )}
            <input type="text" placeholder="Napomena (opciono)" value={forma.napomena} onChange={e => setForma({ ...forma, napomena: e.target.value })}
              style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)', fontSize: 14, marginBottom: 20, boxSizing: 'border-box', outline: 'none' }}
            />
            <button onClick={dodajFakturu} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px #00C89640' }}>
              + Dodaj prihod
            </button>
          </div>
        )}

        {!loading && tab === 'fakture' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setModalIzFaktureOpen(true)}
                style={{
                  flex: 1, background: 'var(--accent)', color: 'var(--foreground)', fontWeight: 700, fontSize: 15,
                  padding: '14px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 2px 12px var(--accent-dim)', transition: 'transform 0.15s ease',
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
                onClick={() => setTab('dodaj')}
                style={{
                  flex: 1, background: 'var(--bg-card)', color: 'var(--accent)', fontWeight: 700, fontSize: 15,
                  padding: '14px 20px', borderRadius: 12, border: '2px solid var(--accent)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 2px 8px var(--shadow)', transition: 'transform 0.15s ease',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>💵</span>
                <span>+ Bez fakture</span>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0, letterSpacing: '0.06em', fontWeight: 800 }}>
                  PRIHODI {godina}. ({fakture.length})
                </p>
                <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, margin: '6px 0 0 0' }}>
                  Prihodi
                </p>
              </div>
              {fakture.length > 0 && (
                <button
                  type="button"
                  onClick={() => generatePDF(fakture, godina, user.email || '', { ukupnoRSD: prihodGodina, porez, pio, zdravstvo, neto, procenat })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--accent-dim)',
                    border: '2px solid var(--accent)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    color: 'var(--accent)',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px var(--shadow)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <FileDown size={18} />
                  Izvezi PDF
                </button>
              )}
            </div>
            {fakture.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: 40 }}>📋</p>
                <p>Nema prihoda za {godina}. godinu</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {fakture.map(f => (
                  <div
                    key={f.id}
                    className="interactive-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedIncome(f); setIncomeDetailsOpen(true) }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedIncome(f)
                        setIncomeDetailsOpen(true)
                      }
                    }}
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    aria-label={`Detalji prihoda: ${f.klijent}`}
                  >
                    <div>
                      <p style={{ fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{f.klijent}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{f.datum || 'Bez datuma'}</p>
                      {f.napomena && <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0 0' }}>{f.napomena}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ color: 'var(--accent)', fontWeight: 700, margin: '0 0 2px 0' }}>{f.iznos} {f.valuta}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{f.iznos_rsd.toLocaleString()} RSD</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteIncomeId(f.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}
                        aria-label="Obriši prihod"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {tab === 'settings' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Podešavanja profila</p>
          <a href="/settings" style={{ background: 'var(--accent)', color: '#000', fontWeight: 700, fontSize: 15, padding: '14px 32px', borderRadius: 12, textDecoration: 'none' }}>
            Otvori podešavanja →
          </a>
        </div>
      )}

      <FloatingAddPrihod />

      {/* Bottom nav — fiksirana na dnu na svim uređajima */}
      <div className="bottom-nav-fixed" style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
        {[
          { key: 'dashboard', icon: '📊', label: 'Pregled' },
          { key: 'fakture', icon: '📋', label: 'Prihodi' },
          { key: 'dodaj', label: 'Dodaj' },
          { key: 'faktura', icon: '🧾', label: 'Faktura', href: '/fakture' },
          { key: 'kpo', icon: '📒', label: 'KPO', href: '/kpo' },
          { key: 'settings', icon: '⚙️', label: 'Profil', href: '/profil' },
        ].map((item) => {
          const href = (item as { href?: string }).href
          if (item.key === 'dodaj') {
            const isDodaj = tab === 'dodaj'
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab('dodaj')}
                className={`bottom-nav-dodaj${isDodaj ? ' bottom-nav-dodaj--active' : ''}`}
                aria-current={isDodaj ? 'page' : undefined}
              >
                <span className="bottom-nav-dodaj-lift" aria-hidden>
                  <span className="bottom-nav-dodaj-fab">
                    <NavDodajFabPlus />
                  </span>
                </span>
                <span className="bottom-nav-dodaj-label">{item.label}</span>
              </button>
            )
          }
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => (href ? (window.location.href = href) : setTab(item.key as 'dashboard' | 'fakture'))}
              className="bottom-nav-item"
              style={{
                color: tab === item.key ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: tab === item.key ? 700 : 400,
              }}
            >
              <span className="bottom-nav-item-icon nav-item-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="bottom-nav-item-label nav-item-label">{item.label}</span>
            </button>
          )
        })}
      </div>
      <div className="page-content-spacer" />
    </div>
  )
}

const dashboardSuspenseFallback = (
  <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    Učitavanje...
  </div>
)

export default function DashboardPage() {
  return (
    <Suspense fallback={dashboardSuspenseFallback}>
      <DashboardContent />
    </Suspense>
  )
}