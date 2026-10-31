import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { mock, test } from 'node:test'
import type { NextAuthConfig } from 'next-auth'

// Run against a migrated disposable database, never the application's database.
if (!new URL(process.env.DATABASE_URL || '').pathname.endsWith('_auth_test')) {
  throw new Error('DATABASE_URL must point to a disposable database ending in _auth_test')
}

let config: NextAuthConfig
let session: { user: { id: string; role: string } } | null = null
let invalidations = 0
mock.module('next-auth', { defaultExport: (options: NextAuthConfig) => {
  config = options
  return { auth: async () => session, handlers: {}, signIn: () => {}, signOut: () => {} }
} })
mock.module('@/lib/cache', { namedExports: {
  jsonWithNoStore: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  invalidatePublicData: () => { invalidations += 1 },
} })
mock.module('@/lib/admin-activity', { namedExports: {
  withAdminMutationAudit: (_config: unknown, handler: unknown) => handler,
} })

test('Discord ownership, profile editing, and role authorization with PostgreSQL', async (t) => {
  const { prisma } = await import('./prisma')
  await import('./auth')
  const { linkDiscordPlayer, currentPlayer } = await import('./discord-player')
  const guard = await import('./auth-guard')
  const profile = await import('../app/api/profile/route')
  const roles = await import('../app/api/admin/user-roles/route')
  const merge = await import('../app/api/admin/players/merge/route')
  const suffix = randomUUID()
  const userIds: string[] = []
  const playerIds: string[] = []
  const studentIds: number[] = []
  async function user(role: 'ADMIN' | 'MANAGER' | 'VIEWER' = 'VIEWER') {
    const result = await prisma.user.create({ data: { name: `Auth test ${suffix}`, role } })
    userIds.push(result.id)
    return result
  }
  async function player(discordId: string, ownerId?: string) {
    const result = await prisma.player.create({ data: { username: randomUUID(), ign: 'Original IGN', userID: discordId, ownerId } })
    playerIds.push(result.id)
    return result
  }
  const request = (path: string, body: unknown) => new Request(`http://localhost${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  try {
    const member = await user()
    const other = await user()
    const admin = await user('ADMIN')
    const discordId = `discord-${suffix}`
    const owned = await player(discordId)
    await prisma.account.create({ data: { userId: member.id, provider: 'discord', type: 'oauth', providerAccountId: discordId } })

    await t.test('OAuth sign-in claims only the exact ID and simultaneous callbacks are idempotent', async () => {
      const signIn = config.events!.signIn!
      await signIn({ user: member, account: { provider: 'discord', providerAccountId: discordId, type: 'oauth' } })
      const results = await Promise.all(Array.from({ length: 4 }, () => linkDiscordPlayer(member.id, discordId)))
      assert.ok(results.every((result) => result?.id === owned.id))
      assert.equal((await currentPlayer(member.id))?.id, owned.id)
    })
    await t.test('unmatched identities cannot take an owned player or match by display name', async () => {
      assert.equal(await linkDiscordPlayer(other.id, `unknown-${suffix}`), null)
      assert.equal(await linkDiscordPlayer(other.id, discordId), null)
      const unrelated = await player(`unrelated-${suffix}`)
      assert.equal((await prisma.player.findUnique({ where: { id: unrelated.id } }))?.ownerId, null)
    })
    await t.test('records imported after first sign-in are linked on the next profile visit', async () => {
      const late = await user()
      const lateId = `late-${suffix}`
      await prisma.account.create({ data: { userId: late.id, provider: 'discord', type: 'oauth', providerAccountId: lateId } })
      assert.equal(await currentPlayer(late.id), null)
      const record = await player(lateId)
      assert.equal((await currentPlayer(late.id))?.id, record.id)
    })
    await t.test('anonymous profile reads and writes are rejected', async () => {
      session = null
      assert.equal((await profile.GET()).status, 401)
      assert.equal((await profile.PATCH(request('/api/profile', { ign: 'Bad' }))).status, 401)
      assert.equal((await profile.PATCH(request('/api/profile', { favouriteStudentId: 2000000001 }))).status, 401)
    })
    await t.test('owner sees their data and changes only their own IGN, invalidating public caches', async () => {
      session = { user: member }
      assert.equal((await (await profile.GET()).json()).player.id, owned.id)
      assert.equal((await profile.PATCH(request('/api/profile', { ign: '  New IGN  ' }))).status, 200)
      assert.equal((await prisma.player.findUnique({ where: { id: owned.id } }))?.ign, 'New IGN')
      assert.equal(invalidations, 1)
      for (const body of [{ ign: '' }, { ign: 'x'.repeat(65) }, { ign: 'bad\nname' }, { ign: 'Hijack', ownerId: other.id }, { ign: 'Hijack', playerId: owned.id }, { role: 'ADMIN' }]) {
        assert.equal((await profile.PATCH(request('/api/profile', body))).status, 400)
      }
      session = { user: other }
      assert.equal((await profile.PATCH(request('/api/profile', { ign: 'Hijack' }))).status, 404)
      assert.equal((await prisma.player.findUnique({ where: { id: owned.id } }))?.ign, 'New IGN')
    })
    await t.test('linked owners change favourite students by ID and cannot edit another player or send arbitrary names', async () => {
      const student = await prisma.student.create({ data: { id: 2000000001, name: 'Fixture student', image: '/fixture.webp' } })
      studentIds.push(student.id)
      session = { user: member }
      const previousInvalidations = invalidations
      const response = await profile.PATCH(request('/api/profile', { favouriteStudentId: student.id }))
      assert.equal(response.status, 200)
      const body = await response.json()
      assert.equal(body.favouriteStudentData.id, student.id)
      assert.equal(body.favouriteStudent, student.name)
      const saved = await prisma.player.findUniqueOrThrow({ where: { id: owned.id } })
      assert.equal(saved.favouriteStudentId, student.id)
      assert.equal(saved.favouriteStudent, student.name)
      assert.equal(saved.ign, 'New IGN')
      assert.equal(invalidations, previousInvalidations + 1)
      assert.equal((await (await profile.GET()).json()).player.favouriteStudentData.name, student.name)
      for (const body of [{}, { favouriteStudentId: null }, { favouriteStudentId: '2000000001' }, { favouriteStudentId: -1 }, { favouriteStudentId: 1.5 }, { favouriteStudentId: 2147483648 }, { favouriteStudentId: 2147483647 }, { favouriteStudentId: student.id, favouriteStudent: 'Injected name' }, { favouriteStudentId: student.id, playerId: owned.id }, { favouriteStudentId: student.id, role: 'ADMIN' }]) {
        assert.equal((await profile.PATCH(request('/api/profile', body))).status, 400)
      }
      session = { user: other }
      assert.equal((await profile.PATCH(request('/api/profile', { favouriteStudentId: student.id }))).status, 404)
      assert.equal((await prisma.player.findUnique({ where: { ownerId: other.id } })), null)
    })
    await t.test('independent owner import locks survive XLSX updates and review resolution', async () => {
      const { default: ExcelJS } = await import('exceljs')
      const { importRaidXlsx } = await import('./xlsx-raid-import')
      const review = await import('../app/api/admin/import/xlsx/review/[id]/resolve/route')
      const boss = await prisma.raidBoss.create({ data: { name: `Lock test ${suffix}` } })
      const terrain = await prisma.raidTerrain.upsert({ where: { name: 'Indoor' }, update: {}, create: { name: 'Indoor' } })
      const incoming = await prisma.student.create({ data: { id: 2000000002, name: 'Import fixture student', image: '/fixture.webp' } })
      studentIds.push(incoming.id)
      async function runImport(favourite = incoming.name) {
        const workbook = new ExcelJS.Workbook()
        for (const name of ['Members', 'Guests']) {
          const sheet = workbook.addWorksheet(name)
          sheet.addRow(['UserId', 'Username', 'IGN', 'Score', 'Club', 'Rank', 'FavoriteStudent'])
          if (name === 'Members') sheet.addRow([discordId, owned.username, 'Imported IGN', 123456, '', 1, favourite])
        }
        return importRaidXlsx({ buffer: await workbook.xlsx.writeBuffer() as ArrayBuffer, filename: `Total Assault S1_ ${boss.name} Indoor.xlsx`, server: 'Global', startDate: '2026-01-01', endDate: '2026-01-08' })
      }
      try {
        session = { user: member }
        assert.equal((await profile.PATCH(request('/api/profile', { ignImportLocked: true, favouriteStudentImportLocked: true }))).status, 200)
        for (const value of ['true', 1, null]) assert.equal((await profile.PATCH(request('/api/profile', { ignImportLocked: value }))).status, 400)
        session = { user: other }
        assert.equal((await profile.PATCH(request('/api/profile', { ignImportLocked: false }))).status, 404)
        session = { user: member }
        assert.equal((await profile.PATCH(request('/api/profile', { ign: 'Manual while locked', favouriteStudentId: 2000000001 }))).status, 200)
        const result = await runImport()
        let saved = await prisma.player.findUniqueOrThrow({ where: { id: owned.id } })
        assert.equal(saved.ign, 'Manual while locked')
        assert.equal(saved.favouriteStudentId, 2000000001)
        assert.equal((await prisma.raidEntry.findUniqueOrThrow({ where: { playerId_raidId: { playerId: owned.id, raidId: result.raid.id } } })).score, 123456)
        assert.equal((await runImport('unrecognizable favourite xyz')).reviewItems.length, 0)
        const pending = await prisma.xlsxImportReviewItem.create({ data: { raidId: result.raid.id, playerId: owned.id } })
        session = { user: admin }
        assert.equal((await review.POST(request('/review', { studentId: incoming.id }), { params: Promise.resolve({ id: pending.id }) })).status, 409)
        assert.equal((await prisma.xlsxImportReviewItem.findUniqueOrThrow({ where: { id: pending.id } })).status, 'pending')
        session = { user: member }
        await profile.PATCH(request('/api/profile', { ignImportLocked: false }))
        await runImport()
        saved = await prisma.player.findUniqueOrThrow({ where: { id: owned.id } })
        assert.equal(saved.ign, 'Imported IGN')
        assert.equal(saved.favouriteStudentId, 2000000001)
        await profile.PATCH(request('/api/profile', { ignImportLocked: true, favouriteStudentImportLocked: false, ign: 'Keep IGN' }))
        await runImport()
        saved = await prisma.player.findUniqueOrThrow({ where: { id: owned.id } })
        assert.equal(saved.ign, 'Keep IGN')
        assert.equal(saved.favouriteStudentId, incoming.id)
        assert.equal(saved.favouriteStudent, incoming.name)
        session = { user: admin }
        assert.equal((await review.POST(request('/review', { studentId: incoming.id }), { params: Promise.resolve({ id: pending.id }) })).status, 200)
      } finally {
        const raids = await prisma.raid.findMany({ where: { raidBossId: boss.id } })
        await prisma.raidEntry.deleteMany({ where: { raidId: { in: raids.map((raid) => raid.id) } } })
        await prisma.raid.deleteMany({ where: { raidBossId: boss.id } })
        await prisma.raidBoss.delete({ where: { id: boss.id } })
      }
    })
    await t.test('real Auth.js OAuth linking rejects active administrator and manager sessions', async () => {
      const { handleLoginOrRegister } = await import('../../node_modules/@auth/core/lib/actions/callback/handle-login.js')
      const { authAdapter } = await import('./auth-adapter')
      const manager = await user('MANAGER')
      const viewer = await user()
      const profile = { id: 'external-profile', name: 'Discord member', email: null, emailVerified: null, role: 'VIEWER' as const }
      const options = (id?: string) => ({
        adapter: authAdapter, jwt: { decode: async () => id ? { sub: id } : null },
        cookies: { sessionToken: { name: 'authjs.session-token' } },
        session: { strategy: 'jwt', generateSessionToken: randomUUID },
        provider: { id: 'discord', type: 'oauth', account: () => ({}) }, events: {},
      } as unknown as Parameters<typeof handleLoginOrRegister>[3])
      const fresh = await handleLoginOrRegister('', profile, { provider: 'discord', type: 'oauth', providerAccountId: `fresh-${suffix}` }, options())
      userIds.push(fresh.user.id!)
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: fresh.user.id } })).role, 'VIEWER')
      for (const privileged of [admin, manager]) {
        const providerAccountId = `blocked-${privileged.id}`
        await assert.rejects(handleLoginOrRegister('active-session', profile, { provider: 'discord', type: 'oauth', providerAccountId }, options(privileged.id)), /Sign out/)
        assert.equal(await prisma.account.findUnique({ where: { provider_providerAccountId: { provider: 'discord', providerAccountId } } }), null)
      }
      const providerAccountId = `explicit-member-${suffix}`
      const linked = await handleLoginOrRegister('active-session', profile, { provider: 'discord', type: 'oauth', providerAccountId }, options(viewer.id))
      assert.equal(linked.user.id, viewer.id)
      const returning = await handleLoginOrRegister('', profile, { provider: 'discord', type: 'oauth', providerAccountId }, options())
      assert.equal(returning.user.id, viewer.id)
      await prisma.account.create({ data: { userId: manager.id, provider: 'discord', type: 'oauth', providerAccountId: `manager-${suffix}` } })
      assert.equal((await handleLoginOrRegister('', profile, { provider: 'discord', type: 'oauth', providerAccountId: `manager-${suffix}` }, options())).user.id, manager.id)
      const otherDiscord = `conflict-${suffix}`
      await prisma.account.create({ data: { userId: other.id, provider: 'discord', providerAccountId: otherDiscord, type: 'oauth' } })
      await assert.rejects(handleLoginOrRegister('active-session', profile, { provider: 'discord', providerAccountId: otherDiscord, type: 'oauth' }, options(viewer.id)), /already associated/)
    })
    await t.test('password accounts reject Discord login and ownership, and old sessions expire', async () => {
      const { default: bcrypt } = await import('bcryptjs')
      const hash = await bcrypt.hash('Fixture-password-123', 4)
      await prisma.user.update({ where: { id: admin.id }, data: { email: `admin-${suffix}@example.com`, passwordHash: hash } })
      const compromisedId = `legacy-discord-${suffix}`
      await prisma.account.create({ data: { userId: admin.id, provider: 'discord', providerAccountId: compromisedId, type: 'oauth' } })
      const record = await player(compromisedId)
      assert.equal(await linkDiscordPlayer(admin.id, compromisedId), null)
      assert.equal((await prisma.player.findUniqueOrThrow({ where: { id: record.id } })).ownerId, null)
      const signIn = config.callbacks!.signIn!
      assert.equal(await signIn({ user: admin, account: { provider: 'discord', providerAccountId: compromisedId, type: 'oauth' } }), false)
      const jwt = config.callbacks!.jwt!
      const check = (token: object) => jwt({ token } as Parameters<typeof jwt>[0])
      assert.equal(await check({ id: admin.id, role: 'ADMIN' }), null)
      assert.equal(await check({ id: admin.id, authProvider: 'discord' }), null)
      assert.equal((await check({ id: admin.id, authProvider: 'credentials' }))?.role, 'ADMIN')
      assert.equal(await check({ id: member.id, authProvider: 'credentials' }), null)
      const issued = await jwt({ token: {}, user: member, account: { provider: 'discord', providerAccountId: discordId, type: 'oauth' } } as Parameters<typeof jwt>[0])
      assert.equal(issued?.authProvider, 'discord')
      assert.equal(issued?.id, member.id)
    })
    await t.test('repair migration separates all password-linked Discord identities and preserves administrator and player data', async () => {
      const { Client } = await import('pg')
      const client = new Client({ connectionString: process.env.DATABASE_URL })
      await client.connect()
      await client.query('BEGIN')
      try {
        const id = `repair-${suffix}`, accountId = `repair-account-${suffix}`, discord = `repair-discord-${suffix}`
        await client.query('INSERT INTO "User" (id, email, name, "passwordHash", role) VALUES ($1, $2, $3, $4, $5)', [id, `${id}@example.com`, 'Legacy admin', 'preserve-hash', 'ADMIN'])
        await client.query('INSERT INTO "Account" (id, "userId", type, provider, "providerAccountId") VALUES ($1,$2,$3,$4,$5)', [accountId, id, 'oauth', 'discord', discord])
        await client.query('INSERT INTO "Player" (id, username, ign, "userID", "ownerId", "ignImportLocked", "favouriteStudentImportLocked") VALUES ($1,$2,$3,$4,$5,true,true)', [`player-${id}`, `player-${id}`, 'Keep IGN', discord, id])
        await client.query('INSERT INTO "Session" (id,"sessionToken","userId",expires) VALUES ($1,$2,$3,$4)', [id, id, id, new Date(Date.now() + 60000)])
        const sql = await readFile('prisma/migrations/20261031000000_separate_discord_password_accounts/migration.sql', 'utf8')
        await client.query(sql.replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, ''))
        const { rows: [legacy] } = await client.query('SELECT * FROM "User" WHERE id=$1', [id])
        assert.equal(legacy.role, 'ADMIN'); assert.equal(legacy.passwordHash, 'preserve-hash'); assert.equal(legacy.email, `${id}@example.com`)
        const { rows: [account] } = await client.query('SELECT * FROM "Account" WHERE id=$1', [accountId])
        assert.notEqual(account.userId, id)
        const { rows: [member] } = await client.query('SELECT * FROM "User" WHERE id=$1', [account.userId])
        assert.equal(member.role, 'VIEWER'); assert.equal(member.passwordHash, null); assert.equal(member.email, null)
        const { rows: [saved] } = await client.query('SELECT * FROM "Player" WHERE id=$1', [`player-${id}`])
        assert.equal(saved.ownerId, member.id); assert.equal(saved.ign, 'Keep IGN')
        assert.equal(saved.ignImportLocked, true); assert.equal(saved.favouriteStudentImportLocked, true)
        assert.equal((await client.query('SELECT * FROM "Session" WHERE "userId"=$1', [id])).rowCount, 0)
        assert.equal((await client.query('SELECT count(*)::int AS count FROM "Account" a JOIN "User" u ON u.id=a."userId" WHERE a.provider=$1 AND u."passwordHash" IS NOT NULL', ['discord'])).rows[0].count, 0)
      } finally { await client.query('ROLLBACK'); await client.end() }
    })
    await t.test('only admins manage roles; managers access the dashboard but cannot promote', async () => {
      session = { user: member }
      assert.equal((await guard.requireAdmin())?.status, 401)
      assert.equal((await roles.GET()).status, 403)
      session = { user: admin }
      assert.equal((await roles.PATCH(request('/api/admin/user-roles', { userId: member.id, role: 'MANAGER' }))).status, 200)
      session = { user: { id: member.id, role: 'VIEWER' } }
      assert.equal(await guard.requireAdmin(), null) // Current database role wins over a stale JWT.
      assert.equal((await roles.GET()).status, 403)
      assert.equal((await roles.PATCH(request('/api/admin/user-roles', { userId: other.id, role: 'MANAGER' }))).status, 403)
      session = { user: admin }
      assert.equal((await roles.PATCH(request('/api/admin/user-roles', { userId: other.id, role: 'ADMIN' }))).status, 400)
      assert.equal((await roles.PATCH(request('/api/admin/user-roles', { userId: admin.id, role: 'VIEWER' }))).status, 409)
      assert.equal((await roles.PATCH(request('/api/admin/user-roles', { userId: member.id, role: 'VIEWER' }))).status, 200)
      session = { user: { id: member.id, role: 'MANAGER' } }
      assert.equal((await guard.requireAdmin())?.status, 401)
    })
    await t.test('session callback refreshes roles and rejects deleted users', async () => {
      const jwt = config.callbacks!.jwt!
      const token = await jwt({ token: { id: member.id, role: 'ADMIN', authProvider: 'discord' } } as unknown as Parameters<typeof jwt>[0])
      assert.equal(token?.role, 'VIEWER')
      assert.equal(await jwt({ token: { id: 'nonexistent' } } as unknown as Parameters<typeof jwt>[0]), null)
    })
    await t.test('player merges preserve ownership and reject merging different owners', async () => {
      session = { user: admin }
      const source = await player(`merge-source-${suffix}`, other.id)
      const target = await player(`merge-target-${suffix}`)
      assert.equal((await merge.POST(request('/api/admin/players/merge', { sourcePlayerId: source.id, targetPlayerId: owned.id }))).status, 409)
      assert.equal((await merge.POST(request('/api/admin/players/merge', { sourcePlayerId: source.id, targetPlayerId: target.id }))).status, 200)
      assert.equal((await prisma.player.findUnique({ where: { id: target.id } }))?.ownerId, other.id)
    })
  } finally {
    await prisma.player.deleteMany({ where: { id: { in: playerIds } } })
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } })
    await prisma.user.deleteMany({ where: { id: { in: userIds } } })
    await prisma.$disconnect()
  }
})
