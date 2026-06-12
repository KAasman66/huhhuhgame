/**
 * AI-art integration. Loads generated sheets from /public/art/, slices sprites
 * and exposes them. Entities fall back to procedural draws when a sprite is missing.
 */

export interface Sprite {
  c: HTMLCanvasElement
  w: number
  h: number
}

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Fake checkerboard → real alpha via border flood-fill. */
function keyOutBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const isBg = (p: number) => {
    const r = d[p * 4]
    const g = d[p * 4 + 1]
    const b = d[p * 4 + 2]
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    return mx - mn < 32 && mx > 155
  }
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  for (let x = 0; x < w; x++) {
    for (const p of [x, (h - 1) * w + x]) if (!seen[p] && isBg(p)) (seen[p] = 1), stack.push(p)
  }
  for (let y = 0; y < h; y++) {
    for (const p of [y * w, y * w + w - 1]) if (!seen[p] && isBg(p)) (seen[p] = 1), stack.push(p)
  }
  while (stack.length) {
    const p = stack.pop()!
    d[p * 4 + 3] = 0
    const px = p % w
    const py = (p / w) | 0
    if (px > 0 && !seen[p - 1] && isBg(p - 1)) (seen[p - 1] = 1), stack.push(p - 1)
    if (px < w - 1 && !seen[p + 1] && isBg(p + 1)) (seen[p + 1] = 1), stack.push(p + 1)
    if (py > 0 && !seen[p - w] && isBg(p - w)) (seen[p - w] = 1), stack.push(p - w)
    if (py < h - 1 && !seen[p + w] && isBg(p + w)) (seen[p + w] = 1), stack.push(p + w)
  }
  ctx.putImageData(img, 0, 0)
}

function cropToSprite(src: CanvasRenderingContext2D, b: Box): Sprite {
  const w = b.x1 - b.x0 + 1
  const h = b.y1 - b.y0 + 1
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.putImageData(src.getImageData(b.x0, b.y0, w, h), 0, 0)
  return { c, w, h }
}

function boxArea(b: Box) {
  return (b.x1 - b.x0) * (b.y1 - b.y0)
}

/** Largest opaque blob inside a cell. */
function largestInCell(ctx: CanvasRenderingContext2D, rx: number, ry: number, rw: number, rh: number): Box | null {
  rx = Math.floor(rx)
  ry = Math.floor(ry)
  rw = Math.floor(rw)
  rh = Math.floor(rh)
  if (rw <= 0 || rh <= 0) return null
  const data = ctx.getImageData(rx, ry, rw, rh).data
  const seen = new Uint8Array(rw * rh)
  const stack: number[] = []
  let best: Box | null = null
  let bestArea = 0

  for (let i = 0; i < rw * rh; i++) {
    if (seen[i] || data[i * 4 + 3] < 40) continue
    let x0 = rw
    let y0 = rh
    let x1 = 0
    let y1 = 0
    let count = 0
    stack.push(i)
    seen[i] = 1
    while (stack.length) {
      const p = stack.pop()!
      const px = p % rw
      const py = (p / rw) | 0
      if (px < x0) x0 = px
      if (px > x1) x1 = px
      if (py < y0) y0 = py
      if (py > y1) y1 = py
      count++
      if (px > 0 && !seen[p - 1] && data[(p - 1) * 4 + 3] >= 40) (seen[p - 1] = 1), stack.push(p - 1)
      if (px < rw - 1 && !seen[p + 1] && data[(p + 1) * 4 + 3] >= 40) (seen[p + 1] = 1), stack.push(p + 1)
      if (py > 0 && !seen[p - rw] && data[(p - rw) * 4 + 3] >= 40) (seen[p - rw] = 1), stack.push(p - rw)
      if (py < rh - 1 && !seen[p + rw] && data[(p + rw) * 4 + 3] >= 40) (seen[p + rw] = 1), stack.push(p + rw)
    }
    if (count > 80 && x1 - x0 >= 12 && y1 - y0 >= 12) {
      const b = { x0: x0 + rx, y0: y0 + ry, x1: x1 + rx, y1: y1 + ry }
      const a = boxArea(b)
      if (a > bestArea) {
        best = b
        bestArea = a
      }
    }
  }
  return best
}

/** Slice a region into a grid; one sprite per occupied cell. */
function sliceGrid(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  cols: number,
  rows: number,
): Sprite[][] {
  const cw = Math.floor(rw / cols)
  const ch = Math.floor(rh / rows)
  const out: Sprite[][] = []
  for (let row = 0; row < rows; row++) {
    const r: Sprite[] = []
    for (let col = 0; col < cols; col++) {
      const pad = Math.min(4, Math.floor(Math.min(cw, ch) / 4))
      const b = largestInCell(ctx, rx + col * cw + pad, ry + row * ch + pad, cw - pad * 2, ch - pad * 2)
      if (b) r.push(cropToSprite(ctx, b))
    }
    out.push(r)
  }
  return out
}

function tinted(sp: Sprite, color: string, alpha = 0.42): Sprite {
  const c = document.createElement('canvas')
  c.width = sp.w
  c.height = sp.h
  const x = c.getContext('2d')!
  x.drawImage(sp.c, 0, 0)
  x.globalCompositeOperation = 'source-atop'
  x.globalAlpha = alpha
  x.fillStyle = color
  x.fillRect(0, 0, sp.w, sp.h)
  return { c, w: sp.w, h: sp.h }
}

function makeCanvasFromRegion(img: HTMLImageElement, sx: number, sy: number, sw: number, sh: number): Sprite {
  const c = document.createElement('canvas')
  c.width = sw
  c.height = sh
  c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
  return { c, w: sw, h: sh }
}

export type BuildingSpriteKey = 'tower' | 'barracks' | 'factory' | 'hq' | 'etower' | 'spawner'

class ArtStore {
  ready = false
  title: Sprite | null = null
  soldierPoses: { player: Sprite[]; enemy: Sprite[] } = { player: [], enemy: [] }
  vehicles: { jeepPlayer: Sprite | null; jeepEnemy: Sprite | null; tankPlayer: Sprite | null; tankEnemy: Sprite | null } = {
    jeepPlayer: null,
    jeepEnemy: null,
    tankPlayer: null,
    tankEnemy: null,
  }
  buildings: Partial<Record<BuildingSpriteKey, Sprite>> = {}
  tiles: { grass: Sprite[]; dirt: Sprite[]; water: Sprite[]; forest: Sprite[] } = { grass: [], dirt: [], water: [], forest: [] }

  async load() {
    const [sheet, sheet2, tilesImg] = await Promise.all([
      loadImage('/art/sheet.png'),
      loadImage('/art/sheet2.png'),
      loadImage('/art/tiles.png'),
    ])
    const safe = (label: string, fn: () => void) => {
      try {
        fn()
      } catch (e) {
        console.warn(`[art] ${label} failed`, e)
      }
    }
    if (sheet) safe('title', () => this.parseTitleFromSheet(sheet))
    else if (sheet2) safe('title', () => this.parseTitleFromSheet2(sheet2))

    if (sheet2) safe('sprites', () => this.parseSpritesFromSheet2(sheet2))
    else if (sheet) safe('sprites', () => this.parseSpritesFromSheet(sheet))

    if (tilesImg) safe('tiles', () => this.parseTiles(tilesImg))
    else if (sheet) safe('tiles', () => this.parseEmbeddedTiles(sheet))

    this.ready = true
    console.info('[art] loaded', this.summary())
  }

  summary() {
    return {
      title: !!this.title,
      playerPoses: this.soldierPoses.player.length,
      enemyPoses: this.soldierPoses.enemy.length,
      vehicles: Object.values(this.vehicles).filter(Boolean).length,
      buildings: Object.keys(this.buildings).length,
      tiles: this.tiles.grass.length + this.tiles.dirt.length,
    }
  }

  private parseTitleFromSheet(img: HTMLImageElement) {
    const titleH = Math.round(img.height * 0.455)
    this.title = makeCanvasFromRegion(img, 0, 0, img.width, titleH)
  }

  private parseTitleFromSheet2(img: HTMLImageElement) {
    const tw = Math.floor(img.width * 0.52)
    const th = Math.floor(img.height * 0.56)
    this.title = makeCanvasFromRegion(img, 0, 0, tw, th)
  }

  /** sheet2: sprites live in the right column in 4 rows. */
  private parseSpritesFromSheet2(img: HTMLImageElement) {
    const rx = Math.floor(img.width * 0.53)
    const ry = Math.floor(img.height * 0.03)
    const rw = img.width - rx
    const rh = img.height - ry - 8

    const sc = document.createElement('canvas')
    sc.width = rw
    sc.height = rh
    const ctx = sc.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh)
    keyOutBackground(ctx, rw, rh)

    const rows = sliceGrid(ctx, 0, 0, rw, rh, 4, 4)
    if (rows.length < 4) {
      console.warn('[art] sheet2 grid parse incomplete', rows.length)
      return
    }

    this.soldierPoses.player = rows[0]
    this.soldierPoses.enemy = rows[1]

    const veh = rows[2]
    if (veh.length >= 3) {
      this.vehicles.jeepPlayer = veh[0]
      this.vehicles.tankPlayer = veh[1]
      this.vehicles.tankEnemy = veh[2]
      this.vehicles.jeepEnemy = tinted(veh[0], '#8a3030', 0.48)
    }

    const bld = rows[3]
    if (bld.length >= 4) {
      this.buildings.tower = bld[0]
      this.buildings.barracks = bld[1]
      this.buildings.factory = bld[2]
      this.buildings.hq = bld[3]
      this.buildings.etower = tinted(bld[0], '#8a3030', 0.48)
      this.buildings.spawner = tinted(bld[1], '#8a3030', 0.48)
    }
  }

  /** Fallback: bottom-left quadrant of sheet.png */
  private parseSpritesFromSheet(img: HTMLImageElement) {
    const titleH = Math.round(img.height * 0.455)
    const sw = Math.floor(img.width / 2)
    const sh = img.height - titleH - 6
    const sc = document.createElement('canvas')
    sc.width = sw
    sc.height = sh
    const ctx = sc.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, titleH + 6, sw, sh, 0, 0, sw, sh)
    keyOutBackground(ctx, sw, sh)

    const rows = sliceGrid(ctx, 0, 0, sw, sh, 4, 4)
    if (rows.length < 4) return

    this.soldierPoses.player = rows[0]
    this.soldierPoses.enemy = rows[1]
    const veh = rows[2]
    if (veh.length >= 3) {
      this.vehicles.jeepPlayer = veh[0]
      this.vehicles.tankPlayer = veh[1]
      this.vehicles.tankEnemy = veh[2]
      this.vehicles.jeepEnemy = tinted(veh[0], '#8a3030', 0.48)
    }
    const bld = rows[3]
    if (bld.length >= 4) {
      this.buildings.tower = bld[0]
      this.buildings.barracks = bld[1]
      this.buildings.factory = bld[2]
      this.buildings.hq = bld[3]
      this.buildings.etower = tinted(bld[0], '#8a3030', 0.48)
      this.buildings.spawner = tinted(bld[1], '#8a3030', 0.48)
    }
  }

  /** 9×6 tile atlas (primary). */
  private parseTiles(img: HTMLImageElement) {
    const COLS = 9
    const ROWS = 6
    const cw = img.width / COLS
    const ch = img.height / ROWS
    const inset = 4
    const grab = (cx: number, cy: number): Sprite => {
      const c = document.createElement('canvas')
      c.width = 160
      c.height = 160
      c.getContext('2d')!.drawImage(img, cx * cw + inset, cy * ch + inset, cw - inset * 2, ch - inset * 2, 0, 0, 160, 160)
      return { c, w: 160, h: 160 }
    }
    this.tiles.grass = [grab(0, 0), grab(1, 0), grab(2, 0), grab(0, 1), grab(1, 1)]
    this.tiles.dirt = [grab(3, 0), grab(4, 0), grab(3, 1)]
    this.tiles.water = [grab(4, 3), grab(5, 3)]
    this.tiles.forest = [grab(0, 2), grab(1, 2), grab(2, 2)]
  }

  /** 2×2 tiles embedded in sheet.png bottom-right. */
  private parseEmbeddedTiles(img: HTMLImageElement) {
    const titleH = Math.round(img.height * 0.455)
    const tx = Math.floor(img.width / 2)
    const ty = titleH
    const tw = img.width - tx
    const th = img.height - ty
    const grab = (cx: number, cy: number): Sprite => {
      const cw = tw / 2
      const ch = th / 2
      const c = document.createElement('canvas')
      c.width = 160
      c.height = 160
      c.getContext('2d')!.drawImage(img, tx + cx * cw, ty + cy * ch, cw, ch, 0, 0, 160, 160)
      return { c, w: 160, h: 160 }
    }
    this.tiles.grass = [grab(0, 0), grab(1, 0)]
    this.tiles.dirt = [grab(0, 1)]
    this.tiles.forest = [grab(1, 1)]
    this.tiles.water = [grab(1, 1)]
  }
}

export const art = new ArtStore()
;(window as unknown as { __art: ArtStore }).__art = art
