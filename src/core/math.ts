export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay)
export const angleTo = (ax: number, ay: number, bx: number, by: number) => Math.atan2(by - ay, bx - ax)

/** Deterministic RNG (mulberry32) so each mission generates the same map. */
export class RNG {
  private s: number
  constructor(seed: number) {
    this.s = seed >>> 0
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0
    let t = this.s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  range(a: number, b: number): number {
    return a + this.next() * (b - a)
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1))
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }
  chance(p: number): boolean {
    return this.next() < p
  }
}

/** Non-seeded helpers for effects (visual randomness may differ per run). */
export const rnd = (a = 1, b?: number) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a))
export const rndPick = <T,>(arr: T[]): T => arr[(Math.random() * arr.length) | 0]
