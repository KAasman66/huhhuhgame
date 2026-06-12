import { COLORS } from './assets.js'

export class Particle {
  constructor(x, y, vx, vy, lifetime, color) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.lifetime = lifetime
    this.maxLifetime = lifetime
    this.color = color
    this.alive = true
    this.size = 3
  }

  update(delta) {
    this.x += this.vx * delta
    this.y += this.vy * delta
    this.vy += 100 * delta // gravity
    this.lifetime -= delta

    if (this.lifetime <= 0) {
      this.alive = false
    }
  }

  render(ctx) {
    const alpha = this.lifetime / this.maxLifetime
    ctx.save()
    ctx.globalAlpha = alpha

    // Main particle
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()

    // Particle glow
    ctx.fillStyle = this.color
    ctx.globalAlpha = alpha * 0.5
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Particle shine
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = alpha * 0.8
    ctx.beginPath()
    ctx.arc(this.x - this.size / 2, this.y - this.size / 2, this.size / 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

export class ParticleEmitter {
  constructor(x, y, count, vx, vy, spread, lifetime, color) {
    this.particles = []
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * spread
      const speed = 50 + Math.random() * 200
      const pvx = Math.cos(angle) * speed + (vx || 0)
      const pvy = Math.sin(angle) * speed + (vy || 0)
      this.particles.push(new Particle(x, y, pvx, pvy, lifetime, color))
    }
  }

  update(delta) {
    for (const p of this.particles) {
      p.update(delta)
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      if (p.alive) p.render(ctx)
    }
  }

  isDead() {
    return this.particles.every(p => !p.alive)
  }
}
