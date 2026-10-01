import { serveChibiArtifact } from '@/lib/chibi/serve'
import { adminChibiRequest } from '@/lib/chibi/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, context: { params: Promise<{ assetId: string; revision: string }> }) {
  return adminChibiRequest(async () => {
    const { assetId, revision } = await context.params
    return serveChibiArtifact(request, assetId, revision, true)
  })
}
export const HEAD = GET
