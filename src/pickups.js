import { COLORS } from './assets.js'

export class Pickup {
  constructor(x, y, type = 'ammo') {
    this.x = x
    this.y = y
    this.type = type // 'ammo' or 'health'
    this.size = 12
    this.lifetime = 10
    this.maxLifetime = 10
    this.alive = true
    this.bobOffset = 0
    this.bobSpeed = 3
  }

  update(delta) {
    this.lifetime -= delta
    this.bobOffset += this.bobSpeed * delta

    if (this.lifetime <= 0) {
      this.alive = false
    }
  }

  render(ctx) {
    const bob = Math.sin(this.bobOffset * Math.PI * 2) * 6
    const pulse = Math.sin(this.bobOffset * Math.PI * 4) * 0.3 + 0.7

    ctx.save()
    ctx.translate(this.x, this.y + bob)
    ctx.globalAlpha = pulse

    if (this.type === 'ammo') {
      // Ammo box
      ctx.fillStyle = COLORS.money
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size)

      // Ammo detail
      ctx.fillStyle = '#dd6600'
      ctx.fillRect(-this.size / 2 + 2, -this.size / 2 + 2, this.size - 4, 3)
      ctx.fillRect(-this.size / 2 + 2, this.size / 2 - 5, this.size - 4, 3)

      // Glow
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(-this.size / 2 - 1, -this.size / 2 - 1, this.size + 2, this.size + 2)
    } else if (this.type === 'health') {
      // Health cross
      ctx.fillStyle = COLORS.health
      // Vertical
      ctx.fillRect(-this.size / 3, -this.size, this.size * 0.66, this.size * 2)
      // Horizontal
      ctx.fillRect(-this.size, -this.size / 3, this.size * 2, this.size * 0.66)

      // Glow
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2)
      ctx.stroke()

      // Center shine
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = pulse * 0.6
      ctx.beginPath()
      ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  hitsUnit(unit) {
    const dx = this.x - unit.x
    const dy = this.y - unit.y
    const dist = Math.hypot(dx, dy)
    return dist < this.size + unit.size / 2
  }
}
