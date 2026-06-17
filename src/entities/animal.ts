import { angleTo, dist, rnd } from '../core/math'
import type { BlockTest } from './soldier'
import { art } from '../core/art'

export type AnimalKind = 'dog' | 'pig'

/**
 * Ambient wildlife — a dog or pig wandering the battlefield. Pure flavour:
 * it does NOT collide with soldiers, isn't hit by bullets, and never fights.
 * The only thing it reacts to is gunfire: when shots crack nearby it bolts
 * away from the noise for a few seconds, then settles back into a lazy wander.
 */
export class Animal {
  alive = true
  angle = rnd(0, Math.PI * 2)
  walkPhase = 0
  moving = false
  flee = 0
  private fleeX = 0
  private fleeY = 0
  private wanderCd = rnd(1, 4)
  private tx: number | null = null
  private ty: number | null = null

  constructor(
    public x: number,
    public y: number,
    public kind: AnimalKind,
  ) {}

  /** Spook the animal away from a gunshot/explosion at (fx, fy). */
  scare(fx: number, fy: number) {
    this.flee = rnd(2, 3.5)
    this.fleeX = fx
    this.fleeY = fy
  }

  update(dt: number, isBlocked: BlockTest) {
    if (!this.alive) return
    this.flee = Math.max(0, this.flee - dt)
    let speed = this.kind === 'dog' ? 40 : 30

    if (this.flee > 0) {
      const a = angleTo(this.fleeX, this.fleeY, this.x, this.y) + rnd(-0.4, 0.4)
      this.tx = this.x + Math.cos(a) * 90
      this.ty = this.y + Math.sin(a) * 90
      speed = this.kind === 'dog' ? 150 : 120
    } else {
      this.wanderCd -= dt
      if (this.wanderCd <= 0) {
        this.wanderCd = rnd(2, 5)
        if (Math.random() < 0.55) {
          const a = rnd(0, Math.PI * 2)
          this.tx = this.x + Math.cos(a) * rnd(30, 80)
          this.ty = this.y + Math.sin(a) * rnd(30, 80)
        } else {
          this.tx = null
          this.ty = null
        }
      }
    }

    this.moving = false
    if (this.tx !== null && this.ty !== null) {
      const d = dist(this.x, this.y, this.tx, this.ty)
      if (d < 5) {
        this.tx = null
        this.ty = null
      } else {
        const a = angleTo(this.x, this.y, this.tx, this.ty)
        this.angle = a
        const nx = this.x + Math.cos(a) * speed * dt
        const ny = this.y + Math.sin(a) * speed * dt
        // Only terrain (water/edges) stops them — they ignore units entirely.
        if (!isBlocked(nx, ny)) {
          this.x = nx
          this.y = ny
          this.moving = true
        } else {
          this.tx = null
          this.ty = null
        }
      }
    }
    if (this.moving) this.walkPhase += dt * (this.flee > 0 ? 16 : 8)
  }

  sortY(): number {
    return this.y
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return
    const { x, y } = this

    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(x, y + 4, 8, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    const sp = this.kind === 'dog' ? art.animals.dog : art.animals.pig
    const bob = this.moving ? Math.abs(Math.sin(this.walkPhase)) * 1.5 : 0
    if (sp) {
      const h = this.kind === 'dog' ? 24 : 22
      const w = (h * sp.w) / sp.h
      // Sheet faces the viewer; flip horizontally to suggest travel direction.
      const faceLeft = Math.cos(this.angle) < 0
      ctx.save()
      ctx.translate(x, y - h + 4 - bob)
      if (faceLeft) ctx.scale(-1, 1)
      ctx.drawImage(sp.c, -w / 2, 0, w, h)
      ctx.restore()
    } else {
      // Procedural fallback blob.
      ctx.fillStyle = this.kind === 'dog' ? '#caa46a' : '#e9a3a3'
      ctx.beginPath()
      ctx.ellipse(x, y - 4 - bob, 9, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + (Math.cos(this.angle) < 0 ? -9 : 9), y - 5 - bob, 3.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
