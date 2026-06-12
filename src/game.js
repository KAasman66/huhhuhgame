import { Squad } from './units.js'
import { GameMap } from './map.js'
import { Building } from './buildings.js'
import { Vehicle } from './vehicles.js'
import { Bullet } from './bullets.js'
import { Pickup } from './pickups.js'
import { ParticleEmitter } from './particles.js'
import { SoundFX } from './audio.js'
import { GAME_CONFIG, COLORS } from './assets.js'
import { CAMPAIGN_LEVELS } from './levels.js'

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
    this.vehicles = []
    this.money = GAME_CONFIG.startingMoney

    // Campaign system
    this.currentLevel = 1
    this.levelConfig = CAMPAIGN_LEVELS.find(l => l.id === this.currentLevel) || CAMPAIGN_LEVELS[0]
    this.money = this.levelConfig.startingMoney
    this.level = this.currentLevel
    this.levelComplete = false
    this.levelFailed = false
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

  spawnVehicle(type) {
    const cost = type === 'jeep' ? 200 : 400
    if (this.money < cost) return

    this.money -= cost
    const vehicle = new Vehicle(this.squad.selectedUnit.x + 50, this.squad.selectedUnit.y, type, true)
    this.vehicles.push(vehicle)
  }

  buildBuilding(type, x, y) {
    const costs = { watchtower: 300, barracks: 500, factory: 800 }
    if (this.money < costs[type]) return false

    this.money -= costs[type]
    const building = new Building(x, y, type, true)
    this.buildings.push(building)
    return true
  }

  nextLevel() {
    if (this.currentLevel < CAMPAIGN_LEVELS.length) {
      this.currentLevel++
      location.reload()
    } else {
      alert('All levels complete! Well done!')
      location.reload()
    }
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
      SoundFX.gunFire()
    })
  }

  addEnemyWave() {
    const waveSize = 3 + Math.floor(this.waveCount * 0.5)
    const spawnSides = ['top', 'right', 'bottom', 'left']
    const sides = spawnSides.sort(() => Math.random() - 0.5).slice(0, Math.min(2, waveSize))

    // Spawn infantry squads
    for (let i = 0; i < Math.max(1, waveSize - 1); i++) {
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
      for (const unit of enemy.units) {
        unit.isPlayer = false
        if (this.waveCount > 2) {
          unit.moveSpeed += 20
          unit.fireRate *= 0.9
        }
        if (this.waveCount > 4) {
          unit.health += 20
          unit.maxHealth += 20
        }
      }
      this.enemies.push(enemy)
    }

    // Spawn enemy vehicles in later waves
    if (this.waveCount > 3) {
      const vehicleCount = Math.floor(this.waveCount / 4)
      for (let i = 0; i < vehicleCount; i++) {
        const side = sides[Math.floor(Math.random() * sides.length)]
        let x, y
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
        const type = this.waveCount > 6 && Math.random() > 0.5 ? 'tank' : 'jeep'
        const vehicle = new Vehicle(x, y, type, false)
        this.enemies.push(vehicle)
      }
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
        // Also fire at vehicles
        for (const vehicle of this.enemies.filter(e => e instanceof Vehicle)) {
          if (!vehicle.alive) continue
          const dx = vehicle.x - building.x
          const dy = vehicle.y - building.y
          const dist = Math.hypot(dx, dy)
          if (dist < 350 && building.canFire()) {
            building.fire()
            const angle = Math.atan2(dy, dx)
            const bulletX = building.x + Math.cos(angle) * building.size / 2
            const bulletY = building.y + Math.sin(angle) * building.size / 2
            this.bullets.push(new Bullet(bulletX, bulletY, angle))
          }
        }
      }
    }

    // Update vehicles
    for (const vehicle of this.vehicles) {
      vehicle.update(delta)
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
          SoundFX.powerup()
          pickup.alive = false
        }
      }
    }

    for (const enemySquad of this.enemies) {
      if (enemySquad instanceof Squad) {
        enemySquad.update(delta)

        // Smart enemy AI: move toward player, attack, spread if too close
        if (enemySquad.selectedUnit && enemySquad.selectedUnit.alive) {
          const dx = this.squad.selectedUnit.x - enemySquad.selectedUnit.x
          const dy = this.squad.selectedUnit.y - enemySquad.selectedUnit.y
          const dist = Math.hypot(dx, dy)

          if (dist > 200) {
            enemySquad.moveTo(this.squad.selectedUnit.x, this.squad.selectedUnit.y)
          } else if (dist < 50) {
            enemySquad.spreadFormation()
          } else {
            enemySquad.fireAt(this.squad.selectedUnit.x, this.squad.selectedUnit.y, (bx, by, angle) => {
              this.bullets.push(new Bullet(bx, by, angle))
            })
          }
        }
      } else if (enemySquad instanceof Vehicle) {
        // Enemy vehicles
        enemySquad.update(delta)
        const dx = this.squad.selectedUnit.x - enemySquad.x
        const dy = this.squad.selectedUnit.y - enemySquad.y
        const dist = Math.hypot(dx, dy)

        if (dist > 150 && Math.random() > 0.3) {
          enemySquad.moveTo(this.squad.selectedUnit.x + Math.random() * 100 - 50, this.squad.selectedUnit.y)
        } else if (dist < 500 && enemySquad.canFire()) {
          enemySquad.fire()
          const angle = Math.atan2(dy, dx)
          const bx = enemySquad.x + Math.cos(angle) * enemySquad.size / 2
          const by = enemySquad.y + Math.sin(angle) * enemySquad.size / 2
          this.bullets.push(new Bullet(bx, by, angle))
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
              SoundFX.explosion()
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

    // Bullet vs vehicle collision
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue

      for (const vehicle of this.vehicles) {
        if (!vehicle.alive) continue
        const dx = bullet.x - vehicle.x
        const dy = bullet.y - vehicle.y
        const dist = Math.hypot(dx, dy)
        if (dist < vehicle.size + bullet.size) {
          vehicle.takeDamage(bullet.damage)
          bullet.alive = false
          if (!vehicle.alive) {
            this.money += 300
            this.kills++
            this.particles.push(new ParticleEmitter(vehicle.x, vehicle.y, 15, 0, 0, Math.PI * 2, 0.8, '#ff6600'))
          }
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

    // Remove dead bullets, pickups, particles, buildings, and vehicles
    this.bullets = this.bullets.filter(b => b.alive)
    this.pickups = this.pickups.filter(p => p.alive)
    this.particles = this.particles.filter(e => !e.isDead())
    this.buildings = this.buildings.filter(b => b.alive)
    this.vehicles = this.vehicles.filter(v => v.alive)

    // Remove dead enemy squads/vehicles
    this.enemies = this.enemies.filter(e => {
      if (e instanceof Squad) return e.getAliveCount() > 0
      return e.alive
    })

    // Check win condition for level
    const waveComplete = this.enemies.length === 0 && this.waveCount >= this.levelConfig.enemyWaves
    const baseDestroyed = this.levelConfig.enemyBase && !this.levelConfig.baseAlive
    const playerBaseAlive = this.squad.getAliveCount() > 0

    if (waveComplete && playerBaseAlive && !baseDestroyed) {
      // Next wave or next level
      if (this.waveCount < this.levelConfig.enemyWaves) {
        this.addEnemyWave()
      } else if (this.levelConfig.endless) {
        this.addEnemyWave()
      } else {
        // Level complete!
        this.levelComplete = true
      }
    }

    if (baseDestroyed) {
      this.levelComplete = true
      this.money += 5000
    }

    // Lose condition
    if (this.squad.getAliveCount() === 0) {
      this.levelFailed = true
    }
  }

  render(ctx) {
    this.map.render(ctx)
    this.squad.render(ctx)

    // Render buildings
    for (const building of this.buildings) {
      if (building.alive) building.render(ctx)
    }

    // Render vehicles
    for (const vehicle of this.vehicles) {
      if (vehicle.alive) vehicle.render(ctx)
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

    // Level complete/failed screens
    if (this.levelComplete) {
      this.renderLevelComplete(ctx)
    }
    if (this.levelFailed) {
      this.renderLevelFailed(ctx)
    }
  }

  renderLevelComplete(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = '#00ff00'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('LEVEL COMPLETE!', this.width / 2, 200)

    ctx.font = '24px Arial'
    ctx.fillStyle = COLORS.ui
    ctx.fillText(`Waves Survived: ${this.waveCount - 1}`, this.width / 2, 280)
    ctx.fillText(`Enemies Killed: ${this.kills}`, this.width / 2, 330)
    ctx.fillText(`Reward: $${this.money}`, this.width / 2, 380)

    ctx.font = '18px Arial'
    ctx.fillText('Press R to restart or E for next level', this.width / 2, 480)
    ctx.textAlign = 'left'
  }

  renderLevelFailed(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = '#ff0000'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('LEVEL FAILED', this.width / 2, 200)

    ctx.font = '24px Arial'
    ctx.fillStyle = COLORS.ui
    ctx.fillText(`Waves Survived: ${this.waveCount}`, this.width / 2, 280)
    ctx.fillText(`Enemies Killed: ${this.kills}`, this.width / 2, 330)

    ctx.font = '18px Arial'
    ctx.fillText('Press R to retry this level', this.width / 2, 430)
    ctx.textAlign = 'left'
  }

  renderHUD(ctx) {
    const totalEnemies = this.enemies.reduce((sum, sq) => {
      if (sq instanceof Squad) return sum + sq.getAliveCount()
      return sum + (sq.alive ? 1 : 0)
    }, 0)

    document.getElementById('money').textContent = `Level ${this.level} | Cash: $${this.money} | Wave: ${this.waveCount}`
    document.getElementById('units').textContent = `Squad: ${this.squad.getAliveCount()}/${this.squad.units.length} | Vehicles: ${this.vehicles.length} | Enemies: ${totalEnemies}`
  }

  renderBuildMenu(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(0, 0, this.width, this.height)

    ctx.fillStyle = COLORS.ui
    ctx.font = 'bold 24px Arial'
    ctx.fillText('BUILD MENU', 100, 60)
    ctx.font = '14px Arial'
    ctx.fillText('Press E to close | Click to build | SPACE to spawn vehicle', 100, 90)

    let y = 140
    const buildings = [
      { key: '1', name: 'Watch Tower', cost: 300, desc: 'Auto-fire tower, $300' },
      { key: '2', name: 'Barracks', cost: 500, desc: 'Train soldiers, $500' },
      { key: '3', name: 'Factory', cost: 800, desc: 'Build vehicles, $800' },
    ]

    ctx.fillStyle = '#ffffff'
    for (const b of buildings) {
      const canBuild = this.money >= b.cost
      ctx.fillStyle = canBuild ? '#00ff00' : '#ff0000'
      ctx.fillText(`[${b.key}] ${b.name}`, 100, y)
      ctx.font = '12px Arial'
      ctx.fillStyle = canBuild ? '#aaffaa' : '#ffaaaa'
      ctx.fillText(b.desc, 300, y)
      ctx.font = '14px Arial'
      y += 35
    }

    ctx.fillStyle = COLORS.ui
    ctx.font = '14px Arial'
    ctx.fillText('[SPACE] Spawn Vehicle ($200 jeep, $400 tank)', 100, y + 20)
  }
}
