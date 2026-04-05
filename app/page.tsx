import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/LandingPage'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  title: 'Paušo — Džepni knjigovođa za paušalce u Srbiji',
  description:
    'Paušo: prati prihode, rokove i poreze kao paušalac u Srbiji. Automatska KPO knjiga, fakturisanje u EUR i USD, push podsetnici.',
  metadataBase: new URL(siteUrl),
  applicationName: 'Paušo',
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: '/',
    siteName: 'Paušo',
    title: 'Paušo — Džepni knjigovođa za paušalce u Srbiji',
    description:
      'Paušo: prati prihode, rokove i poreze kao paušalac u Srbiji. Automatska KPO knjiga, fakturisanje u EUR i USD, push podsetnici.',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Paušo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Paušo — Džepni knjigovođa za paušalce u Srbiji',
    description:
      'Paušo: prati prihode, rokove i poreze kao paušalac u Srbiji. Automatska KPO knjiga, fakturisanje u EUR i USD, push podsetnici.',
  },
  alternates: {
    canonical: '/',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Paušo',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '4.99',
    priceCurrency: 'EUR',
    description: 'Pro plan — jedna cena, mesečna pretplata',
  },
  description:
    'Paušo — džepni knjigovođa za paušalce u Srbiji. Praćenje prihoda, rokova, KPO knjige i fakturisanje.',
  inLanguage: 'sr-RS',
  url: siteUrl,
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
