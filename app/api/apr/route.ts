import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const pib = (req.nextUrl.searchParams.get('pib') || '').replace(/\D/g, '')
  if (!pib) return NextResponse.json({ error: 'Nema PIB' }, { status: 400 })
  if (pib.length !== 9) return NextResponse.json({ error: 'Neispravan PIB' }, { status: 400 })

  try {
    const attempt = async (url: string) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json', 'User-Agent': 'PausalacApp/1.0' },
          cache: 'no-store',
          signal: controller.signal,
        })
        const text = await res.text()
        return { ok: res.ok, status: res.status, text, url }
      } finally {
        clearTimeout(timeout)
      }
    }

    const candidates = [
      // Original public API (some networks can't resolve it)
      `https://api.apr.gov.rs/api/v1/SubjectSearch/SearchByPib?pib=${encodeURIComponent(pib)}`,
      // Portal API (sometimes requires auth / may 404 depending on deployment)
      `https://portal-api.apr.gov.rs/api/v1/SubjectSearch/SearchByPib?pib=${encodeURIComponent(pib)}`,
      // Alternative suggestions (may differ by environment)
      `https://pretraga3.apr.gov.rs/unifiedentityservice/api/v2/subjectData/searchByPib?pib=${encodeURIComponent(pib)}`,
      `https://efatura.purs.gov.rs/api/v1/subjectData?pib=${encodeURIComponent(pib)}`,
    ]

    const errors: Array<{ url: string; code: string }> = []
    for (const url of candidates) {
      try {
        const r = await attempt(url)
        if (r.status === 404) continue
        if (!r.ok) { errors.push({ url, code: `HTTP_${r.status}` }); continue }
        // ensure it's JSON (avoid HTML bot pages)
        const trimmed = r.text.trim()
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) { errors.push({ url, code: 'NON_JSON' }); continue }
        const payload = JSON.parse(trimmed)
        return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } })
      } catch (e: any) {
        const code = e?.cause?.code || e?.code || e?.name || 'ERR'
        errors.push({ url, code: String(code) })
        continue
      }
    }

    return NextResponse.json({ error: 'APR_UNREACHABLE', details: errors }, { status: 503 })
  } catch (e: any) {
    const code = e?.cause?.code || e?.code
    if (e?.name === 'AbortError') return NextResponse.json({ error: 'APR_TIMEOUT' }, { status: 504 })
    if (code === 'ENOTFOUND') return NextResponse.json({ error: 'APR_DNS_NOT_FOUND' }, { status: 503 })
    return NextResponse.json({ error: 'APR_FETCH_FAILED' }, { status: 502 })
  }
}

