const keys = {}
let mouseX = 0
let mouseY = 0
let selectedBuild = null

export function initInput(game, canvas) {
  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true

    if (e.key.toLowerCase() === 'e') {
      game.toggleBuildMenu()
      selectedBuild = null
    }
    if (e.key.toLowerCase() === 'escape') {
      game.closeBuildMenu()
    }

    // Build selection
    if (game.buildMenuOpen) {
      if (e.key === '1') selectedBuild = 'watchtower'
      if (e.key === '2') selectedBuild = 'barracks'
      if (e.key === '3') selectedBuild = 'factory'
    }

    // Vehicle spawn
    if (e.key === ' ') {
      e.preventDefault()
      if (game.money >= 200 && !game.buildMenuOpen) {
        game.spawnVehicle('jeep')
      }
    }
    if (e.key === 'Shift') {
      if (game.money >= 400 && !game.buildMenuOpen) {
        game.spawnVehicle('tank')
      }
    }

    // Level restart/next
    if (e.key === 'r' || e.key === 'R') {
      location.reload()
    }

    // Next level
    if (e.key === 'n' || e.key === 'N') {
      if (game.levelComplete) {
        game.nextLevel()
      }
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
