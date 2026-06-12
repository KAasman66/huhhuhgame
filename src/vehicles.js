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

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.beginPath()
    ctx.ellipse(0, size / 2 + 2, size * 0.8, size * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()

    if (this.type === 'tank') {
      // Tank hull
      ctx.fillStyle = color
      ctx.fillRect(-size / 2, -size / 2.5, size, size / 1.4)

      // Tank armor detail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(-size / 2 + 2, -size / 2.5 + 2, 4, 4)
      ctx.fillRect(size / 2 - 6, -size / 2.5 + 2, 4, 4)

      // Tank turret
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, -2, size / 2.8, 0, Math.PI * 2)
      ctx.fill()

      // Turret ring
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, -2, size / 2.8, 0, Math.PI * 2)
      ctx.stroke()

      // Tank cannon
      ctx.fillStyle = '#333333'
      ctx.fillRect(0, -2.5, size / 1.4, 5)
      ctx.fillStyle = '#666666'
      ctx.fillRect(size / 1.4 - 2, -3, 2, 6)

      // Tracks (stylized)
      ctx.strokeStyle = '#444444'
      ctx.lineWidth = 3
      ctx.setLineDash([6, 3])
      ctx.beginPath()
      ctx.moveTo(-size / 2.3, -size / 2)
      ctx.lineTo(-size / 2.3, size / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(size / 2.3, -size / 2)
      ctx.lineTo(size / 2.3, size / 2)
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      // Jeep body
      ctx.fillStyle = color
      ctx.fillRect(-size / 2, -size / 2.3, size, size / 1.2)

      // Jeep cabin
      ctx.fillStyle = color
      ctx.fillRect(-size / 3, -size / 2.3, size * 0.66, size / 2.5)

      // Windshield
      ctx.fillStyle = 'rgba(100, 150, 255, 0.6)'
      ctx.fillRect(-size / 3.2, -size / 2.5, size * 0.64, size / 3.5)

      // Gun mount
      ctx.fillStyle = '#333333'
      ctx.fillRect(0, -2, size / 1.2, 4)
      ctx.fillStyle = '#666666'
      ctx.fillRect(size / 1.2 - 1, -2.5, 1, 5)

      // Wheels
      ctx.fillStyle = '#222222'
      ctx.fillRect(-size / 3, size / 2.5 - 2, 4, 4)
      ctx.fillRect(size / 3 - 4, size / 2.5 - 2, 4, 4)
    }

    ctx.restore()

    // Health bar (bigger for vehicles)
    const healthPercent = this.health / this.maxHealth
    const barColor = healthPercent > 0.6 ? COLORS.health : healthPercent > 0.3 ? COLORS.money : '#dd2222'
    ctx.fillStyle = '#111111'
    ctx.fillRect(this.x - 18, this.y - size - 12, 36, 6)
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 1
    ctx.strokeRect(this.x - 18, this.y - size - 12, 36, 6)
    ctx.fillStyle = barColor
    ctx.fillRect(this.x - 17, this.y - size - 11, (healthPercent * 34), 4)
  }
}
