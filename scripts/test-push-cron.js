/**
 * Ručni test push crona:
 *   - Supabase Edge Function: postavi PUSH_EDGE_URL na
 *     https://<ref>.supabase.co/functions/v1/push-notifications
 *   - Lokalni Next: PUSH_CRON_URL=http://localhost:3000 (GET /api/cron/push-notifications)
 *
 * Primer (PowerShell):
 *   $env:CRON_SECRET="tvoj-tajni-string"
 *   $env:PUSH_EDGE_URL="https://xxxx.supabase.co/functions/v1/push-notifications"
 *   npm run test:push-cron
 */

const fs = require('fs')
const path = require('path')

function loadEnvLocal() {
  const p = path.join(__dirname, '..', '.env.local')
  let raw
  try {
    raw = fs.readFileSync(p, 'utf8')
  } catch {
    return
  }
  for (const line of raw.split(/\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq < 1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key === 'CRON_SECRET' && !process.env.CRON_SECRET) process.env.CRON_SECRET = val
    if (key === 'PUSH_CRON_URL' && !process.env.PUSH_CRON_URL) process.env.PUSH_CRON_URL = val
    if (key === 'PUSH_EDGE_URL' && !process.env.PUSH_EDGE_URL) process.env.PUSH_EDGE_URL = val
  }
}

loadEnvLocal()

const secret = process.env.CRON_SECRET

if (!secret) {
  console.error('Postavi CRON_SECRET (npr. u .env.local ili u shell-u).')
  process.exit(1)
}

const edge = (process.env.PUSH_EDGE_URL || '').replace(/\/$/, '')
const base = (process.env.PUSH_CRON_URL || 'http://localhost:3000').replace(/\/$/, '')
const url = edge || `${base}/api/cron/push-notifications`

async function main() {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  console.log(res.status, res.statusText)
  console.log(typeof body === 'string' ? body : JSON.stringify(body, null, 2))
  if (!res.ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
