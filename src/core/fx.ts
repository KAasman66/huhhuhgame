import { rnd } from './math'

type Kind = 'blood' | 'gib' | 'spark' | 'smoke' | 'flash' | 'ring' | 'casing' | 'debris' | 'flame'

interface Particle {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

interface FloatText {
  x: number
  y: number
  text: string
  color: string
  life: number
  maxLife: number
  size: number
}

/**
 * Particle system + floating combat text. Blood and gibs stamp permanent
 * decals into the terrain (via onStamp) when they land.
 */
export class FX {
  particles: Particle[] = []
  texts: FloatText[] = []
  /** Wired to Terrain.stampBlood by the game. */
  onStamp: ((x: number, y: number, r: number, color: string) => void) | null = null

  private add(p: Particle) {
    if (this.particles.length < 1200) this.particles.push(p)
  }

  blood(x: number, y: number, angle: number, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = angle + rnd(-0.9, 0.9)
      const s = rnd(40, 220)
      this.add({
        kind: 'blood',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rnd(0.25, 0.55),
        maxLife: 0.55,
        size: rnd(1.5, 3.5),
        color: Math.random() < 0.5 ? '#a00000' : '#cc1111',
      })
    }
  }

  gibs(x: number, y: number, n = 9) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2)
      const s = rnd(80, 320)
      this.add({
        kind: 'gib',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rnd(0.3, 0.7),
        maxLife: 0.7,
        size: rnd(2, 5),
        color: Math.random() < 0.3 ? '#7a0000' : '#b01010',
      })
    }
  }

  sparks(x: number, y: number, n = 8, color = '#ffd24a') {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2)
      const s = rnd(120, 420)
      this.add({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rnd(0.08, 0.25),
        maxLife: 0.25,
        size: rnd(1, 2.5),
        color,
      })
    }
  }

  smoke(x: number, y: number, n = 1, dark = false) {
    for (let i = 0; i < n; i++) {
      this.add({
        kind: 'smoke',
        x: x + rnd(-4, 4),
        y: y + rnd(-4, 4),
        vx: rnd(-15, 15),
        vy: rnd(-40, -15),
        life: rnd(0.6, 1.4),
        maxLife: 1.4,
        size: rnd(4, 9),
        color: dark ? '#222' : '#888',
      })
    }
  }

  explosion(x: number, y: number, r: number) {
    this.add({ kind: 'flash', x, y, vx: 0, vy: 0, life: 0.1, maxLife: 0.1, size: r * 0.8, color: '#fff7d0' })
    this.add({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35, size: r * 1.5, color: '#ffb347' })
    for (let i = 0; i < 14; i++) {
      const a = rnd(0, Math.PI * 2)
      const s = rnd(50, 260)
      this.add({
        kind: 'flame',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rnd(0.2, 0.5),
        maxLife: 0.5,
        size: rnd(3, 7),
        color: Math.random() < 0.5 ? '#ff7b00' : '#ffc400',
      })
    }
    this.smoke(x, y, 8, true)
    this.sparks(x, y, 12)
  }

  debris(x: number, y: number, n = 10, color = '#555') {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2)
      const s = rnd(60, 280)
      this.add({
        kind: 'debris',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rnd(0.3, 0.8),
        maxLife: 0.8,
        size: rnd(2, 4),
        color,
      })
    }
  }

  muzzle(x: number, y: number, angle: number) {
    this.add({
      kind: 'flash',
      x: x + Math.cos(angle) * 4,
      y: y + Math.sin(angle) * 4,
      life: 0.05,
      maxLife: 0.05,
      vx: 0,
      vy: 0,
      size: rnd(5, 8),
      color: '#ffe9a0',
    })
    // Eject a shell casing sideways
    const side = angle + Math.PI / 2
    this.add({
      kind: 'casing',
      x,
      y,
      vx: Math.cos(side) * rnd(40, 90) + Math.cos(angle) * -20,
      vy: Math.sin(side) * rnd(40, 90),
      life: 0.4,
      maxLife: 0.4,
      size: 1.5,
      color: '#d9b13b',
    })
  }

  text(x: number, y: number, text: string, color = '#fff', size = 12) {
    this.texts.push({ x, y, text, color, life: 1.1, maxLife: 1.1, size })
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'blood' || p.kind === 'gib' || p.kind === 'debris' || p.kind === 'casing') {
        p.vx *= 1 - 4 * dt
        p.vy *= 1 - 4 * dt
      }
      if (p.kind === 'smoke') {
        p.size += 8 * dt
      }
      if (p.life <= 0 && this.onStamp) {
        if (p.kind === 'blood') this.onStamp(p.x, p.y, p.size * rnd(1, 2.2), 'rgba(120,8,8,0.55)')
        if (p.kind === 'gib') this.onStamp(p.x, p.y, p.size * rnd(1.5, 2.5), 'rgba(100,4,4,0.7)')
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0)

    for (const t of this.texts) {
      t.life -= dt
      t.y -= 26 * dt
    }
    this.texts = this.texts.filter((t) => t.life > 0)
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const a = p.life / p.maxLife
      ctx.globalAlpha = p.kind === 'smoke' ? a * 0.45 : a
      ctx.fillStyle = p.color
      if (p.kind === 'ring') {
        ctx.globalAlpha = a
        ctx.strokeStyle = p.color
        ctx.lineWidth = 3 * a
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (1 - a), 0, Math.PI * 2)
        ctx.stroke()
      } else if (p.kind === 'flash') {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }
    }
    ctx.globalAlpha = 1

    ctx.textAlign = 'center'
    for (const t of this.texts) {
      const a = Math.min(1, t.life / (t.maxLife * 0.6))
      ctx.globalAlpha = a
      ctx.font = `bold ${t.size}px 'Courier New', monospace`
      ctx.fillStyle = '#000'
      ctx.fillText(t.text, t.x + 1, t.y + 1)
      ctx.fillStyle = t.color
      ctx.fillText(t.text, t.x, t.y)
    }
    ctx.globalAlpha = 1
    ctx.textAlign = 'left'
  }
}
