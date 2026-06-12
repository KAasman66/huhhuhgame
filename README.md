# Cannon Fodder + Red Alert Hybrid Game

Arcade-style tactical action game combining Cannon Fodder squad mechanics with Red Alert tower defense.

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

✅ Bullet physics with collision
✅ Squad-based unit control
✅ Enemy waves with scaling difficulty
✅ Pickup system (health/ammo)
✅ Defensive towers
✅ Particle explosions
✅ Camera follow
✅ Health bars & HUD
✅ Wave counter & kill tracking

## TODO (Future)

- [ ] Building placement system (Red Alert-style)
- [ ] Vehicle production (jeeps, tanks)
- [ ] Campaign missions (5-10 levels)
- [ ] Sandbox mode
- [ ] Unit variety (different classes)
- [ ] Enemy base destruction
- [ ] Civilian rescue mechanics
- [ ] Sound/music
- [ ] Better unit animations

## Notes

Game uses **Vite** for dev server with hot-reload. Changes auto-reflect in browser.

---

Made for arcade fun — Cannon Fodder meets Red Alert! 🎮
