import { GameState } from './game.js'
import { initInput, update as updateInput } from './input.js'

const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

canvas.width = 2000
canvas.height = 1200

const game = new GameState(canvas.width, canvas.height)
initInput(game, canvas)

let lastTime = 0
const FPS = 60
const deltaTime = 1000 / FPS

function gameLoop(currentTime) {
  if (currentTime - lastTime >= deltaTime) {
    updateInput(game)
    if (game.gameStarted && !game.levelComplete && !game.levelFailed) {
      game.update(deltaTime / 1000)
    }

    // Camera follows player (with fallback)
    const playerX = game.squad && game.squad.selectedUnit ? game.squad.selectedUnit.x : game.width / 2
    const playerY = game.squad && game.squad.selectedUnit ? game.squad.selectedUnit.y : game.height / 2
    const cameraX = Math.max(canvas.width / 2, Math.min(playerX - canvas.width / 2, game.width - canvas.width / 2))
    const cameraY = Math.max(canvas.height / 2, Math.min(playerY - canvas.height / 2, game.height - canvas.height / 2))

    ctx.save()
    ctx.translate(-cameraX + canvas.width / 2, -cameraY + canvas.height / 2)
    game.render(ctx)
    ctx.restore()

    lastTime = currentTime
  }
  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)
