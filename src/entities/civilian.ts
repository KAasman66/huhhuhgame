import { angleTo, dist, rnd, rndPick } from '../core/math'
import type { BlockTest } from './soldier'
import { art } from '../core/art'

const SHIRTS = ['#c9a227', '#3f7fbf', '#b03a78', '#7f5fb0', '#3fa66a', '#c96b27']

/**
 * Civilians wander around the battlefield. They panic near gunfire,
 * can be rescued (escort them home) or... not. Postal rules apply.
 */
export class Civilian {
  hp = 40
  alive = true
  rescued = false
  following = false
  panic = 0
  shirt = rndPick(SHIRTS)
  angle = rnd(0, Math.PI * 2)
  spriteIdx = (Math.random() * 1000) | 0
  walkPhase = 0
  moving = false
  private wanderCd = rnd(1, 3)
  private tx: number | null = null
  private ty: number | null = null
  private fleeX = 0
  private fleeY = 0

  constructor(
    public x: number,
    public y: number,
  ) {}

  scare(fromX: number, fromY: number) {
    this.panic = rnd(2.5, 4)
    this.fleeX = fromX
    this.fleeY = fromY
  }

  damage(amount: number): boolean {
    if (!this.alive) return false
    this.hp -= amount
    this.scare(this.x, this.y)
    if (this.hp <= 0) {
      this.alive = false
      return true
    }
    return false
  }

  update(dt: number, isBlocked: BlockTest, leaderX: number, leaderY: number) {
    if (!this.alive || this.rescued) return
    this.panic = Math.max(0, this.panic - dt)
    let speed = 46

    if (this.panic > 0) {
      // Run away from danger, screaming
      const a = angleTo(this.fleeX, this.fleeY, this.x, this.y) + rnd(-0.5, 0.5)
      this.tx = this.x + Math.cos(a) * 80
      this.ty = this.y + Math.sin(a) * 80
      speed = 95
    } else if (this.following) {
      const d = dist(this.x, this.y, leaderX, leaderY)
      if (d > 40) {
        this.tx = leaderX
        this.ty = leaderY
        speed = 88
      } else {
        this.tx = null
        this.ty = null
      }
    } else {
      this.wanderCd -= dt
      if (this.wanderCd <= 0) {
        this.wanderCd = rnd(1.5, 4)
        if (Math.random() < 0.6) {
          const a = rnd(0, Math.PI * 2)
          this.tx = this.x + Math.cos(a) * rnd(30, 90)
          this.ty = this.y + Math.sin(a) * rnd(30, 90)
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
    if (this.moving) this.walkPhase += dt * (this.panic > 0 ? 16 : 9)
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.alive || this.rescued) return
    const { x, y } = this

    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(x, y + 5, 6, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()

    const civs = art.civilians
    if (civs.length > 0) {
      // Upright Gemini figure: feet at (x,y), small bob while walking.
      const sp = civs[this.spriteIdx % civs.length]
      const h = 26
      const w = (h * sp.w) / sp.h
      const bob = this.moving ? Math.abs(Math.sin(this.walkPhase)) * 1.5 : 0
      ctx.drawImage(sp.c, x - w / 2, y - h + 4 - bob, w, h)
    } else {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(this.angle + Math.PI / 2)
      const leg = this.moving ? Math.sin(this.walkPhase) * 3 : 0
      ctx.fillStyle = '#33415c'
      ctx.fillRect(-3.5, 2 - leg, 3, 4.5)
      ctx.fillRect(0.5, 2 + leg, 3, 4.5)
      ctx.fillStyle = this.shirt
      ctx.fillRect(-4.5, -4, 9, 8)
      ctx.fillStyle = '#d8b894'
      ctx.beginPath()
      ctx.arc(0, -3.5, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4a3318'
      ctx.beginPath()
      ctx.arc(0, -4, 3.2, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Follow indicator
    if (this.following) {
      ctx.fillStyle = '#6fe3ff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('\u2665', x, y - 12)
      ctx.textAlign = 'left'
    }
  }
}
