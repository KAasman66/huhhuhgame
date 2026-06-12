// Colors - HD Cannon Fodder inspired palette
export const COLORS = {
  // Player squad - bright lime green
  player: '#22dd00',
  playerSelected: '#ffff44',
  playerHeavy: '#00aa00',
  playerScout: '#ff9944',

  // Enemy - red
  enemy: '#dd2222',
  enemyHeavy: '#990000',
  enemyScout: '#ff6666',

  // Structures
  friendlyBase: '#0099ff',
  enemyBase: '#dd2222',
  tower: '#4488dd',
  barracks: '#88dd00',
  factory: '#ffaa00',

  // Terrain
  grass: '#22aa22',
  grassDark: '#1a7a1a',
  dirt: '#5d4422',
  water: '#2266dd',

  // UI
  gridLine: '#444444',
  ui: '#22dd00',
  money: '#ffff22',
  health: '#22dd00',

  // Visual effects
  fireOrange: '#ff6600',
  fireYellow: '#ffff00',
  blood: '#dd0000',
  smoke: '#888888',
}

// Unit config
export const UNIT_CONFIG = {
  maxHealth: 100,
  moveSpeed: 100, // pixels per second
  fireRate: 0.5,
  fireRange: 200,
  size: 16,
  squadSize: 6,
  vision: 250,
}

// Building config
export const BUILDING_CONFIG = {
  barracks: {
    name: 'Barracks',
    size: 40,
    cost: 500,
    buildTime: 3,
    maxHealth: 200,
  },
  factory: {
    name: 'Factory',
    size: 50,
    cost: 800,
    buildTime: 5,
    maxHealth: 300,
  },
  watchtower: {
    name: 'Watch Tower',
    size: 30,
    cost: 300,
    buildTime: 2,
    maxHealth: 100,
    fireRange: 300,
  },
  refinery: {
    name: 'Refinery',
    size: 40,
    cost: 400,
    buildTime: 3,
    maxHealth: 150,
  },
}

// Game config
export const GAME_CONFIG = {
  gridSize: 20,
  mapWidth: 2000,
  mapHeight: 1200,
  startingMoney: 1000,
  killReward: 100,
}

// Bullet config
export const BULLET_CONFIG = {
  speed: 400,
  lifetime: 3,
  size: 4,
  damage: 25,
}
