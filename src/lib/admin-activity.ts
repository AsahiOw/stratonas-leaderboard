import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeStudentLookup } from '@/lib/student-name-matcher'

type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'UPSERT' | 'IMPORT' | 'SYNC' | 'RESOLVE'
type ActivityStatus = 'success' | 'failed'

type ActivityInput = {
  actorType?: 'ADMIN' | 'AUTOMATION'
  actorId?: string | null
  actorEmail?: string | null
  action: ActivityAction
  entityType: string
  entityId?: string | null
  summary: string
  status?: ActivityStatus
  details?: unknown
}

type AuditConfig = {
  action: ActivityAction
  entityType: string
  summary?: string | ((result: unknown) => string)
}

const REDACTED_KEY = /password|secret|token|authorization|cookie|credential/i

function safeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[truncated]'
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}…` : value
  if (value instanceof Date) return value.toISOString()
  if (value instanceof File) return { name: value.name, size: value.size, type: value.type }
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => safeValue(item, depth + 1))
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .slice(0, 50)
      .map(([key, item]) => [key, REDACTED_KEY.test(key) ? '[redacted]' : safeValue(item, depth + 1)]))
  }
  return String(value)
}

async function requestDetails(request: Request) {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return safeValue(await request.clone().json().catch(() => null))
  }
  if (contentType.includes('multipart/form-data')) return { contentType: 'multipart/form-data' }
  return null
}

function pathEntityId(request: Request) {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean)
  const last = segments.at(-1)
  return last && !['admin', 'sync', 'import', 'resolve', 'emerging'].includes(last) ? decodeURIComponent(last) : null
}

function entityIdFrom(request: Request, result: unknown) {
  if (result && typeof result === 'object' && 'id' in result && typeof result.id === 'string') return result.id
  return pathEntityId(request)
}

async function previousState(config: AuditConfig, request: Request, input: unknown) {
  if (!['UPDATE', 'DELETE', 'UPSERT', 'RESOLVE'].includes(config.action)) return null
  const id = pathEntityId(request)

  if (config.entityType === 'player' && id) return prisma.player.findUnique({ where: { id } })
  if (config.entityType === 'club' && id) return prisma.club.findUnique({ where: { id } })
  if (config.entityType === 'raid entry') {
    if (id) return prisma.raidEntry.findUnique({ where: { id } })
    const values = input as { playerId?: unknown; raidId?: unknown } | null
    if (typeof values?.playerId === 'string' && typeof values.raidId === 'string') {
      return prisma.raidEntry.findUnique({ where: { playerId_raidId: { playerId: values.playerId, raidId: values.raidId } } })
    }
  }
  if (config.entityType === 'raid' && id) return prisma.raid.findUnique({ where: { id } })
  if (config.entityType === 'raid boss' && id) return prisma.raidBoss.findUnique({ where: { id } })
  if (config.entityType === 'student' && id && Number.isInteger(Number(id))) return prisma.student.findUnique({ where: { id: Number(id) } })
  if (config.entityType === 'recruitment' && id) return prisma.recruitment.findUnique({ where: { id } })
  if (config.entityType === 'recruitment schedule' && id) return prisma.upcomingRecruitment.findUnique({ where: { id }, include: { items: true } })
  if (config.entityType === 'XLSX review item' && id) return prisma.xlsxImportReviewItem.findUnique({ where: { id } })
  if (config.entityType === 'Plana emerging raid settings') return prisma.planaImportState.findUnique({ where: { id: 'plana-stats' } })
  if (config.entityType === 'student matching rule' && id) {
    const separator = id.indexOf(':')
    const kind = separator >= 0 ? id.slice(0, separator) : ''
    const recordId = separator >= 0 ? id.slice(separator + 1) : id
    if (kind === 'alias') return prisma.studentAlias.findUnique({ where: { id: recordId } })
    if (kind === 'rule') return prisma.studentMatchRule.findUnique({ where: { id: recordId } })
  }
  if (config.entityType === 'student matching rule') {
    const values = input as { kind?: unknown; alias?: unknown; type?: unknown; pattern?: unknown; value?: unknown } | null
    if (values?.kind === 'alias' && typeof values.alias === 'string') {
      return prisma.studentAlias.findUnique({ where: { normalizedAlias: normalizeStudentLookup(values.alias) } })
    }
    if (typeof values?.type === 'string' && typeof values.pattern === 'string' && typeof values.value === 'string') {
      return prisma.studentMatchRule.findUnique({
        where: {
          type_normalizedPattern_normalizedValue: {
            type: values.type,
            normalizedPattern: normalizeStudentLookup(values.pattern),
            normalizedValue: normalizeStudentLookup(values.value),
          },
        },
      })
    }
  }
  return null
}

function resultLabel(result: unknown) {
  if (!result || typeof result !== 'object') return null
  const record = result as Record<string, unknown>
  const target = record.deleted && typeof record.deleted === 'object' ? record.deleted as Record<string, unknown> : record
  for (const key of ['name', 'ign', 'title', 'displayTitle', 'dateKey', 'email', 'id']) {
    if (typeof target[key] === 'string' && target[key]) return target[key]
  }
  return null
}

function defaultSummary(config: AuditConfig, result: unknown) {
  const verb = { CREATE: 'Created', UPDATE: 'Updated', DELETE: 'Deleted', UPSERT: 'Saved', IMPORT: 'Started import for', SYNC: 'Started sync for', RESOLVE: 'Resolved' }[config.action]
  const label = resultLabel(result)
  return `${verb} ${config.entityType}${label ? `: ${label}` : ''}`
}

export async function recordAdminActivity(input: ActivityInput) {
  let actorId = input.actorId || null
  let actorEmail = input.actorEmail || null
  const actorType = input.actorType || 'ADMIN'
  if (actorType === 'ADMIN' && (!actorId || !actorEmail)) {
    const session = await auth().catch(() => null)
    actorId = session?.user?.id || null
    actorEmail = session?.user?.email || null
  }
  return prisma.adminActivity.create({
    data: {
      actorType,
      actorId,
      actorEmail,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      summary: input.summary,
      status: input.status || 'success',
      details: safeValue(input.details) as object | undefined,
    },
  })
}

export function withAdminMutationAudit<TArgs extends [Request, ...unknown[]]>(
  config: AuditConfig,
  handler: (...args: TArgs) => Promise<Response>,
) {
  return async (...args: TArgs) => {
    const request = args[0]
    const input = await requestDetails(request)
    const session = await auth().catch(() => null)
    const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN'
    const before = isAdmin ? await previousState(config, request, input) : null
    const response = await handler(...args)
    if (!response.ok) return response

    const result = await response.clone().json().catch(() => null)
    await recordAdminActivity({
      action: config.action,
      entityType: config.entityType,
      entityId: entityIdFrom(request, result),
      actorId: session?.user?.id || null,
      actorEmail: session?.user?.email || null,
      summary: typeof config.summary === 'function' ? config.summary(result) : config.summary || defaultSummary(config, result),
      details: { method: request.method, route: new URL(request.url).pathname, before: safeValue(before), input, result: safeValue(result) },
    })
    return response
  }
}
