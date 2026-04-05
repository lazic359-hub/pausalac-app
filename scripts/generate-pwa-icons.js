/**
 * Generates public/icon-192.png and public/icon-512.png from the Lucide Wallet SVG paths
 * (same icon as Prihodi in settings), green #00C896 on #0a0a0a.
 */
const path = require('path')
const sharp = require('sharp')

const root = path.join(__dirname, '..')

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0a0a0a"/>
  <g transform="translate(88 88) scale(14)" fill="none" stroke="#00C896" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
  </g>
</svg>`

async function main() {
  const buf = Buffer.from(svg)
  for (const size of [192, 512]) {
    await sharp(buf).resize(size, size).png().toFile(path.join(root, 'public', `icon-${size}.png`))
    console.log(`Wrote public/icon-${size}.png`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
