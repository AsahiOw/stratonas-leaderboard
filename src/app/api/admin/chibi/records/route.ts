import { adminChibiRequest, noStoreJson } from '@/lib/chibi/http'
import { ChibiInputError, record } from '@/lib/chibi/api-input'
import { CHIBI_RECORD_LIMIT, exportChibiRecords, importChibiRecords } from '@/lib/chibi/record-transfer'
import { recordAdminActivity } from '@/lib/admin-activity'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  return adminChibiRequest(async () => {
    if (Number(request.headers.get('content-length')) > CHIBI_RECORD_LIMIT) throw new ChibiInputError('The records package exceeds 64 MB.')
    const raw = await request.text()
    if (Buffer.byteLength(raw) > CHIBI_RECORD_LIMIT) throw new ChibiInputError('The records package exceeds 64 MB.')
    const body = record(JSON.parse(raw))
    if (body.action === 'export') {
      const result = await exportChibiRecords()
      await recordAdminActivity({ action: 'SYNC', entityType: 'chibi records', summary: `Exported ${result.students} Chibi student records`, details: result })
      return noStoreJson(result)
    }
    if (body.action === 'import') {
      const result = await importChibiRecords(body.records)
      await recordAdminActivity({ action: 'IMPORT', entityType: 'chibi records', summary: `Imported ${result.students} Chibi student records without conversion`, details: result })
      return noStoreJson(result)
    }
    throw new ChibiInputError('Choose export or import.')
  })
}
