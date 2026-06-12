import { COLORS } from './assets.js'

export class Building {
  constructor(x, y, type, isPlayer = true) {
    this.x = x
    this.y = y
    this.type = type
    this.isPlayer = isPlayer
    this.health = 200
    this.maxHealth = 200
    this.size = 40
    this.alive = true
    this.fireTimer = 0
    this.fireRate = 0.8
  }

  update(delta) {
    if (!this.alive) return
    this.fireTimer = Math.max(0, this.fireTimer - delta)
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

    const color = this.isPlayer ? COLORS.tower : COLORS.enemyBase
    const size = this.size

    ctx.save()
    ctx.translate(this.x, this.y)

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.beginPath()
    ctx.ellipse(0, size / 2 + 3, size * 0.7, size * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()

    if (this.type === 'watchtower') {
      // Tower base - square
      ctx.fillStyle = color
      ctx.fillRect(-size / 2.5, -size / 2.5, size / 1.25, size / 1.25)

      // Tower detail - window
      ctx.fillStyle = 'rgba(100, 200, 255, 0.5)'
      ctx.fillRect(-size / 4, -size / 2.2, size / 2, size / 3.5)

      // Gun turret - square rotating platform
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(-size / 3.5, -size / 1.8, size / 1.75, size / 4)

      // Gun barrel
      ctx.fillStyle = '#333333'
      ctx.fillRect(0, -2, size / 1.4, 4)
      ctx.fillStyle = '#555555'
      ctx.fillRect(size / 1.4 - 2, -3, 2, 6)

      // Tower outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = 2
      ctx.strokeRect(-size / 2.5, -size / 2.5, size / 1.25, size / 1.25)
    } else if (this.type === 'barracks') {
      // Barracks building
      ctx.fillStyle = COLORS.barracks
      ctx.fillRect(-size / 2, -size / 2, size, size)

      // Building outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.strokeRect(-size / 2, -size / 2, size, size)

      // Doors/windows
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(-size / 3.5, -size / 3.5, size / 3.5, size / 3.5)
      ctx.fillRect(size / 3.5 - size / 3.5, -size / 3.5, size / 3.5, size / 3.5)

      // Roof detail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(-size / 2, -size / 2 - 2, size, 2)
    } else if (this.type === 'factory') {
      // Factory building
      ctx.fillStyle = COLORS.factory
      ctx.fillRect(-size / 2, -size / 2, size, size)

      // Factory outline
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.lineWidth = 2
      ctx.strokeRect(-size / 2, -size / 2, size, size)

      // Factory details (chimneys)
      ctx.fillStyle = '#555555'
      ctx.fillRect(-size / 3, -size / 1.8, 4, size / 1.5)
      ctx.fillRect(size / 3 - 4, -size / 1.8, 4, size / 1.5)

      // Large door
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(-size / 2.5, -size / 2.5, size / 1.25, size / 1.25)
    }

    ctx.restore()

    // Health bar
    const healthPercent = this.health / this.maxHealth
    const barColor = healthPercent > 0.6 ? COLORS.health : healthPercent > 0.3 ? COLORS.money : '#dd2222'
    ctx.fillStyle = '#111111'
    ctx.fillRect(this.x - size / 2 - 2, this.y - size / 2 - 12, size + 4, 5)
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 1
    ctx.strokeRect(this.x - size / 2 - 2, this.y - size / 2 - 12, size + 4, 5)
    ctx.fillStyle = barColor
    ctx.fillRect(this.x - size / 2 - 1, this.y - size / 2 - 11, (healthPercent * (size + 2)), 3)
  }
}
