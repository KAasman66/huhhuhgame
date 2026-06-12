import { COLORS } from './assets.js'

export class Civilian {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.size = 12
    this.health = 50
    this.maxHealth = 50
    this.alive = true
    this.rescued = false
    this.panicked = false
    this.panicTimer = 0
    this.velocity = { x: 0, y: 0 }
    this.moveSpeed = 40
    this.targetX = null
    this.targetY = null
  }

  update(delta) {
    if (!this.alive || this.rescued) return

    this.panicTimer = Math.max(0, this.panicTimer - delta)

    // Panic behavior when close to combat
    if (this.panicked && this.panicTimer > 0) {
      // Run away from last known threat
      this.targetX = Math.random() * 2000
      this.targetY = Math.random() * 1200
    }

    if (this.targetX && this.targetY) {
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      const dist = Math.hypot(dx, dy)

      if (dist > 5) {
        this.velocity.x = (dx / dist) * this.moveSpeed
        this.velocity.y = (dy / dist) * this.moveSpeed
      } else {
        this.velocity.x = 0
        this.velocity.y = 0
        this.targetX = null
        this.targetY = null
      }
    }

    this.x += this.velocity.x * delta
    this.y += this.velocity.y * delta

    // Clamp
    this.x = Math.max(this.size / 2, Math.min(2000 - this.size / 2, this.x))
    this.y = Math.max(this.size / 2, Math.min(1200 - this.size / 2, this.y))
  }

  takeDamage(amount) {
    this.health -= amount
    this.panicked = true
    this.panicTimer = 2
    if (this.health <= 0) {
      this.alive = false
    }
  }

  rescue() {
    this.rescued = true
  }

  render(ctx) {
    if (!this.alive || this.rescued) return

    ctx.save()
    ctx.translate(this.x, this.y)

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(0, this.size / 2 + 1, this.size / 2, this.size / 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.fillStyle = this.panicked ? '#ff8888' : '#ff9999'
    ctx.fillRect(-this.size / 2.5, -this.size / 3, this.size / 1.25, this.size / 1.5)

    // Head
    ctx.fillStyle = '#ffdd99'
    ctx.beginPath()
    ctx.arc(0, -this.size / 2.5, this.size / 2.5, 0, Math.PI * 2)
    ctx.fill()

    // Hair
    ctx.fillStyle = '#dd8833'
    ctx.fillRect(-this.size / 2, -this.size / 1.8, this.size, this.size / 4)

    // Eyes
    ctx.fillStyle = '#000000'
    if (this.panicked) {
      // Panic eyes (wide)
      ctx.fillRect(-4, -this.size / 2.2, 2, 2.5)
      ctx.fillRect(2, -this.size / 2.2, 2, 2.5)
      // Panick mouth
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, -this.size / 2.5 + 3, 2, 0, Math.PI)
      ctx.stroke()
    } else {
      // Normal eyes
      ctx.fillRect(-3, -this.size / 2.2, 1.5, 1.5)
      ctx.fillRect(1.5, -this.size / 2.2, 1.5, 1.5)
    }

    ctx.restore()

    // Health bar
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = '#111111'
    ctx.fillRect(this.x - 10, this.y - 18, 20, 4)
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 1
    ctx.strokeRect(this.x - 10, this.y - 18, 20, 4)
    ctx.fillStyle = healthPercent > 0.5 ? COLORS.health : '#ffff00'
    ctx.fillRect(this.x - 9, this.y - 17, (healthPercent * 18), 2)
  }
}
