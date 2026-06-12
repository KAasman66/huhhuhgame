import { RANKS } from '../entities/soldier'

/** Cannon Fodder tradition: every recruit has a name, and the dead are remembered. */
const NAMES = [
  'Jools', 'Jops', 'Stoo', 'RJ', 'Ubik', 'Trog', 'Spex', 'Mitch', 'Boyo', 'Dave',
  'Kenny', 'Murf', 'Ziggy', 'Hank', 'Buzz', 'Rico', 'Duke', 'Tex', 'Spud', 'Knux',
  'Chip', 'Gonzo', 'Vince', 'Bo', 'Skip', 'Moss', 'Fitz', 'Red', 'Ace', 'Wally',
  'Champ', 'Bingo', 'Norm', 'Pat', 'Stan', 'Gus', 'Olly', 'Zeke', 'Bram', 'Cyrus',
  'Dutch', 'Elmo', 'Fritz', 'Goose', 'Huck', 'Iggy', 'Jinx', 'Kip', 'Lemmy', 'Mack',
]

export interface Grave {
  name: string
  kills: number
  rank: number
  mission: string
}

const BOOTHILL_KEY = 'chaosfodder.boothill'
const PROGRESS_KEY = 'chaosfodder.progress'

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
    return JSON.parse(localStorage.getItem(BOOTHILL_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function addGraves(graves: Grave[]) {
  const all = loadGraves()
  all.push(...graves)
  localStorage.setItem(BOOTHILL_KEY, JSON.stringify(all.slice(-200)))
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
