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

    // Body
    ctx.fillStyle = this.panicked ? '#ff8888' : '#ffaaaa'
    ctx.beginPath()
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.fillStyle = '#ffdd99'
    ctx.beginPath()
    ctx.arc(0, -this.size / 2, this.size / 3, 0, Math.PI * 2)
    ctx.fill()

    // Eyes when panicked
    if (this.panicked) {
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(-3, -this.size / 2 - 1, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(3, -this.size / 2 - 1, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()

    // Health bar
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(this.x - 8, this.y - 18, 16, 2)
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(this.x - 8, this.y - 18, (this.health / this.maxHealth) * 16, 2)
  }
}
