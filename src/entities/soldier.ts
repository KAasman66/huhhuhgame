import { angleTo, clamp, dist, rnd } from '../core/math'
import type { Side } from './projectile'

export const RANKS = ['PVT', 'CPL', 'SGT', 'CPT'] as const
const RANK_KILLS = [0, 5, 15, 30]

export interface SoldierColors {
  uniform: string
  helmet: string
}

const PLAYER_COLORS: SoldierColors = { uniform: '#4a5d33', helmet: '#5d7340' }
const ENEMY_COLORS: SoldierColors = { uniform: '#6e3a3a', helmet: '#522c2c' }

/** Obstacle test injected by the game (terrain + buildings). */
export type BlockTest = (x: number, y: number) => boolean

export class Soldier {
  hp = 100
  maxHp = 100
  speed: number
  angle = 0
  walkPhase = 0
  moving = false
  fireCd = 0
  kills = 0
  alive = true
  tx: number | null = null
  ty: number | null = null
  colors: SoldierColors

  constructor(
    public x: number,
    public y: number,
    public side: Side,
    public name: string,
  ) {
    this.speed = side === 'player' ? 105 : 82
    this.colors = side === 'player' ? PLAYER_COLORS : ENEMY_COLORS
  }

  rank(): number {
    let r = 0
    for (let i = 0; i < RANK_KILLS.length; i++) if (this.kills >= RANK_KILLS[i]) r = i
    return r
  }

  /** Higher rank shoots faster. Cannon Fodder veterans were deadly. */
  fireInterval(): number {
    return 0.19 - this.rank() * 0.022
  }

  range(): number {
    return 250
  }

  orderMove(x: number, y: number) {
    this.tx = x
    this.ty = y
  }

  stop() {
    this.tx = null
    this.ty = null
  }

  update(dt: number, isBlocked: BlockTest) {
    if (!this.alive) return
    this.fireCd = Math.max(0, this.fireCd - dt)
    this.moving = false

    if (this.tx !== null && this.ty !== null) {
      const d = dist(this.x, this.y, this.tx, this.ty)
      if (d < 4) {
        this.stop()
      } else {
        const a = angleTo(this.x, this.y, this.tx, this.ty)
        this.angle = a
        const step = Math.min(this.speed * dt, d)
        const nx = this.x + Math.cos(a) * step
        const ny = this.y + Math.sin(a) * step
        if (!isBlocked(nx, ny)) {
          this.x = nx
          this.y = ny
          this.moving = true
        } else if (!isBlocked(nx, this.y)) {
          this.x = nx
          this.moving = true
        } else if (!isBlocked(this.x, ny)) {
          this.y = ny
          this.moving = true
        } else {
          this.stop()
        }
      }
    }
    if (this.moving) this.walkPhase += dt * 11
  }

  damage(amount: number): boolean {
    if (!this.alive) return false
    this.hp -= amount
    if (this.hp <= 0) {
      this.alive = false
      return true
    }
    return false
  }

  render(ctx: CanvasRenderingContext2D, isLeader = false) {
    if (!this.alive) return
    const { x, y } = this

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(x, y + 6, 7, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.angle + Math.PI / 2)

    // Legs (march animation)
    const leg = this.moving ? Math.sin(this.walkPhase) * 3.5 : 0
    ctx.fillStyle = '#2e2e22'
    ctx.fillRect(-4, 2 - leg, 3, 5)
    ctx.fillRect(1, 2 + leg, 3, 5)

    // Body
    ctx.fillStyle = this.colors.uniform
    ctx.fillRect(-5, -5, 10, 9)
    // Webbing strap
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(-5, -2, 10, 2)

    // Rifle pointing forward
    ctx.fillStyle = '#26221a'
    ctx.fillRect(2, -12, 2.5, 9)

    // Head + helmet
    ctx.fillStyle = '#d8b894'
    ctx.beginPath()
    ctx.arc(0, -4, 3.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = this.colors.helmet
    ctx.beginPath()
    ctx.arc(0, -4.6, 3.8, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(-3.8, -4.8, 7.6, 1.6)

    ctx.restore()

    // Leader chevron
    if (isLeader) {
      ctx.fillStyle = '#ffe14a'
      ctx.beginPath()
      ctx.moveTo(x, y - 14)
      ctx.lineTo(x - 3.5, y - 19)
      ctx.lineTo(x + 3.5, y - 19)
      ctx.closePath()
      ctx.fill()
    }

    // Health bar only when hurt
    if (this.hp < this.maxHp) {
      const p = clamp(this.hp / this.maxHp, 0, 1)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(x - 8, y - 12, 16, 3)
      ctx.fillStyle = p > 0.5 ? '#4dd34d' : p > 0.25 ? '#ffd24a' : '#ff5040'
      ctx.fillRect(x - 7.5, y - 11.5, 15 * p, 2)
    }
  }
}

/** Slight aim spread makes tracer fire look organic. */
export function aimSpread(angle: number, spread = 0.07): number {
  return angle + rnd(-spread, spread)
}
