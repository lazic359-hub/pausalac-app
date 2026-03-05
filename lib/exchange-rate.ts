export async function getEurToRsdRate(dateStr: string): Promise<number> {
    try {
      const res = await fetch(`/api/kurs?datum=${dateStr}`)
      const data = await res.json()
      if (!data.rate) throw new Error('Nema kursa')
      return data.rate
    } catch {
      return 117
    }
  }