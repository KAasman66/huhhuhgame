import { dist } from '../core/math'
import { Soldier } from '../entities/soldier'
import { Vehicle } from '../entities/vehicle'
import type { Pathfinder } from '../world/path'

export type Formation = 'column' | 'spread'
export type BlockTest = (x: number, y: number) => boolean

interface Crumb {
  x: number
  y: number
  d: number // cumulative arc length from the trail's tail
}

const TRAIL_STEP = 6 // push a breadcrumb every this many px the leader travels
const COL_GAP = 17 // spacing between column members
const SPREAD_BACK = 20 // longitudinal spacing in spread
const SPREAD_LAT = 22 // lateral fan-out in spread
const MIN_SEP = 13 // soldiers closer than this get nudged apart
const ARRIVE = 5 // stop a follower this close to its slot

/**
 * The player's peloton. One move order, the whole squad follows in formation.
 *
 * Movement model: only the *leader* runs A* (via the injected pathfinder).
 * Followers chase a breadcrumb trail the leader leaves behind, so the whole
 * squad threads single-file through the exact gap the leader used instead of
 * each soldier pathfinding independently and splitting up. A light separation
 * pass keeps them from stacking. The squad can also pile into a vehicle.
 */
export class Squad {
  soldiers: Soldier[] = []
  formation: Formation = 'column'
  grenades = 4
  vehicle: Vehicle | null = null
  /** Injected by the game once terrain exists; null → direct move orders. */
  pathfinder: Pathfinder | null = null

  private trail: Crumb[] = []

  alive(): Soldier[] {
    return this.soldiers.filter((s) => s.alive)
  }

  leader(): Soldier | null {
    return this.alive()[0] ?? null
  }

  /** Squad position: vehicle if mounted, otherwise the leader. */
  pos(): { x: number; y: number } | null {
    if (this.vehicle?.alive) return { x: this.vehicle.x, y: this.vehicle.y }
    const l = this.leader()
    return l ? { x: l.x, y: l.y } : null
  }

  mounted(): boolean {
    return this.vehicle !== null && this.vehicle.alive
  }

  moveTo(x: number, y: number) {
    if (this.mounted()) {
      this.routeUnit(this.vehicle!, x, y)
      return
    }
    const l = this.leader()
    if (!l) return
    // Only the leader pathfinds; followers will trail it (see steer()).
    this.routeUnit(l, x, y)
    // Reseed the breadcrumb trail at the leader's current position so followers
    // line up behind it from here rather than chasing a stale trail.
    this.trail = [{ x: l.x, y: l.y, d: 0 }]
  }

  /** Route a single unit with A* when available, else a direct order. */
  private routeUnit(unit: Soldier | Vehicle, x: number, y: number) {
    if (this.pathfinder) {
      const path = this.pathfinder(unit.x, unit.y, x, y)
      if (path.length > 0) {
        unit.orderPath(path)
        return
      }
    }
    unit.orderMove(x, y)
  }

  /**
   * Per-frame follower steering. Call before the soldiers' own update().
   * The leader advances on its A* route untouched; everyone else chases the
   * trail at a formation-dependent distance, then we separate any overlap.
   */
  steer(_dt: number, blocked: BlockTest) {
    if (this.mounted()) return
    const units = this.alive()
    const l = units[0]
    if (!l) return

    // Extend the breadcrumb trail as the leader moves.
    const head = this.trail[this.trail.length - 1]
    if (!head) {
      this.trail.push({ x: l.x, y: l.y, d: 0 })
    } else {
      const step = dist(head.x, head.y, l.x, l.y)
      if (step >= TRAIL_STEP) {
        this.trail.push({ x: l.x, y: l.y, d: head.d + step })
      }
    }
    // Cap the trail to what the rear-most follower could possibly need.
    const maxNeed = units.length * Math.max(COL_GAP, SPREAD_BACK) + 80
    const headD = this.trail[this.trail.length - 1].d
    while (this.trail.length > 2 && headD - this.trail[0].d > maxNeed) this.trail.shift()

    // Assign each follower a slot behind the leader along the trail.
    for (let i = 1; i < units.length; i++) {
      const s = units[i]
      let target: { x: number; y: number }
      if (this.formation === 'column') {
        target = this.trailBehind(COL_GAP * i, l)
      } else {
        const rank = Math.ceil(i / 2)
        const side = i % 2 === 0 ? 1 : -1
        const base = this.trailBehind(SPREAD_BACK * rank, l)
        target = this.lateralOffset(base, side * SPREAD_LAT, l, blocked)
      }
      if (dist(s.x, s.y, target.x, target.y) > ARRIVE) s.orderMove(target.x, target.y)
      else s.stop()
    }

    this.separate(units, blocked)
  }

  /** Point on the trail a given arc-distance behind the leader (head). */
  private trailBehind(distBack: number, leader: Soldier): { x: number; y: number } {
    const t = this.trail
    if (t.length === 0) return { x: leader.x, y: leader.y }
    const headD = t[t.length - 1].d
    const targetD = headD - distBack
    if (targetD <= t[0].d) {
      // Trail too short — extrapolate straight back from the leader's facing.
      const tail = t[0]
      const short = t[t.length - 1].d - tail.d
      const back = leader.angle + Math.PI
      const extra = distBack - short
      return { x: tail.x + Math.cos(back) * extra, y: tail.y + Math.sin(back) * extra }
    }
    // Walk back from the head to find the bracketing crumbs and interpolate.
    for (let k = t.length - 1; k > 0; k--) {
      if (t[k - 1].d <= targetD) {
        const a = t[k - 1]
        const b = t[k]
        const span = b.d - a.d || 1
        const f = (targetD - a.d) / span
        return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }
      }
    }
    return { x: t[0].x, y: t[0].y }
  }

  /** Offset a trail point sideways for spread formation, clamped to open ground. */
  private lateralOffset(
    base: { x: number; y: number },
    amount: number,
    leader: Soldier,
    blocked: BlockTest,
  ): { x: number; y: number } {
    const perp = leader.angle + Math.PI / 2
    for (const f of [1, 0.6, 0.3, 0]) {
      const x = base.x + Math.cos(perp) * amount * f
      const y = base.y + Math.sin(perp) * amount * f
      if (!blocked(x, y)) return { x, y }
    }
    return base
  }

  /** Gentle pairwise push so soldiers don't pile onto the same pixel. */
  private separate(units: Soldier[], blocked: BlockTest) {
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const a = units[i]
        const b = units[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy)
        if (d > 0 && d < MIN_SEP) {
          const push = (MIN_SEP - d) / 2
          const nx = dx / d
          const ny = dy / d
          // Don't shove the leader; nudge followers symmetrically otherwise.
          if (i === 0) {
            this.tryShift(b, nx * push * 2, ny * push * 2, blocked)
          } else {
            this.tryShift(a, -nx * push, -ny * push, blocked)
            this.tryShift(b, nx * push, ny * push, blocked)
          }
        }
      }
    }
  }

  private tryShift(s: Soldier, dx: number, dy: number, blocked: BlockTest) {
    if (!blocked(s.x + dx, s.y + dy)) {
      s.x += dx
      s.y += dy
    }
  }

  halt() {
    for (const s of this.alive()) s.stop()
    const l = this.leader()
    this.trail = l ? [{ x: l.x, y: l.y, d: 0 }] : []
  }

  board(v: Vehicle) {
    this.vehicle = v
    v.occupied = true
    for (const s of this.alive()) s.stop()
  }

  /** Returns dismount positions around the vehicle. */
  dismount(): { x: number; y: number }[] {
    const v = this.vehicle
    if (!v) return []
    const out: { x: number; y: number }[] = []
    const units = this.alive()
    for (let i = 0; i < units.length; i++) {
      const a = (i / units.length) * Math.PI * 2
      out.push({ x: v.x + Math.cos(a) * 30, y: v.y + Math.sin(a) * 30 })
    }
    v.occupied = false
    v.stop()
    this.vehicle = null
    return out
  }
}
