export type Side = 'player' | 'enemy'

import type { Soldier } from './soldier'

export class Bullet {
  vx: number
  vy: number
  life: number
  alive = true

  constructor(
    public x: number,
    public y: number,
    angle: number,
    public side: Side,
    public dmg: number,
    speed = 760,
    range = 300,
    /** Explosion radius (tank shells); 0 = plain bullet. */
    public boom = 0,
    /** Who fired this (for kill credit / promotions). */
    public shooter: Soldier | null = null,
  ) {
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.life = range / speed
  }

  update(dt: number) {
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.life -= dt
    if (this.life <= 0) this.alive = false
  }

  render(ctx: CanvasRenderingContext2D) {
    const len = this.boom > 0 ? 0.035 : 0.018
    ctx.strokeStyle = this.side === 'player' ? '#ffe680' : '#ff7755'
    ctx.lineWidth = this.boom > 0 ? 3 : 1.6
    ctx.beginPath()
    ctx.moveTo(this.x - this.vx * len, this.y - this.vy * len)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()
  }
}

export class Grenade {
  vx: number
  vy: number
  z = 12
  vz: number
  fuse: number
  alive = true

  constructor(
    public x: number,
    public y: number,
    targetX: number,
    targetY: number,
    public side: Side,
  ) {
    const d = Math.hypot(targetX - x, targetY - y)
    const t = Math.max(0.45, Math.min(1.0, d / 320))
    this.vx = (targetX - x) / t
    this.vy = (targetY - y) / t
    this.vz = 60 * t
    this.fuse = t + 0.55
  }

  update(dt: number) {
    this.fuse -= dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.z += this.vz * dt
    this.vz -= 130 * dt
    if (this.z <= 0) {
      this.z = 0
      this.vz *= -0.4
      this.vx *= 0.4
      this.vy *= 0.4
    }
    if (this.fuse <= 0) this.alive = false
  }

  render(ctx: CanvasRenderingContext2D, t: number) {
    // Shadow on the ground
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(this.x, this.y, 3.5, 2, 0, 0, Math.PI * 2)
    ctx.fill()
    // Body lifted by z
    const blink = this.fuse < 0.4 && Math.floor(t * 14) % 2 === 0
    ctx.fillStyle = blink ? '#ff4444' : '#2f4f2f'
    ctx.beginPath()
    ctx.arc(this.x, this.y - this.z, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#888'
    ctx.fillRect(this.x - 1, this.y - this.z - 6, 2, 3)
  }
}
