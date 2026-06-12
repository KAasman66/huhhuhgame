import { Game, VIEW_W, VIEW_H } from './game/game'
import { art } from './core/art'

const canvas = document.getElementById('game') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

canvas.width = VIEW_W
canvas.height = VIEW_H

// Load AI art first (fast, local); the game falls back to procedural
// graphics for anything the sheets don't provide.
art.load().then(() => {
  const game = new Game(canvas)
  // Debug/test handle (handy in the console)
  ;(window as unknown as { game: Game }).game = game

  let last = performance.now()

  function frame(now: number) {
    // Clamp delta: tab switches must not teleport the battle
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    game.update(dt)
    game.render(ctx)
    requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
})
