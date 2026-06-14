import { RNG } from '../core/math'
import { art, Sprite } from '../core/art'

export const TILE = 30

interface Lake {
  x: number
  y: number
  rx: number
  ry: number
}

interface Layout {
  roadY: number
  lakes: Lake[]
  patches: { x: number; y: number; r: number; ry: number; rot: number }[]
  trees: { x: number; y: number }[]
  bushes: { x: number; y: number; s: number }[]
}

/**
 * Procedurally generated battlefield, rendered once into an offscreen canvas.
 * Uses the AI-generated tileset when available, procedural drawing otherwise.
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
  /** Walkable trees: canopy is drawn over units and grants concealment (r = cover radius). */
  trees: { x: number; y: number; r: number; sp: Sprite | null; w: number; h: number }[] = []

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
    const layout = this.computeLayout(rng)

    const tiles = art.tiles
    const useArt =
      art.ready && tiles.grass.length > 0 && tiles.dirt.length > 0 && tiles.water.length > 0 && tiles.forest.length > 0
    if (useArt) {
      try {
        this.paintWithTiles(ctx, rng, layout)
      } catch (e) {
        console.warn('[terrain] tile paint failed — procedural fallback', e)
        this.paintProcedural(ctx, rng, layout)
      }
    } else {
      this.paintProcedural(ctx, rng, layout)
    }

    this.paintFlora(ctx, rng, layout)
    this.markBlocked(layout)
  }

  /**
   * Trees and bushes, baked on top of either paint path. Uses the chabull
   * top-down pack (CC-BY 3.0) when loaded; procedural blobs otherwise.
   * Bushes are baked here; tree canopies are collected for an overlay pass
   * (renderCanopies) and grant concealment (inCover) — both walkable.
   */
  private paintFlora(ctx: CanvasRenderingContext2D, rng: RNG, layout: Layout) {
    const sprites = art.trees
    // Split the pack: small sprites read as bushes, larger ones as trees.
    const small = sprites.filter((s) => Math.max(s.w, s.h) <= 50)
    const large = sprites.filter((s) => Math.max(s.w, s.h) > 50)

    for (const b of layout.bushes) {
      const pool = small.length > 0 ? small : sprites
      if (pool.length > 0) {
        const sp = pool[rng.int(0, pool.length - 1)]
        const w = b.s * 1.6
        const h = (w * sp.h) / sp.w
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.beginPath()
        ctx.ellipse(b.x + 2, b.y + 3, w * 0.4, w * 0.16, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.drawImage(sp.c, b.x - w / 2, b.y - h / 2, w, h)
      } else {
        ctx.fillStyle = rng.chance(0.5) ? '#2a5c1e' : '#336b24'
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.s * 0.45, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Trees: bake only the ground shadow here; the canopy is drawn over the
    // units later (renderCanopies) so the squad reads as walking *underneath* it.
    const pool = large.length > 0 ? large : sprites
    for (const t of layout.trees) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      ctx.ellipse(t.x + 5, t.y + 7, 22, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      const sp = pool.length > 0 ? pool[rng.int(0, pool.length - 1)] : null
      const w = rng.range(58, 88)
      const h = sp ? (w * sp.h) / sp.w : w
      // Cover radius a touch under the visible canopy: you must really be in it.
      this.trees.push({ x: t.x, y: t.y, r: w * 0.34, sp, w, h })
    }
  }

  /** Tree canopies, drawn after entities so units hide beneath the foliage. */
  renderCanopies(ctx: CanvasRenderingContext2D) {
    for (const t of this.trees) {
      if (t.sp) {
        ctx.drawImage(t.sp.c, t.x - t.w / 2, t.y - t.h / 2, t.w, t.h)
      } else {
        ctx.fillStyle = '#1e4d17'
        ctx.beginPath()
        ctx.arc(t.x, t.y, t.w * 0.42, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#2d6e1d'
        ctx.beginPath()
        ctx.arc(t.x - t.w * 0.12, t.y - t.h * 0.12, t.w * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  /** Is this point under a tree canopy? Grants concealment from enemy fire. */
  inCover(x: number, y: number): boolean {
    for (const t of this.trees) {
      const dx = x - t.x
      const dy = y - t.y
      if (dx * dx + dy * dy < t.r * t.r) return true
    }
    return false
  }

  private computeLayout(rng: RNG): Layout {
    const roadY = rng.range(this.h * 0.35, this.h * 0.65)

    const patches: Layout['patches'] = []
    for (let i = 0; i < 24; i++) {
      patches.push({
        x: rng.range(0, this.w),
        y: rng.range(0, this.h),
        r: rng.range(25, 70),
        ry: rng.range(0.5, 0.9),
        rot: rng.range(0, Math.PI),
      })
    }

    const lakes: Lake[] = []
    const lakeCount = rng.int(1, 2)
    for (let i = 0; i < lakeCount; i++) {
      lakes.push({
        x: rng.range(this.w * 0.3, this.w * 0.7),
        y: rng.chance(0.5) ? rng.range(120, this.h * 0.28) : rng.range(this.h * 0.72, this.h - 120),
        rx: rng.range(90, 170),
        ry: rng.range(60, 110),
      })
    }

    const trees: Layout['trees'] = []
    for (let i = 0; i < 55; i++) {
      const x = rng.range(40, this.w - 40)
      const y = rng.range(40, this.h - 40)
      if (Math.abs(y - this.roadYAt(roadY, x)) < 80) continue
      if (lakes.some((l) => ((x - l.x) / (l.rx + 30)) ** 2 + ((y - l.y) / (l.ry + 30)) ** 2 < 1)) continue
      trees.push({ x, y })
    }

    // Decorative bushes: walkable, purely cosmetic. Some cluster near trees.
    const bushes: Layout['bushes'] = []
    for (let i = 0; i < 60; i++) {
      let x: number
      let y: number
      if (i < 22 && trees.length > 0) {
        const t = trees[rng.int(0, trees.length - 1)]
        x = t.x + rng.range(-70, 70)
        y = t.y + rng.range(-70, 70)
      } else {
        x = rng.range(30, this.w - 30)
        y = rng.range(30, this.h - 30)
      }
      if (x < 30 || y < 30 || x > this.w - 30 || y > this.h - 30) continue
      if (Math.abs(y - this.roadYAt(roadY, x)) < 45) continue
      if (lakes.some((l) => ((x - l.x) / (l.rx + 20)) ** 2 + ((y - l.y) / (l.ry + 20)) ** 2 < 1)) continue
      bushes.push({ x, y, s: rng.range(16, 30) })
    }

    return { roadY, lakes, patches, trees, bushes }
  }

  private roadYAt(roadY: number, x: number): number {
    return roadY + Math.sin(x * 0.004) * 60
  }

  private markBlocked(layout: Layout) {
    for (const l of layout.lakes) {
      for (let cy = 0; cy < this.rows; cy++) {
        for (let cx = 0; cx < this.cols; cx++) {
          const px = cx * TILE + TILE / 2
          const py = cy * TILE + TILE / 2
          if (((px - l.x) / l.rx) ** 2 + ((py - l.y) / l.ry) ** 2 < 1) {
            this.blocked[this.cellIdx(cx, cy)] = 1
            this.water[this.cellIdx(cx, cy)] = 1
          }
        }
      }
    }
    // Trees are walkable now (you hide *under* them) — only lakes block.
  }

  // -- AI tileset painting ------------------------------------------------

  private paintWithTiles(ctx: CanvasRenderingContext2D, rng: RNG, layout: Layout) {
    const T = 120
    const tiles = art.tiles
    const pickGrass = (): Sprite => {
      const variantMax = Math.min(2, tiles.grass.length - 1)
      if (tiles.grass.length > 3 && rng.chance(0.15)) {
        return tiles.grass[rng.int(3, tiles.grass.length - 1)]
      }
      return tiles.grass[rng.int(0, variantMax)]
    }

    for (let y = 0; y < this.h; y += T) {
      for (let x = 0; x < this.w; x += T) {
        ctx.drawImage(pickGrass().c, x, y, T, T)
      }
    }

    const dirt = () => tiles.dirt[rng.int(0, tiles.dirt.length - 1)]

    // Dirt patches: clipped ellipses filled with dirt tile
    for (const p of layout.patches) {
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.r, p.r * p.ry, p.rot, 0, Math.PI * 2)
      ctx.clip()
      ctx.globalAlpha = 0.85
      ctx.drawImage(dirt().c, p.x - p.r - 10, p.y - p.r - 10, (p.r + 10) * 2, (p.r + 10) * 2)
      ctx.restore()
    }

    // Winding dirt road
    for (let x = -40; x < this.w + 40; x += 48) {
      const yy = this.roadYAt(layout.roadY, x)
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(x, yy, 48, 34, 0, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(dirt().c, x - 60, yy - 60, 120, 120)
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(220,200,150,0.35)'
    for (let x = 0; x < this.w; x += 38) {
      const yy = this.roadYAt(layout.roadY, x)
      ctx.fillRect(x, yy - 2, 20, 3)
    }

    // Lakes: water tile in ellipse clip + shore ring
    for (const l of layout.lakes) {
      ctx.fillStyle = '#9a8a55'
      ctx.beginPath()
      ctx.ellipse(l.x, l.y, l.rx + 8, l.ry + 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2)
      ctx.clip()
      const wt = tiles.water[0]
      for (let y = l.y - l.ry; y < l.y + l.ry; y += 150) {
        for (let x = l.x - l.rx; x < l.x + l.rx; x += 150) {
          ctx.drawImage(wt.c, x, y, 150, 150)
        }
      }
      ctx.restore()
    }

  }

  // -- Procedural fallback painting ---------------------------------------

  private paintProcedural(ctx: CanvasRenderingContext2D, rng: RNG, layout: Layout) {
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

    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#6b5226'
    for (const p of layout.patches) {
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.r, p.r * p.ry, p.rot, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = '#7a6233'
    for (let x = 0; x < this.w; x += 10) {
      ctx.fillRect(x, this.roadYAt(layout.roadY, x) - 26, 10, 52)
    }
    ctx.fillStyle = '#8d7440'
    for (let x = 0; x < this.w; x += 38) {
      ctx.fillRect(x, this.roadYAt(layout.roadY, x) - 2, 20, 4)
    }

    for (const l of layout.lakes) {
      ctx.fillStyle = '#9a8a55'
      ctx.beginPath()
      ctx.ellipse(l.x, l.y, l.rx + 8, l.ry + 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#2b5d8a'
      ctx.beginPath()
      ctx.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3a72a5'
      ctx.beginPath()
      ctx.ellipse(l.x - l.rx * 0.15, l.y - l.ry * 0.2, l.rx * 0.6, l.ry * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
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
    c.fillStyle = 'rgba(110,6,6,0.6)'
    c.beginPath()
    c.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = uniform
    c.fillRect(-6, -3, 12, 6)
    c.fillRect(-9, -5, 4, 3)
    c.fillRect(4, 2, 5, 3)
    c.fillRect(-8, 1, 4, 3)
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
