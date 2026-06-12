import { Squad } from './units.js'
import { GameMap } from './map.js'
import { Building } from './buildings.js'
import { Vehicle } from './vehicles.js'
import { Bullet } from './bullets.js'
import { Pickup } from './pickups.js'
import { Civilian } from './civilians.js'
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
    this.civilians = []
    this.rescued = 0
    this.money = GAME_CONFIG.startingMoney

    // Campaign system
    this.currentLevel = 1
    this.levelConfig = CAMPAIGN_LEVELS.find(l => l.id === this.currentLevel) || CAMPAIGN_LEVELS[0]
    this.money = this.levelConfig.startingMoney
    this.level = this.currentLevel
    this.levelComplete = false
    this.levelFailed = false
    this.gameStarted = false
    this.mouseX = 0
    this.mouseY = 0
    this.buildMenuOpen = false
    this.selectedBuildType = null
    this.spawnTimer = 0
    this.waveCount = 0
    this.kills = 0

    // Load level
    this.loadLevel()

    this.addEnemyWave()
    this.map.addBuilding(1800, 100, 'base', true)
    // Add starting defensive towers
    this.buildings.push(new Building(1700, 300, 'watchtower', true))
    this.buildings.push(new Building(400, 600, 'watchtower', true))
  }

  loadLevel() {
    // Spawn civilians in certain levels
    if (this.levelConfig.id >= 2 && this.levelConfig.id <= 4) {
      for (let i = 0; i < 3; i++) {
        this.civilians.push(new Civilian(
          Math.random() * 1500 + 250,
          Math.random() * 1000 + 100
        ))
      }
    }
  }
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

  startGame() {
    this.gameStarted = true
  }

  renderMinimap(ctx) {
    const minimapWidth = 220
    const minimapHeight = 160
    const minimapX = this.width - minimapWidth - 20
    const minimapY = 20

    const scaleX = minimapWidth / this.width
    const scaleY = minimapHeight / this.height

    // Background with gradient
    const grad = ctx.createLinearGradient(minimapX, minimapY, minimapX, minimapY + minimapHeight)
    grad.addColorStop(0, 'rgba(0, 20, 0, 0.9)')
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.9)')
    ctx.fillStyle = grad
    ctx.fillRect(minimapX, minimapY, minimapWidth, minimapHeight)

    // Minimap border
    ctx.strokeStyle = COLORS.player
    ctx.lineWidth = 3
    ctx.strokeRect(minimapX, minimapY, minimapWidth, minimapHeight)

    // Inner frame
    ctx.strokeStyle = 'rgba(34, 221, 0, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(minimapX + 1, minimapY + 1, minimapWidth - 2, minimapHeight - 2)

    // Label
    ctx.fillStyle = COLORS.player
    ctx.font = 'bold 10px Courier'
    ctx.fillText('TACTICAL MAP', minimapX + 6, minimapY + 12)

    // Player squad
    ctx.fillStyle = COLORS.player
    for (const unit of this.squad.units) {
      if (unit.alive) {
        const px = minimapX + unit.x * scaleX
        const py = minimapY + unit.y * scaleY
        ctx.fillRect(px - 2, py - 2, 4, 4)
        // Glow
        ctx.strokeStyle = 'rgba(34, 221, 0, 0.5)'
        ctx.lineWidth = 1
        ctx.strokeRect(px - 3, py - 3, 6, 6)
      }
    }

    // Enemies
    ctx.fillStyle = COLORS.enemy
    for (const enemy of this.enemies) {
      if (enemy instanceof Squad) {
        for (const unit of enemy.units) {
          if (unit.alive) {
            const px = minimapX + unit.x * scaleX
            const py = minimapY + unit.y * scaleY
            ctx.fillRect(px - 1, py - 1, 2, 2)
          }
        }
      } else if (enemy instanceof Vehicle && enemy.alive) {
        const px = minimapX + enemy.x * scaleX
        const py = minimapY + enemy.y * scaleY
        ctx.fillRect(px - 2, py - 2, 4, 4)
        // Tank indicator
        ctx.strokeStyle = 'rgba(221, 34, 34, 0.5)'
        ctx.lineWidth = 1
        ctx.strokeRect(px - 3, py - 3, 6, 6)
      }
    }

    // Buildings
    ctx.fillStyle = COLORS.money
    for (const building of this.buildings) {
      if (building.alive) {
        const px = minimapX + building.x * scaleX
        const py = minimapY + building.y * scaleY
        ctx.fillRect(px - 2, py - 2, 4, 4)
        ctx.strokeStyle = 'rgba(255, 255, 34, 0.5)'
        ctx.lineWidth = 1
        ctx.strokeRect(px - 3, py - 3, 6, 6)
      }
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

    // Update civilians
    for (const civilian of this.civilians) {
      civilian.update(delta)
    }

    // Civilian rescue mechanic (close to squad)
    for (const civilian of this.civilians) {
      if (civilian.alive && !civilian.rescued) {
        const dx = civilian.x - this.squad.selectedUnit.x
        const dy = civilian.y - this.squad.selectedUnit.y
        const dist = Math.hypot(dx, dy)

        if (dist < 60) {
          civilian.rescue()
          this.rescued++
          this.money += 500
          SoundFX.powerup()
        }
      }
    }

    // Civilian damage from bullets
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue
      for (const civilian of this.civilians) {
        if (!civilian.alive || civilian.rescued) continue
        if (Math.hypot(bullet.x - civilian.x, bullet.y - civilian.y) < civilian.size + bullet.size) {
          civilian.takeDamage(bullet.damage * 0.5)
          bullet.alive = false
          break
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
          if (!building.alive) {
            // Big building explosion
            this.particles.push(new ParticleEmitter(building.x, building.y, 25, 0, 0, Math.PI * 2, 1.2, '#ff6600'))
            this.particles.push(new ParticleEmitter(building.x, building.y, 15, 0, 0, Math.PI * 2, 1.5, '#ffff00'))
            SoundFX.explosion()
            this.money += 500
          }
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
            // Big explosion for vehicles
            this.particles.push(new ParticleEmitter(vehicle.x, vehicle.y, 20, 0, 0, Math.PI * 2, 1.0, '#ff6600'))
            this.particles.push(new ParticleEmitter(vehicle.x, vehicle.y, 10, 0, 0, Math.PI * 2, 1.2, '#ffff00'))
            SoundFX.explosion()
            SoundFX.explosion()
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

    // Remove dead bullets, pickups, particles, buildings, vehicles, and civiliaans
    this.bullets = this.bullets.filter(b => b.alive)
    this.pickups = this.pickups.filter(p => p.alive)
    this.particles = this.particles.filter(e => !e.isDead())
    this.buildings = this.buildings.filter(b => b.alive)
    this.vehicles = this.vehicles.filter(v => v.alive)
    this.civilians = this.civilians.filter(c => c.alive || c.rescued)

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
    if (!this.gameStarted) {
      this.renderStartScreen(ctx)
      return
    }

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

    // Render civilians
    for (const civilian of this.civilians) {
      if (civilian.alive) civilian.render(ctx)
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

    // HUD and minimap
    this.renderMinimap(ctx)
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
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height)
    grad.addColorStop(0, '#001100')
    grad.addColorStop(1, '#000000')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.width, this.height)

    // Victory animation effect
    const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7
    ctx.fillStyle = `rgba(34, 221, 0, ${pulse * 0.2})`
    ctx.fillRect(0, 0, this.width, this.height)

    // Victory box
    ctx.fillStyle = 'rgba(0, 40, 0, 0.9)'
    ctx.fillRect(this.width / 2 - 350, 80, 700, this.height - 160)
    ctx.strokeStyle = COLORS.player
    ctx.lineWidth = 3
    ctx.strokeRect(this.width / 2 - 350, 80, 700, this.height - 160)

    ctx.fillStyle = COLORS.player
    ctx.font = 'bold 72px Courier'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(34, 221, 0, 0.8)'
    ctx.shadowBlur = 20
    ctx.fillText('MISSION COMPLETE!', this.width / 2, 160)
    ctx.shadowColor = 'transparent'

    ctx.font = '28px Courier'
    ctx.fillStyle = COLORS.money
    ctx.fillText(`${this.levelConfig.name}`, this.width / 2, 230)

    ctx.font = '18px Courier'
    ctx.fillStyle = COLORS.ui
    let y = 300
    ctx.fillText(`Waves Survived ........ ${this.waveCount - 1}`, this.width / 2, y)
    y += 40
    ctx.fillText(`Enemies Killed ........ ${this.kills} x $100`, this.width / 2, y)
    ctx.fillStyle = COLORS.money
    ctx.fillText(`= $${this.kills * 100}`, this.width / 2 + 280, y)

    ctx.fillStyle = COLORS.ui
    y += 40
    ctx.fillText(`Civilians Rescued ...... ${this.rescued} x $500`, this.width / 2, y)
    ctx.fillStyle = COLORS.money
    ctx.fillText(`= $${this.rescued * 500}`, this.width / 2 + 280, y)

    const speedBonus = this.waveCount > 5 ? 1000 : 0
    if (speedBonus > 0) {
      ctx.fillStyle = COLORS.ui
      y += 40
      ctx.fillText(`Speed Bonus`, this.width / 2, y)
      ctx.fillStyle = COLORS.money
      ctx.fillText(`= $${speedBonus}`, this.width / 2 + 280, y)
    }

    const totalReward = (this.kills * 100) + (this.rescued * 500) + this.money + speedBonus
    y += 50
    ctx.fillStyle = COLORS.player
    ctx.font = 'bold 24px Courier'
    ctx.fillText(`TOTAL REWARD ........... $${totalReward}`, this.width / 2, y)

    ctx.font = '16px Courier'
    ctx.fillStyle = COLORS.money
    ctx.fillText(`Press [E] Next Level or [R] Restart`, this.width / 2, this.height - 70)
    ctx.textAlign = 'left'
  }

  renderLevelFailed(ctx) {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height)
    grad.addColorStop(0, '#110000')
    grad.addColorStop(1, '#000000')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.width, this.height)

    // Failure box
    ctx.fillStyle = 'rgba(60, 0, 0, 0.9)'
    ctx.fillRect(this.width / 2 - 300, 100, 600, 400)
    ctx.strokeStyle = '#dd2222'
    ctx.lineWidth = 3
    ctx.strokeRect(this.width / 2 - 300, 100, 600, 400)

    ctx.fillStyle = '#dd2222'
    ctx.font = 'bold 72px Courier'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'rgba(221, 34, 34, 0.8)'
    ctx.shadowBlur = 20
    ctx.fillText('MISSION FAILED', this.width / 2, 200)
    ctx.shadowColor = 'transparent'

    ctx.font = '20px Courier'
    ctx.fillStyle = COLORS.ui
    let y = 280
    ctx.fillText(`Waves Survived ........ ${this.waveCount}`, this.width / 2, y)
    y += 40
    ctx.fillText(`Enemies Killed ........ ${this.kills}`, this.width / 2, y)

    ctx.font = '18px Courier'
    ctx.fillStyle = COLORS.money
    y += 60
    ctx.fillText('Press [R] to retry this level', this.width / 2, y)
    ctx.textAlign = 'left'
  }

  renderStartScreen(ctx) {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height)
    grad.addColorStop(0, '#001100')
    grad.addColorStop(1, '#000000')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, this.width, this.height)

    // Animated scanlines
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.03)'
    ctx.lineWidth = 1
    for (let i = 0; i < this.height; i += 2) {
      ctx.beginPath()
      ctx.moveTo(0, i + (Date.now() / 20) % 2)
      ctx.lineTo(this.width, i + (Date.now() / 20) % 2)
      ctx.stroke()
    }

    // Animated background boxes
    for (let i = 0; i < 15; i++) {
      const x = (Math.sin(Date.now() / 2000 + i) * 150 + 1000) % this.width
      const y = ((i * 80 + Date.now() / 30) % this.height)
      ctx.fillStyle = 'rgba(34, 221, 0, 0.08)'
      ctx.fillRect(x, y, 80, 40)
      ctx.strokeStyle = 'rgba(34, 221, 0, 0.15)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, 80, 40)
    }

    // Title with shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.font = 'bold 80px Courier'
    ctx.textAlign = 'center'
    ctx.fillText('TACTICAL CHAOS', this.width / 2 + 3, 153)

    ctx.fillStyle = COLORS.player
    ctx.shadowColor = 'rgba(34, 221, 0, 0.8)'
    ctx.shadowBlur = 20
    ctx.fillText('TACTICAL CHAOS', this.width / 2, 150)
    ctx.shadowColor = 'transparent'

    // Level info box
    ctx.fillStyle = 'rgba(0, 30, 0, 0.8)'
    ctx.fillRect(this.width / 2 - 300, 220, 600, 180)
    ctx.strokeStyle = COLORS.player
    ctx.lineWidth = 2
    ctx.strokeRect(this.width / 2 - 300, 220, 600, 180)

    ctx.font = 'bold 32px Courier'
    ctx.fillStyle = COLORS.money
    ctx.textAlign = 'center'
    ctx.fillText(`LEVEL ${this.level}: ${this.levelConfig.name}`, this.width / 2, 255)

    ctx.font = '18px Courier'
    ctx.fillStyle = COLORS.ui
    ctx.fillText(this.levelConfig.description, this.width / 2, 295)

    // Objectives
    ctx.font = 'bold 16px Courier'
    ctx.fillStyle = COLORS.player
    ctx.fillText('OBJECTIVES:', this.width / 2, 340)
    ctx.font = '14px Courier'
    ctx.fillStyle = COLORS.ui
    for (let i = 0; i < this.levelConfig.objectives.length; i++) {
      ctx.fillText(`▪ ${this.levelConfig.objectives[i]}`, this.width / 2, 365 + i * 20)
    }

    // Start button
    const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7
    ctx.fillStyle = `rgba(255, 255, 68, ${pulse * 0.8})`
    ctx.fillRect(this.width / 2 - 150, 450, 300, 50)
    ctx.strokeStyle = COLORS.money
    ctx.lineWidth = 2
    ctx.strokeRect(this.width / 2 - 150, 450, 300, 50)

    ctx.font = 'bold 20px Courier'
    ctx.fillStyle = '#000000'
    ctx.fillText('PRESS SPACE TO START', this.width / 2, 485)

    // Controls
    ctx.font = '12px Courier'
    ctx.fillStyle = '#888888'
    ctx.textAlign = 'center'
    ctx.fillText('A=MOVE | D=DEFEND | S=SPREAD | E=BUILD | SPACE=JEEP | SHIFT=TANK', this.width / 2, this.height - 30)

    ctx.textAlign = 'left'
  }

  renderHUD(ctx) {
    const totalEnemies = this.enemies.reduce((sum, sq) => {
      if (sq instanceof Squad) return sum + sq.getAliveCount()
      return sum + (sq.alive ? 1 : 0)
    }, 0)

    document.getElementById('money').textContent = `Level ${this.level} | Cash: $${this.money} | Kills: ${this.kills} | Rescued: ${this.rescued}`
    document.getElementById('units').textContent = `Squad: ${this.squad.getAliveCount()}/${this.squad.units.length} | Vehicles: ${this.vehicles.length} | Enemies: ${totalEnemies} | Wave: ${this.waveCount}`
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
