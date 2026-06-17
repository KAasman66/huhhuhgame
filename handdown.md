# Handoff — MEAT GRINDER

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

## Status (17 jun 2026 — sessie 9)

| Onderdeel | Status |
|---|---|
| Core gameplay (move/fire/**homing missiles**/formations) | ✅ |
| 12-missie campagne + endless mode + **stage select** (klikbaar) | ✅ |
| Economie, bouwen, voertuigen (instappen) | ✅ |
| **Grotere tanks** (render 66px, collision 42) + jeeps mee opgeschaald | ✅ nieuw |
| Fog of war, minimap, persistent gore/decals | ✅ |
| **Volledig klikbare UI** (menu, stage rows, shop, S/E/missile/pause, muziek-knoop) | ✅ |
| **Per-missie biomes** (green/meadow/woodland/autumn/snow), grass-dominant | ✅ |
| **Ground-decals** (kraters, scorch, bloemvelden) tussen terrein en units | ✅ nieuw |
| Boot Hill: marmeren stijlen, family-pictogrammen, namen+leeftijd onder de steen | ✅ |
| AI art: sheet.png, sheet2.png, tiles.png + **Gemini war-factory & civilians** | ✅ |
| Echte bomen/struiken (CC-BY 3.0) + bos = dekking | ✅ |
| Depth/occlusie: units lopen achter gebouwen, props & boomstam, onder kruin | ✅ |
| Environment props: vaten, kratten, zandzakken, struiken, **rotsen, boomstammen** | ✅ |
| **Sprite-slicing via connected-components** (geen half-afgesneden tanks/gebouwen meer) | ✅ |
| Boomstam-collisie (loop om de stam, onder de bladeren door) | ✅ |
| A* pathfinding + cohesieve squad-follow (routet ook om props/stammen) | ✅ |
| Per-level muziek (mp3) + titel-mp3 (default UIT) | ✅ |
| Gunfire + gevarieerde hit-grunts | ✅ |
| GitHub remote + push | ✅ staat erop |
| GitHub Pages Actions-workflow | ⚠️ `deploy.yml` aanwezig (build slaagt); deploy faalt tot Pages-source op "GitHub Actions" staat (user-actie) |
| Netlify deploy-config | ✅ `netlify.toml` aanwezig (aanbevolen route — zie Deploy) |

---

## Besturing

| Input | Actie |
|---|---|
| **LMB** | Beweeg peloton / klik op jeep om in te stappen |
| **Double-LMB** | **Double-time!** Squad sprint (1.85×) naar de plek; looptijd ∝ rank (PVT 1.4s → CPT 3.2s), daarna 4.5s cooldown per soldaat. Stof-trail + "DOUBLE TIME!"-cue |
| **RMB (hold)** | Vuren op crosshair |
| **G** | Seeking missile (leader vuurt, homing + boom, detoneert op min-safe-distance) |
| **S** | Formatie wisselen (column ↔ spread) |
| **E** | Shop (towers/barracks/factory/recruits/vehicles) |

> **Alles is óók muis-klikbaar:** menu-items, stage-rijen op de stage-select, alle action-bar-knoppen (COLUMN/SPREAD, SHOP, MISSILE, PAUSE) en de muziek-noot (doorgestreept = uit). Geregeld via het generieke `clickZones`-systeem in `game.ts` (render registreert rects, update consumeert kliks).
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
│   ├── projectile.ts    Bullet + Missile (homing + boom)
│   ├── civilian.ts      Paniek, follow, rescue
│   ├── animal.ts        Ambient dog/pig: wander + flee gunfire; geen combat-interactie
│   ├── pickup.ts        Cash / medkit / grenades
│   └── prop.ts          ★ Battlefield props: barrel (explosief), crate (loot), sandbag (cover), bush (tree-art), rock (procedural massieve cover), log (procedural destructible cover)
└── game/
    ├── game.ts          ★ Orkestratie (~1400 regels): update, collision, win/lose, fog, depth-sort render, muziek-transities
    ├── squad.ts         ★ Leider-A* + breadcrumb-follow + separatie
    ├── ai.ts            Enemy patrol → attack; respecteert dekking (concealment)
    ├── missions.ts      12 missies + endless config
    ├── roster.ts        Namen, Boot Hill graves (soldier/enemy/civilian), ages, localStorage
    ├── hud.ts           Top bar, squad panel, minimap, build menu
    └── screens.ts       Title, briefing (Boot Hill-backdrop), debrief, gameover, Boot Hill cemetery
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

### Boot Hill & titel (`game/screens.ts`, `game/roster.ts`, `game/game.ts`)
- **Tagline (titel):** *"EITHER WAR IS OBSOLETE OR MEN ARE."* (`screens.ts`, getekend onder de MEAT GRINDER-titel met bounce).
- **Namen + leeftijd onder de steen:** `nameplate()` tekent een plaatje ONDER elke grafsteen (rank+naam+leeftijd+kills voor soldaten; ENEMY/CIVILIAN+leeftijd anders). Family-pictogrammen vergroot daaronder.
- **Briefing-backdrop:** `bootHillBackdrop()` tekent `boothill.png` met 50% zwarte overlay achter missietitel + briefingtekst.
- **Alle doden op de heuvel:** elke missie verzamelt `fallen[]` — eigen KIA's **én** gedode vijanden **én** gedode civilians. Bij win/lose → `addGraves(fallen)` naar `localStorage` `chaosfodder.boothill` (cap 400; bij overflow worden oudste enemy/civilian-graven eerst verwijderd zodat soldaten blijven).
- **Grave-record (`roster.ts`):** `{ type: 'soldier'|'enemy'|'civilian', name?, age, kills, rank, mission, style (0–7), seed }`. Oudere saves zonder velden worden bij load genormaliseerd.
- **Leeftijden:** soldaten 17–42 (hogere rank → ouder); vijanden 18–46; civilians 5–95.
- **8 marmeren stijlen** (soldiers): rounded arch, gothic, flat slab, obelisk, latin cross, celtic ring cross, broken column, double-shoulder. Bijna-wit marmer (`#e9e9e0`).
- **Vijand/civilian-markers:** houten kruisen, houten palen, ruwe veldstenen (donkerder hout voor vijand).
- **Tekst op stenen:** soldaten = rank + **naam** + leeftijd + kills; vijand/civilian = alleen leeftijd (geen naam). **`carveFit()`** krimpt lange namen automatisch en truncate met `…` zodat ze binnen de steen passen.
- **Family-pictogrammen (inspiratie `art/picto.png`):** elke steen krijgt 1–6 stick-figure silhouetten (man, vrouw, jongen, meisje, hond, kat) in een hand-in-hand rij onder de marker — wie ze achterlaten. Deterministisch uit `grave.seed`. Geen knielende huilfiguren meer.
- **Scrollende rijen:** 4 diepte-rijen op de heuvel; passen ze niet op scherm → even rijen scrollen langzaam links, oneven rijen rechts (wobble op oneven). Weinig graven → gecentreerd stilstaand raster.
- **Header:** telt soldaten / vijanden / civilians apart ("X rest here — Y of ours, Z enemy, W caught between").

### Biomes & tiles (`core/art.ts` → `parseTiles`/`setBiome`, `game.ts` → `loadMission`)
- Tile-atlas (9×6) wordt in **per-biome paletten** gesneden: `green`, `meadow`, `woodland`, `autumn`, `snow`. Allemaal grass-dominant — geen cobble/asfalt-wegen meer (user vond die "kut"). Alleen water blokkeert; grond-tiles zijn decoratie.
- `loadMission` kiest een biome uit een vaste `BIOMES`-lijst op missie-index en roept `art.setBiome(...)` **vóór** `new Terrain(...)` zodat de terrein-generator het juiste palet leest. Endless = `green`.

### Sprite-slicing (`core/art.ts` → `detectSpriteRows`, `keyOutFlatGrey`, `parseGemini`)
- **`detectSpriteRows()`** doet connected-component-detectie (flood-fill → rijen) i.p.v. een vast 4×4-grid. Loste de half-afgesneden tanks/gebouwen op (brede voertuigen straddelden de cel-randen).
- **`keyOutFlatGrey()`** keyt de neutraal-grijze (~120/180) checkerboard-achtergrond van de Gemini-image naar transparant (`keyOutBackground` keyde alleen near-white).
- **`parseMoew3()`** override civilians + hond uit `moew3.png` (links): upright human-rijen → 16 front-facing civilians (even index per rij, per-box gevalideerd), dieren-rij → eerste warm-bruine **hond** (avg-blauw <52); **varkens worden bewust overgeslagen** en `animals.pig` = null. Loopt ná `parseNewAss` (overschrijft diens civilians/dog; factory blijft newass). Verifieerd: 16 civ ~38–53×78–88, dog 49×54, pig null.
- **`parseMore()`** snijdt `public/art/more.png` (wit checkerboard → `keyOutBackground`) in alle connected-components (minArea 400), gesorteerd in leesvolgorde → `art.scatter` (122 sprites). Game schaalt + plaatst ze; collision uit footprint. Verifieerd: 122 slices, schoon uitgesneden.
- **`parseNewAss()`** haalt uit `public/art/newass.png` (wit/lichtgrijs checkerboard → `keyOutBackground`) de **war-factory** (grootste blob), **dog + pig** (onderste rij, front = linker van elk paar), en **10 civilians** (front-facing = elke even blob per rij L→R). Barracks blijft bewust de oude sheet2-sprite. Verifieerd: factory 661×465, dog 105×137, pig 111×131, 10 civ-crops. (`parseGemini`/`gemini.png` zijn vervangen.)

### Depth & occlusie (`game/game.ts` → `renderWorld`, `world/terrain.ts`, `entities/prop.ts`)
- **Depth-sorted actor-pass:** gebouwen, props, voertuigen, civilians én soldaten gaan in één lijst, gesorteerd op voet-Y (`sortY`), en worden back-to-front getekend. Gevolg: een unit **noordelijk** van een gebouw/krat/struik valt er correct **achter** weg en stapt **ervoor** zodra hij naar beneden loopt. Pickups eronder, boom-kruinen erboven.
- **Boomstam:** elke boom heeft naast de cover-radius (`r`) een kleine solide **trunk-radius** (`tr`, ≤8px) in `terrain.trunkBlocked()`. Die zit in `blockTest` → units (en de A*-pathfinder) lopen **om de stam** terwijl de kruin (`renderCanopies`) er nog steeds overheen tekent: je loopt *achter de stam langs, onder de bladeren door*.

### Environment props & decals (`entities/prop.ts`, `game.ts` → `placeProps`/`placeDecals`/`renderDecals`)
- Zes prop-soorten, per missie geschaald (`placeProps`, density ∝ missie-index):
  - **`barrel`** — explosief (olijf-metalen drum). Kapotschieten → `explode()` die **buur-vaten kettingt** (Postal-chaos). Geverifieerd in browser: trio detoneert in één klap, geen recursion-crash.
  - **`crate`** — destructible loot-cover (houten munitie-kist); sloop dropt cash/medkit/grenades (70%).
  - **`sandbag`** — taaie cover (zandzak-muur, hp 200); houdt vuur tegen tot een blast/zware beschieting hem sloopt.
  - **`bush`** — **echte top-down tree-art** (foliage-pack), solide thicket, onverwoestbaar natuurlijk dekking.
  - **`scatter`** — echte sprites uit `more.png` (122 stuks: wrakken, ruïnes, schuren, barrels, hekken, gates, speeltuig, barrières, verkeersborden, dode bomen/dennen, rotsen, boomstammen, puin). Eén random sprite per plaatsing, geschaald op eigen footprint (`sp.w*0.42`, clamp 18–150), base-anchored (hoge iso-art met voet op (x,y)). Onverwoestbare massieve cover; kogels stoppen erop. **Vervangt de oude procedurele `rock`/`log`** ("geen lelijke SVG meer").

#### Coherente stage-opbouw (`placeProps`, sessie 9)
Props worden **niet meer willekeurig gestrooid** maar in zones rond terrein-features geplaatst zodat elke map als een *plek* leest. Scatter wordt geclassificeerd op sprite-vorm: **vehicles** (w>70 & w≥h·1.2 = brede wrakken), **ruins** (w&h>88 = grote blokken), **junk** (de rest). Zones:
  - **Geruïneerde gehuchten** (`this.settlements`, 1–3 ∝ idx, langs de weg via `terrain.roadAt`): 3–5 ruins in een ring + fences/junk + kratten/vaten (loot). **Civilians en honden clusteren hier** (in `startCampaign` al rond de settlement-anchors gespawned).
  - **Roadway**: wrakken (`vehicles`) + puin om de ~220–340px langs de `terrain.roadAt`-lijn — een colonne die op de weg sneuvelde.
  - **Verdedigingslinie**: boog van zandzakken + vaten vóór de vijand-HQ (alleen missies met `base≠'none'`), span ∝ idx.
  - **Treeline**: bushes + wat junk rond de bos-clusters (`terrain.trees`).
  - **Open veld**: alleen lichte, schaarse junk + een paar vatenclusters zodat het veld blijft ademen.
- **Ground-decals** (`placeDecals`/`renderDecals`) — **geen collision**, getekend tussen terrein en actors via de `Decal`-interface (`game.ts`): granaat-**kraters**, **scorch**-marks en **bloemvelden**. Puur decoratief; geeft elk veld een uitgevochten, doorleefde look. Density ∝ missie-index, deterministisch uit de RNG-seed.
- **Collisie:** alle props zitten in `blockTest` (radius-cirkel) → tegelijk movement-blokkade én pad-obstakel én cover (kogels stoppen erop via `collideBullet`). Vaten/kratten/zandzakken ook in `explode()` zodat blasts ze meenemen.
- **Echte sprites:** barrel/crate/sandbag worden uit een militaire top-down asset-pack (`art/asses.png`) gesneden. `scripts/extract-props.cjs` (pure-JS `pngjs`, dev-dep) cropt de sprites, keyt de licht-grijze achtergrond naar transparant en trimt ze; output staat in `public/art/props/{barrel,crate,sandbag}.png` en wordt door `art.ts` (`art.props`) geladen. Bushes blijven echte foliage-PNG's. Procedurele fallback in `prop.ts` blijft bestaan voor als een sprite ontbreekt. Bronsheets (`art/asses.png`, `art/barrel.png`) staan in de gitignored `art/`-map; alleen de kleine uitgesneden props worden gecommit.

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
| `public/art/boothill.png` | Boot Hill banner + briefing-backdrop |
| `public/art/newass.png` | Spritesheet (1537×1023, wit checkerboard) → war-factory + 10 civilians + dog + pig (`parseNewAss`) |
| `public/art/more.png` | Prop-pack (1535×1024, wit checkerboard) → 122 scatter-sprites: wrakken/ruïnes/junk/hekken/speeltuig/natuur (`parseMore` → `art.scatter`) |
| `public/art/moew3.png` | Betere civilians + honden (links) + prop-pack (rechts); `parseMoew3` neemt 16 civilians + 1 hond (varkens overgeslagen). Factory blijft uit newass |
| `public/art/props/` | Uitgesneden barrel/crate/sandbag sprites (`scripts/extract-props.cjs`); rock/log zijn procedureel |
| `public/audio/title.mp3` | Titelmuziek (Stoppadawar) |
| `public/audio/level{1,2,3}.mp3` | Level-muziek (RAWONON / SWOEWM / RuimteNietBeschikbaar) |
| `art/` (root) | Bron-images — **niet geladen door Vite**, `/art/` is gegitignored. Bevat o.a. `asses.png`, `barrel.png`, `people.png`, `picto.png` (referentie voor family-pictogrammen) |

Vite serveert `public/` statisch op `/art/...` en `/audio/...` (absolute paden — zie Deploy).

---

## Gameplay-regels

- **Friendly fire:** kogels raken vijand + civilians; **explosies raken iedereen** (ook eigen squad).
- **Civilians:** loop erheen → volgen. Evac = +$400. Dood = -$200 + quip.
- **Wildlife (`entities/animal.ts`):** 4–7 **honden** per missie zwerven rond (varkens bestaan in de sheet maar worden **niet** gebruikt). Ze **interacteren niet** met soldaten (geen collision, niet door kogels te raken) — ze vluchten alleen weg van gunfire/explosies (`scareAnimals`, radius 260 geweer / 320 voertuig / r×5 explosie), daarna lui wanderen. Puur sfeer.
- **Doden:** blood/gibs/corpses worden in de terrein-decal-canvas gestampt (blijven liggen).
- **Promoties:** kills → rank (PVT/CPL/SGT/CPT) → sneller vuren; veteranen gaan mee.
- **Boot Hill:** elke dood → grave in `localStorage` `chaosfodder.boothill`; progress in `chaosfodder.progress`. Soldaten krijgen naam+rank+leeftijd; vijand/civilian alleen leeftijd + family-picto's.

## Campagne

12 stages (zie `missions.ts` voor exacte cijfers per stage): FIRST BLOOD · GOOD SAMARITAN · URBAN RENEWAL · HOLD THE LINE · TOTAL CHAOS · SCORCHED EARTH · BODY COUNT · MEAT GRINDER · DECAPITATION · SHOCK & AWE · LAST STAND · ARMAGEDDON. Doelen variëren (eliminate / rescue / destroyhq / survive / chaos); bouwen + voertuigen unlocken gaandeweg.

Endless: `[E]` op titel. High score in progress.

---

## Deploy

Statische Vite-build (`npm run build` → `dist/`, ~86KB JS gzip 28KB; `dist/` is gegitignored). **Belangrijk:** assets worden geladen met **absolute paden** (`/art/...`, `/audio/...`).

- **Netlify (aanbevolen, nul aanpassingen):** root-domein, dus absolute paden kloppen. `netlify.toml` staat klaar (build=`npm run build`, publish=`dist`, Node 20).
  - A) app.netlify.com → Import → GitHub → `KAasman66/huhhuhgame` → Deploy (auto-deploy per push).
  - B) app.netlify.com/drop → sleep `dist/` erin (handmatig, geen Git).
  - *Account-acties (inloggen/Deploy klikken) doet de user zelf.*
- **GitHub Pages:** `.github/workflows/deploy.yml` staat klaar (build via `npm install` — niet `npm ci`, want de lockfile is op Windows gemaakt en Vite's rolldown pulls platform-specifieke native deps). De **build-job slaagt**, maar de **deploy-job faalt** zolang de Pages-source niet op "GitHub Actions" staat (Pages API 404). Dat is een **user-actie** in de repo-settings; daarna deployt elke push automatisch. Asset-paden gebruiken absolute `/art`+`/audio` — werkt op Pages alleen als de site op het root-domein staat (user-Pages of custom domain), niet onder `/huhhuhgame/`. User koos voorlopig Netlify Drop.

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

*Bijgewerkt: 17 jun 2026 (sessie 9) — Coherente stage-opbouw: props in zones (geruïneerde gehuchten langs de weg met civilians/honden, roadside-wrakken, verdedigingslinie bij de HQ, treeline-dekking) i.p.v. willekeurig strooien; scatter geclassificeerd op vorm (vehicle/ruin/junk). Eerder: Grotere WAR FACTORY (size 54→62, sprite-schaal 2.0× i.p.v. 1.45×). Betere civilians + honden uit `moew3.png` (`parseMoew3`); varkens verwijderd uit het spel. Eerder: `more.png` prop-pack: 122 scatter-sprites (wrakken, ruïnes, junk, hekken, speeltuig, natuur) sprinkelen over de stages als echte solide cover; vervangt de procedurele rock/log ("geen lelijke SVG meer"). Eerder: Nieuwe `newass.png`-assets: war-factory + 10 front-facing civilians + dog/pig (via `parseNewAss`, vervangt gemini). Ambient wildlife (`animal.ts`): honden & varkens die alleen van gunfire wegvluchten, geen combat-interactie. Double-click = double-time sprint (looptijd ∝ rank, cooldown). Grotere tanks (render 66px / collision 42, jeeps mee opgeschaald) en rijkere battlefields: nieuwe props `rock` (massieve cover) + `log` (destructible cover) plus niet-collidende ground-decals (kraters, scorch, bloemvelden) tussen terrein en units. Eerder deze sessie-reeks: nieuwe tagline "Either war is obsolete or men are.", per-missie biomes (grass-dominant, geen wegen), volledig klikbare UI + stage select, homing missiles i.p.v. grenades, connected-component sprite-slicing (geen half-afgesneden tanks/gebouwen), Gemini war-factory + civilians, muziek default uit, MEAT GRINDER rename, Boot Hill met namen+leeftijd onder de stenen.*
