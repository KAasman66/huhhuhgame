import { RANKS } from '../entities/soldier'

/** Cannon Fodder tradition: every recruit has a name, and the dead are remembered. */
const NAMES = [
  'Jools', 'Jops', 'Stoo', 'RJ', 'Ubik', 'Trog', 'Spex', 'Mitch', 'Boyo', 'Dave',
  'Kenny', 'Murf', 'Ziggy', 'Hank', 'Buzz', 'Rico', 'Duke', 'Tex', 'Spud', 'Knux',
  'Chip', 'Gonzo', 'Vince', 'Bo', 'Skip', 'Moss', 'Fitz', 'Red', 'Ace', 'Wally',
  'Champ', 'Bingo', 'Norm', 'Pat', 'Stan', 'Gus', 'Olly', 'Zeke', 'Bram', 'Cyrus',
  'Dutch', 'Elmo', 'Fritz', 'Goose', 'Huck', 'Iggy', 'Jinx', 'Kip', 'Lemmy', 'Mack',
]

export type GraveType = 'soldier' | 'enemy' | 'civilian'

export interface Grave {
  type: GraveType
  /** Soldiers only; enemies and civilians are buried nameless. */
  name?: string
  age: number
  kills: number
  rank: number
  mission: string
  /** 0-7 headstone style, picked once so scrolling stays stable. */
  style: number
  /** Drives mourner appearance / decoration variety. */
  seed: number
}

const BOOTHILL_KEY = 'chaosfodder.boothill'
const PROGRESS_KEY = 'chaosfodder.progress'

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

/** Recruits are young; veterans (higher rank) skew older. 17 → ~40. */
export function soldierAge(rank: number): number {
  return Math.min(42, 17 + rank * 4 + randInt(0, 6))
}
export function civilianAge(): number {
  return randInt(5, 95)
}
export function enemyAge(): number {
  return randInt(18, 46)
}

export function makeGrave(
  type: GraveType,
  opts: { name?: string; age: number; kills?: number; rank?: number; mission: string },
): Grave {
  const seed = (Math.random() * 0xffffffff) >>> 0
  return {
    type,
    name: opts.name,
    age: opts.age,
    kills: opts.kills ?? 0,
    rank: opts.rank ?? 0,
    mission: opts.mission,
    style: seed % 8,
    seed,
  }
}

function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Fill in fields missing from graves saved by older builds. */
function normalizeGrave(raw: Partial<Grave>, i: number): Grave {
  const type: GraveType = raw.type ?? 'soldier'
  const seed = raw.seed ?? ((hashStr((raw.name ?? '') + ':' + i) ^ Math.imul(i + 1, 2654435761)) >>> 0)
  const style = raw.style ?? seed % 8
  let age = raw.age
  if (age == null) {
    age =
      type === 'soldier'
        ? Math.min(42, 17 + (raw.rank ?? 0) * 4 + (seed % 7))
        : type === 'civilian'
          ? 5 + (seed % 91)
          : 18 + (seed % 29)
  }
  return {
    type,
    name: raw.name,
    age,
    kills: raw.kills ?? 0,
    rank: raw.rank ?? 0,
    mission: raw.mission ?? '',
    style,
    seed,
  }
}

export class Roster {
  private used = new Set<string>()
  private counter = 0

  nextName(): string {
    for (const n of NAMES) {
      if (!this.used.has(n)) {
        this.used.add(n)
        return n
      }
    }
    this.counter++
    return `Grunt-${this.counter}`
  }

  reset() {
    this.used.clear()
    this.counter = 0
  }

  claim(name: string) {
    this.used.add(name)
  }
}

export function loadGraves(): Grave[] {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOTHILL_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.map((r, i) => normalizeGrave(r, i))
  } catch {
    return []
  }
}

const GRAVE_CAP = 400

export function addGraves(graves: Grave[]) {
  const all = loadGraves().concat(graves)
  if (all.length > GRAVE_CAP) {
    // The hill is the squad's memorial: when it overflows, evict the oldest
    // enemy/civilian markers first so fallen soldiers are never forgotten.
    let over = all.length - GRAVE_CAP
    for (let i = 0; i < all.length && over > 0; ) {
      if (all[i].type !== 'soldier') {
        all.splice(i, 1)
        over--
      } else i++
    }
    if (all.length > GRAVE_CAP) all.splice(0, all.length - GRAVE_CAP)
  }
  localStorage.setItem(BOOTHILL_KEY, JSON.stringify(all))
}

export function rankName(rank: number): string {
  return RANKS[Math.min(rank, RANKS.length - 1)]
}

export interface Progress {
  unlocked: number
  highScore: number
}

export function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}')
    return { unlocked: p.unlocked ?? 0, highScore: p.highScore ?? 0 }
  } catch {
    return { unlocked: 0, highScore: 0 }
  }
}

export function saveProgress(p: Progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
}
