import 'dotenv/config'
import assert from 'node:assert/strict'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'
import {
  assertDisposableDatabaseUrl,
  assertIsolatedRoots,
  assertMaintenanceDisabled,
} from './chibi-acceptance-guards'
import {
  acceptanceRosterFromOptions,
  ACCEPTANCE_PILOT_STUDENTS,
} from './chibi-acceptance-roster'

// Backwards-compatible export for the explicit one-student pilot. Callers must
// still select --roster pilot; there is no implicit catalog-scale fallback.
export const ACCEPTANCE_STUDENTS = ACCEPTANCE_PILOT_STUDENTS

function readFlag(name: string) {
  const prefix = `--${name}=`
  const inline = process.argv.find(value => value.startsWith(prefix))
  if (inline) return inline.slice(prefix.length).trim()
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1]?.trim() || '' : ''
}

function required(name: string, envName: string) {
  const value = readFlag(name) || process.env[envName]?.trim()
  assert.ok(value, `${envName} or --${name} is required.`)
  return value
}

export function fixturePlan(environment: Readonly<Record<string, string | undefined>> = process.env) {
  const roster = acceptanceRosterFromOptions({
    flag: readFlag('roster'),
    environment: environment.CHIBI_ACCEPTANCE_ROSTER,
  })
  assert.ok(environment.CHIBI_TOOLS_DIR, 'CHIBI_TOOLS_DIR is required for the acceptance fixture plan.')
  const roots = assertIsolatedRoots({
    sourceDir: environment.CHIBI_SOURCE_DIR,
    dataDir: environment.CHIBI_DATA_DIR,
    toolsDir: environment.CHIBI_TOOLS_DIR,
  })
  const database = assertDisposableDatabaseUrl(environment.DATABASE_URL)
  assertMaintenanceDisabled(environment)
  return {
    database: database.databaseName,
    schema: database.schema || 'public',
    dataDir: roots.dataDir,
    toolsDir: roots.toolsDir,
    roster: {
      mode: roster.mode,
      version: roster.version,
      checksum: roster.checksum,
      source: roster.source,
      eligibility: roster.eligibility,
    },
    students: roster.students,
    adminEmail: environment.CHIBI_ACCEPTANCE_ADMIN_EMAIL || environment.ADMIN_EMAIL || null,
    apply: environment.CHIBI_ACCEPTANCE_APPLY === 'true',
  }
}

async function applyFixture() {
  const environment = process.env
  assert.equal(environment.CHIBI_ACCEPTANCE_APPLY, 'true', 'Fixture preparation is dry by default. Set CHIBI_ACCEPTANCE_APPLY=true and pass --apply to write the isolated database.')
  assert.ok(process.argv.includes('--apply'), 'Fixture preparation is dry by default. Pass --apply together with CHIBI_ACCEPTANCE_APPLY=true to write the isolated database.')
  const plan = fixturePlan(environment)
  const email = required('admin-email', 'CHIBI_ACCEPTANCE_ADMIN_EMAIL').normalize('NFKC').toLowerCase()
  const password = required('admin-password', 'CHIBI_ACCEPTANCE_ADMIN_PASSWORD')
  assert.ok(password.length >= 8 && password.length <= 256, 'CHIBI_ACCEPTANCE_ADMIN_PASSWORD must be between 8 and 256 characters.')

  const adapter = new PrismaPg({ connectionString: environment.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })
  try {
    await prisma.$queryRaw`SELECT 1`
    const [assets, bindings, jobs, items, candidates, workers] = await Promise.all([
      prisma.chibiAsset.count(),
      prisma.studentChibiBinding.count(),
      prisma.chibiImportJob.count(),
      prisma.chibiImportItem.count(),
      prisma.chibiSourceCandidate.count(),
      prisma.chibiWorkerState.count(),
    ])
    assert.equal(assets, 0, 'Fixture preparation requires an empty ChibiAsset table.')
    assert.equal(bindings, 0, 'Fixture preparation requires an empty StudentChibiBinding table.')
    assert.equal(jobs, 0, 'Fixture preparation requires an empty ChibiImportJob table.')
    assert.equal(items, 0, 'Fixture preparation requires an empty ChibiImportItem table.')
    assert.equal(candidates, 0, 'Fixture preparation requires an empty ChibiSourceCandidate table.')
    assert.equal(workers, 0, 'Fixture preparation requires an empty ChibiWorkerState table.')
    const existingRoster = await prisma.student.findMany({ where: { id: { gte: 10000, lte: 99999 } }, select: { id: true } })
    const expectedIds = new Set<number>(plan.students.map(student => student.id))
    assert.deepEqual(existingRoster.map(student => student.id).filter(id => !expectedIds.has(id)), [], 'Fixture preparation refuses to mix an existing student roster with the deterministic acceptance fixture.')

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction(async tx => {
      await tx.user.upsert({
        where: { email },
        update: { name: 'Chibi acceptance admin', passwordHash, role: Role.ADMIN },
        create: { email, name: 'Chibi acceptance admin', passwordHash, role: Role.ADMIN },
      })
      for (const student of plan.students) {
        await tx.student.upsert({
          where: { id: student.id },
          update: { name: student.name, pathName: student.pathName, devName: student.devName, image: student.image, portrait: student.portrait },
          create: { ...student },
        })
      }
    })
    console.log(JSON.stringify({ ...plan, applied: true, adminEmail: email }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

function printPlan() {
  console.log(JSON.stringify({ ...fixturePlan(), applied: false, next: 'Set CHIBI_ACCEPTANCE_APPLY=true and pass --apply to apply this plan.' }, null, 2))
}

if (process.argv.includes('--help')) {
  console.log('Dry-run fixture plan. Select --roster pilot (explicit Haruna only) or --roster full (currently refused until a repository-owned roster snapshot is committed). Pass --apply and CHIBI_ACCEPTANCE_APPLY=true to seed the selected roster and one temporary admin in the disposable database.')
} else if (process.argv.includes('--apply')) {
  applyFixture().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
} else {
  try { printPlan() } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }
}
