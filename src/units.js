import { UNIT_CONFIG, COLORS } from './assets.js'

export class Unit {
  constructor(x, y, isPlayer = true) {
    this.x = x
    this.y = y
    this.isPlayer = isPlayer
    this.health = UNIT_CONFIG.maxHealth
    this.maxHealth = UNIT_CONFIG.maxHealth
    this.angle = 0
    this.velocity = { x: 0, y: 0 }
    this.moveSpeed = UNIT_CONFIG.moveSpeed
    this.size = UNIT_CONFIG.size
    this.fireRate = UNIT_CONFIG.fireRate
    this.fireTimer = 0
    this.fireRange = UNIT_CONFIG.fireRange
    this.selected = false
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
    this.x = Math.max(this.size / 2, Math.min(1280 - this.size / 2, this.x))
    this.y = Math.max(this.size / 2, Math.min(720 - this.size / 2, this.y))
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

    const color = this.isPlayer ? (this.selected ? COLORS.playerSelected : COLORS.player) : COLORS.enemy
    const size = this.size

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    ctx.fillStyle = color
    ctx.fillRect(-size / 2, -size / 2, size, size)

    ctx.fillStyle = '#000'
    ctx.fillRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4)

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.strokeRect(-size / 2, -size / 2, size, size)

    ctx.restore()

    // Health bar
    ctx.fillStyle = COLORS.health
    ctx.fillRect(this.x - 12, this.y - 20, 24, 3)
    ctx.fillStyle = '#00aa00'
    ctx.fillRect(this.x - 12, this.y - 20, (this.health / this.maxHealth) * 24, 3)
  }
}

export class Squad {
  constructor(x, y) {
    this.units = []
    this.selectedUnit = null
    this.formation = 'column'
    this.defender = false

    for (let i = 0; i < UNIT_CONFIG.squadSize; i++) {
      const offsetX = (i % 3) * 30
      const offsetY = Math.floor(i / 3) * 30
      this.units.push(new Unit(x + offsetX, y + offsetY, true))
    }
    this.selectUnit(this.units[0])
  }

  selectUnit(unit) {
    if (this.selectedUnit) this.selectedUnit.selected = false
    this.selectedUnit = unit
    unit.selected = true
  }

  moveTo(x, y) {
    if (!this.selectedUnit) return

    this.selectedUnit.moveTo(x, y)

    if (this.formation === 'column') {
      for (let i = 1; i < this.units.length; i++) {
        const dist = 40 + i * 15
        const angle = this.selectedUnit.angle
        const followX = this.selectedUnit.x - Math.cos(angle) * dist
        const followY = this.selectedUnit.y - Math.sin(angle) * dist
        this.units[i].moveTo(followX, followY)
      }
    }
  }

  spreadFormation() {
    if (!this.selectedUnit) return
    for (let i = 0; i < this.units.length; i++) {
      const angle = (i / this.units.length) * Math.PI * 2
      const x = this.selectedUnit.x + Math.cos(angle) * 80
      const y = this.selectedUnit.y + Math.sin(angle) * 80
      this.units[i].moveTo(x, y)
    }
  }

  defendHold() {
    this.defender = !this.defender
    if (!this.defender) {
      for (const unit of this.units) {
        unit.stop()
      }
    }
  }

  fireAt(x, y) {
    for (const unit of this.units) {
      if (!unit.alive) continue
      const dx = x - unit.x
      const dy = y - unit.y
      const dist = Math.hypot(dx, dy)

      if (dist <= unit.fireRange && unit.canFire()) {
        unit.fire()
        unit.angle = Math.atan2(dy, dx)
      }
    }
  }

  update(delta) {
    for (const unit of this.units) {
      unit.update(delta)
    }
  }

  render(ctx) {
    for (const unit of this.units) {
      unit.render(ctx)
    }
  }

  getAliveCount() {
    return this.units.filter(u => u.alive).length
  }
}
