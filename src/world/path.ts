import { TILE, Terrain } from './terrain'

export interface PathPoint {
  x: number
  y: number
}

export type BlockedFn = (x: number, y: number) => boolean
export type Pathfinder = (sx: number, sy: number, tx: number, ty: number) => PathPoint[]

/** Sample a straight segment for walkability (~6px steps). */
export function lineWalkable(blocked: BlockedFn, x0: number, y0: number, x1: number, y1: number): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0)
  const steps = Math.max(1, Math.ceil(d / 6))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    if (blocked(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false
  }
  return true
}

const SQRT2 = Math.SQRT2

/**
 * Grid A* over the terrain cells (TILE=30 → ~80×50 = 4000 cells), then
 * string-pulled so units cut corners naturally instead of zig-zagging
 * cell centers. Returns [] when no route exists — callers fall back to
 * a direct move order, which preserves the old behaviour.
 *
 * If the clicked target is blocked (a lake, a building) the path goes
 * to the nearest walkable cell instead, so "click on water" reads as
 * "get me to that shore".
 */
export function findPath(
  terrain: Terrain,
  blocked: BlockedFn,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): PathPoint[] {
  // Trivial case: straight shot.
  if (lineWalkable(blocked, sx, sy, tx, ty)) return [{ x: tx, y: ty }]

  const cols = terrain.cols
  const rows = terrain.rows
  const n = cols * rows

  // Lazily-evaluated walkability cache: 0 unknown, 1 open, 2 wall.
  const state = new Int8Array(n)
  const walkable = (cx: number, cy: number): boolean => {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return false
    const i = cy * cols + cx
    if (state[i] === 0) state[i] = blocked(cx * TILE + TILE / 2, cy * TILE + TILE / 2) ? 2 : 1
    return state[i] === 1
  }

  const nearestWalkable = (px: number, py: number): { cx: number; cy: number } | null => {
    const cx0 = Math.floor(px / TILE)
    const cy0 = Math.floor(py / TILE)
    if (walkable(cx0, cy0)) return { cx: cx0, cy: cy0 }
    for (let r = 1; r <= 14; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue // ring only
          if (walkable(cx0 + dx, cy0 + dy)) return { cx: cx0 + dx, cy: cy0 + dy }
        }
      }
    }
    return null
  }

  const start = nearestWalkable(sx, sy)
  const goal = nearestWalkable(tx, ty)
  if (!start || !goal) return []
  const goalIdx = goal.cy * cols + goal.cx

  const g = new Float64Array(n).fill(Infinity)
  const came = new Int32Array(n).fill(-1)
  const closed = new Uint8Array(n)

  // Small binary heap keyed on f-score.
  const heap: number[] = []
  const fScore = new Float64Array(n).fill(Infinity)
  const heapPush = (i: number) => {
    heap.push(i)
    let c = heap.length - 1
    while (c > 0) {
      const p = (c - 1) >> 1
      if (fScore[heap[c]] < fScore[heap[p]]) {
        ;[heap[c], heap[p]] = [heap[p], heap[c]]
        c = p
      } else break
    }
  }
  const heapPop = (): number => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let p = 0
      for (;;) {
        const l = p * 2 + 1
        const r = l + 1
        let m = p
        if (l < heap.length && fScore[heap[l]] < fScore[heap[m]]) m = l
        if (r < heap.length && fScore[heap[r]] < fScore[heap[m]]) m = r
        if (m === p) break
        ;[heap[p], heap[m]] = [heap[m], heap[p]]
        p = m
      }
    }
    return top
  }

  const h = (cx: number, cy: number) => {
    const dx = Math.abs(cx - goal.cx)
    const dy = Math.abs(cy - goal.cy)
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy)
  }

  const startIdx = start.cy * cols + start.cx
  g[startIdx] = 0
  fScore[startIdx] = h(start.cx, start.cy)
  heapPush(startIdx)

  let found = false
  let guard = 0
  while (heap.length && guard++ < 12000) {
    const cur = heapPop()
    if (cur === goalIdx) {
      found = true
      break
    }
    if (closed[cur]) continue
    closed[cur] = 1
    const cx = cur % cols
    const cy = (cur / cols) | 0

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = cx + dx
        const ny = cy + dy
        if (!walkable(nx, ny)) continue
        // No corner cutting on diagonals.
        if (dx !== 0 && dy !== 0 && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue
        const ni = ny * cols + nx
        if (closed[ni]) continue
        const cost = dx !== 0 && dy !== 0 ? SQRT2 : 1
        const ng = g[cur] + cost
        if (ng < g[ni]) {
          g[ni] = ng
          came[ni] = cur
          fScore[ni] = ng + h(nx, ny)
          heapPush(ni)
        }
      }
    }
  }
  if (!found) return []

  // Reconstruct cell-center waypoints (goal → start), then flip.
  const raw: PathPoint[] = []
  for (let i = goalIdx; i !== -1; i = came[i]) {
    raw.push({ x: (i % cols) * TILE + TILE / 2, y: ((i / cols) | 0) * TILE + TILE / 2 })
  }
  raw.reverse()
  // Prefer the exact click point if it is itself reachable terrain.
  if (!blocked(tx, ty)) raw[raw.length - 1] = { x: tx, y: ty }

  // String pulling: from each anchor, jump to the furthest visible waypoint.
  const out: PathPoint[] = []
  let cur: PathPoint = { x: sx, y: sy }
  let i = 0
  while (i < raw.length) {
    let j = raw.length - 1
    for (; j > i; j--) {
      if (lineWalkable(blocked, cur.x, cur.y, raw[j].x, raw[j].y)) break
    }
    out.push(raw[j])
    cur = raw[j]
    i = j + 1
  }
  return out
}
