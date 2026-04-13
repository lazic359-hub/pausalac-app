import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

function parseSize(value: string | null, fallback: number) {
  const n = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(16, Math.min(1024, n))
}

export function GET(req: NextRequest) {
  const size = parseSize(req.nextUrl.searchParams.get('size'), 192)
  const padded = req.nextUrl.searchParams.get('maskable') === '1'

  const bg = '#0A0A0A'
  const brand = '#00C896'

  // "Maskable" icons need more safe-area padding.
  const safe = padded ? Math.round(size * 0.16) : Math.round(size * 0.08)
  const inner = size - safe * 2
  const radius = Math.round(inner * 0.26)

  const briefcaseWidth = Math.round(inner * 0.78)
  const briefcaseHeight = Math.round(inner * 0.56)
  const handleWidth = Math.round(briefcaseWidth * 0.44)
  const handleHeight = Math.round(briefcaseHeight * 0.28)
  const handleY = Math.round((inner - briefcaseHeight) * 0.15)

  const textSize = Math.max(16, Math.round(inner * 0.13))
  const textPaddingX = Math.round(inner * 0.08)

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
        }}
      >
        <div
          style={{
            width: inner,
            height: inner,
            borderRadius: radius,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'radial-gradient(120% 120% at 30% 20%, rgba(0, 200, 150, 0.95) 0%, rgba(0, 200, 150, 0.18) 42%, rgba(10, 10, 10, 1) 72%)',
            boxShadow:
              '0 18px 40px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.10)',
          }}
        >
          <div style={{ position: 'relative', width: inner, height: inner }}>
            <svg
              width={inner}
              height={inner}
              viewBox={`0 0 ${inner} ${inner}`}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="bag" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#111827" stopOpacity="0.96" />
                  <stop offset="55%" stopColor="#0B1220" stopOpacity="0.96" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.96" />
                </linearGradient>
                <linearGradient id="bagHi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brand} stopOpacity="0.55" />
                  <stop offset="85%" stopColor={brand} stopOpacity="0" />
                </linearGradient>
                <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy={Math.max(6, Math.round(inner * 0.05))} stdDeviation={Math.max(6, Math.round(inner * 0.04))} floodColor="#000" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* handle */}
              <path
                d={[
                  `M ${(inner - handleWidth) / 2} ${handleY + handleHeight}`,
                  `C ${(inner - handleWidth) / 2} ${handleY} ${(inner + handleWidth) / 2} ${handleY} ${(inner + handleWidth) / 2} ${handleY + handleHeight}`,
                  `L ${(inner + handleWidth) / 2} ${handleY + handleHeight + Math.round(handleHeight * 0.22)}`,
                  `C ${(inner + handleWidth) / 2} ${handleY + Math.round(handleHeight * 0.42)} ${(inner - handleWidth) / 2} ${handleY + Math.round(handleHeight * 0.42)} ${(inner - handleWidth) / 2} ${handleY + handleHeight + Math.round(handleHeight * 0.22)}`,
                  'Z',
                ].join(' ')}
                fill="rgba(255,255,255,0.10)"
              />
              <path
                d={[
                  `M ${(inner - handleWidth) / 2 + Math.round(handleWidth * 0.08)} ${handleY + handleHeight}`,
                  `C ${(inner - handleWidth) / 2 + Math.round(handleWidth * 0.08)} ${handleY + Math.round(handleHeight * 0.26)} ${(inner + handleWidth) / 2 - Math.round(handleWidth * 0.08)} ${handleY + Math.round(handleHeight * 0.26)} ${(inner + handleWidth) / 2 - Math.round(handleWidth * 0.08)} ${handleY + handleHeight}`,
                  `L ${(inner + handleWidth) / 2 - Math.round(handleWidth * 0.08)} ${handleY + handleHeight + Math.round(handleHeight * 0.10)}`,
                  `C ${(inner + handleWidth) / 2 - Math.round(handleWidth * 0.08)} ${handleY + Math.round(handleHeight * 0.42)} ${(inner - handleWidth) / 2 + Math.round(handleWidth * 0.08)} ${handleY + Math.round(handleHeight * 0.42)} ${(inner - handleWidth) / 2 + Math.round(handleWidth * 0.08)} ${handleY + handleHeight + Math.round(handleHeight * 0.10)}`,
                  'Z',
                ].join(' ')}
                fill="rgba(0,0,0,0.55)"
              />

              {/* bag body */}
              <g filter="url(#shadow)">
                <rect
                  x={(inner - briefcaseWidth) / 2}
                  y={(inner - briefcaseHeight) / 2 + Math.round(inner * 0.08)}
                  width={briefcaseWidth}
                  height={briefcaseHeight}
                  rx={Math.round(briefcaseHeight * 0.18)}
                  fill="url(#bag)"
                />
                <rect
                  x={(inner - briefcaseWidth) / 2}
                  y={(inner - briefcaseHeight) / 2 + Math.round(inner * 0.08)}
                  width={briefcaseWidth}
                  height={briefcaseHeight}
                  rx={Math.round(briefcaseHeight * 0.18)}
                  fill="url(#bagHi)"
                />
                <rect
                  x={(inner - briefcaseWidth) / 2}
                  y={(inner - briefcaseHeight) / 2 + Math.round(inner * 0.08)}
                  width={briefcaseWidth}
                  height={briefcaseHeight}
                  rx={Math.round(briefcaseHeight * 0.18)}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={Math.max(2, Math.round(inner * 0.012))}
                />

                {/* latch */}
                <rect
                  x={inner / 2 - Math.round(briefcaseWidth * 0.06)}
                  y={(inner - briefcaseHeight) / 2 + Math.round(inner * 0.08) + Math.round(briefcaseHeight * 0.42)}
                  width={Math.round(briefcaseWidth * 0.12)}
                  height={Math.round(briefcaseHeight * 0.14)}
                  rx={Math.round(briefcaseHeight * 0.05)}
                  fill="rgba(255,255,255,0.10)"
                />
                <rect
                  x={inner / 2 - Math.round(briefcaseWidth * 0.03)}
                  y={(inner - briefcaseHeight) / 2 + Math.round(inner * 0.08) + Math.round(briefcaseHeight * 0.46)}
                  width={Math.round(briefcaseWidth * 0.06)}
                  height={Math.round(briefcaseHeight * 0.06)}
                  rx={Math.round(briefcaseHeight * 0.03)}
                  fill="rgba(0,0,0,0.40)"
                />
              </g>
            </svg>

            {/* title on the bag */}
            <div
              style={{
                position: 'absolute',
                left: textPaddingX,
                right: textPaddingX,
                top: Math.round(inner * 0.54),
                textAlign: 'center',
                fontSize: textSize,
                fontWeight: 800,
                letterSpacing: -Math.max(0, Math.round(textSize * 0.04)),
                color: 'rgba(255,255,255,0.92)',
                textShadow: '0 8px 18px rgba(0,0,0,0.55)',
              }}
            >
              Paušo
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              width: inner,
              height: inner,
              borderRadius: radius,
              boxShadow: 'inset 0 0 0 2px rgba(0, 200, 150, 0.18)',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: Math.round(size * 0.12),
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        />
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  )
}

