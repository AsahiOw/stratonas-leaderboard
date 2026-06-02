import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

function readArg(name: string) {
  const prefix = `--${name}=`
  const inlineArg = process.argv.find((arg) => arg.startsWith(prefix))
  if (inlineArg) return inlineArg.slice(prefix.length).trim()

  const flagIndex = process.argv.indexOf(`--${name}`)
  if (flagIndex >= 0) return process.argv[flagIndex + 1]?.trim()

  return ''
}

function requiredValue(name: string, envName: string): string {
  const value = readArg(name) || process.env[envName]?.trim()
  if (!value) throw new Error(`${envName} or --${name} is required.`)
  return value
}

async function main() {
  const email = requiredValue('email', 'ADMIN_EMAIL').toLowerCase()
  const password = requiredValue('password', 'ADMIN_PASSWORD')
  const name = readArg('name') || process.env.ADMIN_NAME?.trim() || 'Admin'

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email,
      name,
      passwordHash,
      role: Role.ADMIN,
    },
  })

  console.log(`Admin user ready: ${user.email}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
