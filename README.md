# TACTICAL CHAOS — Cannon Fodder + Red Alert Hybrid

High-octane arcade-style tactical action game blending squad-based infantry combat with tower defense and strategic vehicle warfare. Command your elite squad through 5 campaign missions of escalating chaos!

## How to Play

### Controls
- **A** = Move squad to clicked location
- **D** = Defend hold (squad holds ground)
- **S** = Spread formation (soldiers spread in circle)
- **E** = Build menu (coming soon)
- **Left Click** = Select unit OR fire at location
- **Mouse** = Aim and position

### Gameplay Loop
1. **Command your squad**: Click on a soldier to select, rest follow
2. **Take down enemies**: Click on enemies to fire, manage waves
3. **Collect pickups**: 
   - 🟨 Yellow = Ammo (faster fire rate)
   - 🟩 Green = Health (restore HP)
4. **Defend towers**: Watchtowers auto-fire at enemies
5. **Survive waves**: Each wave gets harder with more enemies

### Key Mechanics

**Squad System**
- 6 soldiers per squad, can die (respawn next wave)
- Selected soldier (yellow highlight) leads formation
- Others follow in column or spread

**Combat**
- Click to fire (costs ammo via fire rate)
- Friendly fire enabled (be careful!)
- 25 damage per shot, towers do extra

**Enemy AI**
- Patrol and chase player squad
- Fire back with bullets
- Spawn in waves with increasing difficulty

**Resources**
- Kill enemies → $100 per kill
- Spend money on buildings (future)

## Dev Setup

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

## Game Map
- 2000x1200 pixels (large arena)
- Top-down view with camera follow
- Two defensive towers at spawn

## Architecture

```
src/
├── main.js          → Game loop + camera
├── game.js          → GameState manager
├── units.js         → Unit/Squad classes
├── buildings.js     → Tower/defensive structures
├── bullets.js       → Projectile system
├── pickups.js       → Health/ammo drops
├── particles.js     → Explosions & FX
├── map.js           → Terrain rendering
├── input.js         → Keyboard/mouse
└── assets.js        → Constants & config
```

## Features Implemented

**CORE GAMEPLAY**
✅ Squad-based infantry combat with 3 unit variants (heavy/standard/scout)
✅ Peloton control system — select leader, squad follows
✅ 6-unit squads with mixed composition
✅ Click-to-fire targeting with 200-unit range

**COMBAT & WEAPONS**
✅ Bullet physics with collision detection
✅ Friendly fire enabled (creates tactical depth)
✅ Weapon pickups (ammo, health) drop on kills
✅ Fire rate progression system
✅ Dynamic health bars (color-coded by health %)

**VEHICLES & BUILDINGS**
✅ Jeeps (fast, cheap) and Tanks (slow, powerful)
✅ Vehicle manufacturing with cost system
✅ Defensive watchtowers with auto-targeting
✅ Building placement system ($300-$800)
✅ Destructible buildings with rewards

**ENEMY AI**
✅ Infantry squad enemy patrols, chase, attack
✅ Enemy vehicle AI with smart targeting
✅ Flanking and spreading tactics
✅ Progressive difficulty scaling per wave
✅ Enemy vehicle spawning (waves 4+)

**CAMPAIGN & PROGRESSION**
✅ 5-level campaign with escalating objectives
✅ Level-based difficulty and wave counts
✅ Civilian rescue mechanics (+$500/rescue)
✅ Wave-based progression
✅ Sandbox difficulty modes

**UI & EFFECTS**
✅ Real-time minimap (top-right, color-coded units)
✅ Particle explosions (infantry kills, vehicles, buildings)
✅ Sound effects (gun fire, explosions, pickups)
✅ Level intro screens with objectives
✅ Victory/defeat screens with detailed stats
✅ HUD with cash, kills, units, enemies, wave count

**POLISH**
✅ Camera follow with smooth panning
✅ Animated start screens
✅ Score calculation with bonuses
✅ Speed bonuses (complete level <2min = +$1000)
✅ Detailed victory breakdown
✅ Game pause during menus

## Potential Expansions

- [ ] Multiplayer (PvP squad battles)
- [ ] More campaign levels (10+)
- [ ] Unit upgrades system
- [ ] Weather effects
- [ ] Advanced AI tactics
- [ ] Custom map editor
- [ ] Leaderboards/scoring
- [ ] Additional vehicle types (APCs, helicopters)
- [ ] Super weapons
- [ ] Night vision/thermal mechanics

## Notes

Game uses **Vite** for dev server with hot-reload. Changes auto-reflect in browser.

---

Made for arcade fun — Cannon Fodder meets Red Alert! 🎮
