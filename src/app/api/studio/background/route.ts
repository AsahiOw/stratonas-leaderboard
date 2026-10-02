import { readStudioBackground } from '@/lib/chibi/studio-backgrounds'

export const runtime = 'nodejs'
export async function GET(request: Request) {
  try {
    const { data, type } = await readStudioBackground(new URL(request.url).searchParams.get('file') ?? '')
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=300' } })
  } catch {
    return Response.json({ error: 'Background unavailable.' }, { status: 404 })
  }
}
