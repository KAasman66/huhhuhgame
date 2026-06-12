export interface ClickEvent {
  x: number
  y: number
  button: 0 | 2
}

/**
 * Keyboard + mouse state. Mouse coordinates are in internal canvas pixels
 * (CSS scaling compensated). Clicks are queued and consumed once per frame.
 */
export class Input {
  keys = new Set<string>()
  private justPressed = new Set<string>()
  mx = 0
  my = 0
  leftDown = false
  rightDown = false
  clicks: ClickEvent[] = []

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'tab') e.preventDefault()
      if (!e.repeat) this.justPressed.add(k)
      this.keys.add(k)
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()))
    window.addEventListener('blur', () => {
      this.keys.clear()
      this.leftDown = false
      this.rightDown = false
    })

    canvas.addEventListener('mousemove', (e) => {
      const p = this.toCanvas(e)
      this.mx = p.x
      this.my = p.y
    })
    canvas.addEventListener('mousedown', (e) => {
      const p = this.toCanvas(e)
      this.mx = p.x
      this.my = p.y
      if (e.button === 0) {
        this.leftDown = true
        this.clicks.push({ x: p.x, y: p.y, button: 0 })
      } else if (e.button === 2) {
        this.rightDown = true
        this.clicks.push({ x: p.x, y: p.y, button: 2 })
      }
    })
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.leftDown = false
      if (e.button === 2) this.rightDown = false
    })
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  private toCanvas(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    }
  }

  /** True only on the frame the key went down. */
  pressed(key: string): boolean {
    return this.justPressed.has(key)
  }

  /** Call at the end of every frame. */
  endFrame() {
    this.justPressed.clear()
    this.clicks.length = 0
  }
}
