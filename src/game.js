import { Squad } from './units.js'
import { GameMap } from './map.js'
import { Building } from './buildings.js'
import { Bullet } from './bullets.js'
import { Pickup } from './pickups.js'
import { ParticleEmitter } from './particles.js'
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
    this.particles = []
    this.buildings = []
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
    // Add starting defensive towers
    this.buildings.push(new Building(1700, 300, 'watchtower', true))
    this.buildings.push(new Building(400, 600, 'watchtower', true))
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
    const waveSize = 3 + Math.floor(this.waveCount * 0.5)
    const spawnSides = ['top', 'right', 'bottom', 'left']
    const sides = spawnSides.sort(() => Math.random() - 0.5).slice(0, Math.min(2, waveSize))

    for (let i = 0; i < waveSize; i++) {
      let x, y
      const side = sides[i % sides.length]

      if (side === 'top') {
        x = Math.random() * this.width
        y = -100
      } else if (side === 'bottom') {
        x = Math.random() * this.width
        y = this.height + 100
      } else if (side === 'left') {
        x = -100
        y = Math.random() * this.height
      } else {
        x = this.width + 100
        y = Math.random() * this.height
      }

      const enemy = new Squad(x, y)
      // Vary difficulty per wave
      for (const unit of enemy.units) {
        unit.isPlayer = false
        // Harder enemies as waves progress
        if (this.waveCount > 2) {
          unit.moveSpeed += 20
          unit.fireRate *= 0.9 // Faster
        }
        if (this.waveCount > 4) {
          unit.health += 20
          unit.maxHealth += 20
        }
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

    // Update particles
    for (const emitter of this.particles) {
      emitter.update(delta)
    }

    // Update buildings
    for (const building of this.buildings) {
      building.update(delta)

      // Building fire at nearby enemies
      if (building.isPlayer && building.type === 'watchtower') {
        for (const enemySquad of this.enemies) {
          for (const enemy of enemySquad.units) {
            if (!enemy.alive) continue
            const dx = enemy.x - building.x
            const dy = enemy.y - building.y
            const dist = Math.hypot(dx, dy)
            const fireRange = 300

            if (dist < fireRange && building.canFire()) {
              building.fire()
              const angle = Math.atan2(dy, dx)
              const bulletX = building.x + Math.cos(angle) * building.size / 2
              const bulletY = building.y + Math.sin(angle) * building.size / 2
              this.bullets.push(new Bullet(bulletX, bulletY, angle))
            }
          }
        }
      }
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
              // Explosion effect
              this.particles.push(new ParticleEmitter(enemy.x, enemy.y, 8, 0, 0, Math.PI * 2, 0.6, '#ff6600'))
              this.particles.push(new ParticleEmitter(enemy.x, enemy.y, 4, 0, 0, Math.PI * 2, 0.8, '#ffff00'))
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

    // Bullet vs building collision
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue

      for (const building of this.buildings) {
        if (!building.alive) continue
        const dx = bullet.x - building.x
        const dy = bullet.y - building.y
        const dist = Math.hypot(dx, dy)
        if (dist < building.size / 2 + bullet.size) {
          building.takeDamage(bullet.damage)
          bullet.alive = false
          break
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

    // Remove dead bullets, pickups, particles, and buildings
    this.bullets = this.bullets.filter(b => b.alive)
    this.pickups = this.pickups.filter(p => p.alive)
    this.particles = this.particles.filter(e => !e.isDead())
    this.buildings = this.buildings.filter(b => b.alive)

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

    // Render buildings
    for (const building of this.buildings) {
      if (building.alive) building.render(ctx)
    }

    for (const enemySquad of this.enemies) {
      enemySquad.render(ctx)
    }

    // Render pickups
    for (const pickup of this.pickups) {
      pickup.render(ctx)
    }

    // Render particles
    for (const emitter of this.particles) {
      emitter.render(ctx)
    }

    // Render bullets (on top)
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
