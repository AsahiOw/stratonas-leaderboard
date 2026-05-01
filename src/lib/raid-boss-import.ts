import { prisma } from '@/lib/prisma'

export const RAID_BOSS_IMPORT_ID = 'schaledb-raid-bosses'
const SCHALE_RAIDS_URL = 'https://schaledb.com/data/en/raids.json'
const BATCH_SIZE = 25
const PATTERNS = ['hex', 'grid', 'diamond', 'dot'] as const
type RaidBossPattern = (typeof PATTERNS)[number]

type SchaleRaidBoss = {
  Id?: unknown
  Name?: unknown
  DevName?: unknown
  ArmorType?: unknown
}

function armorColor(armorType: unknown): string {
  switch (armorType) {
    case 'HeavyArmor':
      return '#FFD700'
    case 'Unarmed':
      return '#4D94FF'
    case 'LightArmor':
      return '#FF4D4D'
    case 'ElasticArmor':
      return '#A349A4'
    default:
      return '#4f8ef7'
  }
}

function raidBossImageUrl(devName: string): string {
  return `https://schaledb.com/images/raid/Boss_Portrait_${devName}_Lobby.png`
}

export function defaultRaidBossImportState() {
  return {
    id: RAID_BOSS_IMPORT_ID,
    status: 'idle',
    total: 0,
    processed: 0,
    added: 0,
    skipped: 0,
    error: null as string | null,
    startedAt: null as Date | null,
    completedAt: null as Date | null,
  }
}

export async function getRaidBossImportState() {
  return (await prisma.raidBossImportState.findUnique({
    where: { id: RAID_BOSS_IMPORT_ID },
  })) || defaultRaidBossImportState()
}

async function ensureRaidBossImportState() {
  await prisma.raidBossImportState.upsert({
    where: { id: RAID_BOSS_IMPORT_ID },
    update: {},
    create: {
      id: RAID_BOSS_IMPORT_ID,
      status: 'idle',
      updatedAt: new Date(),
    },
  })
}

export async function startRaidBossImport() {
  await ensureRaidBossImportState()

  const lock = await prisma.raidBossImportState.updateMany({
    where: { id: RAID_BOSS_IMPORT_ID, NOT: { status: 'running' } },
    data: {
      status: 'running',
      total: 0,
      processed: 0,
      added: 0,
      skipped: 0,
      error: null,
      startedAt: new Date(),
      completedAt: null,
    },
  })

  if (lock.count === 0) return false

  void runRaidBossImport()
  return true
}

async function runRaidBossImport() {
  let processed = 0
  let added = 0
  let skipped = 0

  try {
    const res = await fetch(SCHALE_RAIDS_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`SchaleDB request failed with ${res.status}`)

    const raw = await res.json()
    const raidData = raw as { Raid?: SchaleRaidBoss[] }
    const values = Array.isArray(raw) ? raw : Array.isArray(raidData.Raid) ? raidData.Raid : []
    const importedBosses = values
      .map((boss, index) => {
        const data = boss as SchaleRaidBoss
        const schaleId = Number(data.Id)
        const name = typeof data.Name === 'string' ? data.Name.trim() : ''
        const devName = typeof data.DevName === 'string' ? data.DevName.trim() : ''
        if (!Number.isInteger(schaleId) || schaleId <= 0 || !name || !devName) return null
        return {
          schaleId,
          name,
          description: '',
          image: raidBossImageUrl(devName),
          color: armorColor(data.ArmorType),
          color2: '#FFFFFF',
          pattern: PATTERNS[index % PATTERNS.length],
        }
      })
      .filter((boss): boss is {
        schaleId: number
        name: string
        description: string
        image: string
        color: string
        color2: string
        pattern: RaidBossPattern
      } => Boolean(boss))

    await prisma.raidBossImportState.update({
      where: { id: RAID_BOSS_IMPORT_ID },
      data: { total: importedBosses.length },
    })

    const existing = await prisma.raidBoss.findMany({
      where: {
        OR: [
          { schaleId: { in: importedBosses.map((boss) => boss.schaleId) } },
          { name: { in: importedBosses.map((boss) => boss.name) } },
        ],
      },
      select: { schaleId: true, name: true },
    })
    const existingIds = new Set(existing.map((boss) => boss.schaleId).filter((id): id is number => id !== null))
    const existingNames = new Set(existing.map((boss) => boss.name.toLowerCase()))

    for (let i = 0; i < importedBosses.length; i += BATCH_SIZE) {
      const batch = importedBosses.slice(i, i + BATCH_SIZE)
      const rowsToCreate = batch.filter((boss) => (
        !existingIds.has(boss.schaleId) && !existingNames.has(boss.name.toLowerCase())
      ))
      const result = rowsToCreate.length
        ? await prisma.raidBoss.createMany({ data: rowsToCreate, skipDuplicates: true })
        : { count: 0 }

      processed += batch.length
      added += result.count
      skipped += batch.length - result.count

      await prisma.raidBossImportState.update({
        where: { id: RAID_BOSS_IMPORT_ID },
        data: { processed, added, skipped },
      })
    }

    await prisma.raidBossImportState.update({
      where: { id: RAID_BOSS_IMPORT_ID },
      data: {
        status: 'completed',
        processed,
        added,
        skipped,
        error: null,
        completedAt: new Date(),
      },
    })
  } catch (error) {
    await prisma.raidBossImportState.update({
      where: { id: RAID_BOSS_IMPORT_ID },
      data: {
        status: 'failed',
        processed,
        added,
        skipped,
        error: error instanceof Error ? error.message : 'Import failed',
        completedAt: new Date(),
      },
    })
  }
}
