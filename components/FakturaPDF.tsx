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
  divider: { borderBottomWidth: 1, borderBottomColor: '#e8e8f0', marginBottom: 24 },
  dividerBold: { borderBottomWidth: 2, borderBottomColor: '#00b386', marginBottom: 24 },
  firmeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  firmaBox: { width: '46%' },
  firmaLabel: { fontSize: 8, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 4 },
  firmaNaziv: { fontSize: 12, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 },
  firmaInfo: { fontSize: 9, color: '#555', marginBottom: 2 },
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
  ukupnoBox: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, marginBottom: 32 },
  ukupnoInner: { width: '40%' },
  ukupnoFinalBox: { backgroundColor: '#00b386', borderRadius: 6, padding: '10 12', flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  ukupnoFinalLabel: { fontSize: 11, fontWeight: 700, color: '#fff' },
  ukupnoFinalValue: { fontSize: 14, fontWeight: 700, color: '#fff' },
  placanjBox: { backgroundColor: '#f5f7ff', borderRadius: 8, padding: 16, marginBottom: 24 },
  placanjTitle: { fontSize: 9, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  placanjRow: { flexDirection: 'row', marginBottom: 4 },
  placanjLabel: { fontSize: 9, color: '#888', width: 100 },
  placanjValue: { fontSize: 9, color: '#1a1a2e', fontWeight: 700 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 8, color: '#bbb' },
  footerBrand: { fontSize: 8, color: '#00b386', fontWeight: 700 },
  napomenaBox: { borderLeftWidth: 3, borderLeftColor: '#00b386', paddingLeft: 10, marginBottom: 24 },
  napomenaTitle: { fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  napomenaText: { fontSize: 9, color: '#555' },
})

type Stavka = { opis: string; iznos: string }
type Props = {
  brojFakture: string
  datum: string
  datumValute?: string
  izdavalac: { nazivFirme: string; pib: string; maticniBroj: string; brojRacuna: string }
  klijent: { naziv: string; pib?: string; adresa: string }
  stavke: Stavka[]
  napomena?: string
}

function formatBroj(n: number) {
  return n.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RSD'
}

function formatDatum(d: string) {
  if (!d) return ''
  const [god, mes, dan] = d.split('-')
  return `${dan}.${mes}.${god}.`
}

export default function FakturaPDF({ brojFakture, datum, datumValute, izdavalac, klijent, stavke = [], napomena }: Props) {
  const ukupno = (stavke || []).reduce((s, st) => s + (parseFloat(st.iznos) || 0), 0)
  const danas = new Date().toISOString().split('T')[0]

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.logo}>{izdavalac.nazivFirme}</Text>
            <Text style={s.headerSub}>PIB: {izdavalac.pib}  |  MB: {izdavalac.maticniBroj}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.fakturaTitle}>FAKTURA</Text>
            <Text style={s.fakturaBroj}>br. {brojFakture}</Text>
          </View>
        </View>

        <View style={s.dividerBold} />

        <View style={s.firmeRow}>
          <View style={s.firmaBox}>
            <Text style={s.firmaLabel}>Izdavalac</Text>
            <Text style={s.firmaNaziv}>{izdavalac.nazivFirme}</Text>
            <Text style={s.firmaInfo}>PIB: {izdavalac.pib}</Text>
            <Text style={s.firmaInfo}>Maticni broj: {izdavalac.maticniBroj}</Text>
            <Text style={s.firmaInfo}>Racun: {izdavalac.brojRacuna}</Text>
          </View>
          <View style={s.firmaBox}>
            <Text style={s.firmaLabel}>Primalac</Text>
            <Text style={s.firmaNaziv}>{klijent.naziv}</Text>
            {klijent.pib ? <Text style={s.firmaInfo}>PIB: {klijent.pib}</Text> : null}
            <Text style={s.firmaInfo}>{klijent.adresa}</Text>
          </View>
        </View>

        <View style={s.datumRow}>
          <View style={s.datumBox}>
            <Text style={s.datumLabel}>Datum fakture</Text>
            <Text style={s.datumValue}>{formatDatum(datum)}</Text>
          </View>
          <View style={s.datumBox}>
            <Text style={s.datumLabel}>Datum prometa</Text>
            <Text style={s.datumValue}>{formatDatum(datum)}</Text>
          </View>
          <View style={s.datumBox}>
            <Text style={s.datumLabel}>Datum valute</Text>
            <Text style={s.datumValue}>{formatDatum(datumValute || datum)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.tableHeader}>
          <Text style={[s.colBr, s.thText]}>#</Text>
          <Text style={[s.colOpis, s.thText]}>Opis usluge</Text>
          <Text style={[s.colIznos, s.thText]}>Iznos</Text>
        </View>

        {stavke.map((st, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={[s.colBr, s.tdText]}>{i + 1}.</Text>
            <Text style={[s.colOpis, s.tdText]}>{st.opis}</Text>
            <Text style={[s.colIznos, s.tdIznos]}>{formatBroj(parseFloat(st.iznos) || 0)}</Text>
          </View>
        ))}

        <View style={s.ukupnoBox}>
          <View style={s.ukupnoInner}>
            <View style={s.ukupnoFinalBox}>
              <Text style={s.ukupnoFinalLabel}>UKUPNO ZA UPLATU</Text>
              <Text style={s.ukupnoFinalValue}>{formatBroj(ukupno)}</Text>
            </View>
          </View>
        </View>

        <View style={s.placanjBox}>
          <Text style={s.placanjTitle}>Instrukcije za placanje</Text>
          <View style={s.placanjRow}>
            <Text style={s.placanjLabel}>Primalac:</Text>
            <Text style={s.placanjValue}>{izdavalac.nazivFirme}</Text>
          </View>
          <View style={s.placanjRow}>
            <Text style={s.placanjLabel}>Broj racuna:</Text>
            <Text style={s.placanjValue}>{izdavalac.brojRacuna}</Text>
          </View>
          <View style={s.placanjRow}>
            <Text style={s.placanjLabel}>Iznos:</Text>
            <Text style={s.placanjValue}>{formatBroj(ukupno)}</Text>
          </View>
          <View style={s.placanjRow}>
            <Text style={s.placanjLabel}>Poziv na broj:</Text>
            <Text style={s.placanjValue}>{brojFakture}</Text>
          </View>
        </View>

        {napomena ? (
          <View style={s.napomenaBox}>
            <Text style={s.napomenaTitle}>Napomena</Text>
            <Text style={s.napomenaText}>{napomena}</Text>
          </View>
        ) : null}

        <View style={s.footer}>
          <Text style={s.footerText}>Generisano: {formatDatum(danas)}</Text>
          <Text style={s.footerText}>Pausalac - {izdavalac.nazivFirme}  |  PIB: {izdavalac.pib}</Text>
          <Text style={s.footerBrand}>Pausalac App</Text>
        </View>
      </Page>
    </Document>
  )
}