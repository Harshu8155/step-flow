// Generates the StepFlow brand PNGs from SVG, so the artwork is reproducible
// and re-renders cleanly at any size instead of being a binary nobody can edit.
//
//   node scripts/make-brand-assets.js
//
// The mark is the app's own visual language: the orange progress arc from
// RingProgress wrapped around the ascending step bars from WeeklyBarChart.
// Requires `sharp` (dev-only): npm install --no-save sharp
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'assets');

const ORANGE = '#E8552B';
const INK = '#17171A';
const LIGHT_BG = '#EFEEEC';
const DARK_BG = '#0E0E10';

const S = 1024;          // canvas
const C = S / 2;         // centre
const R = 340;           // arc radius
const SW = 64;           // arc stroke width
const SWEEP = 0.75;      // fraction of the ring drawn

const circumference = 2 * Math.PI * R;

/** Three ascending pills, centred, sized to sit inside the ring. */
function bars(fill) {
  const w = 80;
  const gap = 44;
  const total = w * 3 + gap * 2;
  const startX = C - total / 2;
  const baseline = C + 150;
  const heights = [130, 210, 290];

  return heights.map((h, i) => {
    const x = startX + i * (w + gap);
    return `<rect x="${x}" y="${baseline - h}" width="${w}" height="${h}" rx="${w / 2}" fill="${fill}" />`;
  }).join('\n    ');
}

/** `barFill` changes per variant so the mark stays legible on either ground. */
function markSvg({ barFill, background }) {
  const bg = background
    ? `<rect width="${S}" height="${S}" fill="${background}" />`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    ${bg}
    <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${ORANGE}"
            stroke-width="${SW}" stroke-linecap="round"
            stroke-dasharray="${(circumference * SWEEP).toFixed(2)} ${circumference.toFixed(2)}"
            transform="rotate(-90 ${C} ${C})" />
    ${bars(barFill)}
  </svg>`;
}

/** Adaptive-icon foreground: same mark, inset for Android's safe zone. */
function foregroundSvg(barFill) {
  const inset = 0.68; // Android masks up to ~33% of the edges away
  const off = (S - S * inset) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <g transform="translate(${off} ${off}) scale(${inset})">
      ${markSvg({ barFill }).replace(/<\/?svg[^>]*>/g, '')}
    </g>
  </svg>`;
}

const targets = [
  // Transparent marks — app.json paints the background, so one file serves any bg.
  { name: 'splash-icon.png', svg: markSvg({ barFill: INK }), size: 1024 },
  { name: 'splash-icon-dark.png', svg: markSvg({ barFill: '#F4F4F6' }), size: 1024 },
  // Opaque previews, handy for checking contrast at a glance.
  { name: 'brand-preview-light.png', svg: markSvg({ barFill: INK, background: LIGHT_BG }), size: 512 },
  { name: 'brand-preview-dark.png', svg: markSvg({ barFill: '#F4F4F6', background: DARK_BG }), size: 512 },
  // Android adaptive foreground.
  { name: 'android-icon-foreground.png', svg: foregroundSvg(INK), size: 1024 },
];

(async () => {
  for (const t of targets) {
    const file = path.join(OUT, t.name);
    // Never clobber an existing asset without leaving the original recoverable.
    if (fs.existsSync(file) && !fs.existsSync(file + '.bak')) {
      fs.copyFileSync(file, file + '.bak');
      console.log(`  backed up ${t.name} -> ${t.name}.bak`);
    }
    await sharp(Buffer.from(t.svg))
      .resize(t.size, t.size)
      .png({ compressionLevel: 9 })
      .toFile(file);
    const { size } = fs.statSync(file);
    console.log(`  wrote ${t.name}  ${t.size}x${t.size}  ${(size / 1024).toFixed(1)} kB`);
  }
})().catch(err => { console.error(err); process.exit(1); });
