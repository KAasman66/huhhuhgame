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

export interface HomingTarget {
  x: number
  y: number
  alive: boolean
}

/**
 * Fire-and-forget seeking missile. Auto-homes onto a target (no aiming) and
 * only ever detonates once it has travelled at least `minSafe` from its launch
 * point, so it never blows up in the squad's face. If the target dies it flies
 * on and detonates at the safe distance.
 */
export class Missile {
  vx: number
  vy: number
  life = 4
  alive = true
  detonated = false // true = exploded; false-on-death = dud (no blast, kept squad safe)
  private ox: number
  private oy: number
  private lastDist = Infinity

  constructor(
    public x: number,
    public y: number,
    angle: number,
    public side: Side,
    public target: HomingTarget | null,
    public speed = 280,
    public turn = 12, // rad/s — agile enough to spiral onto strafing targets
    public minSafe = 95, // never detonate this close to the launch point
  ) {
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.ox = x
    this.oy = y
  }

  private boom() {
    this.alive = false
    this.detonated = true
  }

  update(dt: number) {
    if (this.target && this.target.alive) {
      const desired = Math.atan2(this.target.y - this.y, this.target.x - this.x)
      const cur = Math.atan2(this.vy, this.vx)
      let diff = desired - cur
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      const step = Math.max(-this.turn * dt, Math.min(this.turn * dt, diff))
      const na = cur + step
      this.vx = Math.cos(na) * this.speed
      this.vy = Math.sin(na) * this.speed
    }
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.life -= dt

    // Safety: only ever detonate once we're clear of the launch point, so the
    // blast can never reach the squad — even against a point-blank enemy.
    const clear = Math.hypot(this.x - this.ox, this.y - this.oy) >= this.minSafe
    if (clear && this.target && this.target.alive) {
      const d = Math.hypot(this.target.x - this.x, this.target.y - this.y)
      if (d < 26 || (d < 34 && d > this.lastDist)) this.boom()
      this.lastDist = d
    } else if (clear && !(this.target && this.target.alive)) {
      this.boom() // target gone, already at safe distance
    }
    if (this.life <= 0) {
      // Out of fuel: detonate if safely clear, otherwise fizzle as a dud.
      if (clear) this.boom()
      else this.alive = false
    }
  }

  render(ctx: CanvasRenderingContext2D, t: number) {
    const ang = Math.atan2(this.vy, this.vx)
    // Flame trail
    const flick = 6 + (Math.floor(t * 30) % 3) * 2
    ctx.strokeStyle = 'rgba(255,170,40,0.8)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(this.x - Math.cos(ang) * flick, this.y - Math.sin(ang) * flick)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()
    // Warhead
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(ang)
    ctx.fillStyle = this.side === 'player' ? '#dfe6ea' : '#e0a0a0'
    ctx.fillRect(-4, -2, 8, 4)
    ctx.fillStyle = '#c03030'
    ctx.fillRect(3, -2, 2, 4)
    ctx.restore()
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
