import { angleTo, dist } from '../core/math'
import type { Side } from './projectile'
import type { BlockTest } from './soldier'

export type VehicleType = 'jeep' | 'tank'

export interface VehicleStats {
  name: string
  hp: number
  speed: number
  turnRate: number
  cost: number
  fireInterval: number
  range: number
  dmg: number
  boom: number
  size: number
}

export const VEHICLE_STATS: Record<VehicleType, VehicleStats> = {
  jeep: { name: 'JEEP', hp: 200, speed: 215, turnRate: 4.2, cost: 700, fireInterval: 0.09, range: 280, dmg: 9, boom: 0, size: 24 },
  tank: { name: 'TANK', hp: 480, speed: 110, turnRate: 2.4, cost: 1400, fireInterval: 1.1, range: 330, dmg: 70, boom: 55, size: 32 },
}

function angleDiff(a: number, b: number): number {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export class Vehicle {
  stats: VehicleStats
  hp: number
  angle = 0
  turretAngle = 0
  alive = true
  occupied = false
  fireCd = 0
  tx: number | null = null
  ty: number | null = null
  trackPhase = 0

  constructor(
    public x: number,
    public y: number,
    public type: VehicleType,
    public side: Side,
  ) {
    this.stats = VEHICLE_STATS[type]
    this.hp = this.stats.hp
  }

  orderMove(x: number, y: number) {
    this.tx = x
    this.ty = y
  }

  stop() {
    this.tx = null
    this.ty = null
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

  update(dt: number, isBlocked: BlockTest) {
    if (!this.alive) return
    this.fireCd = Math.max(0, this.fireCd - dt)

    if (this.tx !== null && this.ty !== null) {
      const d = dist(this.x, this.y, this.tx, this.ty)
      if (d < 10) {
        this.stop()
        return
      }
      // Tank-style steering: rotate hull toward target, then drive
      const want = angleTo(this.x, this.y, this.tx, this.ty)
      const diff = angleDiff(this.angle, want)
      const maxTurn = this.stats.turnRate * dt
      this.angle += Math.abs(diff) < maxTurn ? diff : Math.sign(diff) * maxTurn
      if (Math.abs(diff) < 1.1) {
        const step = Math.min(this.stats.speed * dt, d)
        const nx = this.x + Math.cos(this.angle) * step
        const ny = this.y + Math.sin(this.angle) * step
        if (!isBlocked(nx, ny)) {
          this.x = nx
          this.y = ny
          this.trackPhase += step * 0.15
        } else {
          this.stop()
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return
    const { x, y } = this
    const friendly = this.side === 'player'
    const body = friendly ? '#52633a' : '#6e4040'
    const dark = friendly ? '#3c4a2a' : '#522e2e'
    const s = this.stats.size

    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(x + 3, y + 4, s * 0.65, s * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.angle)

    if (this.type === 'tank') {
      // Tracks with animated tread marks
      ctx.fillStyle = '#2a2a22'
      ctx.fillRect(-s / 2, -s / 2, s, 7)
      ctx.fillRect(-s / 2, s / 2 - 7, s, 7)
      ctx.fillStyle = '#444'
      const off = this.trackPhase % 6
      for (let i = -s / 2 + off - 6; i < s / 2; i += 6) {
        ctx.fillRect(i, -s / 2 + 1, 2, 5)
        ctx.fillRect(i, s / 2 - 6, 2, 5)
      }
      // Hull
      ctx.fillStyle = body
      ctx.fillRect(-s / 2 + 2, -s / 2 + 6, s - 4, s - 12)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(-s / 2 + 2, -s / 2 + 6, s - 4, s - 12)
    } else {
      // Jeep body
      ctx.fillStyle = body
      ctx.fillRect(-s / 2, -s / 2 + 4, s, s - 8)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(-s / 2, -s / 2 + 4, s, s - 8)
      // Hood + windshield
      ctx.fillStyle = dark
      ctx.fillRect(s / 2 - 8, -s / 2 + 5, 7, s - 10)
      ctx.fillStyle = '#7fa6c9'
      ctx.fillRect(s / 6, -s / 2 + 6, 3, s - 12)
      // Wheels
      ctx.fillStyle = '#1d1d18'
      ctx.fillRect(-s / 2 + 1, -s / 2 + 1, 6, 4)
      ctx.fillRect(s / 2 - 7, -s / 2 + 1, 6, 4)
      ctx.fillRect(-s / 2 + 1, s / 2 - 5, 6, 4)
      ctx.fillRect(s / 2 - 7, s / 2 - 5, 6, 4)
    }
    ctx.restore()

    // Turret rotates independently
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.turretAngle)
    if (this.type === 'tank') {
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#26261f'
      ctx.fillRect(0, -3, s * 0.85, 6)
      ctx.fillStyle = '#3a3a30'
      ctx.fillRect(s * 0.85 - 4, -4, 4, 8)
    } else {
      // Mounted MG
      ctx.fillStyle = '#26261f'
      ctx.fillRect(0, -1.7, s * 0.6, 3.4)
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.arc(0, 0, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // Occupied marker
    if (this.occupied) {
      ctx.fillStyle = '#ffe14a'
      ctx.beginPath()
      ctx.moveTo(x, y - s * 0.8 - 4)
      ctx.lineTo(x - 4, y - s * 0.8 - 10)
      ctx.lineTo(x + 4, y - s * 0.8 - 10)
      ctx.closePath()
      ctx.fill()
    }

    if (this.hp < this.stats.hp) {
      const p = this.hp / this.stats.hp
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(x - s / 2, y - s * 0.8, s, 4)
      ctx.fillStyle = p > 0.5 ? '#4dd34d' : p > 0.25 ? '#ffd24a' : '#ff5040'
      ctx.fillRect(x - s / 2 + 0.5, y - s * 0.8 + 0.5, (s - 1) * p, 3)
    }
  }
}
