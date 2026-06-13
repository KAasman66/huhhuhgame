# CHAOS FODDER

> *War is hell. Profit is forever.*

A top-down tactical action game: **Cannon Fodder** squad control, **Red Alert** economy & base building, and a healthy dose of **Postal** chaos. 100% procedural — every sprite, decal, screen and sound effect is generated in code. Zero assets, zero runtime dependencies.

## Run it

```bash
npm install
npm run dev        # → http://localhost:5173
```

Tech: **TypeScript + Vite + Canvas 2D + WebAudio**. `npm run typecheck` for a strict type pass.

## How to play

| Input | Action |
|---|---|
| **LMB** | Move squad (click a friendly vehicle to board it) |
| **RMB (hold)** | Fire at the crosshair |
| **G** | Throw grenade |
| **S** | Toggle formation (column / spread) |
| **E** | Field requisitions: buildings, recruits, vehicles |
| **SPACE** | Dismount vehicle |
| **M** | Music on/off |
| **ESC** | Cancel / close |

Your squad follows the leader (yellow chevron). Soldiers auto-engage threats at close range. Friendly explosions hurt **everyone** — including you and any civilians in the area. HQ deducts $200 per civilian "accident".

## Features

- **Named recruits with ranks** — every soldier has a name and earns promotions (PVT → CPL → SGT → CPT) that boost fire rate. Veterans carry over between missions.
- **Boot Hill** — every fallen soldier gets a permanent grave (localStorage). Visit them from the title screen.
- **Red Alert economy** — earn cash per kill, loot crates, build gun towers / barracks / war factory, hire recruits, buy jeeps and tanks.
- **Mountable vehicles** — the whole squad piles into a jeep or tank; tank shells leave craters.
- **Fog of war** — classic RTS shroud, revealed by your units and buildings.
- **Persistent gore** — blood, corpses, craters and scorch marks are stamped into the battlefield forever.
- **Civilians** — rescue them for cash ($400) or traumatize them; they panic, flee and scream. Postal rules.
- **5-mission campaign** + **Endless mode** with a kill-count high score.
- **Procedural audio** — synthesized gunfire, explosions, screams, plus a dark synth music loop.

## Campaign

1. **FIRST BLOOD** — eliminate all patrols
2. **GOOD SAMARITAN** — escort civilians to the evac zone
3. **URBAN RENEWAL** — destroy the enemy HQ (building unlocked)
4. **HOLD THE LINE** — survive 6 assault waves (vehicles unlocked)
5. **TOTAL CHAOS** — wipe out HQ and all enemy barracks

## Architecture (`src/`)

```
core/       math (seeded RNG), input, camera (shake), audio synth, particle/decal FX
world/      procedural terrain + permanent decal layer, fog of war
entities/   soldier, vehicle, building, projectile, civilian, pickup
game/       game orchestration, squad orders, enemy AI, missions,
            roster/Boot Hill persistence, HUD/minimap, screens
main.ts     fixed-cap game loop
```

Design notes: terrain and decals render to offscreen canvases (terrain once, decals stamped incrementally — persistence is free). Fog is a coarse grid scaled up with smoothing. All entities are plain classes updated/rendered by `game.ts`; collision is brute-force circle tests, comfortably fast at this scale.

## Credits

- Trees and bushes: ["Trees and Bushes"](https://opengameart.org/content/trees-and-bushes) by **chabull** — [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) (`public/art/trees/`)
- AI-generated art sheets (title, tiles, sprites) in `public/art/` — generated for this project
- Everything else is procedural, generated in code
