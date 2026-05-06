export type XlsxImportProgress = {
  status: 'idle' | 'running' | 'completed' | 'failed'
  stage: string
  total: number
  processed: number
  rowsImported: number
  playersCreated: number
  playersUpdated: number
  entriesCreated: number
  entriesUpdated: number
  currentSheet?: string | null
  currentRow?: number | null
  error?: string | null
  startedAt?: string | null
  completedAt?: string | null
}

const idleState: XlsxImportProgress = {
  status: 'idle',
  stage: 'Idle',
  total: 0,
  processed: 0,
  rowsImported: 0,
  playersCreated: 0,
  playersUpdated: 0,
  entriesCreated: 0,
  entriesUpdated: 0,
  currentSheet: null,
  currentRow: null,
  error: null,
  startedAt: null,
  completedAt: null,
}

const globalForXlsxImport = globalThis as typeof globalThis & {
  __stratonasXlsxImportProgress?: XlsxImportProgress
}

function currentProgress() {
  if (!globalForXlsxImport.__stratonasXlsxImportProgress) {
    globalForXlsxImport.__stratonasXlsxImportProgress = { ...idleState }
  }
  return globalForXlsxImport.__stratonasXlsxImportProgress
}

export function getXlsxImportProgress() {
  return { ...currentProgress() }
}

export function resetXlsxImportProgress(stage = 'Preparing import') {
  globalForXlsxImport.__stratonasXlsxImportProgress = {
    ...idleState,
    status: 'running',
    stage,
    startedAt: new Date().toISOString(),
  }
}

export function updateXlsxImportProgress(update: Partial<XlsxImportProgress>) {
  globalForXlsxImport.__stratonasXlsxImportProgress = {
    ...currentProgress(),
    ...update,
  }
}

export function completeXlsxImportProgress() {
  updateXlsxImportProgress({
    status: 'completed',
    stage: 'Import completed',
    completedAt: new Date().toISOString(),
  })
}

export function failXlsxImportProgress(error: string) {
  updateXlsxImportProgress({
    status: 'failed',
    stage: 'Import failed',
    error,
    completedAt: new Date().toISOString(),
  })
}
