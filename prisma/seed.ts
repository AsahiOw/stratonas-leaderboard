import { PrismaClient, Role, PlayerStatus, Server, RaidStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Admin user ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@stratonas.gg' },
    update: {},
    create: {
      email: 'admin@stratonas.gg',
      name: 'Admin',
      passwordHash,
      role: Role.ADMIN,
    },
  })
  console.log('✓ Admin user created')

  // ── Players ─────────────────────────────────────────────────────────────────
  const playersData = [
    { ign: 'ShadowReaper', username: 'shadowreaper_x', favouriteStudent: 'Hoshino', joinedDate: new Date('2026-01-15'), club: 'Millennium', clubID: 'MIL001', userID: 'USR001', status: PlayerStatus.ACTIVE },
    { ign: 'NightVortex',  username: 'night_vortex',   favouriteStudent: 'Shiroko', joinedDate: new Date('2026-01-18'), club: 'Trinity',    clubID: 'TRI001', userID: 'USR002', status: PlayerStatus.ACTIVE },
    { ign: 'IronPhantom',  username: 'iron_phantom',   favouriteStudent: 'Yuuka',   joinedDate: new Date('2026-02-03'), club: 'Millennium', clubID: 'MIL001', userID: 'USR003', status: PlayerStatus.ACTIVE },
    { ign: 'BlazeCrafter', username: 'blaze_crafter',  favouriteStudent: 'Aris',    joinedDate: new Date('2026-02-10'), club: 'Gehenna',    clubID: 'GEH001', userID: 'USR004', status: PlayerStatus.ACTIVE },
    { ign: 'FrostEdge',    username: 'frost_edge',     favouriteStudent: 'Natsu',   joinedDate: new Date('2026-02-20'), club: 'Abydos',     clubID: 'ABY001', userID: 'USR005', status: PlayerStatus.INACTIVE },
    { ign: 'VoidStriker',  username: 'void_striker',   favouriteStudent: 'Hibiki',  joinedDate: new Date('2026-03-01'), club: 'Trinity',    clubID: 'TRI001', userID: 'USR006', status: PlayerStatus.ACTIVE },
    { ign: 'StormBringer', username: 'storm_bringer',  favouriteStudent: 'Kayoko',  joinedDate: new Date('2026-03-05'), club: 'Gehenna',    clubID: 'GEH001', userID: 'USR007', status: PlayerStatus.ACTIVE },
    { ign: 'ArcaneWarden', username: 'arcane_warden',  favouriteStudent: 'Neru',    joinedDate: new Date('2026-03-08'), club: 'Millennium', clubID: 'MIL001', userID: 'USR008', status: PlayerStatus.ACTIVE },
    { ign: 'CrimsonBolt',  username: 'crimson_bolt',   favouriteStudent: 'Haruna',  joinedDate: new Date('2026-01-28'), club: 'Valkyrie',   clubID: 'VAL001', userID: 'USR009', status: PlayerStatus.ACTIVE },
    { ign: 'EmberWolf',    username: 'ember_wolf',     favouriteStudent: 'Mutsuki', joinedDate: new Date('2026-03-12'), club: 'Abydos',     clubID: 'ABY001', userID: 'USR010', status: PlayerStatus.ACTIVE },
  ]

  const playerMap: Record<string, string> = {}
  for (const p of playersData) {
    const player = await prisma.player.upsert({
      where: { ign: p.ign },
      update: {},
      create: p,
    })
    playerMap[p.ign] = player.id
  }
  console.log('✓ 10 players created')

  // ── Raids ───────────────────────────────────────────────────────────────────
  const raidsData = [
    {
      name: 'Void Sanctum',  episode: 'Episode IV',  season: 'Season 3', server: Server.GLOBAL, status: RaidStatus.CURRENT,
      color: '#4f8ef7', color2: '#7c3aed', pattern: 'hex',
      desc: 'Navigate the collapsed dimensions of the Void, where reality fractures with every step.',
      startDate: new Date('2026-04-15'), endDate: new Date('2026-05-15'),
    },
    {
      name: 'Crimson Forge', episode: 'Episode IV',  season: 'Season 3', server: Server.JP,     status: RaidStatus.CURRENT,
      color: '#f87171', color2: '#f59e0b', pattern: 'grid',
      desc: 'Conquer the molten stronghold at the heart of Mount Igaris before it erupts.',
      startDate: new Date('2026-04-20'), endDate: new Date('2026-05-20'),
    },
    {
      name: 'Void Sanctum',  episode: 'Episode III', season: 'Season 2', server: Server.GLOBAL, status: RaidStatus.PREVIOUS,
      color: '#4f8ef7', color2: '#7c3aed', pattern: 'hex',
      desc: 'The third descent into the shattered realm of the Void.',
      startDate: new Date('2026-02-01'), endDate: new Date('2026-03-15'),
    },
    {
      name: 'Crimson Forge', episode: 'Episode III', season: 'Season 2', server: Server.JP,     status: RaidStatus.PREVIOUS,
      color: '#f87171', color2: '#f59e0b', pattern: 'grid',
      desc: 'The forge runs hotter than ever in this brutal third installment.',
      startDate: new Date('2026-02-05'), endDate: new Date('2026-03-20'),
    },
    {
      name: 'Abyssal Keep',  episode: 'Episode II',  season: 'Season 1', server: Server.GLOBAL, status: RaidStatus.PREVIOUS,
      color: '#a78bfa', color2: '#34d399', pattern: 'diamond',
      desc: 'Breach the ancient keep that stands between the mortal realm and the Abyss.',
      startDate: new Date('2025-11-10'), endDate: new Date('2025-12-25'),
    },
    {
      name: 'Shadow Realm',  episode: 'Episode I',   season: 'Season 1', server: Server.JP,     status: RaidStatus.PREVIOUS,
      color: '#6ee7b7', color2: '#0ea5e9', pattern: 'dot',
      desc: 'The inaugural raid that started it all — the original Shadow incursion.',
      startDate: new Date('2025-08-01'), endDate: new Date('2025-09-15'),
    },
  ]

  const raidMap: Record<string, string> = {}
  const raidKeyMap = ['vs4', 'cf4', 'vs3', 'cf3', 'ak2', 'sr1']
  for (let i = 0; i < raidsData.length; i++) {
    const r = raidsData[i]
    const existing = await prisma.raid.findFirst({ where: { name: r.name, episode: r.episode, server: r.server } })
    if (existing) {
      raidMap[raidKeyMap[i]] = existing.id
    } else {
      const raid = await prisma.raid.create({ data: r })
      raidMap[raidKeyMap[i]] = raid.id
    }
  }
  console.log('✓ 6 raids created')

  // ── Raid Entries ─────────────────────────────────────────────────────────────
  const entries: { raidKey: string; ign: string; score: number; wins: number; losses: number; streak: number }[] = [
    // vs4 — Void Sanctum IV Global
    { raidKey: 'vs4', ign: 'ShadowReaper', score: 14820, wins: 31, losses: 4,  streak: 8 },
    { raidKey: 'vs4', ign: 'NightVortex',  score: 13540, wins: 28, losses: 6,  streak: 5 },
    { raidKey: 'vs4', ign: 'IronPhantom',  score: 12310, wins: 25, losses: 8,  streak: 3 },
    { raidKey: 'vs4', ign: 'BlazeCrafter', score: 11090, wins: 22, losses: 11, streak: 1 },
    { raidKey: 'vs4', ign: 'FrostEdge',    score: 9870,  wins: 19, losses: 13, streak: 2 },
    { raidKey: 'vs4', ign: 'VoidStriker',  score: 8650,  wins: 17, losses: 16, streak: 0 },
    { raidKey: 'vs4', ign: 'StormBringer', score: 7420,  wins: 14, losses: 18, streak: 0 },
    { raidKey: 'vs4', ign: 'ArcaneWarden', score: 6200,  wins: 11, losses: 21, streak: 0 },
    // cf4 — Crimson Forge IV JP
    { raidKey: 'cf4', ign: 'NightVortex',  score: 16200, wins: 33, losses: 3,  streak: 11 },
    { raidKey: 'cf4', ign: 'CrimsonBolt',  score: 14980, wins: 29, losses: 5,  streak: 6  },
    { raidKey: 'cf4', ign: 'ShadowReaper', score: 13700, wins: 27, losses: 7,  streak: 4  },
    { raidKey: 'cf4', ign: 'StormBringer', score: 12450, wins: 24, losses: 9,  streak: 3  },
    { raidKey: 'cf4', ign: 'EmberWolf',    score: 11100, wins: 21, losses: 12, streak: 2  },
    { raidKey: 'cf4', ign: 'IronPhantom',  score: 9830,  wins: 18, losses: 15, streak: 0  },
    { raidKey: 'cf4', ign: 'FrostEdge',    score: 8560,  wins: 15, losses: 17, streak: 1  },
    { raidKey: 'cf4', ign: 'BlazeCrafter', score: 7200,  wins: 12, losses: 20, streak: 0  },
    // vs3 — Void Sanctum III Global (previous, streak=0)
    { raidKey: 'vs3', ign: 'NightVortex',  score: 13900, wins: 29, losses: 5,  streak: 0 },
    { raidKey: 'vs3', ign: 'ShadowReaper', score: 13100, wins: 26, losses: 8,  streak: 0 },
    { raidKey: 'vs3', ign: 'ArcaneWarden', score: 12200, wins: 24, losses: 9,  streak: 0 },
    { raidKey: 'vs3', ign: 'VoidStriker',  score: 10800, wins: 20, losses: 12, streak: 0 },
    { raidKey: 'vs3', ign: 'BlazeCrafter', score: 9500,  wins: 18, losses: 14, streak: 0 },
    { raidKey: 'vs3', ign: 'FrostEdge',    score: 8300,  wins: 15, losses: 17, streak: 0 },
    // cf3 — Crimson Forge III JP (previous)
    { raidKey: 'cf3', ign: 'CrimsonBolt',  score: 15400, wins: 31, losses: 4,  streak: 0 },
    { raidKey: 'cf3', ign: 'NightVortex',  score: 14100, wins: 28, losses: 6,  streak: 0 },
    { raidKey: 'cf3', ign: 'EmberWolf',    score: 12900, wins: 25, losses: 8,  streak: 0 },
    { raidKey: 'cf3', ign: 'StormBringer', score: 11600, wins: 22, losses: 11, streak: 0 },
    { raidKey: 'cf3', ign: 'IronPhantom',  score: 10300, wins: 19, losses: 13, streak: 0 },
    // ak2 — Abyssal Keep II Global (previous)
    { raidKey: 'ak2', ign: 'ArcaneWarden', score: 18900, wins: 36, losses: 2,  streak: 0 },
    { raidKey: 'ak2', ign: 'ShadowReaper', score: 17600, wins: 32, losses: 4,  streak: 0 },
    { raidKey: 'ak2', ign: 'VoidStriker',  score: 16300, wins: 30, losses: 6,  streak: 0 },
    { raidKey: 'ak2', ign: 'NightVortex',  score: 15000, wins: 27, losses: 8,  streak: 0 },
    { raidKey: 'ak2', ign: 'BlazeCrafter', score: 13700, wins: 24, losses: 10, streak: 0 },
    { raidKey: 'ak2', ign: 'CrimsonBolt',  score: 12400, wins: 21, losses: 13, streak: 0 },
    { raidKey: 'ak2', ign: 'EmberWolf',    score: 11100, wins: 18, losses: 15, streak: 0 },
    // sr1 — Shadow Realm I JP (previous)
    { raidKey: 'sr1', ign: 'ShadowReaper', score: 9800,  wins: 20, losses: 5,  streak: 0 },
    { raidKey: 'sr1', ign: 'ArcaneWarden', score: 8700,  wins: 18, losses: 6,  streak: 0 },
    { raidKey: 'sr1', ign: 'NightVortex',  score: 7900,  wins: 16, losses: 8,  streak: 0 },
    { raidKey: 'sr1', ign: 'StormBringer', score: 6500,  wins: 13, losses: 11, streak: 0 },
    { raidKey: 'sr1', ign: 'FrostEdge',    score: 5400,  wins: 11, losses: 13, streak: 0 },
  ]

  for (const e of entries) {
    const playerId = playerMap[e.ign]
    const raidId = raidMap[e.raidKey]
    if (!playerId || !raidId) continue
    await prisma.raidEntry.upsert({
      where: { playerId_raidId: { playerId, raidId } },
      update: { score: e.score, wins: e.wins, losses: e.losses, streak: e.streak },
      create: { playerId, raidId, score: e.score, wins: e.wins, losses: e.losses, streak: e.streak },
    })
  }
  console.log('✓ Raid entries seeded')
  console.log('Seeding complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
