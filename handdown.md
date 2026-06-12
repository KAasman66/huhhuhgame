# Handdown — TACTICAL CHAOS

> Top-down tactical action game. Cannon Fodder (peloton-besturing) + Red Alert (builds/economy) + arcade fun.
> Stack: Vanilla JS + Canvas + Vite. Geen externe assets — alle graphics zijn canvas-draws.

## Snel starten
```bash
cd D:\PROJECTS2025\screener-game
npm run dev        # http://localhost:5173
```

## Wat het is
- **Peloton**: 6 soldaten, klik 1 soldaat = leider, rest volgt in kolom. Varianten: heavy / scout / standard.
- **Combat**: klik om te vuren (bullets met collision), friendly fire aan, kills → $100 + pickups.
- **Builds**: watchtower / barracks / factory (menu via `E`). Voertuigen: jeep (`SPACE`, $200) / tank (`SHIFT`, $400).
- **Campaign**: 5 levels in `src/levels.js`, oplopende moeilijkheid, civilian-rescue in level 2–4.
- **Extra's**: particles/explosies, Web Audio SFX, minimap, start/win/fail-schermen, wave-scaling.

## Besturing
`A`=move · `D`=defend · `S`=spread · `E`=build menu · klik=vuren/selecteren · `SPACE`=jeep/start · `SHIFT`=tank · `R`=restart · `N`=next level

## Architectuur (`src/`, ~2300 regels)
| Bestand | Verantwoordelijkheid |
|---|---|
| `main.js` | game loop (60 FPS), camera-follow, ctx.translate |
| `game.js` | **GameState** — alle update/render-orkestratie, collisions, waves, schermen (grootste file) |
| `units.js` | `Unit` + `Squad` (varianten, formaties, fireAt) |
| `vehicles.js` | `Vehicle` (jeep/tank) |
| `buildings.js` | `Building` (tower/barracks/factory), towers auto-vuren |
| `bullets.js` · `pickups.js` · `particles.js` · `civilians.js` | losse entiteiten, elk eigen update/render/collision |
| `audio.js` | `SoundFX` static class, oscillator-beeps |
| `levels.js` | `CAMPAIGN_LEVELS` array |
| `stats.js` | score-berekening (nog niet volledig gekoppeld aan game.js) |
| `map.js` | terrein-render + `isWalkable` |
| `input.js` | keyboard/mouse listeners |
| `assets.js` | `COLORS`, `*_CONFIG` constants |

Patroon: elke entiteit-class heeft `update(delta)`, `render(ctx)`, `alive`. `game.js` filtert dode entiteiten elke frame.

## ⚠️ OPENSTAANDE BUGS (prioriteit)

### 1. Muis-coördinaten kloppen niet met camera + canvas-schaal — KRITIEK
Dit is waarschijnlijk waarom "schieten/bewegen niet werkt" en het scherm leeg leek.
- Canvas is intern `2000x1200` maar heeft **geen CSS-schaling** → op kleiner scherm zie je alleen de hoek; start-scherm-tekst (gecentreerd op x=1000) valt buiten beeld.
- `input.js` click-handler gebruikt rauwe `e.clientX - rect.left`. Dit negeert (a) de CSS-schaal van canvas en (b) de `ctx.translate` camera-offset in `main.js`.
- **Fix-richting**: in click-handler schalen met `canvas.width / rect.width`, daarna camera-offset optellen. Camera-offset moet uit `main.js` deelbaar zijn (nu lokaal in de loop). Overweeg canvas responsive te maken in `style.css` (`max-width:100vw; max-height:100vh; width:auto`).

### 2. Building-plaatsing werkt niet
`selectedBuild` wordt in `input.js` gezet maar **nooit gebruikt**. Click-handler slaat klikken over zodra `buildMenuOpen`. `game.buildBuilding()` bestaat wel maar wordt nergens aangeroepen. Menu is dus puur cosmetisch.

### 3. `handleKeyA()` is leeg
De `A`-toets doet niets; bewegen gaat via muisklik. HUD-tekst ("A=Move") is misleidend. Of A koppelen aan move-mode, of HUD aanpassen.

### 4. Kleine punten
- `stats.js` is geschreven maar niet geïntegreerd (win-scherm rekent inline opnieuw).
- `defendHold()` togglet elke frame zolang `D` ingedrukt is (geen debounce).
- Veel commit-warnings over LF→CRLF (cosmetisch, Windows).

## Git
- Branch: `master`, 14 commits, schoon.
- Laatste: `bb38128` (clamp/camera fix).
- `node_modules/` staat per ongeluk in de eerste commit (vóór `.gitignore` werd toegevoegd) — opschonen met `git rm -r --cached node_modules` kan later.

## Volgende stappen (aanrader)
1. **Eerst bug #1 fixen** — zonder werkende muis-input is de rest niet testbaar.
2. Building-plaatsing afmaken (bug #2): preview onder muis, klik = `buildBuilding(selectedBuild, worldX, worldY)`.
3. HUD/controls consistent maken (bug #3).
4. Pas daarna: meer levels, sandbox-mode, unit-upgrades.
