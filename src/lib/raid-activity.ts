type RaidWithStart = {
  id: string
  serverId: string
  startDate?: Date | string | null
}

function startTime(value?: Date | string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

export function getActiveRaidIds<T extends RaidWithStart>(raids: T[]) {
  const activeByServer = new Map<string, T>()

  raids.forEach((raid) => {
    const current = activeByServer.get(raid.serverId)
    if (!current || startTime(raid.startDate) < startTime(current.startDate)) {
      activeByServer.set(raid.serverId, raid)
    }
  })

  return new Set(Array.from(activeByServer.values()).map((raid) => raid.id))
}

export function withRaidActivity<T extends RaidWithStart>(raids: T[]) {
  const activeIds = getActiveRaidIds(raids)
  return raids.map((raid) => ({ ...raid, isActive: activeIds.has(raid.id) }))
}
