export const CAMPAIGN_LEVELS = [
  {
    id: 1,
    name: 'Training Ground',
    description: 'Survive 3 waves',
    startingMoney: 2000,
    enemyWaves: 3,
    objectives: ['Survive 3 waves', 'Protect base'],
    startPos: { x: 200, y: 600 },
    buildingStart: [
      { x: 1700, y: 300, type: 'watchtower' },
      { x: 400, y: 600, type: 'watchtower' }
    ]
  },
  {
    id: 2,
    name: 'Reinforcements Incoming',
    description: 'Survive 5 waves and destroy enemy base',
    startingMoney: 3000,
    enemyWaves: 5,
    objectives: ['Survive 5 waves', 'Destroy enemy base'],
    startPos: { x: 300, y: 600 },
    buildingStart: [
      { x: 1700, y: 300, type: 'watchtower' },
      { x: 1700, y: 900, type: 'watchtower' },
      { x: 400, y: 600, type: 'watchtower' }
    ],
    enemyBase: { x: 1850, y: 600, health: 300 }
  },
  {
    id: 3,
    name: 'Siege Tactics',
    description: 'Build defenses and survive assault',
    startingMoney: 5000,
    enemyWaves: 8,
    objectives: ['Survive 8 waves', 'Build at least 2 towers', 'Keep HQ alive'],
    startPos: { x: 200, y: 600 },
    buildingStart: [
      { x: 1700, y: 200, type: 'watchtower' },
      { x: 1700, y: 1000, type: 'watchtower' }
    ],
    allowBuilding: true
  },
  {
    id: 4,
    name: 'Industrial Complex',
    description: 'Produce vehicles and defend factory',
    startingMoney: 6000,
    enemyWaves: 10,
    objectives: ['Produce 3 vehicles', 'Survive 10 waves'],
    startPos: { x: 200, y: 600 },
    buildingStart: [
      { x: 1700, y: 300, type: 'watchtower' },
      { x: 1700, y: 900, type: 'watchtower' },
      { x: 1000, y: 600, type: 'factory' }
    ],
    allowBuilding: true,
    allowVehicles: true
  },
  {
    id: 5,
    name: 'Total War',
    description: 'Endless assault - survive as long as possible',
    startingMoney: 8000,
    enemyWaves: 20,
    objectives: ['Survive endless waves', 'Rack up kills'],
    startPos: { x: 200, y: 600 },
    buildingStart: [
      { x: 1700, y: 300, type: 'watchtower' },
      { x: 400, y: 300, type: 'watchtower' },
      { x: 1700, y: 900, type: 'watchtower' },
      { x: 400, y: 900, type: 'watchtower' }
    ],
    allowBuilding: true,
    allowVehicles: true,
    endless: true
  }
]
