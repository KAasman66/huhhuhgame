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

export const sfx = {
  unlock() {
    ac()
  },
  shoot() {
    burst(0.16, 0.07, 'bandpass', 1800, 500)
    tone('square', 220, 90, 0.05, 0.05)
  },
  mg() {
    burst(0.14, 0.05, 'bandpass', 2200, 800)
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

// ---------------------------------------------------------------------------
// Music: minimal dark synth loop (A minor), scheduled with lookahead.
// ---------------------------------------------------------------------------

const BPM = 96
const STEP = 60 / BPM / 2 // 8th notes
const BASS = [55, 55, 0, 55, 65.4, 0, 49, 49, 55, 55, 0, 55, 73.4, 0, 65.4, 49]

let musicOn = false
let timer: number | null = null
let nextStep = 0
let stepIdx = 0

function scheduleStep(t: number, i: number) {
  const a = ac()
  // Kick on quarters
  if (i % 4 === 0) {
    const o = a.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(120, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    const g = a.createGain()
    g.gain.setValueAtTime(0.22, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    o.connect(g).connect(out())
    o.start(t)
    o.stop(t + 0.16)
  }
  // Hat on off-beats
  if (i % 2 === 1) {
    const src = a.createBufferSource()
    src.buffer = noise()
    const f = a.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 7000
    const g = a.createGain()
    g.gain.setValueAtTime(0.04, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    src.connect(f).connect(g).connect(out())
    src.start(t)
    src.stop(t + 0.06)
  }
  // Bass line
  const f0 = BASS[i % BASS.length]
  if (f0 > 0) {
    const o = a.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f0
    const fl = a.createBiquadFilter()
    fl.type = 'lowpass'
    fl.frequency.value = 350
    const g = a.createGain()
    g.gain.setValueAtTime(0.085, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + STEP * 0.9)
    o.connect(fl).connect(g).connect(out())
    o.start(t)
    o.stop(t + STEP)
  }
}

// ---------------------------------------------------------------------------
// Title music: a real track (public/audio/title.mp3), looped. Browser autoplay
// rules mean it can only start after a user gesture, so we retry on first input.
// ---------------------------------------------------------------------------

let titleEl: HTMLAudioElement | null = null
let titleWant = false

function titleAudio(): HTMLAudioElement {
  if (!titleEl) {
    titleEl = new Audio('/audio/title.mp3')
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

if (typeof window !== 'undefined') {
  const unlock = () => {
    if (titleWant && titleEl && titleEl.paused) titleEl.play().catch(() => {})
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export const music = {
  get on() {
    return musicOn
  },
  start() {
    if (musicOn) return
    musicOn = true
    const a = ac()
    nextStep = a.currentTime + 0.05
    timer = window.setInterval(() => {
      const now = ac().currentTime
      while (nextStep < now + 0.15) {
        scheduleStep(nextStep, stepIdx)
        nextStep += STEP
        stepIdx++
      }
    }, 40)
  },
  stop() {
    musicOn = false
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  },
  toggle() {
    musicOn ? music.stop() : music.start()
  },
}
