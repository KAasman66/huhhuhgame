import { GameState } from './game.js'
import { initInput, update as updateInput } from './input.js'

const canvas = document.getElementById('gameCanvas')
const ctx = canvas.getContext('2d')

canvas.width = 1280
canvas.height = 720

const game = new GameState(canvas.width, canvas.height)
initInput(game, canvas)

let lastTime = 0
const FPS = 60
const deltaTime = 1000 / FPS

function gameLoop(currentTime) {
  if (currentTime - lastTime >= deltaTime) {
    updateInput(game)
    game.update(deltaTime / 1000)
    game.render(ctx)
    lastTime = currentTime
  }
  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)
