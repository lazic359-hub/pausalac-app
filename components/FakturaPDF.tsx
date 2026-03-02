'use client'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 700 },
  ],
})

const s = StyleSheet.create({
  page: { fontFamily: 'Roboto', backgroundColor: '#fff', padding: 48, fontSize: 10, color: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  headerLeft: { flexDirection: 'column' },
  logo: { fontSize: 22, fontWeight: 700, color: '#00b386', marginBottom: 4 },
  headerSub: { fontSize: 9, color: '#888' },
  headerRight: { alignItems: 'flex-end' },
  fakturaTitle: { fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
  fakturaBroj: { fontSize: 11, color: '#888' },
  devizaBadge: { fontSize: 9, color: '#fff', backgroundColor: '#00b386', padding: '3 8', borderRadius: 4, marginTop: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e8e8f0', marginBottom: 24 },
  dividerBold: { borderBottomWidth: 2, borderBottomColor: '#00b386', marginBottom: 24 },
  firmeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  firmaBox: { width: '46%' },
  firmaLabel: { fontSize: 8, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 4 },
  firmaNaziv: { fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
  firmaInfo: { fontSize: 9, color: '#555', marginBottom: 2 },
  firmaInfoGreen: { fontSize: 9, color: '#00b386', marginBottom: 2, fontWeight: 700 },
  datumRow: { flexDirection: 'row', gap: 32, marginBottom: 32 },
  datumBox: { flexDirection: 'column' },
  datumLabel: { fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  datumValue: { fontSize: 11, fontWeight: 700, color: '#1a1a2e' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f7ff', padding: '10 12', borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '10 12', borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  tableRowAlt: { flexDirection: 'row', padding: '10 12', backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  colBr: { width: '8%', fontSize: 9, color: '#888' },
  colOpis: { width: '62%' },
  colIznos: { width: '30%', textAlign: 'right' },
  thText: { fontSize: 9, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 },
  tdText: { fontSize: 10, color: '#1a1a2e' },
  tdIznos: { fontSize: 10, fontWeight: 700, color: '#1a1a2e', textAlign: 'right' },
  ukupnoBox: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, marginBottom: 16 },
  ukupnoInner: { width: '45%' },
  ukupnoFinalBox: { backgroundColor: '#00b386', borderRadius: 6, padding: '10 12', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  ukupnoFinalLabel: { fontSize: 11, fontWeight: 700, color: '#fff' },
  ukupnoFinalValue: { fontSize: 14, fontWeight: 700, color: '#fff' },
  konverzijaBox: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 24 },
  konverzijaInner: { width: '45%', backgroundColor: '#f5fff8', borderRadius: 6, padding: '8 12', borderWidth: 1, borderColor: '#c8f0de' },
  konverzijaText: { fontSize: 8, color: '#3a8a60', marginBottom: 2 },
  konverzijaValue: { fontSize: 10, fontWeight: 700, color: '#00b386' },
  placanjBox: { backgroundColor: '#f5f7ff', borderRadius: 8, padding: 16, marginBottom: 24 },
  placanjTitle: { fontSize: 9, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  placanjRow: { flexDirection: 'row', marginBottom: 4 },
  placanjLabel: { fontSize: 9, color: '#888', width: 110 },
  placanjValue: { fontSize: 9, color: '#1a1a2e', fontWeight: 700 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 8, color: '#bbb' },
  footerBrand: { fontSize: 8, color: '#00b386', fontWeight: 700 },
  napomenaBox: { borderLeftWidth: 3, borderLeftColor: '#00b386', paddingLeft: 10, marginBottom: 24 },
  napomenaTitle: { fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  napomenaText: { fontSize: 9, color: '#555' },
  disclaimerBox: { backgroundColor: '#fffbf0', borderRadius: 6, padding: '8 12', marginBottom: 16, borderWidth: 1, borderColor: '#ffe8a0' },
  disclaimerText: { fontSize: 8, color: '#998844' },
})

type Stavka = { opis: string; iznos: string }
type Izdavalac = {
  nazivFirme: string; pib: string; maticniBroj: string; brojRacuna: string
  iban?: string; swift?: string
}
type Props = {
  brojFakture: string
  datum: string
  datumValute?: string
  izdavalac: Izdavalac
  klijent: { naziv: string; pib?: string; adresa: string }
  stavke: Stavka[]
  napomena?: string
  valuta?: string
  kurs?: number
}

function formatBrojRSD(n: number) {
  return n.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RSD'
}

function formatBrojValuta(n: number, valuta: string) {
  return n.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + valuta
}

function formatDatum(d: string) {
  if (!d) return ''
  const [god, mes, dan] = d.split('-')
  return `${dan}.${mes}.${god}.`
}

export default function FakturaPDF({ brojFakture, datum, datumValute, izdavalac, klijent, stavke = [], napomena, valuta = 'RSD', kurs = 1 }: Props) {
  const inostranstvo = valuta !== 'RSD'
  const ukupnoValuta = (stavke || []).reduce((sum, st) => sum + (parseFloat(st.iznos) || 0), 0)
  const ukupnoRSD = inostranstvo ? Math.round(ukupnoValuta * kurs) : ukupnoValuta
  const danas = new Date().toISOString().split('T')[0]

  const L = {
    faktura:      inostranstvo ? 'INVOICE / FAKTURA'  : 'FAKTURA',
    izdavalac:    inostranstvo ? 'Seller / Izdavalac'  : 'Izdavalac',
    primalac:     inostranstvo ? 'Buyer / Primalac'    : 'Primalac',
    datumFakture: inostranstvo ? 'Invoice date / Datum' : 'Datum fakture',
    datumPrometa: inostranstvo ? 'Service date / Promet' : 'Datum prometa',
    datumValute:  inostranstvo ? 'Due date / Valuta'   : 'Datum valute',
    opis:         inostranstvo ? 'Description / Opis'  : 'Opis usluge',
    iznos:        inostranstvo ? 'Amount / Iznos'      : 'Iznos',
    ukupno:       inostranstvo ? 'TOTAL / UKUPNO'      : 'UKUPNO ZA UPLATU',
    placanje:     inostranstvo ? 'Payment instructions / Instrukcije za placanje' : 'Instrukcije za placanje',
    primalacPl:   inostranstvo ? 'Beneficiary / Primalac:' : 'Primalac:',
    racun:        inostranstvo ? 'Account / Racun:' : 'Broj racuna:',
    iznOsPlacanje: inostranstvo ? 'Amount / Iznos:' : 'Iznos:',
    poziv:        inostranstvo ? 'Reference / Poziv:' : 'Poziv na broj:',
    pib:          inostranstvo ? 'Tax ID / PIB:' : 'PIB:',
    mb:           inostranstvo ? 'Reg. No / MB:' : 'Maticni broj:',
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.logo}>{izdavalac.nazivFirme}</Text>
            <Text style={s.headerSub}>{L.pib} {izdavalac.pib}  |  {L.mb} {izdavalac.maticniBroj}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.fakturaTitle}>{L.faktura}</Text>
            <Text style={s.fakturaBroj}>br. {brojFakture}</Text>
            {inostranstvo && <Text style={s.devizaBadge}>{valuta} Invoice</Text>}
          </View>
        </View>

        <View style={s.dividerBold} />

        {/* Firme */}
        <View style={s.firmeRow}>
          <View style={s.firmaBox}>
            <Text style={s.firmaLabel}>{L.izdavalac}</Text>
            <Text style={s.firmaNaziv}>{izdavalac.nazivFirme}</Text>
            <Text style={s.firmaInfo}>{L.pib} {izdavalac.pib}</Text>
            <Text style={s.firmaInfo}>{L.mb} {izdavalac.maticniBroj}</Text>
            <Text style={s.firmaInfo}>Racun: {izdavalac.brojRacuna}</Text>
            {inostranstvo && izdavalac.iban && (
              <Text style={s.firmaInfoGreen}>IBAN: {izdavalac.iban}</Text>
            )}
            {inostranstvo && izdavalac.swift && (
              <Text style={s.firmaInfoGreen}>SWIFT/BIC: {izdavalac.swift}</Text>
            )}
          </View>
          <View style={s.firmaBox}>
            <Text style={s.firmaLabel}>{L.primalac}</Text>
            <Text style={s.firmaNaziv}>{klijent.naziv}</Text>
            {klijent.pib ? <Text style={s.firmaInfo}>{L.pib} {klijent.pib}</Text> : null}
            <Text style={s.firmaInfo}>{klijent.adresa}</Text>
          </View>
        </View>

        {/* Datumi */}
        <View style={s.datumRow}>
          <View style={s.datumBox}>
            <Text style={s.datumLabel}>{L.datumFakture}</Text>
            <Text style={s.datumValue}>{formatDatum(datum)}</Text>
          </View>
          <View style={s.datumBox}>
            <Text style={s.datumLabel}>{L.datumPrometa}</Text>
            <Text style={s.datumValue}>{formatDatum(datum)}</Text>
          </View>
          <View style={s.datumBox}>
            <Text style={s.datumLabel}>{L.datumValute}</Text>
            <Text style={s.datumValue}>{formatDatum(datumValute || datum)}</Text>
          </View>
          {inostranstvo && (
            <View style={s.datumBox}>
              <Text style={s.datumLabel}>Exchange rate / Kurs</Text>
              <Text style={s.datumValue}>1 {valuta} = {kurs} RSD</Text>
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* Tabela */}
        <View style={s.tableHeader}>
          <Text style={[s.colBr, s.thText]}>#</Text>
          <Text style={[s.colOpis, s.thText]}>{L.opis}</Text>
          <Text style={[s.colIznos, s.thText]}>{L.iznos} ({valuta})</Text>
        </View>

        {stavke.map((st, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.colBr, s.tdText]}>{i + 1}.</Text>
            <Text style={[s.colOpis, s.tdText]}>{st.opis}</Text>
            <Text style={[s.colIznos, s.tdIznos]}>
              {formatBrojValuta(parseFloat(st.iznos) || 0, valuta)}
            </Text>
          </View>
        ))}

        {/* Ukupno */}
        <View style={s.ukupnoBox}>
          <View style={s.ukupnoInner}>
            <View style={s.ukupnoFinalBox}>
              <Text style={s.ukupnoFinalLabel}>{L.ukupno}</Text>
              <Text style={s.ukupnoFinalValue}>{formatBrojValuta(ukupnoValuta, valuta)}</Text>
            </View>
          </View>
        </View>

        {/* Dinarska protivvrednost */}
        {inostranstvo && (
          <View style={s.konverzijaBox}>
            <View style={s.konverzijaInner}>
              <Text style={s.konverzijaText}>Dinarska protivvrednost / RSD equivalent:</Text>
              <Text style={s.konverzijaValue}>{formatBrojRSD(ukupnoRSD)}</Text>
              <Text style={s.konverzijaText}>@ {kurs} RSD/{valuta} (NBS kurs)</Text>
            </View>
          </View>
        )}

        {/* Instrukcije za plaćanje */}
        <View style={s.placanjBox}>
          <Text style={s.placanjTitle}>{L.placanje}</Text>
          <View style={s.placanjRow}>
            <Text style={s.placanjLabel}>{L.primalacPl}</Text>
            <Text style={s.placanjValue}>{izdavalac.nazivFirme}</Text>
          </View>
          {!inostranstvo && (
            <View style={s.placanjRow}>
              <Text style={s.placanjLabel}>{L.racun}</Text>
              <Text style={s.placanjValue}>{izdavalac.brojRacuna}</Text>
            </View>
          )}
          {inostranstvo && izdavalac.iban && (
            <View style={s.placanjRow}>
              <Text style={s.placanjLabel}>IBAN:</Text>
              <Text style={s.placanjValue}>{izdavalac.iban}</Text>
            </View>
          )}
          {inostranstvo && izdavalac.swift && (
            <View style={s.placanjRow}>
              <Text style={s.placanjLabel}>SWIFT/BIC:</Text>
              <Text style={s.placanjValue}>{izdavalac.swift}</Text>
            </View>
          )}
          <View style={s.placanjRow}>
            <Text style={s.placanjLabel}>{L.iznOsPlacanje}</Text>
            <Text style={s.placanjValue}>{formatBrojValuta(ukupnoValuta, valuta)}</Text>
          </View>
          <View style={s.placanjRow}>
            <Text style={s.placanjLabel}>{L.poziv}</Text>
            <Text style={s.placanjValue}>{brojFakture}</Text>
          </View>
        </View>

        {/* Disclaimer za devizne fakture */}
        {inostranstvo && (
          <View style={s.disclaimerBox}>
            <Text style={s.disclaimerText}>
              Pausalac nije obveznik PDV-a. / This invoice is VAT exempt (flat-rate taxpayer, Republic of Serbia).
            </Text>
          </View>
        )}

        {napomena ? (
          <View style={s.napomenaBox}>
            <Text style={s.napomenaTitle}>Napomena / Note</Text>
            <Text style={s.napomenaText}>{napomena}</Text>
          </View>
        ) : null}

        <View style={s.footer}>
          <Text style={s.footerText}>Generisano: {formatDatum(danas)}</Text>
          <Text style={s.footerText}>{izdavalac.nazivFirme}  |  PIB: {izdavalac.pib}</Text>
          <Text style={s.footerBrand}>Pausalac App</Text>
        </View>

      </Page>
    </Document>
  )
}
