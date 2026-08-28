import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const PRISMA_SCHEMA_VERSION = 'admin-activity-v1'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; prismaSchemaVersion?: string }
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

export const prisma =
  (globalForPrisma.prisma && globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION ? globalForPrisma.prisma : null) ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION
}
