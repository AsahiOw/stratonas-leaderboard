import { StudentPlayground } from '@/components/chibi/StudentPlayground'
import { getPublicChibiStudents } from '@/lib/chibi/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Schale Residence Hall — Stratónas' }

export default async function PlaygroundPage() {
  const [catalog] = await Promise.allSettled([getPublicChibiStudents()])
  return <main>
    <StudentPlayground students={catalog.status === 'fulfilled' ? catalog.value.filter(student => student.model) : []} loadError={catalog.status === 'rejected' ? 'The student catalog could not be loaded. Reload to try again.' : null} />
  </main>
}
