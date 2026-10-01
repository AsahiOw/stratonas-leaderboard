import { serveChibiArtifact } from '@/lib/chibi/serve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ assetId: string; revision: string }> }) {
  const { assetId, revision } = await context.params
  return serveChibiArtifact(request, assetId, revision)
}
export const HEAD = GET
