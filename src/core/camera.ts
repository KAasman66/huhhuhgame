import { clamp } from './math'

export class Camera {
  x = 0
  y = 0
  private shakeTime = 0
  private shakeDur = 0
  private shakeAmp = 0
  private ox = 0
  private oy = 0

  constructor(
    public w: number,
    public h: number,
  ) {}

  follow(tx: number, ty: number, worldW: number, worldH: number, dt: number) {
    const goalX = clamp(tx - this.w / 2, 0, Math.max(0, worldW - this.w))
    const goalY = clamp(ty - this.h / 2, 0, Math.max(0, worldH - this.h))
    const k = 1 - Math.exp(-8 * dt)
    this.x += (goalX - this.x) * k
    this.y += (goalY - this.y) * k

    if (this.shakeTime > 0) {
      this.shakeTime -= dt
      const f = (this.shakeTime / this.shakeDur) * this.shakeAmp
      this.ox = (Math.random() * 2 - 1) * f
      this.oy = (Math.random() * 2 - 1) * f
    } else {
      this.ox = 0
      this.oy = 0
    }
  }

  shake(amp = 8, dur = 0.35) {
    if (amp >= this.shakeAmp * (this.shakeTime / Math.max(this.shakeDur, 0.001))) {
      this.shakeAmp = amp
      this.shakeDur = dur
      this.shakeTime = dur
    }
  }

  jumpTo(tx: number, ty: number, worldW: number, worldH: number) {
    this.x = clamp(tx - this.w / 2, 0, Math.max(0, worldW - this.w))
    this.y = clamp(ty - this.h / 2, 0, Math.max(0, worldH - this.h))
  }

  begin(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.translate(-Math.round(this.x + this.ox), -Math.round(this.y + this.oy))
  }

  end(ctx: CanvasRenderingContext2D) {
    ctx.restore()
  }

  toWorldX(sx: number) {
    return sx + this.x
  }
  toWorldY(sy: number) {
    return sy + this.y
  }

  /** Is a world-space circle at all visible on screen? */
  sees(x: number, y: number, r = 50): boolean {
    return x + r > this.x && x - r < this.x + this.w && y + r > this.y && y - r < this.y + this.h
  }
}
