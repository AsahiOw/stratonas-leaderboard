import Link from 'next/link'
import { PhotoStudio } from '@/components/chibi/PhotoStudio'
import { getPublicChibiStudents } from '@/lib/chibi/server'
import { getStudioBackgrounds } from '@/lib/chibi/studio-backgrounds'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Student Photo Studio — Stratónas' }

export default async function StudioPage() {
  const [catalog, backgrounds] = await Promise.allSettled([getPublicChibiStudents(), getStudioBackgrounds()])
  return <main className="mx-auto max-w-[1600px] px-3 py-5 sm:px-6">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Make a little memory</p><h1 className="mt-1 text-2xl font-semibold text-white">Student photo studio</h1></div>
      <Link href="/other" className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">← <span className="hidden sm:inline">Back to </span>Other Features</Link>
    </header>
    <PhotoStudio students={catalog.status === 'fulfilled' ? catalog.value.filter(student => student.model) : []} backgrounds={backgrounds.status === 'fulfilled' ? backgrounds.value : []} loadError={catalog.status === 'rejected' ? 'The student catalog could not be loaded. Reload to try again.' : null} backgroundError={backgrounds.status === 'rejected' ? 'BAAD backgrounds are unavailable. Download the scenario backgrounds through BAAD, then reload.' : null} />
  </main>
}
