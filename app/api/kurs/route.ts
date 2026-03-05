import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const datum = req.nextUrl.searchParams.get('datum')
  if (!datum) return NextResponse.json({ error: 'Nema datuma' }, { status: 400 })

  const date = new Date(datum)
  const day = date.getDay()
  if (day === 0) date.setDate(date.getDate() - 2)
  if (day === 6) date.setDate(date.getDate() - 1)

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  try {
    const res = await fetch(`https://kurs.resenje.org/api/v1/currencies/eur/rates/${yyyy}-${mm}-${dd}`)
    const data = await res.json()
    const rate = data?.middle
    if (!rate) throw new Error('Nema kursa')
    return NextResponse.json({ rate })
  } catch {
    return NextResponse.json({ rate: 117 })
  }
}