export class GameStats {
  constructor() {
    this.levelStats = {}
    this.totalKills = 0
    this.totalRescued = 0
    this.totalMoney = 0
    this.levelStartTime = 0
    this.levelEndTime = 0
  }

  startLevel() {
    this.levelStartTime = Date.now()
  }

  finishLevel(levelId, kills, rescued, money) {
    this.levelEndTime = Date.now()
    const duration = (this.levelEndTime - this.levelStartTime) / 1000
    const speedBonus = duration < 120 ? 1000 : 0

    this.levelStats[levelId] = {
      kills,
      rescued,
      money,
      duration,
      speedBonus,
      totalReward: money + kills * 100 + rescued * 500 + speedBonus
    }

    this.totalKills += kills
    this.totalRescued += rescued
    this.totalMoney += money
  }

  getLevelScore(levelId) {
    if (!this.levelStats[levelId]) return 0
    return this.levelStats[levelId].totalReward
  }

  getTotalScore() {
    return Object.values(this.levelStats).reduce((sum, stat) => sum + stat.totalReward, 0)
  }
}
