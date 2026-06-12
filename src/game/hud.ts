import type { Game } from './game'
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H } from './game'
import { BUILDING_STATS, BuildingType } from '../entities/building'
import { VEHICLE_STATS } from '../entities/vehicle'
import { rankName } from './roster'

const FONT = "'Courier New', monospace"

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = 'rgba(8,12,6,0.78)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(150,180,120,0.5)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
}

export function drawHUD(g: Game, ctx: CanvasRenderingContext2D) {
  drawTopBar(g, ctx)
  drawSquadPanel(g, ctx)
  drawMinimap(g, ctx)
  if (g.buildMenuOpen) drawBuildMenu(g, ctx)
  drawHints(g, ctx)
  drawCrosshair(g, ctx)
}

function drawTopBar(g: Game, ctx: CanvasRenderingContext2D) {
  panel(ctx, 12, 12, 460, 64)
  ctx.font = `bold 15px ${FONT}`
  ctx.fillStyle = '#d9e8c9'
  ctx.fillText(g.mission.name, 24, 33)
  ctx.font = `11px ${FONT}`
  ctx.fillStyle = '#9fb886'
  ctx.fillText(`OBJECTIVE: ${g.mission.objectiveText}`, 24, 50)

  ctx.font = `bold 13px ${FONT}`
  ctx.fillStyle = '#ffe14a'
  ctx.fillText(`$${g.money}`, 24, 68)
  ctx.fillStyle = '#aacc66'
  ctx.fillText(`\u25CF GRENADES: ${g.squad.grenades}`, 110, 68)

  if (g.mission.waves) {
    ctx.fillStyle = '#ff9966'
    const total = g.endlessMode ? '\u221E' : String(g.mission.waves.count)
    const next = g.wave < g.mission.waves.count ? ` NEXT IN ${Math.ceil(g.waveTimer)}s` : ''
    ctx.fillText(`WAVE ${g.wave}/${total}${next}`, 270, 68)
  }
  if (g.mission.kind === 'rescue') {
    ctx.fillStyle = '#6fe3ff'
    ctx.fillText(`RESCUED ${g.rescuedCount}/${g.mission.rescueGoal}`, 290, 68)
  }
  if (g.endlessMode) {
    ctx.fillStyle = '#ff9966'
    ctx.fillText(`KILLS: ${g.killCount}`, 380, 33)
  }
}

function drawSquadPanel(g: Game, ctx: CanvasRenderingContext2D) {
  const units = g.squad.alive()
  const mounted = g.squad.mounted()
  const rows = mounted ? 1 : units.length
  const h = 26 + rows * 19
  const y0 = VIEW_H - h - 12
  panel(ctx, 12, y0, 210, h)

  ctx.font = `bold 11px ${FONT}`
  ctx.fillStyle = '#9fb886'
  ctx.fillText(mounted ? 'SQUAD (MOUNTED)' : 'SQUAD', 22, y0 + 17)

  if (mounted) {
    const v = g.squad.vehicle!
    ctx.font = `bold 12px ${FONT}`
    ctx.fillStyle = '#d9e8c9'
    ctx.fillText(`${v.stats.name} \u00D7${units.length} crew`, 22, y0 + 36)
    const p = v.hp / v.stats.hp
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(140, y0 + 28, 70, 8)
    ctx.fillStyle = p > 0.5 ? '#4dd34d' : p > 0.25 ? '#ffd24a' : '#ff5040'
    ctx.fillRect(141, y0 + 29, 68 * p, 6)
    return
  }

  units.forEach((s, i) => {
    const y = y0 + 32 + i * 19
    ctx.font = `bold 10px ${FONT}`
    ctx.fillStyle = '#c8b560'
    ctx.fillText(rankName(s.rank()), 22, y)
    ctx.fillStyle = i === 0 ? '#ffe14a' : '#d9e8c9'
    ctx.font = `12px ${FONT}`
    ctx.fillText(s.name, 56, y)
    // HP bar
    const p = s.hp / s.maxHp
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(130, y - 8, 52, 8)
    ctx.fillStyle = p > 0.5 ? '#4dd34d' : p > 0.25 ? '#ffd24a' : '#ff5040'
    ctx.fillRect(131, y - 7, 50 * p, 6)
    // Kills
    ctx.fillStyle = '#9fb886'
    ctx.font = `10px ${FONT}`
    ctx.fillText(`${s.kills}`, 190, y)
  })
}

function drawMinimap(g: Game, ctx: CanvasRenderingContext2D) {
  const W = 192
  const H = 120
  const x0 = VIEW_W - W - 12
  const y0 = 12
  panel(ctx, x0 - 4, y0 - 4, W + 8, H + 8)
  if (g.minimapBase) ctx.drawImage(g.minimapBase, x0, y0, W, H)

  const sx = W / WORLD_W
  const sy = H / WORLD_H

  // Fog on minimap
  const cell = 40
  ctx.fillStyle = 'rgba(0,0,0,0.85)'
  for (let gy = 0; gy < g.fog.rows; gy++) {
    for (let gx = 0; gx < g.fog.cols; gx++) {
      if (g.fog.state[gy * g.fog.cols + gx] === 0) {
        ctx.fillRect(x0 + gx * cell * sx, y0 + gy * cell * sy, cell * sx + 0.5, cell * sy + 0.5)
      }
    }
  }

  // Blips
  for (const b of g.buildings) {
    if (b.side === 'enemy' && !g.fog.isExplored(b.x, b.y)) continue
    ctx.fillStyle = b.side === 'player' ? '#7dff7d' : '#ff5040'
    ctx.fillRect(x0 + b.x * sx - 2, y0 + b.y * sy - 2, 4, 4)
  }
  ctx.fillStyle = '#6fe3ff'
  for (const c of g.civilians) {
    if (c.alive && !c.rescued && g.fog.isVisible(c.x, c.y)) ctx.fillRect(x0 + c.x * sx - 1, y0 + c.y * sy - 1, 2, 2)
  }
  ctx.fillStyle = '#ff5040'
  for (const sq of g.enemySquads) {
    for (const s of sq.alive()) {
      if (g.fog.isVisible(s.x, s.y)) ctx.fillRect(x0 + s.x * sx - 1, y0 + s.y * sy - 1, 2.5, 2.5)
    }
  }
  for (const v of g.enemyVehicles) {
    if (g.fog.isVisible(v.x, v.y)) ctx.fillRect(x0 + v.x * sx - 2, y0 + v.y * sy - 2, 4, 4)
  }
  ctx.fillStyle = '#7dff7d'
  for (const s of g.squad.alive()) {
    if (!g.squad.mounted()) ctx.fillRect(x0 + s.x * sx - 1.5, y0 + s.y * sy - 1.5, 3, 3)
  }
  for (const v of g.playerVehicles) {
    ctx.fillRect(x0 + v.x * sx - 2, y0 + v.y * sy - 2, 4, 4)
  }

  // Camera viewport
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(x0 + g.camera.x * sx, y0 + g.camera.y * sy, VIEW_W * sx, VIEW_H * sy)
}

interface ShopItem {
  key: string
  label: string
  cost: number
  enabled: boolean
  note: string
}

function shopItems(g: Game): ShopItem[] {
  const items: ShopItem[] = []
  if (g.mission.build) {
    items.push(
      { key: '1', label: 'GUN TOWER', cost: BUILDING_STATS.tower.cost, enabled: true, note: 'auto-fire defense' },
      { key: '2', label: 'BARRACKS', cost: BUILDING_STATS.barracks.cost, enabled: true, note: 'unlocks recruits' },
      { key: '3', label: 'WAR FACTORY', cost: BUILDING_STATS.factory.cost, enabled: true, note: 'unlocks vehicles' },
      { key: '4', label: 'RECRUIT', cost: 300, enabled: g.hasBuilding('barracks'), note: g.hasBuilding('barracks') ? 'fresh meat' : 'needs barracks' },
    )
  }
  if (g.mission.vehicles) {
    items.push(
      { key: '5', label: 'JEEP', cost: VEHICLE_STATS.jeep.cost, enabled: g.hasBuilding('factory'), note: g.hasBuilding('factory') ? 'fast, MG' : 'needs factory' },
      { key: '6', label: 'TANK', cost: VEHICLE_STATS.tank.cost, enabled: g.hasBuilding('factory'), note: g.hasBuilding('factory') ? 'slow, BOOM' : 'needs factory' },
    )
  }
  return items
}

function drawBuildMenu(g: Game, ctx: CanvasRenderingContext2D) {
  const items = shopItems(g)
  const w = 252
  const h = 44 + items.length * 30
  const x0 = VIEW_W / 2 - w / 2
  const y0 = VIEW_H - h - 12
  panel(ctx, x0, y0, w, h)

  ctx.font = `bold 13px ${FONT}`
  ctx.fillStyle = '#d9e8c9'
  ctx.fillText('FIELD REQUISITIONS', x0 + 14, y0 + 22)
  ctx.font = `10px ${FONT}`
  ctx.fillStyle = '#9fb886'
  ctx.fillText('[E] close  [ESC] cancel', x0 + 150, y0 + 22)

  items.forEach((it, i) => {
    const y = y0 + 48 + i * 30
    const afford = g.money >= it.cost && it.enabled
    ctx.font = `bold 12px ${FONT}`
    ctx.fillStyle = afford ? '#ffe14a' : '#666'
    ctx.fillText(`[${it.key}]`, x0 + 14, y)
    ctx.fillStyle = afford ? '#d9e8c9' : '#777'
    ctx.fillText(it.label, x0 + 46, y)
    ctx.fillStyle = afford ? '#ffe14a' : '#666'
    ctx.fillText(`$${it.cost}`, x0 + 150, y)
    ctx.font = `9px ${FONT}`
    ctx.fillStyle = '#7d8f6d'
    ctx.fillText(it.note, x0 + 46, y + 11)
  })
}

function drawHints(g: Game, ctx: CanvasRenderingContext2D) {
  ctx.font = `10px ${FONT}`
  ctx.fillStyle = 'rgba(200,220,180,0.55)'
  const parts = ['LMB move', 'RMB fire', 'G grenade', 'S formation']
  if (g.mission.build || g.mission.vehicles) parts.push('E shop')
  if (g.squad.mounted()) parts.push('SPACE dismount')
  else if (g.playerVehicles.length > 0) parts.push('LMB on vehicle = board')
  ctx.textAlign = 'right'
  ctx.fillText(parts.join('  \u00B7  '), VIEW_W - 14, VIEW_H - 14)
  ctx.textAlign = 'left'
}

function drawCrosshair(g: Game, ctx: CanvasRenderingContext2D) {
  const { mx, my } = g.input
  ctx.strokeStyle = g.input.rightDown ? '#ff7755' : 'rgba(255,255,255,0.75)'
  ctx.lineWidth = 1.5
  const r = g.input.rightDown ? 7 : 9
  ctx.beginPath()
  ctx.moveTo(mx - r, my)
  ctx.lineTo(mx - 3, my)
  ctx.moveTo(mx + 3, my)
  ctx.lineTo(mx + r, my)
  ctx.moveTo(mx, my - r)
  ctx.lineTo(mx, my - 3)
  ctx.moveTo(mx, my + 3)
  ctx.lineTo(mx, my + r)
  ctx.stroke()
}

export function drawBuildGhost(g: Game, ctx: CanvasRenderingContext2D, wx: number, wy: number) {
  const type = g.buildMode as BuildingType
  const s = BUILDING_STATS[type]
  const ok = g.canPlace(type, wx, wy) && g.money >= s.cost
  ctx.globalAlpha = 0.5
  ctx.fillStyle = ok ? '#7dff7d' : '#ff5040'
  ctx.fillRect(wx - s.size / 2, wy - s.size / 2, s.size, s.size)
  ctx.globalAlpha = 1
  ctx.strokeStyle = ok ? '#7dff7d' : '#ff5040'
  ctx.lineWidth = 2
  ctx.strokeRect(wx - s.size / 2, wy - s.size / 2, s.size, s.size)
  ctx.font = `bold 11px ${FONT}`
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.fillText(`${s.name} $${s.cost}`, wx, wy - s.size / 2 - 6)
  ctx.fillText(ok ? 'LMB place \u00B7 RMB cancel' : 'BLOCKED', wx, wy + s.size / 2 + 14)
  ctx.textAlign = 'left'
}
