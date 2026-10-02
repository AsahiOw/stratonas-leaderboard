import { Suspense } from 'react'
import Link from 'next/link'
import { ChibiBrowser } from '@/components/chibi/ChibiBrowser'
import { isCurrentAdmin } from '@/lib/auth-guard'
import { getPublicChibiStudents } from '@/lib/chibi/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: '3D Student Browser — Stratónas' }

export default async function ChibiPage() {
  const isAdmin = await isCurrentAdmin()
  let students: Awaited<ReturnType<typeof getPublicChibiStudents>> = []
  let loadError: string | null = null
  try { students = await getPublicChibiStudents() }
  catch { loadError = 'The student catalog could not be loaded. Please try again shortly.' }

  return <main className="mx-auto flex h-[100svh] min-h-[360px] max-w-[1600px] flex-col gap-4 px-3 pb-3 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
    <header className="flex shrink-0 items-center justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Student collection</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">A little closer, in 3D.</h1></div>
      <div className="flex items-center gap-2"><Link href="/studio" className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">Photo studio</Link>
      <Link href="/other" className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">← <span className="hidden sm:inline">Back to </span>Other Features</Link></div>
    </header>
    <Suspense fallback={<div className="flex flex-1 items-center justify-center rounded-3xl border border-white/10 bg-[#151925] text-sm text-slate-400">Loading students…</div>}><ChibiBrowser students={students} loadError={loadError} adminEnabled={isAdmin} /></Suspense>
  </main>
}
