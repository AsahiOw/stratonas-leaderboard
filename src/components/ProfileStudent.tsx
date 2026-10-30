'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import type { ChibiCatalogStudent } from '@/lib/chibi/types'

const ChibiViewer = dynamic(() => import('@/components/chibi/ChibiViewer').then((module) => module.ChibiViewer), {
  ssr: false,
  loading: () => <p role="status" className="flex h-[var(--profile-model-height)] items-center justify-center text-xs text-muted2">Preparing your student…</p>,
})

export function ProfileStudent({ student, onActivityChange }: { student: { id: number; name: string; image: string; portrait?: string | null }; onActivityChange?: (active: boolean) => void }) {
  const [catalog, setCatalog] = useState<ChibiCatalogStudent[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setFailed(false)
    fetch('/api/chibi/students', { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load student catalog')
      const data: { students: ChibiCatalogStudent[] } = await response.json()
      if (!controller.signal.aborted) setCatalog(data.students)
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [attempt])
  const model = catalog?.find((entry) => entry.id === student.id)?.model
  return <section aria-label="Representative student" className="relative min-w-0">
    {model ? <>
      <ChibiViewer key={student.id} model={model} showDiagnostics={false} figurine figurineName={student.name} onActivityChange={onActivityChange} className="relative" />
    </> : <div className="relative flex h-[var(--profile-model-height)] flex-col items-center justify-end overflow-hidden px-2 text-center">
      <ProgressiveImage src={student.portrait || student.image} alt={student.name} className="absolute inset-0 h-[85%] w-full object-contain" />
      <p role="status" className="relative rounded-lg bg-card px-2 py-1 text-[10px] text-muted2">{failed ? 'Student couldn’t load.' : catalog ? '3D model unavailable' : 'Loading student…'}</p>
      {failed && <button onClick={() => setAttempt((value) => value + 1)} className="relative mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border2 px-4 text-sm text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><RefreshCw size={14} />Try again</button>}
    </div>}
    {!model && <p className="flex min-h-8 items-center justify-center text-center text-[11px] font-semibold sm:text-[13px]">{student.name}</p>}
  </section>
}
