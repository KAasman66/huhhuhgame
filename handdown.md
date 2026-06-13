# Handoff — CHAOS FODDER

> **Wat is dit?** Top-down tactical action game. Cannon Fodder (squad + namen + Boot Hill) × Red Alert (economie, bouwen, fog of war) × Postal (gore, burgers, zwarte humor).
>
> **Stack:** TypeScript + Vite + Canvas 2D + WebAudio. Geen runtime-dependencies. Graphics zijn hybride: AI-sheets waar beschikbaar, anders procedureel.

---

## Snel starten

```bash
cd D:\PROJECTS2025\screener-game
npm install
npm run dev          # → http://localhost:5173 (5174 als 5173 bezet)
npm run typecheck    # tsc --noEmit — hoort schoon
```

Spelen: **ENTER** = campagne · **E** = endless · **B** = Boot Hill · **M** = muziek

---

## Status (13 jun 2026 — sessie 2)

| Onderdeel | Status |
|---|---|
| Core gameplay (move/fire/grenades/formations) | ✅ Werkt |
| 5-missie campagne + endless mode | ✅ Werkt |
| Economie, bouwen, voertuigen (instappen) | ✅ Werkt |
| Fog of war, minimap, persistent gore/decals | ✅ Werkt |
| Boot Hill + localStorage progress | ✅ Werkt |
| Procedural audio + muziekloop | ✅ Werkt |
| AI title art (`sheet.png`) | ✅ Werkt |
| AI terrain tiles (`tiles.png`) | ✅ Werkt |
| AI sprite slicing (sheet2.png) | ✅ Gehard — crash gefixt, per-parser try/catch |
| GitHub remote `KAasman66/huhhuhgame` | ⚠️ User moet `git remote add` + push handmatig draaien |
| Oude `.js` bestanden in `src/` | ✅ Niet aanwezig (al opgeruimd in reboot) |

---

## Besturing

| Input | Actie |
|---|---|
| **LMB** | Beweeg peloton / klik op jeep om in te stappen |
| **RMB (hold)** | Vuren op crosshair |
| **G** | Granaat (leader gooit) |
| **S** | Formatie wisselen (column ↔ spread) |
| **E** | Shop (towers/barracks/factory/recruits/vehicles) |
| **SPACE** | Uit voertuig stappen |
| **M** | Muziek aan/uit |
| **ESC** | Annuleer build-mode / sluit menu |
| **R** | Retry na game over |
| **N** | — (niet actief; SPACE op debrief = volgende missie) |

---

## Architectuur

```
src/
├── main.ts              Game loop; wacht op art.load() vóór start
├── core/
│   ├── art.ts           ★ AI-sheet loader + sprite slicer (NIEUW, uncommitted)
│   ├── math.ts          Seeded RNG (mulberry32), dist/clamp/lerp
│   ├── input.ts         Keyboard + muis; CSS-scale compensatie
│   ├── camera.ts        Smooth follow + screen shake
│   ├── audio.ts         WebAudio synth SFX + dark muziekloop
│   └── fx.ts            Particles, floating text, stampt decals
├── world/
│   ├── terrain.ts       Procedurele map + AI-tileset paint; permanente decal-layer
│   └── fog.ts           Grid-based fog (40px cells, soft edges)
├── entities/
│   ├── soldier.ts       Namen, rangen, AI-sprite of procedural fallback
│   ├── vehicle.ts       Jeep/tank, instapbaar, AI-sprite fallback
│   ├── building.ts      6 types, AI-sprite fallback
│   ├── projectile.ts    Bullet + Grenade (arc + boom)
│   ├── civilian.ts      Paniek, follow, rescue
│   └── pickup.ts        Cash / medkit / grenades
└── game/
    ├── game.ts          ★ Orkestratie (~1100 regels): update, collision, win/lose
    ├── squad.ts         Formaties, mount/dismount
    ├── ai.ts            Enemy patrol → attack
    ├── missions.ts      5 missies + endless config
    ├── roster.ts        Namen, Boot Hill graves, campaign progress (localStorage)
    ├── hud.ts           Top bar, squad panel, minimap, build menu
    └── screens.ts       Title, briefing, debrief, gameover, Boot Hill
```

**Patroon:** entities zijn domme classes met `update`/`render`. `game.ts` doet alle logica. Collision = brute-force cirkels (snel genoeg op deze schaal).

**Resolutie:** canvas intern 1280×720, CSS schaalt 16:9. Wereld 2400×1500.

**Debug handles (browser console):**
- `window.game` — live GameState
- `window.__art` — geladen sprites + `art.summary()`

---

## AI-art integratie

### Bestanden

| Pad | Rol |
|---|---|
| `public/art/sheet.png` | Title key art (bovenste ~45%) + embedded sprites/tiles |
| `public/art/sheet2.png` | Alternatief sheet; **sprites rechts in 4×4 grid** (preferred voor slicing) |
| `public/art/tiles.png` | 9×6 tile-atlas (grass, dirt, water, forest, bomen, etc.) |
| `art/` (root) | Bron-images van ChatGPT/Gemini — **niet automatisch geladen**; kopieer naar `public/art/` |

Vite serveert `public/` statisch op `/art/...`.

### Hoe het werkt (`src/core/art.ts`)

1. `art.load()` draait vóór game-start (`main.ts`)
2. Title panorama uit `sheet.png` (of `sheet2.png` fallback)
3. Sprites: grid-slice uit `sheet2.png` rechterkolom (4 rijen × 4 kolommen)
   - Rij 1: groene soldaten (walk/idle/fire poses)
   - Rij 2: rode soldaten
   - Rij 3: jeep, groene tank, rode tank
   - Rij 4: tower, barracks, factory, HQ
4. Tiles: `tiles.png` 9×6 grid → grass/dirt/water/forest arrays
5. Checkerboard-background wordt verwijderd via border flood-fill
6. Enemy-varianten: `tinted()` kopie met rode overlay (jeep/tower/barracks)
7. **Fallback:** als sprite ontbreekt, teken entity procedureel (oude canvas-draws blijven intact)

### Bekende art-problemen

- Eerste parser (connected-components) vond wel tiles + title, maar **miste vehicles/buildings** (te agressief mergen)
- Verbeterde grid-slicer in `art.ts` is geschreven maar **nog niet gecommit** — test in browser met `__art.summary()`:
  ```js
  __art.summary()
  // verwacht: playerPoses: 4, enemyPoses: 4, vehicles: 4, buildings: 6
  ```
- Terrain wordt gegenereerd bij mission-load; art moet klaar zijn (gebeurt automatisch via `art.load().then(...)`)
- Minimap-thumbnail wordt uit terrain.base getekend vóór decals — OK

---

## Gameplay-regels (belangrijk voor bugs/features)

- **Friendly fire:** kogels raken alleen vijand + civilians. **Explosies raken iedereen** (inclusief eigen squad).
- **Civilians:** loop erheen → volgen. Evac-zone = +$400. Dood = -$200 + "YOU MONSTER".
- **Doden:** blood/gibs/corpses worden **gestampt in terrain decal-canvas** (blijft op de map).
- **Promoties:** kills → rank up (PVT/CPL/SGT/CPT) → sneller vuren. Veteranen gaan mee naar volgende missie.
- **Boot Hill:** elke KIA → grave in `localStorage` key `chaosfodder.boothill`. Progress in `chaosfodder.progress`.
- **Fog:** alleen rendering/minimap; enemy AI schiet ook buiten zicht.

---

## Campagne

| # | Naam | Doel | Unlocks |
|---|---|---|---|
| 1 | FIRST BLOOD | Elimineer alle patrols | — |
| 2 | GOOD SAMARITAN | Red 4 civilians naar evac | — |
| 3 | URBAN RENEWAL | Vernietig enemy HQ | Bouwen |
| 4 | HOLD THE LINE | Overleef 6 waves | Voertuigen |
| 5 | TOTAL CHAOS | HQ + alle enemy barracks | Alles |

Endless: `[E]` op title screen. High score in progress.

---

## Git

```
Branch: master (moet hernoemd naar main bij eerste push)
Laatste commits:
  c13608d — Fix art loader crash: harden grid slicer + per-parser error isolation
  b76a595 — Add AI art pipeline: title, tiles, sprite sheets with procedural fallback
  28d0770 — Full reboot: CHAOS FODDER
Remote configured: NEE (user moet zelf draaien — zie hieronder)
Target repo: https://github.com/KAasman66/huhhuhgame.git
```

**Uncommitted (handoff-moment):**
- `art/` (6 bron-images van ChatGPT/Gemini, ~15MB) — niet automatisch geladen.
  Optie: gitignore, of verplaats naar `public/art/sources/`. Niet kritiek.

**Eerste push (user moet zelf draaien — `gh` CLI ontbreekt, geen permission voor `winget install`):**
```bash
git remote add origin https://github.com/KAasman66/huhhuhgame.git
git branch -M main
git push -u origin main
```
Auth via Git Credential Manager (browser-popup) of Personal Access Token. **GEEN** `git init` en **GEEN** README aanmaken — repo heeft al history.

---

## Testen

Handmatig: `npm run dev` → ENTER → SPACE (briefing) → LMB move, RMB fire.

Automated (browser CDP):
```js
// Keyboard via dispatch (browser_press_key werkt NIET op window listeners)
window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}))

// Mouse: reken camera-offset mee
const g = window.game
const wx = 500, wy = 700  // world coords
const sx = wx - g.camera.x, sy = wy - g.camera.y
// ... canvas getBoundingClientRect scaling ...
```

Getest en werkend: title → briefing → playing, combat/kills/money, build tower, destroy HQ → debrief, buy jeep + mount/dismount, wave spawn, civilian rescue, squad wipe → Boot Hill.

---

## Volgende stappen (prioriteit)

1. **User: push naar GitHub** — zie Git-sectie hierboven; daarna `git remote -v` bevestigt.
2. **Sprite slicing visueel verifiëren** — open game in browser, console: `__art.summary()`.
   Verwacht ruwweg: `{ playerPoses: 3-4, enemyPoses: 3-4, vehicles: 3-4, buildings: 4-6, tiles: 5+ }`.
   Als een categorie 0 is: `parseSpritesFromSheet2()` grid-coördinaten bijstellen
   (rx/ry/rw/rh percentages) of overschakelen op handmatige pixel-offsets.
3. **`art/` root opruimen** — gitignoren of naar `public/art/sources/`. Cosmetisch.
4. Nice-to-have: pathfinding rond meren, gamepad, screen-flash bij damage,
   enemy turret rotation op AI buildings, extra sprite-poses (4-frame walk cycle).

## Sessie-2 wijzigingen (sinds vorige handoff)

**Gefixt:**
- `RangeError: Invalid array length` crash bij sprite parsing op start (sheet2.png).
  Oorzaak: `largestInCell` kreeg fractional/negatieve dims als pad ≥ cell/2.
  Fix: floor dims in `largestInCell` + `sliceGrid`, return null bij ≤0 dims.
- Sprite-parse crash sloopte óók tile-loading omdat alles in één try/catch zat.
  Fix: `load()` wrapt elke parser apart.
- `paintWithTiles` kon crashen als grass-tiles array <4 entries had.
  Fix: `pickGrass()` clampt indices; terrain valt terug op procedural bij paint-exception.
- Terrain vereist nu álle vier tile-categories voordat tile-painter aan gaat.

**Niet gedaan:**
- Sprite slicing kwaliteit niet visueel geverifieerd in deze sessie (geen browser test).
- GitHub push niet uitgevoerd — `winget install gh` geweigerd door permission;
  user heeft commando-blok voor handmatige push gekregen.

---

## Prompts voor extra AI-art (indien user meer genereert)

**Sprite sheet (prioriteit):** strict top-down, transparent background, 4×4 grid: green soldiers (4 poses), red soldiers (4), jeep + 2 tanks, tower + barracks + factory + HQ. Geen tekst.

**Title art:** night battlefield, soldiers on hill with graves, explosions, NO text (game overlay tekent zelf).

**Tiles:** 9×6 seamless tile atlas — grass, dirt, water, forest, roads, craters. Top-down.

Plaats output in `public/art/` en hernoem desnoods naar `sheet2.png` / `tiles.png`.

---

*Geschreven: 13 jun 2026 — sessie 2 na art-integratie crash fix.*
