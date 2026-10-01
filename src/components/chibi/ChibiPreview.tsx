'use client'

import { useEffect, useState } from 'react'
import { ChibiViewer } from './ChibiViewer'
import { emptyChibiProfile, type ChibiCatalogStudent, type ChibiProfile } from '@/lib/chibi/types'

export function ChibiPreview({ jobId }: { jobId: string }) {
  const [model, setModel] = useState<ChibiCatalogStudent['model']>(null)
  const [message, setMessage] = useState('Waiting for the candidate preview worker…')
  const [identity, setIdentity] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const response = await fetch(`/api/admin/chibi/import/jobs/${encodeURIComponent(jobId)}`, { signal: controller.signal })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Could not load preview.')
        const item = body.items?.[0]
        if (item?.asset && item.asset.validation?.valid) {
          const profile: ChibiProfile = body.job.candidate?.profile || emptyChibiProfile()
          setModel({ assetId: item.asset.id, revision: item.asset.checksum, url: `/api/admin/chibi/assets/${item.asset.id}/${item.asset.checksum}.glb`, sourceIdentity: item.sourceIdentity || '', profile })
          setIdentity(`${item.student?.name || ''} · ${item.studentId} · ${item.student?.pathName || ''}`)
          setMessage('Private candidate preview · verify identity, face, equipment, and interactions before approving.')
          return
        }
        setMessage(item?.diagnostic || body.job.error || `${body.job.status} · ${body.job.stage}`)
        if (['queued', 'running'].includes(body.job.status)) timer = setTimeout(poll, 2000)
      } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Preview failed.') }
    }
    poll()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [jobId])
  return <div className="space-y-5"><h1 className="text-2xl font-semibold">Candidate preview</h1><p>{identity}</p><p role="status" className="text-sm text-slate-400">{message}</p>{model && <ChibiViewer model={model} />}</div>
}
