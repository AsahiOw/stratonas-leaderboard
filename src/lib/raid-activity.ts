type RaidWithStart = {
  id: string
  serverId: string
  startDate?: Date | string | null
}

function startTime(value?: Date | string | null) {
  if (!value) return Number.NEGATIVE_INFINITY
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

export function getActiveRaidIds<T extends RaidWithStart>(raids: T[], now = new Date()) {
  const latestByServer = new Map<string, T>()
  const nowTime = now.getTime()

  raids.forEach((raid) => {
    const raidStart = startTime(raid.startDate)
    if (raidStart > nowTime) return
    const current = latestByServer.get(raid.serverId)
    if (!current || startTime(raid.startDate) > startTime(current.startDate)) {
      latestByServer.set(raid.serverId, raid)
    }
  })

  return new Set(Array.from(latestByServer.values()).map((raid) => raid.id))
}

export function withRaidActivity<T extends RaidWithStart>(raids: T[]) {
  const activeIds = getActiveRaidIds(raids)
  return raids.map((raid) => ({ ...raid, isActive: activeIds.has(raid.id) }))
}
