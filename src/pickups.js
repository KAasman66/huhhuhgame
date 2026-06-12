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
    const bob = Math.sin(this.bobOffset * Math.PI * 2) * 5

    ctx.save()
    ctx.translate(this.x, this.y + bob)

    if (this.type === 'ammo') {
      ctx.fillStyle = '#ffff00'
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size)
      ctx.strokeStyle = '#ff8800'
      ctx.lineWidth = 2
      ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size)
    } else if (this.type === 'health') {
      ctx.fillStyle = '#00ff00'
      ctx.beginPath()
      ctx.arc(0, 0, this.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#00aa00'
      ctx.lineWidth = 2
      ctx.stroke()
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
