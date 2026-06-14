export const FOG_CELL = 40

const UNSEEN = 0
const EXPLORED = 1
const VISIBLE = 2

/**
 * Red Alert style fog of war on a coarse grid, rendered through a tiny
 * offscreen canvas scaled up with smoothing for soft edges.
 */
export class Fog {
  cols: number
  rows: number
  state: Uint8Array
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor(
    public worldW: number,
    public worldH: number,
  ) {
    this.cols = Math.ceil(worldW / FOG_CELL)
    this.rows = Math.ceil(worldH / FOG_CELL)
    this.state = new Uint8Array(this.cols * this.rows)
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.cols
    this.canvas.height = this.rows
    this.ctx = this.canvas.getContext('2d')!
  }

  update(viewers: { x: number; y: number; range: number }[]) {
    // Downgrade visible -> explored
    for (let i = 0; i < this.state.length; i++) {
      if (this.state[i] === VISIBLE) this.state[i] = EXPLORED
    }
    for (const v of viewers) {
      const r = v.range / FOG_CELL
      const cx = v.x / FOG_CELL
      const cy = v.y / FOG_CELL
      const minX = Math.max(0, Math.floor(cx - r))
      const maxX = Math.min(this.cols - 1, Math.ceil(cx + r))
      const minY = Math.max(0, Math.floor(cy - r))
      const maxY = Math.min(this.rows - 1, Math.ceil(cy + r))
      for (let gy = minY; gy <= maxY; gy++) {
        for (let gx = minX; gx <= maxX; gx++) {
          const dx = gx + 0.5 - cx
          const dy = gy + 0.5 - cy
          if (dx * dx + dy * dy <= r * r) this.state[gy * this.cols + gx] = VISIBLE
        }
      }
    }
  }

  isVisible(x: number, y: number): boolean {
    const i = Math.floor(y / FOG_CELL) * this.cols + Math.floor(x / FOG_CELL)
    return this.state[i] === VISIBLE
  }

  isExplored(x: number, y: number): boolean {
    const i = Math.floor(y / FOG_CELL) * this.cols + Math.floor(x / FOG_CELL)
    return this.state[i] >= EXPLORED
  }

  revealAll() {
    this.state.fill(EXPLORED)
  }

  /**
   * Mark a world-space rectangle as at least explored. Used so a building's
   * tall sprite isn't sliced in half by fog covering the cells above its base.
   */
  exploreRect(left: number, top: number, right: number, bottom: number) {
    const gx0 = Math.max(0, Math.floor(left / FOG_CELL))
    const gy0 = Math.max(0, Math.floor(top / FOG_CELL))
    const gx1 = Math.min(this.cols - 1, Math.floor(right / FOG_CELL))
    const gy1 = Math.min(this.rows - 1, Math.floor(bottom / FOG_CELL))
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const i = gy * this.cols + gx
        if (this.state[i] === UNSEEN) this.state[i] = EXPLORED
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const c = this.ctx
    c.clearRect(0, 0, this.cols, this.rows)
    for (let gy = 0; gy < this.rows; gy++) {
      for (let gx = 0; gx < this.cols; gx++) {
        const s = this.state[gy * this.cols + gx]
        if (s === VISIBLE) continue
        c.fillStyle = s === UNSEEN ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,0.45)'
        c.fillRect(gx, gy, 1, 1)
      }
    }
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.canvas, 0, 0, this.cols, this.rows, 0, 0, this.cols * FOG_CELL, this.rows * FOG_CELL)
  }
}
