import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from './providers'

export const metadata: Metadata = {
  title: 'Paušo',
  description:
    'Paušo — pratite prihode, rokove i poreze kao paušalac u Srbiji. Džepni knjigovođa za paušalce.',
  applicationName: 'Paušo',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/api/app-icon?size=16', sizes: '16x16', type: 'image/png' },
      { url: '/api/app-icon?size=32', sizes: '32x32', type: 'image/png' },
      { url: '/api/app-icon?size=192', sizes: '192x192', type: 'image/png' },
      { url: '/api/app-icon?size=512', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [{ url: '/api/app-icon?size=192', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/api/app-icon?size=180', sizes: '180x180', type: 'image/png' }],
  },
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