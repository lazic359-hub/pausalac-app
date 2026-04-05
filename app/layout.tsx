import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from './providers'

export const metadata: Metadata = {
  title: 'Paušo',
  description:
    'Paušo — pratite prihode, rokove i poreze kao paušalac u Srbiji. Džepni knjigovođa za paušalce.',
  applicationName: 'Paušo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Paušo',
  },
}

export const viewport: Viewport = {
  themeColor: '#00C896',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}