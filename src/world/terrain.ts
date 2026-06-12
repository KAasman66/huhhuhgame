import { RNG } from '../core/math'

export const TILE = 30

/**
 * Procedurally generated battlefield, rendered once into an offscreen canvas.
 * A second canvas holds permanent decals: blood, craters, scorch marks and
 * corpses. War leaves traces.
 */
export class Terrain {
  cols: number
  rows: number
  blocked: Uint8Array
  water: Uint8Array
  base: HTMLCanvasElement
  decals: HTMLCanvasElement
  private dctx: CanvasRenderingContext2D
  trees: { x: number; y: number }[] = []

  constructor(
    public w: number,
    public h: number,
    seed: number,
  ) {
    this.cols = Math.ceil(w / TILE)
    this.rows = Math.ceil(h / TILE)
    this.blocked = new Uint8Array(this.cols * this.rows)
    this.water = new Uint8Array(this.cols * this.rows)
    this.base = document.createElement('canvas')
    this.base.width = w
    this.base.height = h
    this.decals = document.createElement('canvas')
    this.decals.width = w
    this.decals.height = h
    this.dctx = this.decals.getContext('2d')!
    this.generate(seed)
  }

  private cellIdx(cx: number, cy: number) {
    return cy * this.cols + cx
  }

  private generate(seed: number) {
    const rng = new RNG(seed)
    const ctx = this.base.getContext('2d')!

    // Grass base: two-tone checker with speckles
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const light = (cx + cy) % 2 === 0
        ctx.fillStyle = light ? '#3d7a2e' : '#356d28'
        ctx.fillRect(cx * TILE, cy * TILE, TILE, TILE)
        ctx.fillStyle = light ? '#356d28' : '#3d7a2e'
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(cx * TILE + rng.range(0, TILE), cy * TILE + rng.range(0, TILE), 2, 2)
        }
      }
    }

    // Dirt patches
    ctx.globalAlpha = 0.5
    for (let i = 0; i < 26; i++) {
      const x = rng.range(0, this.w)
      const y = rng.range(0, this.h)
      const r = rng.range(20, 70)
      ctx.fillStyle = '#6b5226'
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * rng.range(0.5, 0.9), rng.range(0, Math.PI), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Horizontal dirt road across the map
    const roadY = rng.range(this.h * 0.35, this.h * 0.65)
    ctx.fillStyle = '#7a6233'
    for (let x = 0; x < this.w; x += 10) {
      const yy = roadY + Math.sin(x * 0.004) * 60
      ctx.fillRect(x, yy - 26, 10, 52)
    }
    ctx.fillStyle = '#8d7440'
    for (let x = 0; x < this.w; x += 38) {
      const yy = roadY + Math.sin(x * 0.004) * 60
      ctx.fillRect(x, yy - 2, 20, 4)
    }

    // Lakes (avoid spawn corners: left-center and right-center kept clear)
    const lakes = rng.int(1, 2)
    for (let i = 0; i < lakes; i++) {
      const lx = rng.range(this.w * 0.3, this.w * 0.7)
      const ly = rng.chance(0.5) ? rng.range(120, this.h * 0.28) : rng.range(this.h * 0.72, this.h - 120)
      const rx = rng.range(90, 170)
      const ry = rng.range(60, 110)
      // Shore
      ctx.fillStyle = '#9a8a55'
      ctx.beginPath()
      ctx.ellipse(lx, ly, rx + 8, ry + 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#2b5d8a'
      ctx.beginPath()
      ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3a72a5'
      ctx.beginPath()
      ctx.ellipse(lx - rx * 0.15, ly - ry * 0.2, rx * 0.6, ry * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      // Mark blocked cells
      for (let cy = 0; cy < this.rows; cy++) {
        for (let cx = 0; cx < this.cols; cx++) {
          const px = cx * TILE + TILE / 2
          const py = cy * TILE + TILE / 2
          const dx = (px - lx) / rx
          const dy = (py - ly) / ry
          if (dx * dx + dy * dy < 1) {
            this.blocked[this.cellIdx(cx, cy)] = 1
            this.water[this.cellIdx(cx, cy)] = 1
          }
        }
      }
    }

    // Trees: blocked circles with shadow + canopy
    for (let i = 0; i < 55; i++) {
      const x = rng.range(40, this.w - 40)
      const y = rng.range(40, this.h - 40)
      if (Math.abs(y - roadY) < 80) continue
      const cx = Math.floor(x / TILE)
      const cy = Math.floor(y / TILE)
      if (this.blocked[this.cellIdx(cx, cy)]) continue
      this.trees.push({ x, y })
      this.blocked[this.cellIdx(cx, cy)] = 1

      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(x + 5, y + 6, 14, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4a3318'
      ctx.fillRect(x - 2, y - 2, 4, 8)
      const greens = ['#1e4d17', '#266018', '#2d6e1d']
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = greens[b % greens.length]
        ctx.beginPath()
        ctx.arc(x + rng.range(-7, 7), y - 6 + rng.range(-6, 6), rng.range(6, 11), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  isBlocked(x: number, y: number): boolean {
    if (x < 8 || y < 8 || x > this.w - 8 || y > this.h - 8) return true
    const cx = Math.floor(x / TILE)
    const cy = Math.floor(y / TILE)
    return this.blocked[this.cellIdx(cx, cy)] === 1
  }

  /** Area check for building placement. */
  areaFree(x: number, y: number, r: number): boolean {
    for (let dx = -r; dx <= r; dx += TILE / 2) {
      for (let dy = -r; dy <= r; dy += TILE / 2) {
        if (this.isBlocked(x + dx, y + dy)) return false
      }
    }
    return true
  }

  // -- Decals -----------------------------------------------------------

  stampBlood(x: number, y: number, r: number, color = 'rgba(120,8,8,0.55)') {
    const c = this.dctx
    c.fillStyle = color
    for (let i = 0; i < 3; i++) {
      c.beginPath()
      c.arc(x + (Math.random() - 0.5) * r * 1.6, y + (Math.random() - 0.5) * r * 1.6, r * (0.4 + Math.random() * 0.6), 0, Math.PI * 2)
      c.fill()
    }
  }

  stampCrater(x: number, y: number, r: number) {
    const c = this.dctx
    const g = c.createRadialGradient(x, y, 2, x, y, r)
    g.addColorStop(0, 'rgba(20,14,8,0.85)')
    g.addColorStop(0.7, 'rgba(30,22,12,0.5)')
    g.addColorStop(1, 'rgba(30,22,12,0)')
    c.fillStyle = g
    c.beginPath()
    c.arc(x, y, r, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(60,45,25,0.4)'
    c.lineWidth = 2
    c.beginPath()
    c.arc(x, y, r * 0.7, 0, Math.PI * 2)
    c.stroke()
  }

  stampScorch(x: number, y: number, r: number) {
    const c = this.dctx
    c.fillStyle = 'rgba(10,10,10,0.35)'
    c.beginPath()
    c.arc(x, y, r, 0, Math.PI * 2)
    c.fill()
  }

  /** Permanently draw a fallen soldier into the battlefield. */
  stampCorpse(x: number, y: number, angle: number, uniform: string) {
    const c = this.dctx
    c.save()
    c.translate(x, y)
    c.rotate(angle)
    // Blood pool
    c.fillStyle = 'rgba(110,6,6,0.6)'
    c.beginPath()
    c.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2)
    c.fill()
    // Body sprawled
    c.fillStyle = uniform
    c.fillRect(-6, -3, 12, 6)
    c.fillStyle = uniform
    c.fillRect(-9, -5, 4, 3) // arm
    c.fillRect(4, 2, 5, 3) // arm
    c.fillRect(-8, 1, 4, 3) // leg
    // Head
    c.fillStyle = '#d8b894'
    c.beginPath()
    c.arc(8, -1, 3.2, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number) {
    const sx = Math.max(0, Math.floor(camX) - 4)
    const sy = Math.max(0, Math.floor(camY) - 4)
    const sw = Math.min(this.w - sx, vw + 8)
    const sh = Math.min(this.h - sy, vh + 8)
    ctx.drawImage(this.base, sx, sy, sw, sh, sx, sy, sw, sh)
    ctx.drawImage(this.decals, sx, sy, sw, sh, sx, sy, sw, sh)
  }
}
