import { BULLET_CONFIG, COLORS } from './assets.js'

export class Bullet {
  constructor(x, y, angle) {
    this.x = x
    this.y = y
    this.angle = angle
    this.vx = Math.cos(angle) * BULLET_CONFIG.speed
    this.vy = Math.sin(angle) * BULLET_CONFIG.speed
    this.lifetime = BULLET_CONFIG.lifetime
    this.maxLifetime = BULLET_CONFIG.lifetime
    this.size = BULLET_CONFIG.size
    this.damage = BULLET_CONFIG.damage
    this.alive = true
  }

  update(delta) {
    this.x += this.vx * delta
    this.y += this.vy * delta
    this.lifetime -= delta

    if (this.lifetime <= 0) {
      this.alive = false
    }

    // Out of bounds
    if (this.x < 0 || this.x > 2000 || this.y < 0 || this.y > 1200) {
      this.alive = false
    }
  }

  render(ctx) {
    ctx.save()

    // Bullet trail effect
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(this.x - this.vx * 5, this.y - this.vy * 5)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()

    // Bullet body
    ctx.fillStyle = COLORS.money
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()

    // Bullet shine/highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.beginPath()
    ctx.arc(this.x - this.size / 3, this.y - this.size / 3, this.size / 2, 0, Math.PI * 2)
    ctx.fill()

    // Bullet glow
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size + 1.5, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()
  }

  hitsUnit(unit) {
    const dx = this.x - unit.x
    const dy = this.y - unit.y
    const dist = Math.hypot(dx, dy)
    return dist < this.size + unit.size / 2
  }
}
