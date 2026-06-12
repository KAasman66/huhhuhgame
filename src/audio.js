export class SoundFX {
  static ctx = null

  static init() {
    if (!SoundFX.ctx) {
      SoundFX.ctx = new (window.AudioContext || window.webkitAudioContext)()
    }
  }

  static playBeep(freq = 440, duration = 0.1, volume = 0.1) {
    if (!SoundFX.ctx) SoundFX.init()

    const osc = SoundFX.ctx.createOscillator()
    const gain = SoundFX.ctx.createGain()

    osc.connect(gain)
    gain.connect(SoundFX.ctx.destination)

    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, SoundFX.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, SoundFX.ctx.currentTime + duration)

    osc.start(SoundFX.ctx.currentTime)
    osc.stop(SoundFX.ctx.currentTime + duration)
  }

  static gunFire() {
    SoundFX.playBeep(800, 0.05, 0.15)
  }

  static explosion() {
    SoundFX.playBeep(200, 0.3, 0.2)
    setTimeout(() => SoundFX.playBeep(150, 0.2, 0.15), 50)
  }

  static powerup() {
    SoundFX.playBeep(1200, 0.1, 0.1)
    setTimeout(() => SoundFX.playBeep(1400, 0.1, 0.1), 100)
  }

  static error() {
    SoundFX.playBeep(300, 0.15, 0.1)
    setTimeout(() => SoundFX.playBeep(250, 0.15, 0.1), 100)
  }
}
