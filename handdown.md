# Handoff — CHAOS FODDER

> **Wat is dit?** Top-down tactical action game. Cannon Fodder (squad + namen + Boot Hill) × Red Alert (economie, bouwen, fog of war) × Postal (gore, burgers, zwarte humor).
>
> **Stack:** TypeScript + Vite + Canvas 2D + WebAudio. Geen runtime-dependencies. Graphics: AI-sheets + echte tree-PNGs, met procedural fallback. Muziek: echte mp3-tracks, SFX procedureel.
>
> **Repo:** https://github.com/KAasman66/huhhuhgame (branch `main`).

---

## Snel starten

```bash
cd D:\PROJECTS2025\screener-game
npm install
npm run dev          # → http://localhost:5173 (pakt 5174+ als bezet)
npm run typecheck    # tsc --noEmit — hoort schoon
npm run build        # productie-build naar dist/
```

Spelen: **ENTER** = campagne · **E** = endless · **B** = Boot Hill.

---

## Status (15 jun 2026 — sessie 5)

| Onderdeel | Status |
|---|---|
| Core gameplay (move/fire/grenades/formations) | ✅ |
| 5-missie campagne + endless mode | ✅ |
| Economie, bouwen, voertuigen (instappen) | ✅ |
| Fog of war, minimap, persistent gore/decals | ✅ |
| Boot Hill + localStorage progress | ✅ |
| AI title/tiles/sprites art (sheet.png, sheet2.png, tiles.png) | ✅ geverifieerd: playerPoses 4, enemyPoses 4, vehicles 4, buildings 6, tiles 8 |
| Echte bomen/struiken (CC-BY 3.0) + bos = dekking | ✅ |
| A* pathfinding + cohesieve squad-follow | ✅ |
| Per-level muziek (mp3) + titel-mp3 | ✅ |
| Gunfire + gevarieerde hit-grunts | ✅ |
| GitHub remote + push | ✅ staat erop |
| Netlify deploy-config | ✅ `netlify.toml` aanwezig (zie Deploy) |

---

## Besturing

| Input | Actie |
|---|---|
| **LMB** | Beweeg peloton / klik op jeep om in te stappen |
| **RMB (hold)** | Vuren op crosshair |
| **G** | Granaat (leader gooit) |
| **S** | Formatie wisselen (column ↔ spread) |
| **E** | Shop (towers/barracks/factory/recruits/vehicles) |
| **SPACE** | Uit voertuig stappen; bevestig briefing/debrief |
| **P** | Pauze aan/uit |
| **M** | Muziek aan/uit (titel = mp3, in-game = level-track) |
| **ESC** | Annuleer build-mode / sluit menu / terug naar titel |
| **R** | Retry na game over |

---

## Architectuur

```
src/
├── main.ts              Game loop (rAF, dt-clamp); wacht op art.load() vóór start
├── core/
│   ├── art.ts           AI-sheet loader + sprite slicer + tree-PNG loader
│   ├── math.ts          Seeded RNG (mulberry32), dist/clamp/lerp
│   ├── input.ts         Keyboard + muis; CSS-scale compensatie
│   ├── camera.ts        Smooth follow + screen shake
│   ├── audio.ts         Procedurele SFX + grunts; mp3-muziek (titel + per level)
│   └── fx.ts            Particles, floating text, stampt decals
├── world/
│   ├── terrain.ts       Procedurele map + AI-tileset paint; bomen=canopy+cover; decal-layer
│   ├── path.ts          Grid A* (octile, binary heap) + string-pulling
│   └── fog.ts           Grid fog (40px); exploreRect onthult gebouw-footprints
├── entities/
│   ├── soldier.ts       Namen, rangen, route[]/orderPath, AI-sprite of procedural
│   ├── vehicle.ts       Jeep/tank, instapbaar, route[]/orderPath
│   ├── building.ts      6 types, AI-sprite fallback
│   ├── projectile.ts    Bullet + Grenade (arc + boom)
│   ├── civilian.ts      Paniek, follow, rescue
│   └── pickup.ts        Cash / medkit / grenades
└── game/
    ├── game.ts          ★ Orkestratie (~1300 regels): update, collision, win/lose, fog, muziek-transities
    ├── squad.ts         ★ Leider-A* + breadcrumb-follow + separatie
    ├── ai.ts            Enemy patrol → attack; respecteert dekking (concealment)
    ├── missions.ts      5 missies + endless config
    ├── roster.ts        Namen, Boot Hill graves, campaign progress (localStorage)
    ├── hud.ts           Top bar, squad panel, minimap, build menu
    └── screens.ts       Title, briefing, debrief, gameover, Boot Hill
```

**Patroon:** entities zijn domme classes met `update`/`render`. `game.ts` doet alle logica. Collision = brute-force cirkels (snel genoeg op deze schaal).

**Resolutie:** canvas intern 1280×720, CSS schaalt 16:9. Wereld 2400×1500.

**Debug handles (browser console):** `window.game` (live GameState), `window.__art` (`art.summary()`).

---

## Belangrijkste systemen (recent werk)

### Pathfinding & squad-beweging (`world/path.ts`, `game/squad.ts`)
- Grid A* over terrein-cellen (TILE=30, octile heuristiek, binary heap, geen corner-cutting) + string-pulling zodat units bochten afsnijden i.p.v. zigzaggen.
- Klik op water/gebouw → herroutet naar dichtstbijzijnde begaanbare cel.
- **Alleen de leider doet A*.** Volgers chasen een **breadcrumb-spoor** (`Squad.steer`, elke frame vóór de soldier-updates) → de hele squad rijgt single-file door hetzelfde gat. Kolom = gelijkmatig achter elkaar; spread = + zijwaartse waaier (geklemd op open terrein). Lichte pairwise separatie tegen stapelen. 1× A* per order i.p.v. 8.

### Bos = dekking (`world/terrain.ts`, `game/ai.ts`)
- Bomen zijn **beloopbaar** (niet meer geblokkeerd; alleen meren blokkeren). Canopy wordt ná de units getekend (`renderCanopies`) → je verdwijnt eronder.
- `terrain.inCover(x,y)` = onder een kruin. Vijand-AI: spot-range 300→110 onder dekking; al-alerte squad valt terug naar patrol als je >130px de bomen in glipt; schoten trager+wijder. Tanks/torens stoppen met vuren op verstopte squad voorbij ~150/120px.

### Game-feel (`game/game.ts`, `core/camera.ts`)
- **Hitstop** (`freeze`, ≤120ms) bij zware klappen; **screen-flash** (`flash`) rood bij eigen schade, amber bij grote explosies/sloop; **low-HP vignette** (pulserend rood randje). **Pauze** met P.

### Audio (`core/audio.ts`)
- **Muziek = echte mp3's.** Titel: `public/audio/title.mp3`. In-game: per level cyclisch — `music.playLevel(missionIdx)` → `level{1,2,3}.mp3`, level 4 weer level1, enz. Autoplay-unlock retry op eerste toets/klik (browser-policy). 'M' togglet de juiste track per screen.
- **SFX procedureel:** gunfire = crack + body + click met per-schot pitch-variatie. `sfx.grunt()` = gevarieerde "ah/uh/eh/oh" (randomiseert fundament/formanten/lengte/pitch-drop) bij niet-dodelijke treffers. Dodelijk = scream + gibs.

---

## Assets

| Pad | Rol |
|---|---|
| `public/art/sheet.png` | Title key art + embedded sprites/tiles |
| `public/art/sheet2.png` | Sprites rechts in 4×4 grid (preferred voor slicing) |
| `public/art/tiles.png` | 9×6 tile-atlas (grass/dirt/water/forest) |
| `public/art/trees/` | 47 top-down boom/struik PNGs (chabull, opengameart, **CC-BY 3.0**, credit in README) |
| `public/audio/title.mp3` | Titelmuziek (Stoppadawar) |
| `public/audio/level{1,2,3}.mp3` | Level-muziek (RAWONON / SWOEWM / RuimteNietBeschikbaar) |
| `art/` (root) | Bron-images — **niet geladen**, `/art/` is gegitignored |

Vite serveert `public/` statisch op `/art/...` en `/audio/...` (absolute paden — zie Deploy).

---

## Gameplay-regels

- **Friendly fire:** kogels raken vijand + civilians; **explosies raken iedereen** (ook eigen squad).
- **Civilians:** loop erheen → volgen. Evac = +$400. Dood = -$200 + quip.
- **Doden:** blood/gibs/corpses worden in de terrein-decal-canvas gestampt (blijven liggen).
- **Promoties:** kills → rank (PVT/CPL/SGT/CPT) → sneller vuren; veteranen gaan mee.
- **Boot Hill:** elke KIA → grave in `localStorage` `chaosfodder.boothill`; progress in `chaosfodder.progress`.

## Campagne

| # | Naam | Doel | Unlocks |
|---|---|---|---|
| 1 | FIRST BLOOD | Elimineer alle patrols | — |
| 2 | GOOD SAMARITAN | Red civilians naar evac | — |
| 3 | URBAN RENEWAL | Vernietig enemy HQ | Bouwen |
| 4 | HOLD THE LINE | Overleef waves | Voertuigen |
| 5 | TOTAL CHAOS | HQ + alle enemy barracks | Alles |

Endless: `[E]` op titel. High score in progress.

---

## Deploy

Statische Vite-build (`npm run build` → `dist/`, ~86KB JS gzip 28KB; `dist/` is gegitignored). **Belangrijk:** assets worden geladen met **absolute paden** (`/art/...`, `/audio/...`).

- **Netlify (aanbevolen, nul aanpassingen):** root-domein, dus absolute paden kloppen. `netlify.toml` staat klaar (build=`npm run build`, publish=`dist`, Node 20).
  - A) app.netlify.com → Import → GitHub → `KAasman66/huhhuhgame` → Deploy (auto-deploy per push).
  - B) app.netlify.com/drop → sleep `dist/` erin (handmatig, geen Git).
  - *Account-acties (inloggen/Deploy klikken) doet de user zelf.*
- **GitHub Pages:** serveert onder `/huhhuhgame/` → absolute `/art`+`/audio` paden **404'en**. Vereist: asset-paden relatief maken (`import.meta.env.BASE_URL`-prefix in `art.ts` + `audio.ts`), `base:'/huhhuhgame/'` in `vite.config.js`, en een Actions deploy-workflow. ~20 min werk; nog niet gedaan.

---

## Testen

Handmatig: `npm run dev` → ENTER → SPACE (briefing) → LMB move, RMB hold to fire.

**Let op — Claude-preview:** de preview-tab is hidden → de browser pauzeert `requestAnimationFrame` → de game-loop staat stil (screenshots/keys werken niet vanzelf). Synchrone calls via `preview_eval` werken wél: `g.startCampaign(n); g.screen='playing'; g.update(1/60)` in een lus, dan state uitlezen. Audio kun je niet horen, alleen bevestigen dat bestanden 200 serveren en de logica foutloos draait.

---

## Volgende stappen / openstaand

1. **Vijand-AI via pathfinder** — achtervolgende vijanden lopen nog dom tegen meren aan; speler heeft wél A*. Per-frame repathing throttlen.
2. **Audio-mix balans** in een echte browser checken (muziek 0.5, titel 0.6, grunt ~0.16–0.23) — eenvoudig bij te stellen in `audio.ts`.
3. **GitHub Pages** afmaken als de user dat naast/i.p.v. Netlify wil (zie Deploy).
4. Nice-to-have: gamepad, enemy turret-rotatie op AI-buildings, 4-frame walk cycle.

---

*Bijgewerkt: 15 jun 2026 — na pathfinding-rewrite, per-level audio, bos-dekking, fog/voertuig-fixes en deploy-config.*
