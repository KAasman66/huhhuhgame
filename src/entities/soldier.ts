import { angleTo, clamp, dist, rnd } from '../core/math'
import { art } from '../core/art'
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
  /** Remaining sprint time (s); >0 means currently running faster. */
  sprintTime = 0
  /** Lockout before this soldier can sprint again (s). */
  sprintCd = 0

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

  /** How long this soldier can sprint — fitter veterans run longer. */
  sprintDuration(): number {
    return 1.4 + this.rank() * 0.6 // PVT 1.4s → CPT 3.2s
  }

  /** Kick off a sprint if not on cooldown. Returns true if it started. */
  sprint(): boolean {
    if (!this.alive || this.sprintCd > 0) return false
    this.sprintTime = this.sprintDuration()
    this.sprintCd = this.sprintTime + 4.5 // run, then a cooldown before the next dash
    return true
  }

  sprintReady(): boolean {
    return this.sprintCd <= 0
  }

  range(): number {
    return 250
  }

  /** Remaining waypoints after the current (tx,ty) target. */
  route: { x: number; y: number }[] = []

  orderMove(x: number, y: number) {
    this.route.length = 0
    this.tx = x
    this.ty = y
  }

  /** Follow a multi-waypoint route (from the pathfinder). */
  orderPath(path: { x: number; y: number }[]) {
    if (path.length === 0) {
      this.stop()
      return
    }
    this.route = path.slice(1)
    this.tx = path[0].x
    this.ty = path[0].y
  }

  stop() {
    this.route.length = 0
    this.tx = null
    this.ty = null
  }

  update(dt: number, isBlocked: BlockTest) {
    if (!this.alive) return
    this.fireCd = Math.max(0, this.fireCd - dt)
    this.sprintCd = Math.max(0, this.sprintCd - dt)
    this.sprintTime = Math.max(0, this.sprintTime - dt)
    this.moving = false
    const spd = this.sprintTime > 0 ? this.speed * 1.85 : this.speed

    if (this.tx !== null && this.ty !== null) {
      const d = dist(this.x, this.y, this.tx, this.ty)
      if (d < 4) {
        const next = this.route.shift()
        if (next) {
          this.tx = next.x
          this.ty = next.y
        } else {
          this.stop()
        }
      } else {
        const a = angleTo(this.x, this.y, this.tx, this.ty)
        this.angle = a
        const step = Math.min(spd * dt, d)
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
    if (this.moving) this.walkPhase += dt * (this.sprintTime > 0 ? 18 : 11)
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

    // Sprint dust — little kicked-up puffs trailing a running soldier.
    if (this.sprintTime > 0 && this.moving) {
      const bx = x - Math.cos(this.angle)
      const by = y - Math.sin(this.angle)
      ctx.fillStyle = 'rgba(190,175,150,0.5)'
      for (let i = 1; i <= 3; i++) {
        const t = this.walkPhase * 2 + i
        const r = 1.6 + (i % 2) * 1.2
        ctx.beginPath()
        ctx.arc(bx - Math.cos(this.angle) * i * 4 + Math.sin(t) * 2, by - Math.sin(this.angle) * i * 4 + 3, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.angle + Math.PI / 2)

    const poses = this.side === 'player' ? art.soldierPoses.player : art.soldierPoses.enemy
    if (poses.length >= 3) {
      // AI sprite: pick pose (walk cycle / idle / firing)
      const justFired = this.fireCd > this.fireInterval() * 0.5
      let sp = poses[2]
      if (justFired) sp = poses[poses.length - 1]
      else if (this.moving) sp = poses[Math.floor(this.walkPhase * 1.4) % 2]
      const h = 26
      const w = (h * sp.w) / sp.h
      ctx.drawImage(sp.c, -w / 2, -h / 2, w, h)
    } else {
      // Procedural fallback
      const leg = this.moving ? Math.sin(this.walkPhase) * 3.5 : 0
      ctx.fillStyle = '#2e2e22'
      ctx.fillRect(-4, 2 - leg, 3, 5)
      ctx.fillRect(1, 2 + leg, 3, 5)
      ctx.fillStyle = this.colors.uniform
      ctx.fillRect(-5, -5, 10, 9)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(-5, -2, 10, 2)
      ctx.fillStyle = '#26221a'
      ctx.fillRect(2, -12, 2.5, 9)
      ctx.fillStyle = '#d8b894'
      ctx.beginPath()
      ctx.arc(0, -4, 3.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = this.colors.helmet
      ctx.beginPath()
      ctx.arc(0, -4.6, 3.8, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(-3.8, -4.8, 7.6, 1.6)
    }

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
