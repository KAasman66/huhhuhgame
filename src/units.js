import { UNIT_CONFIG, COLORS } from './assets.js'

export class Unit {
  constructor(x, y, isPlayer = true, variant = 'standard') {
    this.x = x
    this.y = y
    this.isPlayer = isPlayer
    this.variant = variant

    // Variant-based stats
    if (variant === 'heavy') {
      this.health = 150
      this.maxHealth = 150
      this.moveSpeed = UNIT_CONFIG.moveSpeed * 0.7
      this.fireRate = UNIT_CONFIG.fireRate * 1.5
      this.fireRange = UNIT_CONFIG.fireRange
    } else if (variant === 'scout') {
      this.health = 60
      this.maxHealth = 60
      this.moveSpeed = UNIT_CONFIG.moveSpeed * 1.5
      this.fireRate = UNIT_CONFIG.fireRate * 0.8
      this.fireRange = UNIT_CONFIG.fireRange * 1.3
    } else {
      this.health = UNIT_CONFIG.maxHealth
      this.maxHealth = UNIT_CONFIG.maxHealth
      this.moveSpeed = UNIT_CONFIG.moveSpeed
      this.fireRate = UNIT_CONFIG.fireRate
      this.fireRange = UNIT_CONFIG.fireRange
    }

    this.angle = 0
    this.velocity = { x: 0, y: 0 }
    this.size = UNIT_CONFIG.size
    this.fireTimer = 0
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

    const baseColor = this.isPlayer ? COLORS.player : COLORS.enemy
    const size = this.variant === 'heavy' ? this.size * 1.3 : this.variant === 'scout' ? this.size * 0.8 : this.size

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    // Shadow (ground)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.beginPath()
    ctx.ellipse(0, size / 2 + 2, size * 0.6, size * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body - HD pixelated look
    ctx.fillStyle = baseColor
    ctx.fillRect(-size / 2.2, -size / 2.2, size / 1.1, size / 1.1)

    // Armor plates (heavy)
    if (this.variant === 'heavy') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fillRect(-size / 2.2 + 2, -size / 2.2 + 2, 3, 3)
      ctx.fillRect(size / 2.2 - 5, -size / 2.2 + 2, 3, 3)
    }

    // Head
    ctx.fillStyle = this.isPlayer ? '#ffdd99' : '#dd8844'
    ctx.fillRect(-size / 3, -size / 1.8, size * 0.66, size / 3)

    // Eyes
    ctx.fillStyle = this.selected ? '#ffff00' : '#000000'
    ctx.fillRect(-size / 4.5, -size / 2, 2, 2)
    ctx.fillRect(size / 4.5 - 2, -size / 2, 2, 2)

    // Gun barrel
    const barrelLength = this.variant === 'heavy' ? size / 1.5 : this.variant === 'scout' ? size / 1.2 : size / 2
    const barrelWidth = this.variant === 'heavy' ? 3 : 2.5
    ctx.fillStyle = '#333333'
    ctx.fillRect(0, -barrelWidth / 2, barrelLength, barrelWidth)

    // Gun tip (muzzle brake)
    ctx.fillStyle = '#666666'
    ctx.fillRect(barrelLength - 2, -barrelWidth / 2 - 1, 2, barrelWidth + 2)

    // Selection ring
    if (this.selected) {
      ctx.strokeStyle = '#ffff44'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.8
      ctx.strokeRect(-size / 2.2 - 2, -size / 2.2 - 2, size / 1.1 + 4, size / 1.1 + 4)
      ctx.globalAlpha = 1.0
    }

    ctx.restore()

    // Health bar
    const healthPercent = this.health / this.maxHealth
    const barColor = healthPercent > 0.6 ? COLORS.health : healthPercent > 0.3 ? COLORS.money : '#dd2222'
    ctx.fillStyle = '#111111'
    ctx.fillRect(this.x - 14, this.y - 24, 28, 5)
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 1
    ctx.strokeRect(this.x - 14, this.y - 24, 28, 5)
    ctx.fillStyle = barColor
    ctx.fillRect(this.x - 13, this.y - 23, (healthPercent * 26), 3)
  }
}

export class Squad {
  constructor(x, y, isPlayer = true) {
    this.units = []
    this.selectedUnit = null
    this.formation = 'column'
    this.defender = false

    // Mixed squad composition: 2 heavy, 2 scout, 2 standard
    const variants = ['heavy', 'heavy', 'scout', 'scout', 'standard', 'standard']
    for (let i = 0; i < UNIT_CONFIG.squadSize; i++) {
      const offsetX = (i % 3) * 30
      const offsetY = Math.floor(i / 3) * 30
      const variant = isPlayer ? variants[i] : Math.random() > 0.5 ? 'heavy' : 'standard'
      this.units.push(new Unit(x + offsetX, y + offsetY, isPlayer, variant))
    }
    this.selectUnit(this.units[0])
  }

  getAliveCount() {
    return this.units.filter(u => u.alive).length
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

  fireAt(x, y, bulletCallback) {
    for (const unit of this.units) {
      if (!unit.alive) continue
      const dx = x - unit.x
      const dy = y - unit.y
      const dist = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)

      if (dist <= unit.fireRange && unit.canFire()) {
        unit.fire()
        unit.angle = angle
        if (bulletCallback) {
          bulletCallback(unit.x + Math.cos(angle) * unit.size / 2,
                        unit.y + Math.sin(angle) * unit.size / 2,
                        angle)
        }
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
