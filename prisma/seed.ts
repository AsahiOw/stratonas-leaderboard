import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function rotate<T>(arr: T[], n: number): T[] {
  const i = ((n % arr.length) + arr.length) % arr.length
  return [...arr.slice(i), ...arr.slice(0, i)]
}

function makeExtEntries(
  ignOrder: string[],
  startScore: number,
  step: number,
): { ign: string; score: number }[] {
  return ignOrder.map((ign, j) => ({
    ign,
    score: Math.max(100, startScore - j * step),
  }))
}

const EXT_NAMES = [
  'DarkSerpent', 'IceWraith',    'FlameKnight',  'ThunderClaw', 'SilverMist',
  'GhostBlade',  'StoneFist',    'WindRider',     'ChaosEdge',   'LunarHawk',
  'RiftWalker',  'StarPiercer',  'BoneCrusher',   'SoulReaper',  'NeonPhantom',
  'DawnBreaker', 'TwilightEdge', 'MidnightRush',  'CrimsonDawn', 'VoidChild',
  'IronClad',    'SwiftArrow',   'DeepEcho',      'SkyShatter',  'EarthBreaker',
  'TideRider',   'MoonShard',    'SunForge',      'AstralBolt',  'NightCrawler',
  'StormFist',   'RavenClaw',    'SerpentTail',   'DragonFang',  'PhoenixAsh',
  'CrystalGuard','ShadowStep',   'BloodMoon',     'FrostBite',   'LavaFlow',
  'QuickSilver', 'DarkMatter',   'GoldRush',
]

const EXT_USERNAMES: Record<string, string> = {
  DarkSerpent:  'dark_serpent',   IceWraith:    'ice_wraith',    FlameKnight:  'flame_knight',
  ThunderClaw:  'thunder_claw',   SilverMist:   'silver_mist',   GhostBlade:   'ghost_blade',
  StoneFist:    'stone_fist',     WindRider:    'wind_rider',    ChaosEdge:    'chaos_edge',
  LunarHawk:    'lunar_hawk',     RiftWalker:   'rift_walker',   StarPiercer:  'star_piercer',
  BoneCrusher:  'bone_crusher',   SoulReaper:   'soul_reaper',   NeonPhantom:  'neon_phantom',
  DawnBreaker:  'dawn_breaker',   TwilightEdge: 'twilight_edge', MidnightRush: 'midnight_rush',
  CrimsonDawn:  'crimson_dawn',   VoidChild:    'void_child',    IronClad:     'iron_clad',
  SwiftArrow:   'swift_arrow',    DeepEcho:     'deep_echo',     SkyShatter:   'sky_shatter',
  EarthBreaker: 'earth_breaker',  TideRider:    'tide_rider',    MoonShard:    'moon_shard',
  SunForge:     'sun_forge',      AstralBolt:   'astral_bolt',   NightCrawler: 'night_crawler',
  StormFist:    'storm_fist',     RavenClaw:    'raven_claw',    SerpentTail:  'serpent_tail',
  DragonFang:   'dragon_fang',    PhoenixAsh:   'phoenix_ash',   CrystalGuard: 'crystal_guard',
  ShadowStep:   'shadow_step',    BloodMoon:    'blood_moon',    FrostBite:    'frost_bite',
  LavaFlow:     'lava_flow',      QuickSilver:  'quick_silver',  DarkMatter:   'dark_matter',
  GoldRush:     'gold_rush',
}

const FAVOURITE_STUDENTS = ['Hoshino','Shiroko','Yuuka','Aris','Natsu','Hibiki','Kayoko','Neru','Haruna','Mutsuki','Serika','Nonomi','Karin','Haruka','Izumi','Ui','Mika','Sora','Toki','Ako']

async function main() {
  console.log('Seeding database...')

  // ── Admin user ───────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@stratonas.gg' },
    update: {},
    create: { email: 'admin@stratonas.gg', name: 'Admin', passwordHash, role: Role.ADMIN },
  })
  console.log('✓ Admin user created')

  // ── Guild players (10) ───────────────────────────────────────────────────────
  const guildPlayersData = [
    { ign: 'ShadowReaper', username: 'shadowreaper_x', favouriteStudent: 'Hoshino', joinedDate: new Date('2026-01-15'), club: 'Millennium', clubID: 'MIL001', userID: 'USR001' },
    { ign: 'NightVortex',  username: 'night_vortex',   favouriteStudent: 'Shiroko', joinedDate: new Date('2026-01-18'), club: 'Trinity',    clubID: 'TRI001', userID: 'USR002' },
    { ign: 'IronPhantom',  username: 'iron_phantom',   favouriteStudent: 'Yuuka',   joinedDate: new Date('2026-02-03'), club: 'Millennium', clubID: 'MIL001', userID: 'USR003' },
    { ign: 'BlazeCrafter', username: 'blaze_crafter',  favouriteStudent: 'Aris',    joinedDate: new Date('2026-02-10'), club: 'Gehenna',    clubID: 'GEH001', userID: 'USR004' },
    { ign: 'FrostEdge',    username: 'frost_edge',     favouriteStudent: 'Natsu',   joinedDate: new Date('2026-02-20'), club: 'Abydos',     clubID: 'ABY001', userID: 'USR005' },
    { ign: 'VoidStriker',  username: 'void_striker',   favouriteStudent: 'Hibiki',  joinedDate: new Date('2026-03-01'), club: 'Trinity',    clubID: 'TRI001', userID: 'USR006' },
    { ign: 'StormBringer', username: 'storm_bringer',  favouriteStudent: 'Kayoko',  joinedDate: new Date('2026-03-05'), club: 'Gehenna',    clubID: 'GEH001', userID: 'USR007' },
    { ign: 'ArcaneWarden', username: 'arcane_warden',  favouriteStudent: 'Neru',    joinedDate: new Date('2026-03-08'), club: 'Millennium', clubID: 'MIL001', userID: 'USR008' },
    { ign: 'CrimsonBolt',  username: 'crimson_bolt',   favouriteStudent: 'Haruna',  joinedDate: new Date('2026-01-28'), club: 'Valkyrie',   clubID: 'VAL001', userID: 'USR009' },
    { ign: 'EmberWolf',    username: 'ember_wolf',     favouriteStudent: 'Mutsuki', joinedDate: new Date('2026-03-12'), club: 'Abydos',     clubID: 'ABY001', userID: 'USR010' },
  ]

  const playerMap: Record<string, string> = {}
  for (const p of guildPlayersData) {
    const player = await prisma.player.upsert({
      where: { ign: p.ign },
      update: { isGuildMember: true },
      create: { ...p, isGuildMember: true },
    })
    playerMap[p.ign] = player.id
  }
  console.log('✓ 10 guild players created/updated')

  // ── External players (43, isGuildMember: false) ──────────────────────────────
  for (const [idx, ign] of EXT_NAMES.entries()) {
    const externalPlayer = {
      ign,
      username: EXT_USERNAMES[ign],
      favouriteStudent: FAVOURITE_STUDENTS[idx % FAVOURITE_STUDENTS.length],
      club: 'Guest',
      clubID: 'GUEST',
      userID: `GST${String(idx + 1).padStart(3, '0')}`,
      isGuildMember: false,
    }
    const player = await prisma.player.upsert({
      where: { ign },
      update: externalPlayer,
      create: externalPlayer,
    })
    playerMap[ign] = player.id
  }
  console.log('✓ 43 external players created/updated')

  // ── Raid lookup tables ───────────────────────────────────────────────────────
  const totalAssault = await prisma.raidType.upsert({ where: { name: 'Total Assault' }, update: {}, create: { name: 'Total Assault' } })
  const grandAssault = await prisma.raidType.upsert({ where: { name: 'Grand Assault' }, update: {}, create: { name: 'Grand Assault' } })
  const serverGlobal = await prisma.raidServer.upsert({ where: { name: 'Global' }, update: {}, create: { name: 'Global' } })
  const serverJapan  = await prisma.raidServer.upsert({ where: { name: 'Japan'  }, update: {}, create: { name: 'Japan'  } })
  console.log('✓ RaidType and RaidServer lookup data created')

  // ── Raid bosses ──────────────────────────────────────────────────────────────
  const bossesData = [
    { name: 'Void Sanctum',  description: 'Navigate the collapsed dimensions of the Void, where reality fractures with every step.', color: '#4f8ef7', color2: '#7c3aed', pattern: 'hex' },
    { name: 'Crimson Forge', description: 'Conquer the molten stronghold at the heart of Mount Igaris before it erupts.', color: '#f87171', color2: '#f59e0b', pattern: 'grid' },
    { name: 'Abyssal Keep',  description: 'Breach the ancient keep that stands between the mortal realm and the Abyss.', color: '#a78bfa', color2: '#34d399', pattern: 'diamond' },
    { name: 'Shadow Realm',  description: 'The inaugural raid that started it all — the original Shadow incursion.', color: '#6ee7b7', color2: '#0ea5e9', pattern: 'dot' },
  ]
  const bossMap: Record<string, string> = {}
  for (const b of bossesData) {
    const boss = await prisma.raidBoss.upsert({
      where: { name: b.name },
      update: { description: b.description, color: b.color, color2: b.color2, pattern: b.pattern },
      create: b,
    })
    bossMap[b.name] = boss.id
  }
  console.log('✓ 4 raid bosses created')

  // ── Raids ────────────────────────────────────────────────────────────────────
  const raidsData = [
    { key: 'vs3', raidBossId: bossMap['Void Sanctum'],  season: 3, typeId: totalAssault.id, serverId: serverGlobal.id, status: 'CURRENT'  as const, color: '#4f8ef7', color2: '#7c3aed', pattern: 'hex',     startDate: new Date('2026-04-15'), endDate: new Date('2026-05-15') },
    { key: 'cf3', raidBossId: bossMap['Crimson Forge'], season: 3, typeId: totalAssault.id, serverId: serverJapan.id,  status: 'CURRENT'  as const, color: '#f87171', color2: '#f59e0b', pattern: 'grid',    startDate: new Date('2026-04-20'), endDate: new Date('2026-05-20') },
    { key: 'vs2', raidBossId: bossMap['Void Sanctum'],  season: 2, typeId: totalAssault.id, serverId: serverGlobal.id, status: 'PREVIOUS' as const, color: '#4f8ef7', color2: '#7c3aed', pattern: 'hex',     startDate: new Date('2026-02-01'), endDate: new Date('2026-03-15') },
    { key: 'cf2', raidBossId: bossMap['Crimson Forge'], season: 2, typeId: totalAssault.id, serverId: serverJapan.id,  status: 'PREVIOUS' as const, color: '#f87171', color2: '#f59e0b', pattern: 'grid',    startDate: new Date('2026-02-05'), endDate: new Date('2026-03-20') },
    { key: 'ak1', raidBossId: bossMap['Abyssal Keep'],  season: 1, typeId: totalAssault.id, serverId: serverGlobal.id, status: 'PREVIOUS' as const, color: '#a78bfa', color2: '#34d399', pattern: 'diamond', startDate: new Date('2025-11-10'), endDate: new Date('2025-12-25') },
    { key: 'sr1', raidBossId: bossMap['Shadow Realm'],  season: 1, typeId: grandAssault.id,  serverId: serverJapan.id,  status: 'PREVIOUS' as const, color: '#6ee7b7', color2: '#0ea5e9', pattern: 'dot',     startDate: new Date('2025-08-01'), endDate: new Date('2025-09-15') },
  ]
  const raidMap: Record<string, string> = {}
  for (const r of raidsData) {
    const { key, ...data } = r
    const existing = await prisma.raid.findFirst({
      where: { raidBossId: data.raidBossId, season: data.season, serverId: data.serverId },
    })
    raidMap[key] = existing ? existing.id : (await prisma.raid.create({ data })).id
  }
  console.log('✓ 6 raids created/found')

  // ── Raid entries ─────────────────────────────────────────────────────────────
  type Entry = { raidKey: string; ign: string; score: number }

  const guildEntries: Entry[] = [
    // vs3 — Void Sanctum S3 Global (current)
    { raidKey: 'vs3', ign: 'ShadowReaper', score: 14820 },
    { raidKey: 'vs3', ign: 'NightVortex',  score: 13540 },
    { raidKey: 'vs3', ign: 'IronPhantom',  score: 12310 },
    { raidKey: 'vs3', ign: 'BlazeCrafter', score: 11090 },
    { raidKey: 'vs3', ign: 'FrostEdge',    score:  9870 },
    { raidKey: 'vs3', ign: 'VoidStriker',  score:  8650 },
    { raidKey: 'vs3', ign: 'StormBringer', score:  7420 },
    { raidKey: 'vs3', ign: 'ArcaneWarden', score:  6200 },
    // cf3 — Crimson Forge S3 JP (current)
    { raidKey: 'cf3', ign: 'NightVortex',  score: 16200 },
    { raidKey: 'cf3', ign: 'CrimsonBolt',  score: 14980 },
    { raidKey: 'cf3', ign: 'ShadowReaper', score: 13700 },
    { raidKey: 'cf3', ign: 'StormBringer', score: 12450 },
    { raidKey: 'cf3', ign: 'EmberWolf',    score: 11100 },
    { raidKey: 'cf3', ign: 'IronPhantom',  score:  9830 },
    { raidKey: 'cf3', ign: 'FrostEdge',    score:  8560 },
    { raidKey: 'cf3', ign: 'BlazeCrafter', score:  7200 },
    // vs2 — Void Sanctum S2 Global (previous)
    { raidKey: 'vs2', ign: 'NightVortex',  score: 13900 },
    { raidKey: 'vs2', ign: 'ShadowReaper', score: 13100 },
    { raidKey: 'vs2', ign: 'ArcaneWarden', score: 12200 },
    { raidKey: 'vs2', ign: 'VoidStriker',  score: 10800 },
    { raidKey: 'vs2', ign: 'BlazeCrafter', score:  9500 },
    { raidKey: 'vs2', ign: 'FrostEdge',    score:  8300 },
    // cf2 — Crimson Forge S2 JP (previous)
    { raidKey: 'cf2', ign: 'CrimsonBolt',  score: 15400 },
    { raidKey: 'cf2', ign: 'NightVortex',  score: 14100 },
    { raidKey: 'cf2', ign: 'EmberWolf',    score: 12900 },
    { raidKey: 'cf2', ign: 'StormBringer', score: 11600 },
    { raidKey: 'cf2', ign: 'IronPhantom',  score: 10300 },
    // ak1 — Abyssal Keep S1 Global (previous)
    { raidKey: 'ak1', ign: 'ArcaneWarden', score: 18900 },
    { raidKey: 'ak1', ign: 'ShadowReaper', score: 17600 },
    { raidKey: 'ak1', ign: 'VoidStriker',  score: 16300 },
    { raidKey: 'ak1', ign: 'NightVortex',  score: 15000 },
    { raidKey: 'ak1', ign: 'BlazeCrafter', score: 13700 },
    { raidKey: 'ak1', ign: 'CrimsonBolt',  score: 12400 },
    { raidKey: 'ak1', ign: 'EmberWolf',    score: 11100 },
    // sr1 — Shadow Realm S1 JP (previous)
    { raidKey: 'sr1', ign: 'ShadowReaper', score:  9800 },
    { raidKey: 'sr1', ign: 'ArcaneWarden', score:  8700 },
    { raidKey: 'sr1', ign: 'NightVortex',  score:  7900 },
    { raidKey: 'sr1', ign: 'StormBringer', score:  6500 },
    { raidKey: 'sr1', ign: 'FrostEdge',    score:  5400 },
  ]

  // External entries — different rotation & score range per raid for realism
  // vs3: 42 players, start 5950, step 115   (ranks 9-50)
  // cf3: 42 players, start 6950, step 120   (ranks 9-50)
  // vs2: 43 players, start 7950, step 120   (ranks 7-49)
  // cf2: 43 players, start 9950, step 150   (ranks 6-48)
  // ak1: 43 players, start 10800, step 150  (ranks 8-50)
  // sr1: 43 players, start 5200, step 80    (ranks 6-48)
  const extByRaid: Record<string, Entry[]> = {
    vs3: makeExtEntries(EXT_NAMES.slice(0, 42),    5950, 115).map((e) => ({ raidKey: 'vs3', ...e })),
    cf3: makeExtEntries(EXT_NAMES.slice(1),         6950, 120).map((e) => ({ raidKey: 'cf3', ...e })),
    vs2: makeExtEntries(rotate(EXT_NAMES,  5),      7950, 120).map((e) => ({ raidKey: 'vs2', ...e })),
    cf2: makeExtEntries(rotate(EXT_NAMES, 10),      9950, 150).map((e) => ({ raidKey: 'cf2', ...e })),
    ak1: makeExtEntries(rotate(EXT_NAMES, 15),     10800, 150).map((e) => ({ raidKey: 'ak1', ...e })),
    sr1: makeExtEntries(rotate(EXT_NAMES, 20),      5200,  80).map((e) => ({ raidKey: 'sr1', ...e })),
  }

  const allEntries: Entry[] = [
    ...guildEntries,
    ...Object.values(extByRaid).flat(),
  ]

  for (const e of allEntries) {
    const playerId = playerMap[e.ign]
    const raidId   = raidMap[e.raidKey]
    if (!playerId || !raidId) continue
    await prisma.raidEntry.upsert({
      where:  { playerId_raidId: { playerId, raidId } },
      update: { score: e.score },
      create: { playerId, raidId, score: e.score },
    })
  }
  console.log(`✓ ${allEntries.length} raid entries seeded`)
  console.log('Seeding complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
