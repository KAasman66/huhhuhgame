import { Squad } from './units.js'
import { GameMap } from './map.js'
import { Bullet } from './bullets.js'
import { Pickup } from './pickups.js'
import { GAME_CONFIG, COLORS } from './assets.js'

export class GameState {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.map = new GameMap(width, height)
    this.squad = new Squad(200, 600)
    this.enemies = []
    this.bullets = []
    this.pickups = []
    this.money = GAME_CONFIG.startingMoney
    this.mouseX = 0
    this.mouseY = 0
    this.buildMenuOpen = false
    this.selectedBuildType = null
    this.spawnTimer = 0
    this.waveCount = 0
    this.kills = 0

    this.addEnemyWave()
    this.map.addBuilding(1800, 100, 'base', true)
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

    // Fire at click position
    this.squad.fireAt(x, y, (bx, by, angle) => {
      this.bullets.push(new Bullet(bx, by, angle))
    })
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

    // Update bullets
    for (const bullet of this.bullets) {
      bullet.update(delta)
    }

    // Update pickups
    for (const pickup of this.pickups) {
      pickup.update(delta)
    }

    // Pickup collection
    for (const unit of this.squad.units) {
      if (!unit.alive) continue
      for (const pickup of this.pickups) {
        if (!pickup.alive) continue
        if (pickup.hitsUnit(unit)) {
          if (pickup.type === 'health') {
            unit.health = Math.min(unit.maxHealth, unit.health + 30)
          } else if (pickup.type === 'ammo') {
            unit.fireRate = Math.max(0.1, unit.fireRate - 0.1)
          }
          pickup.alive = false
        }
      }
    }

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
          enemySquad.fireAt(this.squad.selectedUnit.x, this.squad.selectedUnit.y, (bx, by, angle) => {
            this.bullets.push(new Bullet(bx, by, angle))
          })
        }
      }
    }

    // Bullet vs enemy collision
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue

      for (const enemySquad of this.enemies) {
        for (const enemy of enemySquad.units) {
          if (!enemy.alive) continue

          if (bullet.hitsUnit(enemy)) {
            enemy.takeDamage(bullet.damage)
            bullet.alive = false

            if (!enemy.alive) {
              this.money += GAME_CONFIG.killReward
              this.kills++
              // Spawn pickup on death
              if (Math.random() > 0.3) {
                const pickupType = Math.random() > 0.6 ? 'health' : 'ammo'
                this.pickups.push(new Pickup(enemy.x, enemy.y, pickupType))
              }
            }
            break
          }
        }
      }
    }

    // Bullet vs player collision (friendly fire!)
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue

      for (const unit of this.squad.units) {
        if (!unit.alive) continue

        if (bullet.hitsUnit(unit)) {
          unit.takeDamage(bullet.damage * 0.5) // half damage from friendly fire
          bullet.alive = false
          break
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

    // Remove dead bullets and pickups
    this.bullets = this.bullets.filter(b => b.alive)
    this.pickups = this.pickups.filter(p => p.alive)

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

    // Render pickups
    for (const pickup of this.pickups) {
      pickup.render(ctx)
    }

    // Render bullets
    for (const bullet of this.bullets) {
      bullet.render(ctx)
    }

    // HUD
    this.renderHUD(ctx)

    // Build menu (if open)
    if (this.buildMenuOpen) {
      this.renderBuildMenu(ctx)
    }
  }

  renderHUD(ctx) {
    document.getElementById('money').textContent = `Cash: $${this.money} | Kills: ${this.kills}`
    document.getElementById('units').textContent = `Units: ${this.squad.getAliveCount()}/${this.squad.units.length} | Enemies: ${this.enemies.reduce((sum, sq) => sum + sq.getAliveCount(), 0)}`
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
