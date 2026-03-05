export interface KPOEntry {
    id: string;
    datumPrometa: string; // format: "YYYY-MM-DD"
    brojFakture: string;
    opis: string;
    iznos: number;
    // dodaj ostala polja koja imaš
  }
  
  /**
   * Sortira unose hronološki po datumu prometa,
   * filtrira po godini i dodeljuje redne brojeve bez rupa.
   */
  export function getKPOWithRedniBrevi(
    entries: KPOEntry[],
    godina: number
  ): (KPOEntry & { redniBroj: number })[] {
    return entries
      .filter((e) => new Date(e.datumPrometa).getFullYear() === godina)
      .sort(
        (a, b) =>
          new Date(a.datumPrometa).getTime() - new Date(b.datumPrometa).getTime()
      )
      .map((entry, index) => ({
        ...entry,
        redniBroj: index + 1, // 1, 2, 3... bez rupa
      }));
  }