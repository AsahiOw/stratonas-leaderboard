import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { invalidatePublicData } from '@/lib/cache'
import { importRaidXlsx } from '@/lib/xlsx-raid-import'
import { completeXlsxImportProgress, failXlsxImportProgress, resetXlsxImportProgress } from '@/lib/xlsx-import-progress'

export const dynamic = 'force-dynamic'

function stringField(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (guard) return guard

  try {
    const form = await req.formData()
    const file = form.get('file')
    const server = stringField(form.get('server'))
    const startDate = stringField(form.get('startDate'))
    const endDate = stringField(form.get('endDate'))

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'XLSX file is required.' }, { status: 400 })
    }
    if (!server) {
      return NextResponse.json({ error: 'Server is required.' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are supported.' }, { status: 400 })
    }

    resetXlsxImportProgress('Reading workbook')
    const result = await importRaidXlsx({
      buffer: await file.arrayBuffer(),
      filename: file.name,
      server,
      startDate,
      endDate,
    })
    completeXlsxImportProgress()
    invalidatePublicData()

    return NextResponse.json(result)
  } catch (error) {
    failXlsxImportProgress(error instanceof Error ? error.message : 'Import failed.')
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Import failed.',
    }, { status: 400 })
  }
}
