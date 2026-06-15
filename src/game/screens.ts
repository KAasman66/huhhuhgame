import type { Game } from './game'
import { VIEW_W, VIEW_H } from './game'
import { MISSIONS, STAGE_KEYS } from './missions'
import { loadGraves, rankName } from './roster'
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
  ctx.fillText('CHAOS FODDER', VIEW_W / 2 + 5, 195 + bounce + 5)
  ctx.fillStyle = '#c8d96a'
  ctx.fillText('CHAOS FODDER', VIEW_W / 2, 195 + bounce)
  ctx.fillStyle = '#7a4040'
  ctx.font = `bold 19px ${FONT}`
  ctx.fillText('WAR IS HELL. PROFIT IS FOREVER.', VIEW_W / 2, 236 + bounce)

  // Menu
  const blink = Math.floor(t * 2) % 2 === 0
  ctx.font = `bold 22px ${FONT}`
  ctx.fillStyle = blink ? '#ffe14a' : '#bba23a'
  ctx.fillText('[ENTER]  NEW CAMPAIGN', VIEW_W / 2, 380)
  ctx.font = `17px ${FONT}`
  ctx.fillStyle = '#9fb886'
  let y = 420
  if (g.progress.unlocked > 0 && g.progress.unlocked < MISSIONS.length) {
    ctx.fillText(`[C]  CONTINUE \u2014 MISSION ${g.progress.unlocked + 1}: ${MISSIONS[g.progress.unlocked].name}`, VIEW_W / 2, y)
    y += 32
  }
  ctx.fillText('[E]  ENDLESS CHAOS', VIEW_W / 2, y)
  y += 32
  ctx.fillText('[B]  BOOT HILL \u2014 honour the dead', VIEW_W / 2, y)
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
    ctx.fillText(`[${key}] ${i + 1}. ${MISSIONS[i].name}`, colX[col], y + row * 20)
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
  ctx.fillText('LMB move \u00B7 RMB shoot \u00B7 G grenade \u00B7 S formation \u00B7 E shop \u00B7 squad follows the leader', VIEW_W / 2, VIEW_H - 28)
  ctx.textAlign = 'left'

  scanlines(ctx, t)
}

function drawBriefing(g: Game, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#06080a'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

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
  if (Math.floor(g.time * 2) % 2 === 0) {
    ctx.font = `bold 17px ${FONT}`
    ctx.fillStyle = '#d9e8c9'
    ctx.fillText(g.campaignWon || g.endlessMode ? 'PRESS [SPACE] FOR TITLE' : 'PRESS [SPACE] FOR NEXT MISSION', VIEW_W / 2, 620)
  }
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

  if (Math.floor(g.time * 2) % 2 === 0) {
    ctx.font = `bold 16px ${FONT}`
    ctx.fillStyle = '#d9e8c9'
    ctx.fillText(g.endlessMode ? 'PRESS [R] FOR TITLE' : 'PRESS [R] TO RETRY \u00B7 [ESC] FOR TITLE', VIEW_W / 2, 560)
  }
  ctx.textAlign = 'left'
}

function drawBootHill(g: Game, ctx: CanvasRenderingContext2D) {
  // Night cemetery
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H)
  grad.addColorStop(0, '#0a0d12')
  grad.addColorStop(1, '#10160c')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  // Moon
  ctx.fillStyle = '#d9d9c0'
  ctx.beginPath()
  ctx.arc(VIEW_W - 140, 100, 36, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0a0d12'
  ctx.beginPath()
  ctx.arc(VIEW_W - 128, 92, 32, 0, Math.PI * 2)
  ctx.fill()
  // Hill
  ctx.fillStyle = '#16200e'
  ctx.beginPath()
  ctx.moveTo(0, VIEW_H)
  ctx.quadraticCurveTo(VIEW_W / 2, VIEW_H * 0.28, VIEW_W, VIEW_H)
  ctx.closePath()
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.font = `bold 40px ${FONT}`
  ctx.fillStyle = '#c8d96a'
  ctx.fillText('BOOT HILL', VIEW_W / 2, 88)
  ctx.font = `14px ${FONT}`
  ctx.fillStyle = '#7d8f6d'

  const graves = loadGraves()
  ctx.fillText(graves.length === 0 ? 'No graves yet. Give it time.' : `${graves.length} heroes rest here`, VIEW_W / 2, 116)

  // Tombstones on the hill
  const show = graves.slice(-24)
  show.forEach((grave, i) => {
    const col = i % 8
    const row = Math.floor(i / 8)
    const x = 160 + col * 130
    const cy = VIEW_H * 0.55 + row * 88 - Math.sin((x / VIEW_W) * Math.PI) * 110
    // Stone
    ctx.fillStyle = '#6e7468'
    ctx.fillRect(x - 26, cy - 28, 52, 46)
    ctx.beginPath()
    ctx.arc(x, cy - 28, 26, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#565c52'
    ctx.fillRect(x - 30, cy + 18, 60, 6)
    // Inscription
    ctx.fillStyle = '#2e332b'
    ctx.font = `bold 10px ${FONT}`
    ctx.fillText('R.I.P.', x, cy - 22)
    ctx.font = `bold 11px ${FONT}`
    ctx.fillText(`${rankName(grave.rank)} ${grave.name}`.slice(0, 14), x, cy - 8)
    ctx.font = `9px ${FONT}`
    ctx.fillText(`${grave.kills} kills`, x, cy + 5)
  })

  ctx.font = `bold 14px ${FONT}`
  ctx.fillStyle = '#d9e8c9'
  if (Math.floor(g.time * 2) % 2 === 0) ctx.fillText('PRESS [ESC] TO LEAVE THEM IN PEACE', VIEW_W / 2, VIEW_H - 36)
  ctx.textAlign = 'left'
  scanlines(ctx, g.time)
}
