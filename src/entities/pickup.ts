export type PickupType = 'cash' | 'medkit' | 'grenades'

export class Pickup {
  alive = true
  life = 18
  private bob = Math.random() * 10

  constructor(
    public x: number,
    public y: number,
    public type: PickupType,
    /** Cash value for 'cash' pickups. */
    public value = 100,
  ) {}

  update(dt: number) {
    this.life -= dt
    this.bob += dt * 4
    if (this.life <= 0) this.alive = false
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.alive) return
    const y = this.y + Math.sin(this.bob) * 2
    const blink = this.life < 4 && Math.floor(this.life * 5) % 2 === 0
    if (blink) return

    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(this.x, this.y + 6, 7, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()

    if (this.type === 'cash') {
      ctx.fillStyle = '#7a5c1e'
      ctx.fillRect(this.x - 7, y - 6, 14, 11)
      ctx.strokeStyle = '#cfa53a'
      ctx.lineWidth = 1.5
      ctx.strokeRect(this.x - 7, y - 6, 14, 11)
      ctx.fillStyle = '#ffe14a'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('$', this.x, y + 3)
      ctx.textAlign = 'left'
    } else if (this.type === 'medkit') {
      ctx.fillStyle = '#e8e8e0'
      ctx.fillRect(this.x - 7, y - 6, 14, 11)
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1
      ctx.strokeRect(this.x - 7, y - 6, 14, 11)
      ctx.fillStyle = '#d03030'
      ctx.fillRect(this.x - 1.5, y - 4, 3, 7)
      ctx.fillRect(this.x - 4.5, y - 1, 9, 3)
    } else {
      ctx.fillStyle = '#2f4f2f'
      ctx.fillRect(this.x - 7, y - 6, 14, 11)
      ctx.strokeStyle = '#557755'
      ctx.lineWidth = 1
      ctx.strokeRect(this.x - 7, y - 6, 14, 11)
      ctx.fillStyle = '#aacc66'
      ctx.beginPath()
      ctx.arc(this.x, y - 0.5, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
