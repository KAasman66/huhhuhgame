# Handdown — CHAOS FODDER (v2, volledige reboot)

> Het oude "TACTICAL CHAOS" (vanilla JS) is volledig vervangen door een nieuwe game:
> **CHAOS FODDER** — TypeScript + Vite + Canvas 2D + WebAudio, nul dependencies, alles procedureel.
> Concept: Cannon Fodder (squad + namen + Boot Hill) × Red Alert (economie/bouwen/fog) × Postal (gore, civilians, zwarte humor).

## Snel starten
```bash
cd D:\PROJECTS2025\screener-game
npm run dev          # meestal http://localhost:5173 (5174 als 5173 bezet is)
npm run typecheck    # tsc --noEmit, hoort schoon te zijn
```

## Status: SPEELBAAR & GETEST
End-to-end in de browser geverifieerd (via CDP-automatisering):
titel → briefing → gameplay, bewegen/vuren/granaten, kills+geld+loot+promoties,
bouwen (tower/barracks/factory), HQ-destructie → win → debrief → volgende missie,
voertuigen (kopen/instappen/rijden/uitstappen), waves, rescue-missie (civ volgt → evac +$400),
squad wipe → gameover → graven in localStorage → Boot Hill scherm. Geen console errors.

## Architectuur (`src/`)
| Map | Inhoud |
|---|---|
| `core/` | `math.ts` (seeded RNG), `input.ts` (clicks-queue + pressed-per-frame), `camera.ts` (follow+shake), `audio.ts` (synth SFX + muziekloop), `fx.ts` (particles, floating text, stampt decals) |
| `world/` | `terrain.ts` (procedureel, offscreen base + **permanente decal-canvas**: bloed/kraters/lijken), `fog.ts` (grid 40px, geschaald met smoothing) |
| `entities/` | `soldier.ts` (namen/rangen), `vehicle.ts` (jeep/tank, instapbaar), `building.ts`, `projectile.ts` (Bullet+Grenade), `civilian.ts`, `pickup.ts` |
| `game/` | `game.ts` (**orkestratie, grootste file**), `squad.ts` (formaties, mount), `ai.ts` (patrol/attack squads), `missions.ts` (5 missies + endless), `roster.ts` (namen, Boot Hill + progress in localStorage), `hud.ts`, `screens.ts` |

Patronen: entities zijn domme classes; `game.ts` doet alle interactie (collision = brute-force circkels).
Debug-handle: `window.game` (gezet in `main.ts`) — handig voor console-testen.
Window-coördinaten: canvas 1280×720 intern, CSS schaalt; `input.ts` compenseert. Wereld 2400×1500.

## Controls
LMB move/board · RMB(hold) fire · G grenade · S formatie · E shop · SPACE dismount · M muziek · ESC cancel

## Belangrijke ontwerpkeuzes
- Kogels raken alleen de tegenpartij + civilians; **explosies raken iedereen** (friendly fire by design).
- Civilian dood = -$200 + "YOU MONSTER". Rescue = +$400 via evac-zone.
- Doden worden **in de decal-canvas gestampt** (gratis persistentie, geen entity-overhead).
- Vijandelijke bullets/AI negeren fog (alleen rendering/minimap filtert op zichtbaarheid).
- `seed` per missie ⇒ zelfde map bij retry; endless krijgt random seed.

## Open punten / ideeën voor een volgende sessie
1. **AI-art integratie**: user genereert mogelijk 2-3 images via ChatGPT (title key art, sprite sheet, terrain tiles). Prompts zijn al aan user gegeven. Plan: in `public/art/`, laden met fallback naar procedurele draws.
2. Browser `browser_press_key` MCP-tool bereikt window-keylisteners niet; gebruik CDP `Runtime.evaluate` met `KeyboardEvent` dispatch (helpers: `window.tt` in test-sessie).
3. Mogelijk: pathfinding rond meren (nu simpel x/y-slide), gamepad, meer missietypes, screen-flash bij eigen schade.
4. Git: `node_modules` zat per ongeluk in de eerste commits; bij v2-commit uit de index gehaald (`git rm -r --cached`).
5. Push naar GitHub: **wachtwoord-auth werkt niet meer bij GitHub**; user moet PAT maken of `gh auth login` doen. User is geadviseerd het in chat gedeelde wachtwoord te roteren.
