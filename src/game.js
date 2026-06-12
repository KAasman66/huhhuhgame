import { Squad } from './units.js'
import { GameMap } from './map.js'
import { GAME_CONFIG, COLORS } from './assets.js'

export class GameState {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.map = new GameMap(width, height)
    this.squad = new Squad(100, 300)
    this.enemies = []
    this.money = GAME_CONFIG.startingMoney
    this.mouseX = 0
    this.mouseY = 0
    this.buildMenuOpen = false
    this.selectedBuildType = null
    this.spawnTimer = 0
    this.waveCount = 0

    this.addEnemyWave()
    this.map.addBuilding(1150, 100, 'base', true)
  }

  toggleBuildMenu() {
    this.buildMenuOpen = !this.buildMenuOpen
  }

  closeBuildMenu() {
    this.buildMenuOpen = false
  }

  handleKeyA() {
    // A key: toggle between move mode and follow mode (currently defaults to move)
    // This is placeholder; in full implementation would toggle states
  }

  handleMapClick(x, y) {
    // Check if clicking on own unit
    for (const unit of this.squad.units) {
      if (!unit.alive) continue
      const dx = x - unit.x
      const dy = y - unit.y
      if (Math.hypot(dx, dy) < unit.size) {
        this.squad.selectUnit(unit)
        return
      }
    }

    // Otherwise, move squad to click position
    this.squad.moveTo(x, y)

    // Check if clicking on enemy
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      const dx = x - enemy.x
      const dy = y - enemy.y
      if (Math.hypot(dx, dy) < enemy.size * 2) {
        this.squad.fireAt(enemy.x, enemy.y)
      }
    }
  }

  addEnemyWave() {
    const waveSize = 3 + this.waveCount
    for (let i = 0; i < waveSize; i++) {
      const x = Math.random() * 400 + 800
      const y = Math.random() * 600
      const enemy = new Squad(x, y)
      // Convert squad to enemy units
      for (const unit of enemy.units) {
        unit.isPlayer = false
      }
      this.enemies.push(enemy)
    }
    this.waveCount++
  }

  update(delta) {
    this.squad.update(delta)

    for (const enemySquad of this.enemies) {
      enemySquad.update(delta)

      // Simple enemy AI: move toward player
      if (enemySquad.selectedUnit && enemySquad.selectedUnit.alive) {
        const dx = this.squad.selectedUnit.x - enemySquad.selectedUnit.x
        const dy = this.squad.selectedUnit.y - enemySquad.selectedUnit.y
        const dist = Math.hypot(dx, dy)

        if (dist > 150) {
          enemySquad.moveTo(this.squad.selectedUnit.x, this.squad.selectedUnit.y)
        } else {
          enemySquad.fireAt(this.squad.selectedUnit.x, this.squad.selectedUnit.y)
        }
      }
    }

    // Check collisions between player squad and enemies
    for (const unit of this.squad.units) {
      if (!unit.alive) continue

      for (const enemySquad of this.enemies) {
        for (const enemy of enemySquad.units) {
          if (!enemy.alive) continue

          const dx = unit.x - enemy.x
          const dy = unit.y - enemy.y
          const dist = Math.hypot(dx, dy)

          if (dist < unit.size + enemy.size) {
            const damage = 0.5
            unit.takeDamage(damage)
            enemy.takeDamage(damage)
          }
        }
      }
    }

    // Remove dead enemy squads
    this.enemies = this.enemies.filter(squad => squad.getAliveCount() > 0)

    // Check win condition
    if (this.enemies.length === 0) {
      this.addEnemyWave()
    }
  }

  render(ctx) {
    this.map.render(ctx)
    this.squad.render(ctx)

    for (const enemySquad of this.enemies) {
      enemySquad.render(ctx)
    }

    // HUD
    this.renderHUD(ctx)

    // Build menu (if open)
    if (this.buildMenuOpen) {
      this.renderBuildMenu(ctx)
    }
  }

  renderHUD(ctx) {
    document.getElementById('money').textContent = `Cash: $${this.money}`
    document.getElementById('units').textContent = `Units: ${this.squad.getAliveCount()}/${this.squad.units.length}`
  }

  renderBuildMenu(ctx) {
    // Simple build menu overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = COLORS.ui
    ctx.font = 'bold 20px Arial'
    ctx.fillText('BUILD MENU (E to close)', 50, 50)

    ctx.font = '16px Arial'
    ctx.fillText('Coming soon: Barracks, Factory, Watch Tower, Refinery', 50, 100)
  }
}
