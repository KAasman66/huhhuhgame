import { COLORS } from './assets.js'

export class Vehicle {
  constructor(x, y, type = 'jeep', isPlayer = true) {
    this.x = x
    this.y = y
    this.type = type
    this.isPlayer = isPlayer
    this.health = type === 'tank' ? 200 : 100
    this.maxHealth = this.health
    this.angle = 0
    this.velocity = { x: 0, y: 0 }
    this.moveSpeed = type === 'tank' ? 60 : 120
    this.size = type === 'tank' ? 28 : 20
    this.fireRate = type === 'tank' ? 1.2 : 0.6
    this.fireTimer = 0
    this.fireRange = 300
    this.alive = true
  }

  update(delta) {
    if (!this.alive) return
    this.x += this.velocity.x * delta
    this.y += this.velocity.y * delta
    this.fireTimer = Math.max(0, this.fireTimer - delta)
    this.clampPosition()
  }

  clampPosition() {
    this.x = Math.max(this.size / 2, Math.min(2000 - this.size / 2, this.x))
    this.y = Math.max(this.size / 2, Math.min(1200 - this.size / 2, this.y))
  }

  moveTo(x, y) {
    const dx = x - this.x
    const dy = y - this.y
    const dist = Math.hypot(dx, dy)

    if (dist > 1) {
      this.velocity.x = (dx / dist) * this.moveSpeed
      this.velocity.y = (dy / dist) * this.moveSpeed
      this.angle = Math.atan2(dy, dx)
    } else {
      this.velocity.x = 0
      this.velocity.y = 0
    }
  }

  stop() {
    this.velocity.x = 0
    this.velocity.y = 0
  }

  canFire() {
    return this.fireTimer <= 0
  }

  fire() {
    if (this.canFire()) {
      this.fireTimer = this.fireRate
      return true
    }
    return false
  }

  takeDamage(amount) {
    this.health -= amount
    if (this.health <= 0) {
      this.alive = false
    }
  }

  render(ctx) {
    if (!this.alive) return

    const color = this.isPlayer ? COLORS.player : COLORS.enemy
    const size = this.size

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    if (this.type === 'tank') {
      // Tank body
      ctx.fillStyle = color
      ctx.fillRect(-size / 2, -size / 2.5, size, size / 1.5)

      // Tank turret
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, size / 3, 0, Math.PI * 2)
      ctx.fill()

      // Tank gun
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(size / 1.5, 0)
      ctx.stroke()

      // Tracks (dashed lines)
      ctx.strokeStyle = '#444'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 2])
      ctx.beginPath()
      ctx.moveTo(-size / 2.2, -size / 2)
      ctx.lineTo(-size / 2.2, size / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(size / 2.2, -size / 2)
      ctx.lineTo(size / 2.2, size / 2)
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      // Jeep (smaller, faster)
      ctx.fillStyle = color
      ctx.fillRect(-size / 2, -size / 2.5, size, size / 1.3)

      // Windshield
      ctx.fillStyle = '#aaa'
      ctx.fillRect(-size / 3, -size / 3.5, size * 0.66, size / 5)

      // Gun mount
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(size / 1.3, 0)
      ctx.stroke()
    }

    ctx.restore()

    // Health bar
    ctx.fillStyle = this.health / this.maxHealth > 0.5 ? '#00ff00' : '#ffff00'
    const healthBar = (this.health / this.maxHealth) * (size + 4)
    ctx.fillRect(this.x - size / 2 - 2, this.y - size - 10, healthBar, 3)
  }
}
