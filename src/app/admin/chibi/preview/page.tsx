import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-guard'
import { ChibiPreview } from '@/components/chibi/ChibiPreview'

export const dynamic = 'force-dynamic'
export default async function ChibiPreviewPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  if (await requireAdmin()) redirect('/')
  const { job } = await searchParams
  return <main className="mx-auto max-w-5xl p-8">{job ? <ChibiPreview jobId={job} /> : <p>No candidate preview selected.</p>}</main>
}
