/**
 * Fully procedural audio: every sound is synthesized with WebAudio,
 * plus a dark military synth loop for music. No audio files.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function out(): GainNode {
  ac()
  return master!
}

function noise(): AudioBuffer {
  const a = ac()
  if (!noiseBuffer) {
    noiseBuffer = a.createBuffer(1, a.sampleRate * 1, a.sampleRate)
    const d = noiseBuffer.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

function env(g: GainNode, t: number, vol: number, dur: number, attack = 0.002) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

function burst(vol: number, dur: number, filterType: BiquadFilterType, freq: number, freqEnd?: number) {
  const a = ac()
  const t = a.currentTime
  const src = a.createBufferSource()
  src.buffer = noise()
  const f = a.createBiquadFilter()
  f.type = filterType
  f.frequency.setValueAtTime(freq, t)
  if (freqEnd !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + dur)
  const g = a.createGain()
  env(g, t, vol, dur)
  src.connect(f).connect(g).connect(out())
  src.start(t)
  src.stop(t + dur + 0.05)
}

function tone(type: OscillatorType, f0: number, f1: number, vol: number, dur: number) {
  const a = ac()
  const t = a.currentTime
  const o = a.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur)
  const g = a.createGain()
  env(g, t, vol, dur)
  o.connect(g).connect(out())
  o.start(t)
  o.stop(t + dur + 0.05)
}

/**
 * A short voiced grunt ("ah / argh / oof") for non-fatal hits. Randomises
 * fundamental, vowel formants, length and pitch-drop every call so it never
 * sounds like the same clip twice.
 */
function grunt() {
  const a = ac()
  const t = a.currentTime
  const f0 = 95 + Math.random() * 95 // 95–190 Hz
  const dur = 0.16 + Math.random() * 0.18
  const drop = 0.55 + Math.random() * 0.25
  // Vowel formant pairs: ah / uh / eh / oh
  const vowels = [
    [720, 1100],
    [600, 1000],
    [520, 1600],
    [450, 800],
  ]
  const [f1, f2] = vowels[(Math.random() * vowels.length) | 0]
  const vol = 0.16 + Math.random() * 0.07

  const o = a.createOscillator()
  o.type = Math.random() < 0.5 ? 'sawtooth' : 'square'
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(f0 * drop, 30), t + dur)

  const b1 = a.createBiquadFilter()
  b1.type = 'bandpass'
  b1.frequency.value = f1
  b1.Q.value = 7
  const b2 = a.createBiquadFilter()
  b2.type = 'bandpass'
  b2.frequency.value = f2
  b2.Q.value = 9

  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)

  o.connect(b1).connect(g)
  o.connect(b2).connect(g)
  g.connect(out())
  o.start(t)
  o.stop(t + dur + 0.05)

  // A little breath/grit on top.
  const src = a.createBufferSource()
  src.buffer = noise()
  const nf = a.createBiquadFilter()
  nf.type = 'bandpass'
  nf.frequency.value = f2
  nf.Q.value = 3
  const ng = a.createGain()
  env(ng, t, vol * 0.22, dur * 0.6)
  src.connect(nf).connect(ng).connect(out())
  src.start(t)
  src.stop(t + dur)
}

export const sfx = {
  unlock() {
    ac()
  },
  shoot() {
    // Crack + body + click, with per-shot pitch variance so rapid fire
    // doesn't sound like one looped sample.
    const p = 0.88 + Math.random() * 0.24
    burst(0.18, 0.055, 'bandpass', 2000 * p, 560 * p)
    burst(0.13, 0.13, 'lowpass', 680, 110)
    tone('square', 250 * p, 80, 0.05, 0.05)
  },
  mg() {
    const p = 0.85 + Math.random() * 0.3
    burst(0.14, 0.045, 'bandpass', 2400 * p, 900)
    burst(0.08, 0.09, 'lowpass', 560, 130)
  },
  grunt() {
    grunt()
  },
  tankShot() {
    burst(0.35, 0.25, 'lowpass', 900, 120)
    tone('sine', 120, 40, 0.3, 0.25)
  },
  explosion(big = false) {
    const dur = big ? 0.8 : 0.45
    burst(big ? 0.55 : 0.4, dur, 'lowpass', big ? 700 : 900, 60)
    tone('sine', big ? 110 : 150, 30, big ? 0.5 : 0.35, dur)
  },
  grenadePin() {
    tone('square', 900, 1400, 0.06, 0.06)
  },
  scream() {
    const a = ac()
    const t = a.currentTime
    const o = a.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(500 + Math.random() * 300, t)
    o.frequency.linearRampToValueAtTime(900 + Math.random() * 300, t + 0.08)
    o.frequency.exponentialRampToValueAtTime(150, t + 0.35)
    const g = a.createGain()
    env(g, t, 0.12, 0.35)
    o.connect(g).connect(out())
    o.start(t)
    o.stop(t + 0.4)
  },
  hurt() {
    tone('square', 200, 80, 0.08, 0.08)
  },
  pickup() {
    tone('square', 880, 880, 0.08, 0.07)
    setTimeout(() => tone('square', 1320, 1320, 0.08, 0.09), 70)
  },
  cash() {
    tone('triangle', 1200, 1200, 0.1, 0.05)
    setTimeout(() => tone('triangle', 1600, 1600, 0.1, 0.07), 60)
  },
  build() {
    burst(0.2, 0.15, 'lowpass', 500, 100)
    tone('square', 150, 100, 0.1, 0.12)
  },
  click() {
    tone('square', 700, 500, 0.05, 0.03)
  },
  denied() {
    tone('square', 220, 180, 0.1, 0.1)
    setTimeout(() => tone('square', 160, 140, 0.1, 0.12), 90)
  },
  promote() {
    tone('square', 660, 660, 0.09, 0.08)
    setTimeout(() => tone('square', 880, 880, 0.09, 0.08), 90)
    setTimeout(() => tone('square', 1100, 1100, 0.1, 0.15), 180)
  },
}

let musicOn = false

// ---------------------------------------------------------------------------
// Title music: a real track (public/audio/title.mp3), looped. Browser autoplay
// rules mean it can only start after a user gesture, so we retry on first input.
// ---------------------------------------------------------------------------

let titleEl: HTMLAudioElement | null = null
let titleWant = false

function titleAudio(): HTMLAudioElement {
  if (!titleEl) {
    titleEl = new Audio(`${import.meta.env.BASE_URL}audio/title.mp3`)
    titleEl.loop = true
    titleEl.volume = 0.6
  }
  return titleEl
}

export const titleMusic = {
  play() {
    titleWant = true
    titleAudio().play().catch(() => {
      /* blocked until a user gesture — the unlock listener will retry */
    })
  },
  stop() {
    titleWant = false
    if (titleEl) {
      titleEl.pause()
      titleEl.currentTime = 0
    }
  },
  get on() {
    return titleWant
  },
}

// ---------------------------------------------------------------------------
// In-mission music: one real track per level, cycling every 3 levels
// (level 1→track1, 2→track2, 3→track3, 4→track1, ...). Looped HTMLAudio.
// ---------------------------------------------------------------------------

const LEVEL_TRACKS = ['level1.mp3', 'level2.mp3', 'level3.mp3'].map(
  (f) => `${import.meta.env.BASE_URL}audio/${f}`,
)
const levelEls: (HTMLAudioElement | null)[] = [null, null, null]
let curTrack: HTMLAudioElement | null = null
let curIdx = 0

function levelAudio(i: number): HTMLAudioElement {
  if (!levelEls[i]) {
    const el = new Audio(LEVEL_TRACKS[i])
    el.loop = true
    el.volume = 0.5
    levelEls[i] = el
  }
  return levelEls[i]!
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    if (titleWant && titleEl && titleEl.paused) titleEl.play().catch(() => {})
    if (musicOn && curTrack && curTrack.paused) curTrack.play().catch(() => {})
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export const music = {
  get on() {
    return musicOn
  },
  /** Play the track for a 0-based level index, cycling every 3 levels. */
  playLevel(level0: number) {
    const idx = ((level0 % 3) + 3) % 3
    musicOn = true
    const next = levelAudio(idx)
    if (curTrack && curTrack !== next) {
      curTrack.pause()
      curTrack.currentTime = 0
    }
    curIdx = idx
    curTrack = next
    next.currentTime = 0
    next.play().catch(() => {
      /* blocked until a user gesture — the unlock listener retries */
    })
  },
  start() {
    this.playLevel(curIdx)
  },
  stop() {
    musicOn = false
    if (curTrack) curTrack.pause()
  },
  toggle() {
    musicOn ? music.stop() : music.start()
  },
}
