import { art } from '../core/art'
import type { Side } from './projectile'

export type BuildingType = 'tower' | 'barracks' | 'factory' | 'hq' | 'spawner' | 'etower'

export interface BuildingStats {
  name: string
  hp: number
  size: number
  cost: number
}

export const BUILDING_STATS: Record<BuildingType, BuildingStats> = {
  tower: { name: 'GUN TOWER', hp: 220, size: 34, cost: 400 },
  barracks: { name: 'BARRACKS', hp: 350, size: 46, cost: 600 },
  factory: { name: 'WAR FACTORY', hp: 420, size: 54, cost: 900 },
  hq: { name: 'ENEMY HQ', hp: 700, size: 64, cost: 0 },
  spawner: { name: 'ENEMY BARRACKS', hp: 320, size: 46, cost: 0 },
  etower: { name: 'ENEMY TOWER', hp: 200, size: 34, cost: 0 },
}

export class Building {
  hp: number
  maxHp: number
  size: number
  alive = true
  fireCd = 0
  spawnCd = 8
  turretAngle = 0
  smokeCd = 0

  constructor(
    public x: number,
    public y: number,
    public type: BuildingType,
    public side: Side,
  ) {
    const s = BUILDING_STATS[type]
    this.hp = s.hp
    this.maxHp = s.hp
    this.size = s.size
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

  /** Approximate circle radius for collision. */
  radius(): number {
    return this.size * 0.55
  }

  render(ctx: CanvasRenderingContext2D, t: number) {
    if (!this.alive) return
    const { x, y, size } = this
    const half = size / 2
    const friendly = this.side === 'player'
    const trim = friendly ? '#d9c34a' : '#c03030'

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(x + 4, y + half * 0.8, half * 1.1, half * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()

    // AI sprite path
    const sp = art.buildings[this.type]
    if (sp) {
      const w = size * 1.45
      const h = (w * sp.h) / sp.w
      ctx.drawImage(sp.c, x - w / 2, y - h * 0.58, w, h)
      this.renderHpBar(ctx)
      return
    }

    if (this.type === 'tower' || this.type === 'etower') {
      // Concrete base
      ctx.fillStyle = friendly ? '#8b8b7a' : '#6e5f5f'
      ctx.fillRect(x - half, y - half, size, size)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 2
      ctx.strokeRect(x - half, y - half, size, size)
      ctx.fillStyle = trim
      ctx.fillRect(x - half, y - half, size, 4)
      // Rotating turret
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(this.turretAngle)
      ctx.fillStyle = '#3a3a32'
      ctx.beginPath()
      ctx.arc(0, 0, half * 0.55, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#26261f'
      ctx.fillRect(0, -2.5, half + 8, 5)
      ctx.restore()
    } else if (this.type === 'barracks' || this.type === 'spawner') {
      // Long hut with roof stripes
      ctx.fillStyle = friendly ? '#5a6e3a' : '#6e4040'
      ctx.fillRect(x - half, y - half * 0.8, size, size * 0.8)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      for (let i = 0; i < 4; i++) ctx.fillRect(x - half + 3 + i * (size / 4), y - half * 0.8, 4, size * 0.8)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 2
      ctx.strokeRect(x - half, y - half * 0.8, size, size * 0.8)
      // Door
      ctx.fillStyle = '#1f1f18'
      ctx.fillRect(x - 6, y + half * 0.8 - 14, 12, 14)
      // Flag
      ctx.fillStyle = '#444'
      ctx.fillRect(x + half - 4, y - half * 0.8 - 14, 2, 14)
      ctx.fillStyle = trim
      ctx.fillRect(x + half - 2, y - half * 0.8 - 14, 9, 6)
    } else if (this.type === 'factory') {
      ctx.fillStyle = '#5d5d52'
      ctx.fillRect(x - half, y - half * 0.85, size, size * 0.85)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 2
      ctx.strokeRect(x - half, y - half * 0.85, size, size * 0.85)
      // Big bay door
      ctx.fillStyle = '#2c2c24'
      ctx.fillRect(x - half + 6, y - 2, size - 12, half * 0.85)
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      for (let i = 0; i < 3; i++) ctx.fillRect(x - half + 6, y + i * 6, size - 12, 2)
      // Chimney + roof trim
      ctx.fillStyle = '#3a3a32'
      ctx.fillRect(x + half - 12, y - half * 0.85 - 12, 8, 12)
      ctx.fillStyle = trim
      ctx.fillRect(x - half, y - half * 0.85, size, 4)
    } else if (this.type === 'hq') {
      // Bunker complex
      ctx.fillStyle = '#5a4646'
      ctx.fillRect(x - half, y - half * 0.8, size, size * 0.8)
      ctx.fillStyle = '#6e5454'
      ctx.fillRect(x - half * 0.6, y - half * 0.8 - 12, size * 0.6, 12)
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 3
      ctx.strokeRect(x - half, y - half * 0.8, size, size * 0.8)
      // Star emblem
      ctx.fillStyle = '#c03030'
      ctx.font = 'bold 18px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('\u2605', x, y + 6)
      ctx.textAlign = 'left'
      // Antenna with blinking light
      ctx.strokeStyle = '#222'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + half * 0.7, y - half * 0.8)
      ctx.lineTo(x + half * 0.7, y - half * 0.8 - 22)
      ctx.stroke()
      if (Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = '#ff4444'
        ctx.beginPath()
        ctx.arc(x + half * 0.7, y - half * 0.8 - 22, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    this.renderHpBar(ctx)
  }

  private renderHpBar(ctx: CanvasRenderingContext2D) {
    if (this.hp >= this.maxHp) return
    const { x, y, size } = this
    const half = size / 2
    const p = this.hp / this.maxHp
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(x - half, y - half - 10, size, 4)
    ctx.fillStyle = p > 0.5 ? '#4dd34d' : p > 0.25 ? '#ffd24a' : '#ff5040'
    ctx.fillRect(x - half + 0.5, y - half - 9.5, (size - 1) * p, 3)
  }
}
