import { Camera } from '../core/camera'
import { Input } from '../core/input'
import { FX } from '../core/fx'
import { music, sfx } from '../core/audio'
import { clamp, dist, rnd, rndPick, RNG, angleTo } from '../core/math'
import { Terrain } from '../world/terrain'
import { Fog } from '../world/fog'
import { findPath } from '../world/path'
import { Soldier, aimSpread } from '../entities/soldier'
import { Bullet, Grenade } from '../entities/projectile'
import { Building, BUILDING_STATS, BuildingType } from '../entities/building'
import { Vehicle, VEHICLE_STATS, VehicleType } from '../entities/vehicle'
import { Civilian } from '../entities/civilian'
import { Pickup } from '../entities/pickup'
import { Squad } from './squad'
import { EnemySquad, makeEnemySquad } from './ai'
import { MISSIONS, ENDLESS, MissionDef } from './missions'
import { Roster, Grave, addGraves, loadProgress, saveProgress } from './roster'
import { drawHUD, drawBuildGhost } from './hud'
import { drawScreens } from './screens'

export const VIEW_W = 1280
export const VIEW_H = 720
export const WORLD_W = 2400
export const WORLD_H = 1500

export type Screen = 'title' | 'briefing' | 'playing' | 'debrief' | 'gameover' | 'boothill'

const KILL_QUIPS = ['Got him!', 'Down!', 'Eat dirt!', 'Next!', 'Tango down!', 'Ha!']
const CIV_QUIPS = ['YOU MONSTER', 'OOPS...', 'THAT WAS A CIVILIAN', 'WAR CRIME ALERT']

export class Game {
  input: Input
  camera = new Camera(VIEW_W, VIEW_H)
  fx = new FX()
  screen: Screen = 'title'
  time = 0

  // Mission state
  terrain!: Terrain
  fog!: Fog
  mission: MissionDef = MISSIONS[0]
  missionIdx = 0
  endlessMode = false
  squad = new Squad()
  roster = new Roster()
  enemySquads: EnemySquad[] = []
  enemyVehicles: Vehicle[] = []
  playerVehicles: Vehicle[] = []
  buildings: Building[] = []
  civilians: Civilian[] = []
  bullets: Bullet[] = []
  grenades: Grenade[] = []
  pickups: Pickup[] = []
  extraction: { x: number; y: number; r: number } | null = null
  minimapBase: HTMLCanvasElement | null = null

  money = 0
  killCount = 0
  civKills = 0

  // Game feel
  private hitstop = 0
  private flashA = 0
  private flashColor = '#ff0000'
  paused = false
  rescuedCount = 0
  missionTime = 0
  wave = 0
  waveTimer = 0
  casualties: Grave[] = []

  buildMenuOpen = false
  buildMode: BuildingType | null = null
  briefingChars = 0
  private winTimer = -1
  private loseTimer = -1
  private gravesCommitted = false
  campaignWon = false
  progress = loadProgress()

  constructor(canvas: HTMLCanvasElement) {
    this.input = new Input(canvas)
  }

  // ------------------------------------------------------------------
  // Mission lifecycle
  // ------------------------------------------------------------------

  startCampaign(fromMission = 0) {
    this.endlessMode = false
    this.campaignWon = false
    this.missionIdx = fromMission
    if (fromMission === 0) {
      this.squad = new Squad()
      this.roster = new Roster()
    }
    this.loadMission(MISSIONS[this.missionIdx])
    this.screen = 'briefing'
    this.briefingChars = 0
  }

  startEndless() {
    this.endlessMode = true
    this.campaignWon = false
    this.squad = new Squad()
    this.roster = new Roster()
    this.loadMission({ ...ENDLESS, seed: (Math.random() * 1e9) | 0 })
    this.screen = 'briefing'
    this.briefingChars = 0
  }

  private findOpen(x: number, y: number): { x: number; y: number } {
    for (let r = 0; r < 300; r += 18) {
      for (let a = 0; a < Math.PI * 2; a += 0.7) {
        const px = clamp(x + Math.cos(a) * r, 30, WORLD_W - 30)
        const py = clamp(y + Math.sin(a) * r, 30, WORLD_H - 30)
        if (!this.terrain.isBlocked(px, py)) return { x: px, y: py }
      }
    }
    return { x, y }
  }

  /**
   * Like findOpen, but also keeps `clearance` away from every building so a
   * freshly produced unit doesn't spawn wedged between structures. Spirals
   * outward and returns the first genuinely free spot.
   */
  private findClear(x: number, y: number, clearance: number): { x: number; y: number } {
    const free = (px: number, py: number) => {
      if (this.terrain.isBlocked(px, py)) return false
      for (const b of this.buildings) {
        if (b.alive && dist(px, py, b.x, b.y) < b.radius() + clearance + 6) return false
      }
      return true
    }
    // Random start angle so successive spawns don't all stack on one point.
    const a0 = Math.random() * Math.PI * 2
    for (let r = 0; r < 360; r += 14) {
      for (let a = a0; a < a0 + Math.PI * 2; a += 0.5) {
        const px = clamp(x + Math.cos(a) * r, 30, WORLD_W - 30)
        const py = clamp(y + Math.sin(a) * r, 30, WORLD_H - 30)
        if (free(px, py)) return { x: px, y: py }
      }
    }
    return this.findOpen(x, y)
  }

  loadMission(def: MissionDef) {
    this.mission = def
    const rng = new RNG(def.seed || 1)
    this.terrain = new Terrain(WORLD_W, WORLD_H, def.seed || 1)
    this.fog = new Fog(WORLD_W, WORLD_H)
    this.fx = new FX()
    this.fx.onStamp = (x, y, r, c) => this.terrain.stampBlood(x, y, r, c)

    this.enemySquads = []
    this.enemyVehicles = []
    this.playerVehicles = []
    this.buildings = []
    this.civilians = []
    this.bullets = []
    this.grenades = []
    this.pickups = []
    this.money = def.cash
    this.killCount = 0
    this.civKills = 0
    this.rescuedCount = 0
    this.missionTime = 0
    this.wave = 0
    this.waveTimer = def.waves ? 10 : 0
    this.casualties = []
    this.buildMenuOpen = false
    this.buildMode = null
    this.winTimer = -1
    this.loseTimer = -1
    this.gravesCommitted = false

    // Player spawn on the left flank
    const spawn = this.findOpen(170, WORLD_H / 2)
    this.extraction = { x: spawn.x, y: spawn.y, r: 95 }

    // Carry over surviving veterans, heal them, top up with recruits
    this.squad.vehicle = null
    this.squad.soldiers = this.squad.alive()
    for (const s of this.squad.soldiers) {
      s.hp = s.maxHp
      s.stop()
      this.roster.claim(s.name)
    }
    while (this.squad.soldiers.length < def.squadSize) {
      this.squad.soldiers.push(new Soldier(0, 0, 'player', this.roster.nextName()))
    }
    this.squad.soldiers.forEach((s, i) => {
      const p = this.findOpen(spawn.x + ((i % 3) - 1) * 26, spawn.y + (Math.floor(i / 3) - 0.5) * 26)
      s.x = p.x
      s.y = p.y
      s.alive = true
    })
    this.squad.grenades = Math.max(4, this.squad.grenades)

    // Patrols
    for (let i = 0; i < def.patrols; i++) {
      const p = this.findOpen(rng.range(WORLD_W * 0.35, WORLD_W * 0.85), rng.range(WORLD_H * 0.12, WORLD_H * 0.88))
      const wps = [p]
      for (let w = 0; w < 2; w++) {
        wps.push(this.findOpen(p.x + rng.range(-260, 260), p.y + rng.range(-220, 220)))
      }
      this.enemySquads.push(makeEnemySquad(p.x, p.y, def.patrolSize, wps, rng))
    }

    // Enemy base
    if (def.base !== 'none') {
      const bx = WORLD_W - 240
      const by = this.findOpen(bx, WORLD_H / 2).y
      const hq = this.findOpen(bx + 60, by)
      this.buildings.push(new Building(hq.x, hq.y, 'hq', 'enemy'))
      const towers = def.base === 'big' ? 3 : 2
      for (let i = 0; i < towers; i++) {
        const t = this.findOpen(bx - 130, by + (i - (towers - 1) / 2) * 190)
        this.buildings.push(new Building(t.x, t.y, 'etower', 'enemy'))
      }
      const spawners = def.base === 'big' ? 2 : 1
      for (let i = 0; i < spawners; i++) {
        const t = this.findOpen(bx - 30, by + (i === 0 ? -150 : 150))
        this.buildings.push(new Building(t.x, t.y, 'spawner', 'enemy'))
      }
    }

    // Enemy armor
    for (let i = 0; i < def.enemyVehicles; i++) {
      const p = this.findOpen(WORLD_W * 0.7, WORLD_H * (0.3 + i * 0.4))
      this.enemyVehicles.push(new Vehicle(p.x, p.y, 'tank', 'enemy'))
    }

    // Civilians
    for (let i = 0; i < def.civilians; i++) {
      const p = this.findOpen(rng.range(WORLD_W * 0.25, WORLD_W * 0.75), rng.range(WORLD_H * 0.15, WORLD_H * 0.85))
      this.civilians.push(new Civilian(p.x, p.y))
    }

    // Minimap thumbnail
    const mm = document.createElement('canvas')
    mm.width = 192
    mm.height = 120
    mm.getContext('2d')!.drawImage(this.terrain.base, 0, 0, 192, 120)
    this.minimapBase = mm

    this.camera.jumpTo(spawn.x, spawn.y, WORLD_W, WORLD_H)
    this.paused = false

    // Squad move orders route around lakes/buildings from here on.
    this.squad.pathfinder = (sx, sy, tx, ty) => findPath(this.terrain, this.blockTest, sx, sy, tx, ty)
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  blockTest = (x: number, y: number): boolean => {
    if (this.terrain.isBlocked(x, y)) return true
    for (const b of this.buildings) {
      if (b.alive && dist(x, y, b.x, b.y) < b.radius() + 8) return true
    }
    return false
  }

  private bulletBlocked(x: number, y: number): boolean {
    // Bullets fly over water but stop on trees / map edge
    if (x < 4 || y < 4 || x > WORLD_W - 4 || y > WORLD_H - 4) return true
    const cx = Math.floor(x / 30)
    const cy = Math.floor(y / 30)
    const i = cy * this.terrain.cols + cx
    return this.terrain.blocked[i] === 1 && this.terrain.water[i] !== 1
  }

  private scareCivs(x: number, y: number, r: number, chance = 1) {
    for (const c of this.civilians) {
      if (c.alive && !c.rescued && dist(x, y, c.x, c.y) < r && Math.random() < chance) {
        if (c.panic <= 0 && Math.random() < 0.3) this.fx.text(c.x, c.y - 14, 'AAAH!', '#ffd0d0', 10)
        c.scare(x, y)
      }
    }
  }

  private soldierFire(s: Soldier, tx: number, ty: number) {
    s.angle = angleTo(s.x, s.y, tx, ty)
    const a = aimSpread(s.angle, s.side === 'player' ? 0.055 : 0.12)
    const mx = s.x + Math.cos(s.angle) * 10
    const my = s.y + Math.sin(s.angle) * 10
    this.bullets.push(new Bullet(mx, my, a, s.side, s.side === 'player' ? 14 : 11, 760, s.range() + 40, 0, s))
    this.fx.muzzle(mx, my, s.angle)
    if (s.side === 'player') sfx.shoot()
    else if (this.camera.sees(s.x, s.y)) sfx.mg()
    this.scareCivs(s.x, s.y, 120, 0.25)
  }

  private vehicleFire(v: Vehicle, tx: number, ty: number) {
    if (v.fireCd > 0) return
    v.fireCd = v.stats.fireInterval
    v.turretAngle = angleTo(v.x, v.y, tx, ty)
    const a = aimSpread(v.turretAngle, v.type === 'tank' ? 0.02 : 0.06)
    const mx = v.x + Math.cos(v.turretAngle) * (v.stats.size * 0.8)
    const my = v.y + Math.sin(v.turretAngle) * (v.stats.size * 0.8)
    this.bullets.push(new Bullet(mx, my, a, v.side, v.stats.dmg, v.type === 'tank' ? 620 : 800, v.stats.range + 50, v.stats.boom))
    this.fx.muzzle(mx, my, v.turretAngle)
    if (v.type === 'tank') {
      sfx.tankShot()
      this.camera.shake(4, 0.15)
      this.fx.smoke(mx, my, 2)
    } else {
      sfx.mg()
    }
    this.scareCivs(v.x, v.y, 160, 0.3)
  }

  /** Brief freeze-frame to add impact to big hits. Caps so it never stacks too long. */
  freeze(sec: number) {
    this.hitstop = Math.min(0.12, Math.max(this.hitstop, sec))
  }

  /** Full-screen colour flash (damage feedback, big kills). */
  flash(color: string, amount: number) {
    this.flashColor = color
    this.flashA = Math.max(this.flashA, amount)
  }

  explode(x: number, y: number, r: number, dmg: number) {
    this.fx.explosion(x, y, r)
    this.terrain.stampCrater(x, y, r * 0.75)
    this.terrain.stampScorch(x, y, r * 0.95)
    this.camera.shake(Math.min(14, r / 5), 0.4)
    if (r > 55) {
      this.freeze(0.05)
      if (this.camera.sees(x, y, r)) this.flash('#ffd27a', 0.18)
    }
    sfx.explosion(r > 60)
    this.scareCivs(x, y, r * 4, 0.8)

    const hitSoldier = (s: Soldier, enemy: EnemySquad | null) => {
      const d = dist(x, y, s.x, s.y)
      if (d < r + 8 && s.alive) {
        const died = s.damage(dmg * (1 - d / (r + 20)))
        if (died) this.onSoldierKilled(s, true, null)
        else if (enemy) enemy.alert()
      }
    }
    for (const s of this.squad.alive()) hitSoldier(s, null)
    for (const sq of this.enemySquads) for (const s of sq.alive()) hitSoldier(s, sq)
    for (const list of [this.playerVehicles, this.enemyVehicles]) {
      for (const v of list) {
        const d = dist(x, y, v.x, v.y)
        if (v.alive && d < r + v.stats.size * 0.5) {
          if (v.damage(dmg * 0.9 * (1 - d / (r + 40)))) this.onVehicleKilled(v)
        }
      }
    }
    for (const b of this.buildings) {
      const d = dist(x, y, b.x, b.y)
      if (b.alive && d < r + b.radius()) {
        if (b.damage(dmg * 0.8)) this.onBuildingKilled(b)
      }
    }
    for (const c of this.civilians) {
      const d = dist(x, y, c.x, c.y)
      if (c.alive && !c.rescued && d < r + 6) {
        if (c.damage(dmg * (1 - d / (r + 10)))) this.onCivilianKilled(c, true)
      }
    }
  }

  private onSoldierKilled(s: Soldier, explosive: boolean, shooter: Soldier | null) {
    if (explosive) {
      this.fx.gibs(s.x, s.y, 12)
      this.terrain.stampBlood(s.x, s.y, 14, 'rgba(110,6,6,0.7)')
      sfx.scream()
    } else {
      this.fx.blood(s.x, s.y, s.angle + Math.PI, 12)
      this.terrain.stampCorpse(s.x, s.y, rnd(0, Math.PI * 2), s.colors.uniform)
      if (Math.random() < 0.6) sfx.scream()
    }

    if (s.side === 'enemy') {
      this.killCount++
      this.money += 25
      if (shooter && shooter.alive && shooter.side === 'player') {
        const before = shooter.rank()
        shooter.kills++
        if (shooter.rank() > before) {
          this.fx.text(shooter.x, shooter.y - 20, `${shooter.name} PROMOTED!`, '#ffe14a', 13)
          sfx.promote()
        } else if (Math.random() < 0.18) {
          this.fx.text(shooter.x, shooter.y - 18, rndPick(KILL_QUIPS), '#cfe8cf', 10)
        }
      }
      // Loot drops
      const roll = Math.random()
      if (roll < 0.2) this.pickups.push(new Pickup(s.x, s.y, 'cash', 50 + ((Math.random() * 4) | 0) * 50))
      else if (roll < 0.3) this.pickups.push(new Pickup(s.x, s.y, 'medkit'))
      else if (roll < 0.4) this.pickups.push(new Pickup(s.x, s.y, 'grenades'))
    } else {
      this.casualties.push({ name: s.name, kills: s.kills, rank: s.rank(), mission: this.mission.name })
      this.fx.text(s.x, s.y - 20, `${s.name} IS DOWN!`, '#ff6666', 13)
    }
  }

  private onVehicleKilled(v: Vehicle) {
    this.explodeVisualOnly(v.x, v.y, 40)
    this.fx.debris(v.x, v.y, 14, v.side === 'player' ? '#52633a' : '#6e4040')
    this.terrain.stampScorch(v.x, v.y, 34)
    if (v.side === 'enemy') {
      this.killCount++
      this.money += 150
      this.fx.text(v.x, v.y - 24, '+$150', '#ffe14a', 12)
    } else if (this.squad.vehicle === v) {
      // Squad bails out of the burning wreck
      const spots = this.squad.dismount()
      const units = this.squad.alive()
      units.forEach((s, i) => {
        const p = this.findOpen(spots[i]?.x ?? v.x, spots[i]?.y ?? v.y)
        s.x = p.x
        s.y = p.y
        if (s.damage(55)) this.onSoldierKilled(s, true, null)
      })
      this.fx.text(v.x, v.y - 26, 'BAIL OUT!', '#ff9944', 14)
    }
    const idxP = this.playerVehicles.indexOf(v)
    if (idxP >= 0) this.playerVehicles.splice(idxP, 1)
    const idxE = this.enemyVehicles.indexOf(v)
    if (idxE >= 0) this.enemyVehicles.splice(idxE, 1)
  }

  /** Explosion FX without area damage (used for death explosions to avoid chain wipes). */
  private explodeVisualOnly(x: number, y: number, r: number) {
    this.fx.explosion(x, y, r)
    this.terrain.stampCrater(x, y, r * 0.6)
    this.camera.shake(9, 0.32)
    this.freeze(0.04)
    if (this.camera.sees(x, y, r)) this.flash('#ffd27a', 0.14)
    sfx.explosion(false)
  }

  private onBuildingKilled(b: Building) {
    this.explodeVisualOnly(b.x, b.y, b.size)
    this.fx.debris(b.x, b.y, 22)
    this.terrain.stampScorch(b.x, b.y, b.size * 0.9)
    if (b.side === 'enemy') {
      const bounty = b.type === 'hq' ? 800 : 300
      this.money += bounty
      this.killCount++
      this.fx.text(b.x, b.y - 30, `+$${bounty}`, '#ffe14a', 14)
      if (b.type === 'hq') this.fx.text(b.x, b.y - 50, 'HQ DESTROYED!', '#ff9944', 18)
    }
  }

  private onCivilianKilled(c: Civilian, explosive: boolean) {
    this.civKills++
    this.money = Math.max(0, this.money - 200)
    if (explosive) this.fx.gibs(c.x, c.y, 10)
    else this.fx.blood(c.x, c.y, rnd(0, Math.PI * 2), 10)
    this.terrain.stampCorpse(c.x, c.y, rnd(0, Math.PI * 2), c.shirt)
    sfx.scream()
    this.fx.text(c.x, c.y - 18, rndPick(CIV_QUIPS), '#ff5050', 12)
    this.fx.text(c.x, c.y - 4, '-$200', '#ff9999', 10)
  }

  // ------------------------------------------------------------------
  // Economy / build actions
  // ------------------------------------------------------------------

  hasBuilding(type: BuildingType): boolean {
    return this.buildings.some((b) => b.alive && b.side === 'player' && b.type === type)
  }

  tryStartBuild(type: BuildingType) {
    if (this.money < BUILDING_STATS[type].cost) {
      sfx.denied()
      return
    }
    this.buildMode = type
    this.buildMenuOpen = false
    sfx.click()
  }

  canPlace(type: BuildingType, x: number, y: number): boolean {
    const s = BUILDING_STATS[type]
    if (!this.fog.isVisible(x, y)) return false
    if (!this.terrain.areaFree(x, y, s.size * 0.62)) return false
    for (const b of this.buildings) {
      if (b.alive && dist(x, y, b.x, b.y) < b.radius() + s.size * 0.6 + 12) return false
    }
    return true
  }

  placeBuilding(type: BuildingType, x: number, y: number) {
    const cost = BUILDING_STATS[type].cost
    if (this.money < cost || !this.canPlace(type, x, y)) {
      sfx.denied()
      return
    }
    this.money -= cost
    this.buildings.push(new Building(x, y, type, 'player'))
    this.fx.smoke(x, y, 6)
    sfx.build()
    this.buildMode = null
  }

  buyRecruit() {
    const barracks = this.buildings.find((b) => b.alive && b.side === 'player' && b.type === 'barracks')
    if (!barracks || this.money < 300 || this.squad.soldiers.filter((s) => s.alive).length >= 8) {
      sfx.denied()
      return
    }
    this.money -= 300
    const p = this.findClear(barracks.x, barracks.y + barracks.size * 0.7, 10)
    const s = new Soldier(p.x, p.y, 'player', this.roster.nextName())
    this.squad.soldiers.push(s)
    const lead = this.squad.pos()
    if (lead) s.orderMove(lead.x, lead.y)
    this.fx.text(p.x, p.y - 16, `${s.name} REPORTING!`, '#aaffaa', 11)
    sfx.cash()
    this.buildMenuOpen = false
  }

  buyVehicle(type: VehicleType) {
    const factory = this.buildings.find((b) => b.alive && b.side === 'player' && b.type === 'factory')
    const cost = VEHICLE_STATS[type].cost
    if (!factory || this.money < cost) {
      sfx.denied()
      return
    }
    this.money -= cost
    // Spawn clear of the factory and any neighbours so it can drive away.
    const p = this.findClear(factory.x, factory.y + factory.size, VEHICLE_STATS[type].size * 0.6)
    this.playerVehicles.push(new Vehicle(p.x, p.y, type, 'player'))
    this.fx.smoke(p.x, p.y, 5)
    sfx.build()
    this.buildMenuOpen = false
  }

  // ------------------------------------------------------------------
  // Update
  // ------------------------------------------------------------------

  update(dt: number) {
    this.time += dt
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt * 2.2)
    if (this.input.pressed('m')) music.toggle()

    switch (this.screen) {
      case 'title':
        this.updateTitle()
        break
      case 'briefing':
        this.briefingChars += dt * 55
        if (this.input.pressed(' ') || this.input.clicks.length > 0) {
          const total = this.mission.brief.join('').length
          if (this.briefingChars < total) this.briefingChars = total
          else {
            this.screen = 'playing'
            sfx.click()
            music.start()
          }
        }
        break
      case 'playing':
        if (this.input.pressed('p')) {
          this.paused = !this.paused
          sfx.click()
        }
        if (this.paused) break
        // Hitstop: freeze the battle for a few frames on heavy impacts.
        // Camera still settles so the freeze reads as deliberate, not a stall.
        if (this.hitstop > 0) {
          this.hitstop -= dt
          const fp = this.squad.pos()
          if (fp) this.camera.follow(fp.x, fp.y, WORLD_W, WORLD_H, dt)
        } else {
          this.updatePlaying(dt)
        }
        break
      case 'debrief':
        if (this.input.pressed(' ')) {
          sfx.click()
          if (this.campaignWon || this.endlessMode) {
            this.screen = 'title'
          } else {
            this.missionIdx++
            this.loadMission(MISSIONS[this.missionIdx])
            this.screen = 'briefing'
            this.briefingChars = 0
          }
        }
        break
      case 'gameover':
        if (this.input.pressed('r') && !this.endlessMode) {
          this.squad = new Squad()
          this.roster = new Roster()
          this.loadMission(MISSIONS[this.missionIdx])
          this.screen = 'briefing'
          this.briefingChars = 0
        }
        if (this.input.pressed('escape') || (this.endlessMode && this.input.pressed('r'))) {
          this.screen = 'title'
        }
        break
      case 'boothill':
        if (this.input.pressed('escape') || this.input.pressed('b')) this.screen = 'title'
        break
    }
    this.input.endFrame()
  }

  private updateTitle() {
    sfx.unlock()
    if (this.input.pressed('enter')) {
      sfx.click()
      this.startCampaign(0)
    }
    if (this.input.pressed('c') && this.progress.unlocked > 0) {
      sfx.click()
      this.startCampaign(Math.min(this.progress.unlocked, MISSIONS.length - 1))
    }
    if (this.input.pressed('e')) {
      sfx.click()
      this.startEndless()
    }
    if (this.input.pressed('b')) {
      sfx.click()
      this.screen = 'boothill'
    }
  }

  private updatePlaying(dt: number) {
    this.missionTime += dt
    const mouseWX = this.camera.toWorldX(this.input.mx)
    const mouseWY = this.camera.toWorldY(this.input.my)

    this.handleOrders(mouseWX, mouseWY)

    // Squad movement
    for (const s of this.squad.alive()) s.update(dt, this.blockTest)
    if (this.squad.mounted()) {
      const v = this.squad.vehicle!
      v.update(dt, this.blockTest)
      v.turretAngle = angleTo(v.x, v.y, mouseWX, mouseWY)
      v.fireCd = Math.max(0, v.fireCd - dt)
    }

    // Fire orders (hold RMB)
    if (this.input.rightDown && !this.buildMode && !this.buildMenuOpen) {
      if (this.squad.mounted()) {
        this.vehicleFire(this.squad.vehicle!, mouseWX, mouseWY)
      } else {
        for (const s of this.squad.alive()) {
          if (s.fireCd <= 0 && dist(s.x, s.y, mouseWX, mouseWY) < s.range() + 60) {
            s.fireCd = s.fireInterval()
            this.soldierFire(s, mouseWX, mouseWY)
          }
        }
      }
    } else {
      // Auto-defense: engage very close threats
      this.autoDefend()
    }

    this.updateEnemies(dt)
    this.updateBuildings(dt)
    this.updateWaves(dt)
    this.updateProjectiles(dt)
    this.updatePickupsAndCivs(dt)

    this.fx.update(dt)

    // Fog viewers
    const viewers: { x: number; y: number; range: number }[] = []
    for (const s of this.squad.alive()) viewers.push({ x: s.x, y: s.y, range: 280 })
    if (this.squad.mounted()) viewers.push({ x: this.squad.vehicle!.x, y: this.squad.vehicle!.y, range: 330 })
    for (const v of this.playerVehicles) if (!v.occupied) viewers.push({ x: v.x, y: v.y, range: 240 })
    for (const b of this.buildings) {
      if (b.alive && b.side === 'player') viewers.push({ x: b.x, y: b.y, range: 300 })
    }
    this.fog.update(viewers)

    // Once a building's base is seen, reveal its whole sprite footprint so the
    // fog doesn't black out the (tall) upper half of the structure.
    for (const b of this.buildings) {
      if (!b.alive) continue
      if (b.side === 'player' || this.fog.isExplored(b.x, b.y)) {
        const w = b.size * 1.45
        this.fog.exploreRect(b.x - w / 2, b.y - w * 0.62, b.x + w / 2, b.y + w * 0.45)
      }
    }

    const pos = this.squad.pos()
    if (pos) this.camera.follow(pos.x, pos.y, WORLD_W, WORLD_H, dt)

    this.checkWinLose(dt)
  }

  private handleOrders(mouseWX: number, mouseWY: number) {
    const input = this.input

    if (input.pressed('e') && (this.mission.build || this.mission.vehicles)) {
      this.buildMenuOpen = !this.buildMenuOpen
      this.buildMode = null
      sfx.click()
    }
    if (input.pressed('escape')) {
      this.buildMenuOpen = false
      this.buildMode = null
    }
    if (this.buildMenuOpen) {
      if (input.pressed('1') && this.mission.build) this.tryStartBuild('tower')
      if (input.pressed('2') && this.mission.build) this.tryStartBuild('barracks')
      if (input.pressed('3') && this.mission.build) this.tryStartBuild('factory')
      if (input.pressed('4') && this.mission.build) this.buyRecruit()
      if (input.pressed('5') && this.mission.vehicles) this.buyVehicle('jeep')
      if (input.pressed('6') && this.mission.vehicles) this.buyVehicle('tank')
    }
    if (input.pressed('s')) {
      this.squad.formation = this.squad.formation === 'column' ? 'spread' : 'column'
      const p = this.squad.pos()
      if (p) this.fx.text(p.x, p.y - 26, this.squad.formation.toUpperCase(), '#9fd6ff', 11)
      sfx.click()
    }
    if (input.pressed('g') && !this.squad.mounted()) {
      const l = this.squad.leader()
      if (l && this.squad.grenades > 0) {
        this.squad.grenades--
        this.grenades.push(new Grenade(l.x, l.y, mouseWX, mouseWY, 'player'))
        sfx.grenadePin()
      } else {
        sfx.denied()
      }
    }
    if (input.pressed(' ') && this.squad.mounted()) {
      const spots = this.squad.dismount()
      this.squad.alive().forEach((s, i) => {
        const p = this.findOpen(spots[i]?.x ?? s.x, spots[i]?.y ?? s.y)
        s.x = p.x
        s.y = p.y
      })
    }

    for (const click of input.clicks) {
      const wx = this.camera.toWorldX(click.x)
      const wy = this.camera.toWorldY(click.y)
      if (click.button === 0) {
        if (this.buildMode) {
          this.placeBuilding(this.buildMode, wx, wy)
          continue
        }
        // Board a vehicle?
        if (!this.squad.mounted()) {
          const v = this.playerVehicles.find((v) => v.alive && !v.occupied && dist(wx, wy, v.x, v.y) < v.stats.size * 0.9)
          const p = this.squad.pos()
          if (v && p && dist(p.x, p.y, v.x, v.y) < 90) {
            this.squad.board(v)
            this.fx.text(v.x, v.y - 24, 'MOUNT UP!', '#9fd6ff', 12)
            sfx.click()
            continue
          }
        }
        this.squad.moveTo(wx, wy)
      } else if (click.button === 2 && this.buildMode) {
        this.buildMode = null
      }
    }
  }

  private nearestEnemyOf(x: number, y: number, maxR: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null
    let bd = maxR
    for (const sq of this.enemySquads) {
      for (const s of sq.alive()) {
        const d = dist(x, y, s.x, s.y)
        if (d < bd) {
          bd = d
          best = s
        }
      }
    }
    for (const v of this.enemyVehicles) {
      if (!v.alive) continue
      const d = dist(x, y, v.x, v.y)
      if (d < bd) {
        bd = d
        best = v
      }
    }
    return best
  }

  private autoDefend() {
    if (this.squad.mounted()) return
    for (const s of this.squad.alive()) {
      if (s.fireCd > 0) continue
      const t = this.nearestEnemyOf(s.x, s.y, 175)
      if (t) {
        s.fireCd = s.fireInterval() * 1.4
        this.soldierFire(s, t.x, t.y)
      }
    }
  }

  private updateEnemies(dt: number) {
    const playerPos = this.squad.pos()
    const concealed = !this.squad.mounted() && playerPos ? this.terrain.inCover(playerPos.x, playerPos.y) : false
    for (const sq of this.enemySquads) {
      sq.update(dt, playerPos, concealed, this.blockTest, (s, tx, ty) => this.soldierFire(s, tx, ty))
    }
    this.enemySquads = this.enemySquads.filter((sq) => sq.alive().length > 0)

    for (const v of this.enemyVehicles) {
      if (!v.alive) continue
      v.update(dt, this.blockTest)
      if (playerPos) {
        const d = dist(v.x, v.y, playerPos.x, playerPos.y)
        if (d < 520 && d > 270) v.orderMove(playerPos.x, playerPos.y)
        else if (d <= 270) v.stop()
        // Tanks can't draw a bead on a squad tucked into the treeline.
        if (d < v.stats.range + 40 && !(concealed && d > 150)) {
          v.turretAngle = angleTo(v.x, v.y, playerPos.x, playerPos.y)
          const spread = concealed ? 30 : 25
          this.vehicleFire(v, playerPos.x + rnd(-spread, spread), playerPos.y + rnd(-spread, spread))
        }
      }
    }

    for (const v of this.playerVehicles) {
      if (v === this.squad.vehicle || !v.alive) continue
      v.update(dt, this.blockTest)
      // Unmanned vehicles still have a gunner: light auto-defense
      v.fireCd = Math.max(0, v.fireCd - dt)
      const t = this.nearestEnemyOf(v.x, v.y, v.stats.range * 0.8)
      if (t) this.vehicleFire(v, t.x, t.y)
    }
  }

  private updateBuildings(dt: number) {
    const playerPos = this.squad.pos()
    for (const b of this.buildings) {
      if (!b.alive) continue
      b.fireCd = Math.max(0, b.fireCd - dt)
      // Damage smoke
      if (b.hp < b.maxHp * 0.45) {
        b.smokeCd -= dt
        if (b.smokeCd <= 0) {
          b.smokeCd = rnd(0.15, 0.4)
          this.fx.smoke(b.x + rnd(-b.size / 3, b.size / 3), b.y - b.size / 3, 1, true)
        }
      }

      if (b.type === 'tower' && b.side === 'player') {
        const t = this.nearestEnemyOf(b.x, b.y, 290)
        if (t) {
          b.turretAngle = angleTo(b.x, b.y, t.x, t.y)
          if (b.fireCd <= 0) {
            b.fireCd = 0.32
            const mx = b.x + Math.cos(b.turretAngle) * (b.size * 0.6)
            const my = b.y + Math.sin(b.turretAngle) * (b.size * 0.6)
            this.bullets.push(new Bullet(mx, my, aimSpread(b.turretAngle, 0.05), 'player', 13, 800, 340))
            this.fx.muzzle(mx, my, b.turretAngle)
            if (this.camera.sees(b.x, b.y)) sfx.mg()
          }
        }
      } else if (b.type === 'etower' && playerPos) {
        const d = dist(b.x, b.y, playerPos.x, playerPos.y)
        const concealed = !this.squad.mounted() && this.terrain.inCover(playerPos.x, playerPos.y)
        if (d < 310 && !(concealed && d > 120)) {
          b.turretAngle = angleTo(b.x, b.y, playerPos.x, playerPos.y)
          if (b.fireCd <= 0) {
            b.fireCd = 0.5
            const mx = b.x + Math.cos(b.turretAngle) * (b.size * 0.6)
            const my = b.y + Math.sin(b.turretAngle) * (b.size * 0.6)
            this.bullets.push(new Bullet(mx, my, aimSpread(b.turretAngle, 0.09), 'enemy', 11, 760, 360))
            this.fx.muzzle(mx, my, b.turretAngle)
            if (this.camera.sees(b.x, b.y)) sfx.mg()
          }
        }
      } else if (b.type === 'spawner') {
        b.spawnCd -= dt
        if (b.spawnCd <= 0) {
          b.spawnCd = rnd(17, 24)
          const sq = makeEnemySquad(b.x, b.y + b.size, 3, [])
          sq.alert()
          this.enemySquads.push(sq)
          if (this.fog.isVisible(b.x, b.y)) this.fx.text(b.x, b.y - 30, 'REINFORCEMENTS!', '#ff8866', 12)
        }
      }
    }
    this.buildings = this.buildings.filter((b) => b.alive)
  }

  private updateWaves(dt: number) {
    const w = this.mission.waves
    if (!w || this.wave >= w.count) return
    this.waveTimer -= dt
    if (this.waveTimer <= 0) {
      this.wave++
      this.waveTimer = w.interval
      const difficulty = Math.floor(this.wave / 3)
      const size = w.size + difficulty
      const side = rndPick(['top', 'right', 'bottom'])
      let x = WORLD_W - 100
      let y = rnd(150, WORLD_H - 150)
      if (side === 'top') {
        x = rnd(WORLD_W * 0.4, WORLD_W - 100)
        y = 80
      } else if (side === 'bottom') {
        x = rnd(WORLD_W * 0.4, WORLD_W - 100)
        y = WORLD_H - 80
      }
      const groups = 1 + Math.floor(this.wave / 4)
      for (let g = 0; g < groups; g++) {
        const p = this.findOpen(x + rnd(-120, 120), y + rnd(-120, 120))
        const sq = makeEnemySquad(p.x, p.y, size, [])
        sq.alert()
        this.enemySquads.push(sq)
      }
      // Armor joins later waves
      if (this.wave >= 3 && this.wave % 2 === 1) {
        const p = this.findOpen(x, y)
        this.enemyVehicles.push(new Vehicle(p.x, p.y, this.wave >= 5 ? 'tank' : 'jeep', 'enemy'))
      }
      this.fx.text(this.camera.x + VIEW_W / 2, this.camera.y + 130, `WAVE ${this.wave} INCOMING!`, '#ff8866', 26)
      sfx.denied()
    }
  }

  private updateProjectiles(dt: number) {
    for (const g of this.grenades) {
      g.update(dt)
      if (!g.alive) this.explode(g.x, g.y, 75, 95)
    }
    this.grenades = this.grenades.filter((g) => g.alive)

    for (const b of this.bullets) {
      if (!b.alive) continue
      b.update(dt)
      if (!b.alive) {
        if (b.boom > 0) this.explode(b.x, b.y, b.boom, b.dmg)
        continue
      }
      if (this.bulletBlocked(b.x, b.y)) {
        b.alive = false
        if (b.boom > 0) this.explode(b.x, b.y, b.boom, b.dmg)
        else this.fx.sparks(b.x, b.y, 3, '#c9b87a')
        continue
      }
      this.collideBullet(b)
    }
    this.bullets = this.bullets.filter((b) => b.alive)
  }

  private collideBullet(b: Bullet) {
    const hit = (): boolean => {
      if (b.side === 'player') {
        for (const sq of this.enemySquads) {
          for (const s of sq.alive()) {
            if (dist(b.x, b.y, s.x, s.y) < 9) {
              sq.alert()
              this.fx.blood(b.x, b.y, Math.atan2(b.vy, b.vx), 5)
              if (s.damage(b.dmg)) this.onSoldierKilled(s, false, b.shooter)
              else if (Math.random() < 0.3) sfx.hurt()
              return true
            }
          }
        }
        for (const v of this.enemyVehicles) {
          if (v.alive && dist(b.x, b.y, v.x, v.y) < v.stats.size * 0.6) {
            this.fx.sparks(b.x, b.y, 4)
            if (v.damage(b.dmg)) this.onVehicleKilled(v)
            return true
          }
        }
        for (const bl of this.buildings) {
          if (bl.alive && bl.side === 'enemy' && dist(b.x, b.y, bl.x, bl.y) < bl.radius()) {
            this.fx.sparks(b.x, b.y, 3, '#aaa')
            if (bl.damage(b.dmg)) this.onBuildingKilled(bl)
            return true
          }
        }
      } else {
        if (!this.squad.mounted()) {
          for (const s of this.squad.alive()) {
            if (dist(b.x, b.y, s.x, s.y) < 9) {
              this.fx.blood(b.x, b.y, Math.atan2(b.vy, b.vx), 5)
              if (s.damage(b.dmg)) {
                this.flash('#cc1111', 0.32)
                this.freeze(0.05)
                this.camera.shake(7, 0.3)
                this.onSoldierKilled(s, false, null)
              } else {
                this.flash('#cc1111', 0.14)
                sfx.hurt()
              }
              return true
            }
          }
        }
        for (const v of this.playerVehicles) {
          if (v.alive && dist(b.x, b.y, v.x, v.y) < v.stats.size * 0.6) {
            this.fx.sparks(b.x, b.y, 4)
            if (v.damage(b.dmg)) this.onVehicleKilled(v)
            return true
          }
        }
        for (const bl of this.buildings) {
          if (bl.alive && bl.side === 'player' && dist(b.x, b.y, bl.x, bl.y) < bl.radius()) {
            this.fx.sparks(b.x, b.y, 3, '#aaa')
            if (bl.damage(b.dmg)) this.onBuildingKilled(bl)
            return true
          }
        }
      }
      // Anyone can hit a civilian. Anyone.
      for (const c of this.civilians) {
        if (c.alive && !c.rescued && dist(b.x, b.y, c.x, c.y) < 8) {
          this.fx.blood(b.x, b.y, Math.atan2(b.vy, b.vx), 6)
          if (c.damage(b.dmg)) {
            if (b.side === 'player') this.onCivilianKilled(c, false)
            else {
              this.civilians.splice(this.civilians.indexOf(c), 1)
              this.fx.text(c.x, c.y - 14, 'CIVILIAN KILLED', '#ff8888', 10)
              this.terrain.stampCorpse(c.x, c.y, rnd(0, Math.PI * 2), c.shirt)
              sfx.scream()
            }
          }
          return true
        }
      }
      return false
    }

    if (hit()) {
      if (b.boom > 0) this.explode(b.x, b.y, b.boom, b.dmg)
      b.alive = false
    }
  }

  private updatePickupsAndCivs(dt: number) {
    const leader = this.squad.leader()
    const pos = this.squad.pos()

    for (const p of this.pickups) {
      p.update(dt)
      if (!p.alive) continue
      let collected = false
      for (const s of this.squad.alive()) {
        if (dist(p.x, p.y, s.x, s.y) < 20) {
          collected = true
          break
        }
      }
      if (!collected && pos && this.squad.mounted() && dist(p.x, p.y, pos.x, pos.y) < 30) collected = true
      if (collected) {
        p.alive = false
        if (p.type === 'cash') {
          this.money += p.value
          this.fx.text(p.x, p.y - 12, `+$${p.value}`, '#ffe14a', 11)
          sfx.cash()
        } else if (p.type === 'medkit') {
          for (const s of this.squad.alive()) s.hp = Math.min(s.maxHp, s.hp + 45)
          this.fx.text(p.x, p.y - 12, 'PATCHED UP', '#7dff7d', 11)
          sfx.pickup()
        } else {
          this.squad.grenades += 3
          this.fx.text(p.x, p.y - 12, '+3 GRENADES', '#aacc66', 11)
          sfx.pickup()
        }
      }
    }
    this.pickups = this.pickups.filter((p) => p.alive)

    for (const c of this.civilians) {
      if (!c.alive || c.rescued) continue
      c.update(dt, this.blockTest, leader?.x ?? -999, leader?.y ?? -999)
      if (leader && !c.following && c.panic <= 0 && dist(c.x, c.y, leader.x, leader.y) < 30) {
        c.following = true
        this.fx.text(c.x, c.y - 16, rndPick(['Take me home!', 'Thank you!', 'Finally!']), '#9fd6ff', 10)
        sfx.pickup()
      }
      if (c.following && this.extraction && dist(c.x, c.y, this.extraction.x, this.extraction.y) < this.extraction.r) {
        c.rescued = true
        this.rescuedCount++
        this.money += 400
        this.fx.text(c.x, c.y - 14, 'RESCUED +$400', '#7dff7d', 13)
        sfx.cash()
      }
    }
  }

  private checkWinLose(dt: number) {
    // Lose
    if (this.squad.alive().length === 0 && this.loseTimer < 0) {
      this.loseTimer = 1.4
    }
    if (this.loseTimer > 0) {
      this.loseTimer -= dt
      if (this.loseTimer <= 0) {
        this.commitGraves()
        if (this.endlessMode && this.killCount > this.progress.highScore) {
          this.progress.highScore = this.killCount
          saveProgress(this.progress)
        }
        this.screen = 'gameover'
      }
      return
    }

    // Win
    if (this.winTimer < 0 && this.missionWon()) {
      this.winTimer = 1.6
      this.money += 500
      const p = this.squad.pos()
      if (p) this.fx.text(p.x, p.y - 40, 'MISSION ACCOMPLISHED! +$500', '#7dff7d', 18)
      sfx.promote()
    }
    if (this.winTimer > 0) {
      this.winTimer -= dt
      if (this.winTimer <= 0) {
        this.commitGraves()
        if (!this.endlessMode) {
          this.progress.unlocked = Math.max(this.progress.unlocked, this.missionIdx + 1)
          saveProgress(this.progress)
          if (this.missionIdx >= MISSIONS.length - 1) this.campaignWon = true
        }
        this.screen = 'debrief'
      }
    }
  }

  private missionWon(): boolean {
    const noEnemies = this.enemySquads.length === 0 && this.enemyVehicles.length === 0
    switch (this.mission.kind) {
      case 'eliminate':
        return noEnemies
      case 'rescue':
        return this.rescuedCount >= this.mission.rescueGoal
      case 'destroyhq':
        return !this.buildings.some((b) => b.alive && b.type === 'hq')
      case 'survive':
        return !this.endlessMode && this.wave >= (this.mission.waves?.count ?? 0) && noEnemies
      case 'chaos':
        return !this.buildings.some((b) => b.alive && (b.type === 'hq' || b.type === 'spawner'))
    }
  }

  private commitGraves() {
    if (this.gravesCommitted) return
    this.gravesCommitted = true
    if (this.casualties.length > 0) addGraves(this.casualties)
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)

    if (this.screen === 'playing' || this.screen === 'debrief' || this.screen === 'gameover') {
      this.renderWorld(ctx)
    }
    if (this.screen === 'playing') {
      drawHUD(this, ctx)
      this.renderLowHpVignette(ctx)
    }

    // Full-screen damage/impact flash (screen space, above world, below menus)
    if (this.flashA > 0) {
      ctx.save()
      ctx.globalAlpha = Math.min(0.5, this.flashA)
      ctx.fillStyle = this.flashColor
      ctx.fillRect(0, 0, VIEW_W, VIEW_H)
      ctx.restore()
      ctx.globalAlpha = 1
    }

    if (this.paused && this.screen === 'playing') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, VIEW_W, VIEW_H)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffe14a'
      ctx.font = 'bold 42px monospace'
      ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 8)
      ctx.fillStyle = '#cfcfcf'
      ctx.font = '14px monospace'
      ctx.fillText('[P] RESUME', VIEW_W / 2, VIEW_H / 2 + 24)
      ctx.textAlign = 'left'
    }

    drawScreens(this, ctx)
  }

  /** Pulsing red edge vignette when the squad is close to wiping. */
  private renderLowHpVignette(ctx: CanvasRenderingContext2D) {
    const units = this.squad.alive()
    if (units.length === 0) return
    let frac = 0
    for (const s of units) frac += s.hp / s.maxHp
    frac /= units.length
    // Few survivors should feel desperate even at full health.
    frac = Math.min(frac, 0.34 + units.length * 0.11)
    if (frac >= 0.45) return
    const urgency = (0.45 - frac) / 0.45
    const a = urgency * (0.38 + 0.14 * Math.sin(this.time * 5.5))
    const grad = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.78,
    )
    grad.addColorStop(0, 'rgba(160,0,0,0)')
    grad.addColorStop(1, `rgba(160,0,0,${a.toFixed(3)})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }

  private renderWorld(ctx: CanvasRenderingContext2D) {
    const cam = this.camera
    cam.begin(ctx)

    this.terrain.render(ctx, cam.x, cam.y, VIEW_W, VIEW_H)

    // Evac zone
    if (this.extraction && (this.mission.kind === 'rescue' || this.civilians.some((c) => c.following))) {
      const e = this.extraction
      ctx.strokeStyle = 'rgba(110,220,255,0.7)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 8])
      ctx.lineDashOffset = -this.time * 30
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(110,220,255,0.8)'
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('EVAC ZONE', e.x, e.y - e.r - 8)
      ctx.textAlign = 'left'
    }

    for (const p of this.pickups) p.render(ctx)
    for (const b of this.buildings) {
      if (b.side === 'player' || this.fog.isExplored(b.x, b.y)) b.render(ctx, this.time)
    }
    for (const c of this.civilians) {
      if (this.fog.isVisible(c.x, c.y)) c.render(ctx)
    }
    for (const v of this.playerVehicles) v.render(ctx)
    for (const v of this.enemyVehicles) {
      if (this.fog.isVisible(v.x, v.y)) v.render(ctx)
    }
    if (!this.squad.mounted()) {
      const units = this.squad.alive()
      for (let i = units.length - 1; i >= 0; i--) units[i].render(ctx, i === 0)
    }
    for (const sq of this.enemySquads) {
      for (const s of sq.alive()) {
        if (this.fog.isVisible(s.x, s.y)) s.render(ctx)
      }
    }
    // Tree canopies sit above units, so the squad reads as hidden underneath.
    this.terrain.renderCanopies(ctx)
    for (const g of this.grenades) g.render(ctx, this.time)
    for (const b of this.bullets) b.render(ctx)
    this.fx.render(ctx)

    // Build placement ghost
    if (this.buildMode && this.screen === 'playing') {
      drawBuildGhost(this, ctx, this.camera.toWorldX(this.input.mx), this.camera.toWorldY(this.input.my))
    }

    this.fog.render(ctx)
    cam.end(ctx)
  }
}
