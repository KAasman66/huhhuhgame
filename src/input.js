const keys = {}
let mouseX = 0
let mouseY = 0

export function initInput(game, canvas) {
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true

    if (e.key.toLowerCase() === 'e') {
      game.toggleBuildMenu()
    }
    if (e.key.toLowerCase() === 'escape') {
      game.closeBuildMenu()
    }
  })

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false
  })

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top
  })

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect()
    mouseX = e.clientX - rect.left
    mouseY = e.clientY - rect.top

    if (!game.buildMenuOpen) {
      game.handleMapClick(mouseX, mouseY)
    }
  })
}

export function update(game) {
  // Movement
  if (keys['a']) {
    game.handleKeyA()
  }

  // Spread
  if (keys['s']) {
    game.squad.spreadFormation()
  }

  // Defend
  if (keys['d']) {
    game.squad.defendHold()
  }

  game.mouseX = mouseX
  game.mouseY = mouseY
}
