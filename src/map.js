import { COLORS, GAME_CONFIG } from './assets.js'

export class GameMap {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.gridSize = GAME_CONFIG.gridSize
    this.buildings = []
  }

  addBuilding(x, y, type, isPlayer = true) {
    const building = {
      x,
      y,
      type,
      isPlayer,
      health: 200,
      maxHealth: 200,
      size: 40,
    }
    this.buildings.push(building)
    return building
  }

  render(ctx) {
    // HD terrain - layered grass
    ctx.fillStyle = COLORS.grass
    ctx.fillRect(0, 0, this.width, this.height)

    // Grass pattern detail (Cannon Fodder style)
    const tileSize = 40
    for (let x = 0; x < this.width; x += tileSize) {
      for (let y = 0; y < this.height; y += tileSize) {
        const isLight = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0
        ctx.fillStyle = isLight ? COLORS.grass : COLORS.grassDark
        ctx.fillRect(x, y, tileSize, tileSize)

        // Grass texture dots
        ctx.fillStyle = isLight ? COLORS.grassDark : COLORS.grass
        for (let i = 0; i < 3; i++) {
          const px = x + Math.random() * tileSize
          const py = y + Math.random() * tileSize
          ctx.fillRect(px, py, 2, 2)
        }
      }
    }

    // Dirt patches
    ctx.fillStyle = COLORS.dirt
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      ctx.beginPath()
      ctx.arc(x, y, Math.random() * 40 + 20, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1.0

    // Subtle grid for tactical overlay
    ctx.strokeStyle = COLORS.gridLine
    ctx.lineWidth = 0.5
    ctx.globalAlpha = 0.08
    for (let x = 0; x < this.width; x += this.gridSize * 4) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, this.height)
      ctx.stroke()
    }
    for (let y = 0; y < this.height; y += this.gridSize * 4) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(this.width, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1.0

    // Buildings
    for (const building of this.buildings) {
      this.renderBuilding(ctx, building)
    }
  }

  renderBuilding(ctx, building) {
    const color = building.isPlayer ? COLORS.friendlyBase : COLORS.enemyBase
    ctx.fillStyle = color
    ctx.fillRect(building.x - building.size / 2, building.y - building.size / 2, building.size, building.size)

    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.strokeRect(building.x - building.size / 2, building.y - building.size / 2, building.size, building.size)

    // Health bar
    ctx.fillStyle = '#00aa00'
    const healthBar = (building.health / building.maxHealth) * building.size
    ctx.fillRect(
      building.x - building.size / 2,
      building.y - building.size / 2 - 10,
      healthBar,
      4
    )
  }

  isWalkable(x, y, size) {
    if (x - size / 2 < 0 || x + size / 2 > this.width || y - size / 2 < 0 || y + size / 2 > this.height) {
      return false
    }

    for (const building of this.buildings) {
      const dx = x - building.x
      const dy = y - building.y
      const minDist = size / 2 + building.size / 2
      if (Math.hypot(dx, dy) < minDist) {
        return false
      }
    }

    return true
  }
}
