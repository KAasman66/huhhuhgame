// One-off asset extractor: crops individual props out of the bundled top-down
// sheets, keys out the light checkerboard/white background to transparency, and
// trims to the sprite bounds. Run with: node scripts/extract-props.cjs
const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')

// Source sheets live in the gitignored root art/ folder; output is served.
const SRC = path.join(__dirname, '..', 'art')
const OUT = path.join(__dirname, '..', 'public', 'art', 'props')
fs.mkdirSync(OUT, { recursive: true })

// sheet, source rect, threshold (min channel >= thr → background)
const JOBS = [
  { sheet: 'asses.png', name: 'barrel', sx: 1432, sy: 40, sw: 62, sh: 58, thr: 232 },
  { sheet: 'asses.png', name: 'crate', sx: 1333, sy: 40, sw: 42, sh: 55, thr: 232 },
  { sheet: 'asses.png', name: 'sandbag', sx: 1242, sy: 116, sw: 80, sh: 46, thr: 232 },
]

const sheets = {}
function load(name) {
  if (!sheets[name]) sheets[name] = PNG.sync.read(fs.readFileSync(path.join(SRC, name)))
  return sheets[name]
}

for (const j of JOBS) {
  const src = load(j.sheet)
  const out = new PNG({ width: j.sw, height: j.sh })
  let minx = j.sw, miny = j.sh, maxx = 0, maxy = 0
  for (let y = 0; y < j.sh; y++) {
    for (let x = 0; x < j.sw; x++) {
      const si = ((j.sy + y) * src.width + (j.sx + x)) << 2
      const di = (y * j.sw + x) << 2
      const r = src.data[si], g = src.data[si + 1], b = src.data[si + 2]
      let a = src.data[si + 3]
      const m = Math.min(r, g, b)
      if (m >= j.thr) a = 0
      else if (m > j.thr - 22) a = Math.round((a * (j.thr - m)) / 22)
      out.data[di] = r
      out.data[di + 1] = g
      out.data[di + 2] = b
      out.data[di + 3] = a
      if (a > 20) {
        if (x < minx) minx = x
        if (x > maxx) maxx = x
        if (y < miny) miny = y
        if (y > maxy) maxy = y
      }
    }
  }
  const tw = Math.max(1, maxx - minx + 1)
  const th = Math.max(1, maxy - miny + 1)
  const trimmed = new PNG({ width: tw, height: th })
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const si = ((y + miny) * j.sw + (x + minx)) << 2
      const di = (y * tw + x) << 2
      trimmed.data[di] = out.data[si]
      trimmed.data[di + 1] = out.data[si + 1]
      trimmed.data[di + 2] = out.data[si + 2]
      trimmed.data[di + 3] = out.data[si + 3]
    }
  }
  const file = path.join(OUT, j.name + '.png')
  fs.writeFileSync(file, PNG.sync.write(trimmed))
  console.log(`${j.name}: ${tw}x${th} -> ${path.relative(path.join(__dirname, '..'), file)}`)
}
