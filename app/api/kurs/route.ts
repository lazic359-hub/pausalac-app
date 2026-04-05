import { NextRequest, NextResponse } from 'next/server'

function businessDate(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  if (day === 0) date.setDate(date.getDate() - 2)
  if (day === 6) date.setDate(date.getDate() - 1)
  return date
}

export async function GET(req: NextRequest) {
  const datum = req.nextUrl.searchParams.get('datum')
  if (!datum) return NextResponse.json({ error: 'Nema datuma' }, { status: 400 })

  const valuta = (req.nextUrl.searchParams.get('valuta') || 'EUR').toUpperCase()
  if (valuta !== 'EUR' && valuta !== 'USD') {
    return NextResponse.json({ error: 'Nepodržana valuta' }, { status: 400 })
  }

  const date = businessDate(new Date(datum))
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const d = `${yyyy}-${mm}-${dd}`
  const slug = valuta === 'EUR' ? 'eur' : 'usd'

  try {
    const res = await fetch(`https://kurs.resenje.org/api/v1/currencies/${slug}/rates/${d}`)
    const data = await res.json()
    const rate = data?.middle ?? data?.exchange_middle
    if (!rate) throw new Error('Nema kursa')
    return NextResponse.json({ rate: Number(rate), valuta, fallback: false })
  } catch {
    return NextResponse.json({ rate: valuta === 'EUR' ? 117 : 108, valuta, fallback: true })
  }
}