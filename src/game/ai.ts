import { dist, rnd, RNG } from '../core/math'
import { Soldier } from '../entities/soldier'

export type SquadState = 'patrol' | 'attack'

export interface AiTarget {
  x: number
  y: number
}

/**
 * Enemy infantry squad: patrols waypoints until the player gets close
 * (or shoots them), then converges and opens fire.
 */
export class EnemySquad {
  state: SquadState = 'patrol'
  private wpIdx = 0
  private repathCd = 0

  constructor(
    public soldiers: Soldier[],
    public waypoints: AiTarget[],
  ) {}

  alive(): Soldier[] {
    return this.soldiers.filter((s) => s.alive)
  }

  center(): AiTarget | null {
    const units = this.alive()
    if (units.length === 0) return null
    let x = 0
    let y = 0
    for (const s of units) {
      x += s.x
      y += s.y
    }
    return { x: x / units.length, y: y / units.length }
  }

  alert() {
    this.state = 'attack'
  }

  /**
   * @param playerPos squad/vehicle position of the player, or null
   * @param playerConcealed player is under tree cover — much harder to spot/hit
   * @param fire callback(soldier, tx, ty) that spawns a bullet
   */
  update(
    dt: number,
    playerPos: AiTarget | null,
    playerConcealed: boolean,
    isBlocked: (x: number, y: number) => boolean,
    fire: (s: Soldier, tx: number, ty: number) => void,
  ) {
    const units = this.alive()
    if (units.length === 0) return
    const c = this.center()!
    this.repathCd -= dt
    // Concealed players are only noticed up close, and can't be shot from range.
    const spotRange = playerConcealed ? 110 : 300
    const engageRange = playerConcealed ? 130 : 10000

    if (this.state === 'patrol') {
      if (playerPos && dist(c.x, c.y, playerPos.x, playerPos.y) < spotRange) {
        this.alert()
      } else if (this.waypoints.length > 0) {
        const wp = this.waypoints[this.wpIdx]
        if (dist(c.x, c.y, wp.x, wp.y) < 40) {
          this.wpIdx = (this.wpIdx + 1) % this.waypoints.length
        } else if (this.repathCd <= 0) {
          this.repathCd = 0.8
          for (let i = 0; i < units.length; i++) {
            units[i].orderMove(wp.x + (i % 3) * 18 - 18, wp.y + Math.floor(i / 3) * 18)
          }
        }
      }
    }

    if (this.state === 'attack' && playerPos) {
      // Lost them in the trees: stop firing blind and fall back to patrol.
      if (playerConcealed && dist(c.x, c.y, playerPos.x, playerPos.y) > engageRange) {
        this.state = 'patrol'
        for (const s of units) s.stop()
      } else {
        for (const s of units) {
          const d = dist(s.x, s.y, playerPos.x, playerPos.y)
          if (d > s.range() * 0.85) {
            if (this.repathCd <= 0) {
              s.orderMove(playerPos.x + rnd(-50, 50), playerPos.y + rnd(-50, 50))
            }
          } else if (!playerConcealed || d < engageRange) {
            s.stop()
            s.angle = Math.atan2(playerPos.y - s.y, playerPos.x - s.x)
            if (s.fireCd <= 0) {
              // Concealed targets draw sloppier, less frequent fire.
              s.fireCd = playerConcealed ? rnd(0.8, 1.2) : rnd(0.45, 0.7)
              const spread = playerConcealed ? 22 : 0
              fire(s, playerPos.x + rnd(-spread, spread), playerPos.y + rnd(-spread, spread))
            }
          }
        }
      }
      if (this.repathCd <= 0) this.repathCd = 0.8
    }

    for (const s of units) s.update(dt, isBlocked)
  }
}

let grunt = 0

export function makeEnemySquad(x: number, y: number, count: number, waypoints: AiTarget[], rng?: RNG): EnemySquad {
  const soldiers: Soldier[] = []
  for (let i = 0; i < count; i++) {
    grunt++
    const ox = ((i % 3) - 1) * 20 + (rng ? rng.range(-6, 6) : rnd(-6, 6))
    const oy = (Math.floor(i / 3) - 0.5) * 20
    soldiers.push(new Soldier(x + ox, y + oy, 'enemy', `Hostile-${grunt}`))
  }
  return new EnemySquad(soldiers, waypoints)
}
