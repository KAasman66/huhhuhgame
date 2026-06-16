import type { Game } from './game'
import { VIEW_W, VIEW_H } from './game'
import { MISSIONS, STAGE_KEYS } from './missions'
import { loadGraves, rankName, type Grave } from './roster'
import { art } from '../core/art'

const FONT = "'Courier New', monospace"

export function drawScreens(g: Game, ctx: CanvasRenderingContext2D) {
  switch (g.screen) {
    case 'title':
      drawTitle(g, ctx)
      break
    case 'briefing':
      drawBriefing(g, ctx)
      break
    case 'debrief':
      drawDebrief(g, ctx)
      break
    case 'gameover':
      drawGameOver(g, ctx)
      break
    case 'boothill':
      drawBootHill(g, ctx)
      break
  }
}

function scanlines(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  const off = (t * 14) % 4
  for (let y = -4 + off; y < VIEW_H; y += 4) ctx.fillRect(0, y, VIEW_W, 1.5)
}

function drawTitle(g: Game, ctx: CanvasRenderingContext2D) {
  const t = g.time

  if (art.title) {
    // AI key art: cover-fit the panorama, centered
    const scale = Math.max(VIEW_W / art.title.w, VIEW_H / art.title.h)
    const dw = art.title.w * scale
    const dh = art.title.h * scale
    ctx.drawImage(art.title.c, (VIEW_W - dw) / 2, (VIEW_H - dh) / 2, dw, dh)
    // Darken top and bottom so text stays readable
    const g1 = ctx.createLinearGradient(0, 0, 0, VIEW_H)
    g1.addColorStop(0, 'rgba(0,0,0,0.55)')
    g1.addColorStop(0.32, 'rgba(0,0,0,0.1)')
    g1.addColorStop(0.55, 'rgba(0,0,0,0.25)')
    g1.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  } else {
    // Procedural fallback background
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H)
    grad.addColorStop(0, '#0a0f08')
    grad.addColorStop(0.7, '#15200f')
    grad.addColorStop(1, '#070a05')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)

    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.5 + i * 1.7) % 5
      if (phase < 0.3) {
        const x = ((i * 467 + Math.floor(t / 5) * 131) % VIEW_W)
        const y = VIEW_H * 0.62
        ctx.fillStyle = `rgba(255,150,50,${(0.3 - phase) * 1.6})`
        ctx.beginPath()
        ctx.arc(x, y, 30 + phase * 120, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.fillStyle = '#050804'
    ctx.fillRect(0, VIEW_H * 0.65, VIEW_W, VIEW_H * 0.35)
    ctx.fillStyle = '#020302'
    for (let i = 0; i < 9; i++) {
      const x = ((i * 170 + t * 26) % (VIEW_W + 120)) - 60
      const y = VIEW_H * 0.65
      const step = Math.sin(t * 7 + i) * 3
      ctx.fillRect(x - 4, y - 22, 8, 16)
      ctx.beginPath()
      ctx.arc(x, y - 26, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(x - 5, y - 8, 3, 8 + step)
      ctx.fillRect(x + 2, y - 8, 3, 8 - step)
      ctx.fillRect(x + 2, y - 20, 12, 2.5) // rifle
    }
  }

  // Title
  ctx.textAlign = 'center'
  const bounce = Math.sin(t * 2) * 4
  ctx.font = `bold 92px ${FONT}`
  ctx.fillStyle = '#000'
  ctx.fillText('MEAT GRINDER', VIEW_W / 2 + 5, 195 + bounce + 5)
  ctx.fillStyle = '#c8d96a'
  ctx.fillText('MEAT GRINDER', VIEW_W / 2, 195 + bounce)
  ctx.fillStyle = '#7a4040'
  ctx.font = `bold 16px ${FONT}`
  ctx.fillText('“EITHER WAR IS OBSOLETE OR MEN ARE.”', VIEW_W / 2, 236 + bounce)

  // Menu
  const blink = Math.floor(t * 2) % 2 === 0
  ctx.font = `bold 22px ${FONT}`
  ctx.fillStyle = blink ? '#ffe14a' : '#bba23a'
  const menuZone = (yy: number, act: () => void) => g.addZone(VIEW_W / 2 - 220, yy - 22, 440, 30, act)
  ctx.fillText('[ENTER]  NEW CAMPAIGN', VIEW_W / 2, 380)
  menuZone(380, () => g.selectStage(0))
  ctx.font = `17px ${FONT}`
  ctx.fillStyle = '#9fb886'
  let y = 420
  if (g.progress.unlocked > 0 && g.progress.unlocked < MISSIONS.length) {
    ctx.fillText(`[C]  CONTINUE \u2014 MISSION ${g.progress.unlocked + 1}: ${MISSIONS[g.progress.unlocked].name}`, VIEW_W / 2, y)
    menuZone(y, () => g.selectStage(Math.min(g.progress.unlocked, MISSIONS.length - 1)))
    y += 32
  }
  ctx.fillText('[E]  ENDLESS CHAOS', VIEW_W / 2, y)
  menuZone(y, () => g.startEndless())
  y += 32
  ctx.fillText('[B]  BOOT HILL \u2014 honour the dead', VIEW_W / 2, y)
  menuZone(y, () => (g.screen = 'boothill'))
  y += 32
  ctx.fillText(`[M]  MUSIC: ${g.musicEnabled ? 'ON' : 'OFF'}`, VIEW_W / 2, y)

  // Stage select: jump straight to any mission with a fresh squad.
  // Rendered in two columns; each row labelled with its select key.
  y += 36
  ctx.fillStyle = '#ffe14a'
  ctx.font = `bold 14px ${FONT}`
  ctx.fillText('SELECT STAGE \u2014 press the key', VIEW_W / 2, y)
  y += 22
  ctx.font = `12px ${FONT}`
  ctx.fillStyle = '#9fb886'
  const rows = Math.ceil(MISSIONS.length / 2)
  const colX = [VIEW_W / 2 - 200, VIEW_W / 2 + 8]
  ctx.textAlign = 'left'
  for (let i = 0; i < MISSIONS.length; i++) {
    const col = Math.floor(i / rows)
    const row = i % rows
    const key = STAGE_KEYS[i] ?? '?'
    const ry = y + row * 20
    ctx.fillText(`[${key}] ${i + 1}. ${MISSIONS[i].name}`, colX[col], ry)
    g.addZone(colX[col] - 4, ry - 14, 200, 19, () => g.selectStage(i))
  }
  ctx.textAlign = 'center'
  y += rows * 20

  if (g.progress.highScore > 0) {
    ctx.fillStyle = '#ff9966'
    ctx.font = `14px ${FONT}`
    ctx.fillText(`ENDLESS RECORD: ${g.progress.highScore} KILLS`, VIEW_W / 2, y + 12)
  }

  ctx.font = `11px ${FONT}`
  ctx.fillStyle = 'rgba(160,180,140,0.5)'
  ctx.fillText('LMB move \u00B7 RMB shoot \u00B7 G seeking missile \u00B7 S formation \u00B7 E shop \u00B7 squad follows the leader', VIEW_W / 2, VIEW_H - 28)
  ctx.textAlign = 'left'

  scanlines(ctx, t)
}

/** Boot Hill gravestone banner as a dimmed backdrop for the mission screens. */
function bootHillBackdrop(ctx: CanvasRenderingContext2D, darken: number) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  if (art.bootHill) {
    const sp = art.bootHill
    const scale = Math.max(VIEW_W / sp.w, VIEW_H / sp.h)
    const dw = sp.w * scale
    const dh = sp.h * scale
    ctx.drawImage(sp.c, (VIEW_W - dw) / 2, (VIEW_H - dh) / 2, dw, dh)
  }
  ctx.fillStyle = `rgba(0,0,0,${darken})`
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
}

function drawBriefing(g: Game, ctx: CanvasRenderingContext2D) {
  bootHillBackdrop(ctx, 0.5)

  ctx.textAlign = 'center'
  ctx.font = `bold 15px ${FONT}`
  ctx.fillStyle = '#7d8f6d'
  const header = g.endlessMode ? 'SPECIAL ASSIGNMENT' : `MISSION ${g.missionIdx + 1} OF ${MISSIONS.length}`
  ctx.fillText(header, VIEW_W / 2, 130)

  ctx.font = `bold 52px ${FONT}`
  ctx.fillStyle = '#c8d96a'
  ctx.fillText(g.mission.name, VIEW_W / 2, 190)
  ctx.font = `italic 16px ${FONT}`
  ctx.fillStyle = '#9b6a4a'
  ctx.fillText(`\u201C${g.mission.tagline}\u201D`, VIEW_W / 2, 222)

  // Typewriter briefing
  ctx.font = `17px ${FONT}`
  ctx.fillStyle = '#aabf93'
  let remaining = Math.floor(g.briefingChars)
  let y = 300
  for (const line of g.mission.brief) {
    if (remaining <= 0) break
    const shown = line.slice(0, remaining)
    ctx.fillText(shown + (remaining < line.length && Math.floor(g.time * 8) % 2 === 0 ? '_' : ''), VIEW_W / 2, y)
    remaining -= line.length
    y += 30
  }

  ctx.font = `bold 14px ${FONT}`
  ctx.fillStyle = '#ffe14a'
  ctx.fillText(`OBJECTIVE: ${g.mission.objectiveText}`, VIEW_W / 2, 490)
  ctx.fillStyle = '#9fb886'
  ctx.font = `13px ${FONT}`
  ctx.fillText(`SQUAD: ${g.squad.soldiers.length} soldiers \u00B7 BUDGET: $${g.mission.cash}`, VIEW_W / 2, 518)

  if (Math.floor(g.time * 2) % 2 === 0) {
    ctx.font = `bold 17px ${FONT}`
    ctx.fillStyle = '#d9e8c9'
    ctx.fillText('PRESS [SPACE] TO DEPLOY', VIEW_W / 2, 600)
  }
  ctx.textAlign = 'left'
  scanlines(ctx, g.time)
}

function statRow(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, value: string, color = '#d9e8c9') {
  ctx.font = `14px ${FONT}`
  ctx.fillStyle = '#7d8f6d'
  ctx.fillText(label, x, y)
  ctx.fillStyle = color
  ctx.textAlign = 'right'
  ctx.fillText(value, x + 360, y)
  ctx.textAlign = 'left'
}

function fmtTime(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function drawDebrief(g: Game, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  const x0 = VIEW_W / 2 - 220
  ctx.textAlign = 'center'
  ctx.font = `bold 46px ${FONT}`
  ctx.fillStyle = '#7dff7d'
  ctx.fillText(g.campaignWon ? 'CAMPAIGN COMPLETE!' : 'MISSION ACCOMPLISHED', VIEW_W / 2, 140)
  if (g.campaignWon) {
    ctx.font = `16px ${FONT}`
    ctx.fillStyle = '#ffe14a'
    ctx.fillText('The war is over. The invoices are eternal.', VIEW_W / 2, 178)
  }
  ctx.textAlign = 'left'

  let y = 240
  statRow(ctx, x0, y, 'TIME', fmtTime(g.missionTime)); y += 28
  statRow(ctx, x0, y, 'KILLS', String(g.killCount)); y += 28
  statRow(ctx, x0, y, 'CASH SECURED', `$${g.money}`, '#ffe14a'); y += 28
  if (g.mission.kind === 'rescue' || g.rescuedCount > 0) {
    statRow(ctx, x0, y, 'CIVILIANS RESCUED', String(g.rescuedCount), '#6fe3ff')
    y += 28
  }
  if (g.civKills > 0) {
    statRow(ctx, x0, y, 'CIVILIAN "ACCIDENTS"', String(g.civKills), '#ff5050')
    y += 28
  }
  statRow(ctx, x0, y, 'CASUALTIES', String(g.casualties.length), g.casualties.length > 0 ? '#ff6666' : '#7dff7d')
  y += 28

  if (g.casualties.length > 0) {
    ctx.font = `12px ${FONT}`
    ctx.fillStyle = '#9c7070'
    ctx.fillText('KIA: ' + g.casualties.map((c) => `${rankName(c.rank)} ${c.name}`).join(', '), x0, y + 8)
    y += 30
  }

  // Veterans
  const vets = g.squad.alive().filter((s) => s.kills > 0)
  if (vets.length > 0) {
    ctx.font = `12px ${FONT}`
    ctx.fillStyle = '#9fb886'
    ctx.fillText('SURVIVORS: ' + vets.map((s) => `${rankName(s.rank())} ${s.name} (${s.kills})`).join(', '), x0, y + 8)
  }

  ctx.textAlign = 'center'
  ctx.font = `bold 17px ${FONT}`
  if (Math.floor(g.time * 2) % 2 === 0) {
    ctx.fillStyle = '#d9e8c9'
    ctx.fillText(g.campaignWon || g.endlessMode ? 'CLICK / [SPACE] FOR TITLE' : 'CLICK / [SPACE] FOR NEXT MISSION', VIEW_W / 2, 620)
  }
  // Whole screen advances the debrief.
  g.addZone(0, 0, VIEW_W, VIEW_H, () => g.advanceDebrief())
  ctx.textAlign = 'left'
}

function drawGameOver(g: Game, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(40,0,0,0.7)'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  ctx.textAlign = 'center'
  ctx.font = `bold 64px ${FONT}`
  ctx.fillStyle = '#000'
  ctx.fillText('SQUAD WIPED OUT', VIEW_W / 2 + 4, 244)
  ctx.fillStyle = '#ff4040'
  ctx.fillText('SQUAD WIPED OUT', VIEW_W / 2, 240)

  ctx.font = `16px ${FONT}`
  ctx.fillStyle = '#d9a0a0'
  ctx.fillText('Their names go on the hill. The war goes on without them.', VIEW_W / 2, 290)

  ctx.font = `15px ${FONT}`
  ctx.fillStyle = '#d9e8c9'
  let y = 360
  ctx.fillText(`KILLS: ${g.killCount}    TIME: ${fmtTime(g.missionTime)}    WAVE: ${g.wave}`, VIEW_W / 2, y)
  if (g.endlessMode && g.killCount >= g.progress.highScore && g.killCount > 0) {
    y += 36
    ctx.fillStyle = '#ffe14a'
    ctx.fillText('NEW RECORD!', VIEW_W / 2, y)
  }

  // Clickable buttons (also [R]/[ESC]).
  const by = 552
  const drawBtn = (label: string, cx: number, act: () => void) => {
    const bw = 150
    const bh = 38
    const bx = cx - bw / 2
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(bx, by, bw, bh)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#d9e8c9'
    ctx.strokeRect(bx, by, bw, bh)
    ctx.fillStyle = '#eaffcf'
    ctx.font = `bold 16px ${FONT}`
    ctx.textAlign = 'center'
    ctx.fillText(label, cx, by + 25)
    g.addZone(bx, by, bw, bh, act)
  }
  if (g.endlessMode) {
    drawBtn('TITLE [R]', VIEW_W / 2, () => g.gameOverAction(true))
  } else {
    drawBtn('RETRY [R]', VIEW_W / 2 - 90, () => g.gameOverAction(false))
    drawBtn('TITLE [ESC]', VIEW_W / 2 + 90, () => g.gameOverAction(true))
  }
  ctx.textAlign = 'left'
}

// --- Boot Hill ------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mod = (n: number, m: number) => ((n % m) + m) % m

type PictoKind = 'man' | 'woman' | 'boy' | 'girl' | 'dog' | 'cat'

/** 1–6 family members left behind — spouse, kids, pets — seeded per grave. */
function familyForGrave(grave: Grave): PictoKind[] {
  const n = 1 + ((grave.seed >>> 4) % 6)
  const rand = mulberry32(grave.seed ^ 0xfa111005)
  const out: PictoKind[] = []

  // Start with adults when the family is bigger than one.
  if (n >= 2) {
    const spouse: PictoKind = rand() < 0.62 ? 'woman' : 'man'
    out.push(spouse)
    if (n >= 3) out.push(spouse === 'woman' ? (rand() < 0.55 ? 'man' : 'boy') : 'woman')
  } else {
    out.push(rand() < 0.45 ? 'woman' : rand() < 0.7 ? 'man' : 'boy')
  }

  const fill: PictoKind[] = ['boy', 'girl', 'girl', 'boy', 'dog', 'cat', 'boy', 'girl']
  let fi = (grave.seed >>> 8) % fill.length
  while (out.length < n) {
    out.push(fill[fi % fill.length])
    fi++
  }
  return out.slice(0, n)
}

/** Stick-figure family decal inspired by art/picto.png — who they left behind. */
function drawPicto(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  kind: PictoKind,
  sc: number,
  color: string,
  outline = '#2a2218',
) {
  const child = kind === 'boy' || kind === 'girl'
  const pet = kind === 'dog' || kind === 'cat'
  const scale = sc * (pet ? 0.88 : child ? 0.92 : 1)
  const px = (v: number) => Math.round(v)

  const head = (cy: number, r: number, fill: string, bump = 1) => {
    const s = scale * bump
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(px(cx), px(footY - cy * s), r * s, 0, Math.PI * 2)
    ctx.fill()
  }
  const box = (x: number, y: number, w: number, h: number, fill: string, bump = 1) => {
    const s = scale * bump
    ctx.fillStyle = fill
    ctx.fillRect(px(cx + x * s), px(footY - (y + h) * s), Math.max(2, Math.round(w * s)), Math.max(2, Math.round(h * s)))
  }
  const tri = (pts: [number, number][], fill: string, bump = 1) => {
    const s = scale * bump
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.moveTo(px(cx + pts[0][0] * s), px(footY - pts[0][1] * s))
    for (let i = 1; i < pts.length; i++) ctx.lineTo(px(cx + pts[i][0] * s), px(footY - pts[i][1] * s))
    ctx.closePath()
    ctx.fill()
  }

  const drawBody = (fill: string, bump = 1) => {
    switch (kind) {
      case 'man':
        head(12, 2.2, fill, bump)
        box(-2.6, 3.6, 5.2, 5.8, fill, bump)
        box(-2.4, 0, 2, 4.2, fill, bump)
        box(0.4, 0, 2, 4.2, fill, bump)
        break
      case 'woman':
        head(12.5, 2.1, fill, bump)
        tri(
          [
            [-2.4, 0.4],
            [2.4, 0.4],
            [3.8, 9.6],
            [-3.8, 9.6],
          ],
          fill,
          bump,
        )
        break
      case 'boy':
        head(10.5, 1.9, fill, bump)
        box(-2.2, 3.2, 4.4, 4.8, fill, bump)
        box(-2, 0, 1.7, 3.8, fill, bump)
        box(0.3, 0, 1.7, 3.8, fill, bump)
        break
      case 'girl':
        head(10.8, 1.8, fill, bump)
        box(-0.6, 11.6, 1.2, 0.65, fill, bump)
        box(-1.6, 11.3, 0.85, 0.55, fill, bump)
        box(0.75, 11.3, 0.85, 0.55, fill, bump)
        tri(
          [
            [-1.9, 0.4],
            [1.9, 0.4],
            [2.9, 8.2],
            [-2.9, 8.2],
          ],
          fill,
          bump,
        )
        break
      case 'dog': {
        const s = scale * bump
        ctx.fillStyle = fill
        ctx.beginPath()
        ctx.ellipse(px(cx), px(footY - 3.2 * s), 4.2 * s, 2.1 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px(cx + 3.2 * s), px(footY - 4.8 * s), 1.8 * s, 0, Math.PI * 2)
        ctx.fill()
        box(-4.4, 0.8, 1.4, 2.8, fill, bump)
        box(-5.4, 3.2, 1.1, 1.9, fill, bump)
        break
      }
      default: {
        const s = scale * bump
        ctx.fillStyle = fill
        ctx.beginPath()
        ctx.ellipse(px(cx), px(footY - 3.4 * s), 2.9 * s, 3.6 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(px(cx), px(footY - 7 * s), 1.8 * s, 0, Math.PI * 2)
        ctx.fill()
        tri(
          [
            [-1.4, 7.8],
            [-0.2, 6.4],
            [0.6, 8.2],
          ],
          fill,
          bump,
        )
        tri(
          [
            [1.4, 7.8],
            [0.2, 6.4],
            [-0.6, 8.2],
          ],
          fill,
          bump,
        )
        box(2.1, 2.4, 0.7, 3.2, fill, bump)
      }
    }
  }

  drawBody(outline, 1.14)
  drawBody(color, 1)
}

/** Horizontal family sticker under each marker — holding-hands chain like picto.png. */
function drawFamilyPictos(ctx: CanvasRenderingContext2D, cx: number, baseY: number, grave: Grave, scale: number) {
  const members = familyForGrave(grave)
  const pictoScale = scale * 1.55
  const iconW = 11.5 * scale
  const gap = 2 * scale
  const totalW = members.length * iconW + Math.max(0, members.length - 1) * gap
  let x = cx - totalW / 2 + iconW / 2
  const footY = baseY + (grave.type === 'soldier' ? 38 : 34) * scale
  const color =
    grave.type === 'soldier' ? '#f4f0e6' : grave.type === 'civilian' ? '#dcccb0' : '#c8b494'

  // Dark plate so silhouettes pop on the hill grass.
  ctx.fillStyle = 'rgba(8,10,6,0.55)'
  ctx.beginPath()
  ctx.roundRect(cx - totalW / 2 - 4 * scale, footY - 14 * pictoScale, totalW + 8 * scale, 14 * pictoScale + 3 * scale, 3 * scale)
  ctx.fill()

  members.forEach((kind, i) => {
    drawPicto(ctx, x, footY, kind, pictoScale, color)
    if (i < members.length - 1) {
      const nx = x + iconW / 2 + gap / 2
      const handY = footY - 7.5 * pictoScale
      ctx.fillStyle = color
      ctx.fillRect(
        Math.round(nx),
        Math.round(handY),
        Math.max(2, Math.round(gap + 2.5 * scale)),
        Math.max(2, Math.round(1.2 * scale)),
      )
    }
    x += iconW + gap
  })
}

/** Engrave centered text, shrinking or truncating so it fits the stone face. */
function carveFit(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  maxSize: number,
  minSize: number,
  face: string,
) {
  ctx.textAlign = 'center'
  let size = maxSize
  let label = text
  ctx.font = `bold ${size}px ${FONT}`
  while (size > minSize && ctx.measureText(label).width > maxW) {
    size -= 0.5
    ctx.font = `bold ${size}px ${FONT}`
  }
  if (ctx.measureText(label).width > maxW) {
    while (label.length > 2 && ctx.measureText(`${label}\u2026`).width > maxW) label = label.slice(0, -1)
    label += '\u2026'
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillText(label, x + 1, y + 1)
  ctx.fillStyle = face
  ctx.fillText(label, x, y)
}

function carve(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, face: string) {
  ctx.textAlign = 'center'
  ctx.font = `bold ${size}px ${FONT}`
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillText(text, x + 1, y + 1)
  ctx.fillStyle = face
  ctx.fillText(text, x, y)
}

/**
 * One headstone sitting on the ground at (x, baseY). Soldiers get pale marble
 * in eight styles (name, rank, age, kills); enemies and civilians get plain
 * wooden crosses / rough field stones with age only. Every marker shows the
 * family pictogram chain they left behind.
 */
function drawGravestone(ctx: CanvasRenderingContext2D, x: number, baseY: number, grave: Grave, scale: number, _t: number) {
  const soldier = grave.type === 'soldier'
  const faceW = 46 * scale

  // Ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.beginPath()
  ctx.ellipse(x, baseY + 2 * scale, 26 * scale, 7 * scale, 0, 0, Math.PI * 2)
  ctx.fill()

  if (soldier) {
    drawMarbleStone(ctx, x, baseY, grave.style, scale)
    const top = baseY - 66 * scale
    carve(ctx, `${rankName(grave.rank)}`, x, top + 18 * scale, 9 * scale, '#6b6b62')
    carveFit(ctx, `${grave.name ?? '???'}`, x, top + 31 * scale, faceW, 12 * scale, 7 * scale, '#3a3a34')
    carve(ctx, `AGE ${grave.age}`, x, top + 44 * scale, 8 * scale, '#6b6b62')
    if (grave.kills > 0) carve(ctx, `${grave.kills} kills`, x, baseY + 9 * scale, 8 * scale, '#9aa886')
  } else {
    drawSimpleMarker(ctx, x, baseY, grave, scale, mulberry32(grave.seed || 1))
    carve(ctx, `AGE ${grave.age}`, x, baseY + 14 * scale, 8 * scale, '#b8ab8c')
  }

  drawFamilyPictos(ctx, x, baseY, grave, scale)
}

/** Eight pale-marble soldier headstone silhouettes. */
function drawMarbleStone(ctx: CanvasRenderingContext2D, x: number, baseY: number, style: number, sc: number) {
  const face = '#e9e9e0'
  const shade = '#c4c4ba'
  const edge = '#b3b3a6'
  const W = 52 * sc
  const top = baseY - 66 * sc
  const fill = (path: () => void, withShade = true) => {
    if (withShade) {
      ctx.fillStyle = shade
      ctx.save()
      ctx.translate(2.5 * sc, 0)
      path()
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = face
    path()
    ctx.fill()
    ctx.strokeStyle = edge
    ctx.lineWidth = Math.max(1, sc)
    ctx.stroke()
  }
  switch (style) {
    case 0: // rounded-top headstone
      fill(() => {
        ctx.beginPath()
        ctx.moveTo(x - W / 2, baseY)
        ctx.lineTo(x - W / 2, top + 18 * sc)
        ctx.arc(x, top + 18 * sc, W / 2, Math.PI, 0)
        ctx.lineTo(x + W / 2, baseY)
        ctx.closePath()
      })
      break
    case 1: // gothic pointed arch
      fill(() => {
        ctx.beginPath()
        ctx.moveTo(x - W / 2, baseY)
        ctx.lineTo(x - W / 2, top + 20 * sc)
        ctx.quadraticCurveTo(x, top - 10 * sc, x + W / 2, top + 20 * sc)
        ctx.lineTo(x + W / 2, baseY)
        ctx.closePath()
      })
      break
    case 2: // low flat slab
      fill(() => {
        const h = 44 * sc
        ctx.beginPath()
        ctx.moveTo(x - W / 2, baseY)
        ctx.lineTo(x - W / 2, baseY - h + 8 * sc)
        ctx.quadraticCurveTo(x - W / 2, baseY - h, x - W / 2 + 8 * sc, baseY - h)
        ctx.lineTo(x + W / 2 - 8 * sc, baseY - h)
        ctx.quadraticCurveTo(x + W / 2, baseY - h, x + W / 2, baseY - h + 8 * sc)
        ctx.lineTo(x + W / 2, baseY)
        ctx.closePath()
      })
      break
    case 3: // obelisk
      fill(() => {
        ctx.beginPath()
        ctx.moveTo(x - W * 0.32, baseY)
        ctx.lineTo(x - W * 0.28, top + 8 * sc)
        ctx.lineTo(x, top - 8 * sc)
        ctx.lineTo(x + W * 0.28, top + 8 * sc)
        ctx.lineTo(x + W * 0.32, baseY)
        ctx.closePath()
      })
      break
    case 4: // latin cross
      fill(() => {
        ctx.beginPath()
        ctx.rect(x - 6 * sc, top - 6 * sc, 12 * sc, baseY - top + 6 * sc)
        ctx.rect(x - 18 * sc, top + 8 * sc, 36 * sc, 11 * sc)
      })
      break
    case 5: // celtic ring cross
      fill(() => {
        ctx.beginPath()
        ctx.rect(x - 5 * sc, top - 8 * sc, 10 * sc, baseY - top + 8 * sc)
        ctx.rect(x - 17 * sc, top + 6 * sc, 34 * sc, 9 * sc)
      })
      ctx.lineWidth = 5 * sc
      ctx.strokeStyle = face
      ctx.beginPath()
      ctx.arc(x, top + 10 * sc, 13 * sc, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 6: // broken column
      fill(() => {
        ctx.beginPath()
        ctx.moveTo(x - W * 0.34, baseY)
        ctx.lineTo(x - W * 0.34, top + 24 * sc)
        ctx.lineTo(x - W * 0.1, top + 14 * sc)
        ctx.lineTo(x + W * 0.12, top + 26 * sc)
        ctx.lineTo(x + W * 0.34, top + 20 * sc)
        ctx.lineTo(x + W * 0.34, baseY)
        ctx.closePath()
      })
      break
    default: // 7: double-shoulder
      fill(() => {
        ctx.beginPath()
        ctx.moveTo(x - W / 2, baseY)
        ctx.lineTo(x - W / 2, top + 24 * sc)
        ctx.arc(x - W * 0.22, top + 24 * sc, W * 0.28, Math.PI, 0)
        ctx.arc(x + W * 0.22, top + 24 * sc, W * 0.28, Math.PI, 0)
        ctx.lineTo(x + W / 2, baseY)
        ctx.closePath()
      })
      break
  }
}

/** Wooden crosses & rough field stones for the nameless dead. */
function drawSimpleMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  grave: Grave,
  sc: number,
  rand: () => number,
) {
  const wood = grave.type === 'enemy' ? '#5b3f25' : '#6a4d30'
  const woodDark = grave.type === 'enemy' ? '#3f2b18' : '#4a3621'
  const style = grave.style % 4
  if (style === 0 || style === 1) {
    // Wooden Latin cross, sometimes leaning.
    const lean = style === 1 ? (rand() < 0.5 ? -0.12 : 0.12) : 0
    ctx.save()
    ctx.translate(x, baseY)
    ctx.rotate(lean)
    const top = -46 * sc
    ctx.fillStyle = woodDark
    ctx.fillRect(-4 * sc + 1.5 * sc, top, 8 * sc, -top)
    ctx.fillRect(-14 * sc + 1.5 * sc, top + 12 * sc, 28 * sc, 7 * sc)
    ctx.fillStyle = wood
    ctx.fillRect(-4 * sc, top, 8 * sc, -top)
    ctx.fillRect(-14 * sc, top + 12 * sc, 28 * sc, 7 * sc)
    ctx.restore()
  } else if (style === 2) {
    // Pointed wooden marker plank.
    ctx.fillStyle = woodDark
    ctx.beginPath()
    ctx.moveTo(x - 9 * sc + 1.5 * sc, baseY)
    ctx.lineTo(x - 9 * sc + 1.5 * sc, baseY - 34 * sc)
    ctx.lineTo(x + 1.5 * sc, baseY - 44 * sc)
    ctx.lineTo(x + 9 * sc + 1.5 * sc, baseY - 34 * sc)
    ctx.lineTo(x + 9 * sc + 1.5 * sc, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = wood
    ctx.beginPath()
    ctx.moveTo(x - 9 * sc, baseY)
    ctx.lineTo(x - 9 * sc, baseY - 34 * sc)
    ctx.lineTo(x, baseY - 44 * sc)
    ctx.lineTo(x + 9 * sc, baseY - 34 * sc)
    ctx.lineTo(x + 9 * sc, baseY)
    ctx.closePath()
    ctx.fill()
  } else {
    // Rough field stone.
    const stone = '#7d756a'
    const stoneDark = '#5f594f'
    ctx.fillStyle = stoneDark
    ctx.beginPath()
    ctx.ellipse(x + 1.5 * sc, baseY - 13 * sc, 14 * sc, 16 * sc, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = stone
    ctx.beginPath()
    ctx.moveTo(x - 13 * sc, baseY)
    ctx.lineTo(x - 11 * sc, baseY - 20 * sc)
    ctx.quadraticCurveTo(x, baseY - 30 * sc, x + 11 * sc, baseY - 19 * sc)
    ctx.lineTo(x + 12 * sc, baseY)
    ctx.closePath()
    ctx.fill()
  }
}

function drawBootHill(g: Game, ctx: CanvasRenderingContext2D) {
  // Background: the painted night-hill banner, cover-fit, darkened to a hush.
  if (art.bootHill) {
    const sp = art.bootHill
    const scale = Math.max(VIEW_W / sp.w, VIEW_H / sp.h)
    const dw = sp.w * scale
    const dh = sp.h * scale
    ctx.drawImage(sp.c, (VIEW_W - dw) / 2, (VIEW_H - dh) / 2, dw, dh)
    ctx.fillStyle = 'rgba(6,9,14,0.55)'
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H)
    grad.addColorStop(0, '#0a0d12')
    grad.addColorStop(1, '#10160c')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  }

  const graves = loadGraves()
  // Oldest at the back (top rows), newest near the front.
  const ordered = graves.slice()

  ctx.textAlign = 'center'
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 12
  ctx.font = `bold 46px ${FONT}`
  ctx.fillStyle = '#e7f0b0'
  ctx.fillText('BOOT HILL', VIEW_W / 2, 70)
  ctx.restore()

  ctx.font = `15px ${FONT}`
  ctx.fillStyle = '#cdd9b0'
  if (ordered.length === 0) {
    ctx.fillText('No graves yet. Give it time.', VIEW_W / 2, 100)
  } else {
    const sol = ordered.filter((x) => x.type === 'soldier').length
    const civ = ordered.filter((x) => x.type === 'civilian').length
    const en = ordered.filter((x) => x.type === 'enemy').length
    ctx.fillText(`${ordered.length} rest here \u2014 ${sol} of ours, ${en} enemy, ${civ} caught between`, VIEW_W / 2, 100)
  }

  // Rows recede up the hill: higher rows are further away (smaller).
  const ROWS = [
    { baseY: 248, scale: 0.82 },
    { baseY: 372, scale: 0.96 },
    { baseY: 502, scale: 1.1 },
    { baseY: 642, scale: 1.26 },
  ]
  const CELL = 152
  const visibleCols = Math.floor(VIEW_W / CELL)
  const nRows = ROWS.length

  // Distribute graves round-robin so each row keeps a mix.
  const rows: Grave[][] = ROWS.map(() => [])
  ordered.forEach((grave, i) => rows[i % nRows].push(grave))

  // Clip the cemetery band so stones scroll cleanly under the header.
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 118, VIEW_W, VIEW_H - 118 - 40)
  ctx.clip()

  rows.forEach((rowGraves, r) => {
    if (rowGraves.length === 0) return
    const { baseY, scale } = ROWS[r]
    const rowW = rowGraves.length * CELL
    const fits = rowGraves.length <= visibleCols

    if (fits) {
      // Few enough to sit still: a tidy, centered rank.
      const startX = (VIEW_W - rowGraves.length * CELL) / 2 + CELL / 2
      rowGraves.forEach((grave, j) => drawGravestone(ctx, startX + j * CELL, baseY, grave, scale, g.time))
    } else {
      // Too many to fit — the row drifts. Even rows crawl left; odd rows roll
      // right at an uneven, wavering pace.
      const dir = r % 2 === 0 ? -1 : 1
      const speed = r % 2 === 0 ? 11 : 17 + r * 3
      const wobble = r % 2 === 0 ? 0 : Math.sin(g.time * 0.6 + r) * 10
      const offset = dir * g.time * speed + wobble
      rowGraves.forEach((grave, j) => {
        const p = mod(j * CELL + offset, rowW)
        for (const xx of [p, p - rowW]) {
          const x = xx + CELL / 2
          if (x > -CELL && x < VIEW_W + CELL) drawGravestone(ctx, x, baseY, grave, scale, g.time)
        }
      })
    }
  })
  ctx.restore()

  // Soft vignette to settle the scene.
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  ctx.textAlign = 'center'
  ctx.font = `bold 14px ${FONT}`
  ctx.fillStyle = '#e7f0b0'
  if (Math.floor(g.time * 2) % 2 === 0) ctx.fillText('PRESS [ESC] TO LEAVE THEM IN PEACE', VIEW_W / 2, VIEW_H - 16)
  ctx.textAlign = 'left'
  scanlines(ctx, g.time)
}
