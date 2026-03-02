import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Paušalac App',
  description: 'Pratite prihode i poreze kao paušalac u Srbiji',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Paušalac',
  },
}

export const viewport: Viewport = {
  themeColor: '#00ffb3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0f', overflowX: 'hidden' }}>{children}</body>
```

Dakle sa **Ctrl+H**:

**Find:**
```
      <body>{children}</body>
```

**Replace:**
```
      <body style={{ margin: 0, padding: 0, background: '#0a0a0f', overflowX: 'hidden' }}>{children}</body>
    </html>
  )
}