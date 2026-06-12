// Colors
export const COLORS = {
  player: '#00ff00',
  playerSelected: '#ffff00',
  enemy: '#ff0000',
  friendlyBase: '#0088ff',
  enemyBase: '#ff0000',
  grass: '#1a4d1a',
  dirt: '#3d2817',
  gridLine: '#333333',
  ui: '#00ff00',
  money: '#00ff00',
  health: '#00ff00',
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
  mapWidth: 1280,
  mapHeight: 720,
  startingMoney: 1000,
  killReward: 100,
}
