import { angleTo } from '../core/math'
import { Soldier } from '../entities/soldier'
import { Vehicle } from '../entities/vehicle'

export type Formation = 'column' | 'spread'

/**
 * The player's peloton. One move order, the whole squad follows in formation.
 * The squad can also pile into a vehicle and drive it.
 */
export class Squad {
  soldiers: Soldier[] = []
  formation: Formation = 'column'
  grenades = 4
  vehicle: Vehicle | null = null

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
      this.vehicle!.orderMove(x, y)
      return
    }
    const units = this.alive()
    const l = units[0]
    if (!l) return
    const approach = angleTo(l.x, l.y, x, y)
    l.orderMove(x, y)
    for (let i = 1; i < units.length; i++) {
      let ox: number
      let oy: number
      if (this.formation === 'column') {
        // Single file behind the leader with slight stagger
        const back = approach + Math.PI
        const lateral = approach + Math.PI / 2
        const wob = (i % 2 === 0 ? 1 : -1) * 7
        ox = Math.cos(back) * 20 * i + Math.cos(lateral) * wob
        oy = Math.sin(back) * 20 * i + Math.sin(lateral) * wob
      } else {
        // Loose combat spread
        const a = approach + Math.PI + ((i % 2 === 0 ? 1 : -1) * (0.5 + Math.floor(i / 2) * 0.4))
        const d = 26 + Math.floor(i / 2) * 16
        ox = Math.cos(a) * d
        oy = Math.sin(a) * d
      }
      units[i].orderMove(x + ox, y + oy)
    }
  }

  halt() {
    for (const s of this.alive()) s.stop()
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
