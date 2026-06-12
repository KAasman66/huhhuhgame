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

    const color = this.isPlayer ? COLORS.friendlyBase : COLORS.enemyBase
    const size = this.size

    ctx.save()
    ctx.translate(this.x, this.y)

    if (this.type === 'watchtower') {
      // Tower base
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, size / 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Gun turret top
      ctx.fillStyle = color
      ctx.fillRect(-size / 4, -size / 2, size / 2, size / 4)

      // Gun barrel
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(size / 2, 0)
      ctx.stroke()

      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, size / 2.5, 0, Math.PI * 2)
      ctx.stroke()
    } else if (this.type === 'barracks') {
      ctx.fillStyle = color
      ctx.fillRect(-size / 2, -size / 2, size, size)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(-size / 2, -size / 2, size, size)
      ctx.fillStyle = '#666'
      ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2)
    }

    ctx.restore()

    // Health bar
    ctx.fillStyle = this.health / this.maxHealth > 0.5 ? '#00ff00' : '#ffff00'
    const healthBar = (this.health / this.maxHealth) * size
    ctx.fillRect(this.x - size / 2, this.y - size / 2 - 12, healthBar, 3)
  }
}
