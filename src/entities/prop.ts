import { art, Sprite } from '../core/art'

export type PropKind = 'barrel' | 'crate' | 'sandbag' | 'bush'

interface PropSpec {
  hp: number
  destructible: boolean
  explosive: boolean
  /** On-screen sprite width; collision radius is derived from it. */
  drawW: number
  /** Fallback collision radius when no sprite is loaded. */
  r: number
}

const SPECS: Record<PropKind, PropSpec> = {
  barrel: { hp: 18, destructible: true, explosive: true, drawW: 30, r: 12 },
  crate: { hp: 45, destructible: true, explosive: false, drawW: 30, r: 13 },
  sandbag: { hp: 200, destructible: true, explosive: false, drawW: 54, r: 20 },
  bush: { hp: Infinity, destructible: false, explosive: false, drawW: 46, r: 16 },
}

/**
 * Static battlefield clutter with real collision and depth, drawn from the
 * top-down sprite packs (barrel/crate/sandbag) or the foliage pack (bush).
 * Props sort with the actors so the squad walks *behind* them, and they block
 * movement so they double as cover. Barrels are the Postal touch — shoot one
 * and the chain reaction tears through a position.
 */
export class Prop {
  alive = true
  r: number
  hp: number
  maxHp: number
  destructible: boolean
  explosive: boolean
  /** Set when an explosive prop is destroyed, so the game can detonate it. */
  detonated = false
  sp: Sprite | null = null
  dw = 0
  dh = 0

  constructor(
    public x: number,
    public y: number,
    public kind: PropKind,
  ) {
    const s = SPECS[kind]
    this.hp = s.hp
    this.maxHp = s.hp
    this.destructible = s.destructible
    this.explosive = s.explosive
    this.r = s.r

    if (kind === 'bush') {
      const pool = art.trees.filter((t) => Math.max(t.w, t.h) > 50)
      const src = pool.length > 0 ? pool : art.trees
      this.sp = src.length > 0 ? src[(Math.random() * src.length) | 0] : null
    } else {
      this.sp = art.props[kind]
    }

    if (this.sp) {
      this.dw = s.drawW
      this.dh = (this.dw * this.sp.h) / this.sp.w
      // Collision tracks the sprite footprint (a bit tighter than the art).
      this.r = Math.max(this.dw, this.dh) * 0.36
    }
  }

  /** Sort key for depth ordering: the foot of the prop. */
  sortY(): number {
    return this.y + (this.sp ? this.dh * 0.4 : this.r * 0.6)
  }

  /** Returns true if this hit destroyed the prop. */
  damage(n: number): boolean {
    if (!this.destructible || !this.alive) return false
    this.hp -= n
    if (this.hp <= 0) {
      this.alive = false
      if (this.explosive) this.detonated = true
      return true
    }
    return false
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return
    if (this.sp) {
      // Ground shadow grounds the sprite on the grass.
      ctx.fillStyle = 'rgba(0,0,0,0.26)'
      ctx.beginPath()
      ctx.ellipse(this.x, this.y + this.dh * 0.34, this.dw * 0.46, this.dh * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.drawImage(this.sp.c, this.x - this.dw / 2, this.y - this.dh / 2, this.dw, this.dh)
      // Subtle scorch as destructibles take damage.
      if (this.destructible && this.maxHp !== Infinity) {
        const wear = 1 - this.hp / this.maxHp
        if (wear > 0.4) {
          ctx.save()
          ctx.globalAlpha = (wear - 0.4) * 0.6
          ctx.fillStyle = '#100806'
          ctx.beginPath()
          ctx.ellipse(this.x, this.y, this.dw * 0.32, this.dh * 0.32, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }
      return
    }
    this.drawFallback(ctx)
  }

  private drawFallback(ctx: CanvasRenderingContext2D) {
    const { x, y, r } = this
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.6, r * 1.05, r * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()
    if (this.kind === 'bush') {
      ctx.fillStyle = '#234d18'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#356e22'
      ctx.beginPath()
      ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.66, 0, Math.PI * 2)
      ctx.fill()
    } else if (this.kind === 'barrel') {
      ctx.fillStyle = '#6b6233'
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * 1.1, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8c24a'
      ctx.fillRect(x - r, y - 2, r * 2, 4)
    } else if (this.kind === 'sandbag') {
      ctx.fillStyle = '#b9a468'
      ctx.fillRect(x - r, y - r * 0.5, r * 2, r)
    } else {
      ctx.fillStyle = '#7c5a2e'
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
      ctx.strokeStyle = '#4a3519'
      ctx.lineWidth = 2
      ctx.strokeRect(x - r, y - r, r * 2, r * 2)
    }
  }
}
