import { prisma } from '@/lib/prisma'

function slugId(prefix: string, name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${prefix}_${slug || crypto.randomUUID().slice(0, 8)}`
}

export async function resolveRaidType(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null

  const existingById = await prisma.raidType.findUnique({ where: { id: raw } })
  if (existingById) return existingById

  const existingByName = await prisma.raidType.findUnique({ where: { name: raw } })
  if (existingByName) return existingByName

  return prisma.raidType.create({
    data: { id: slugId('raidtype', raw), name: raw },
  })
}

export async function resolveRaidServer(value: unknown) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return null

  const existingById = await prisma.raidServer.findUnique({ where: { id: raw } })
  if (existingById) return existingById

  const existingByName = await prisma.raidServer.findUnique({ where: { name: raw } })
  if (existingByName) return existingByName

  return prisma.raidServer.create({
    data: { id: slugId('raidserver', raw), name: raw },
  })
}
