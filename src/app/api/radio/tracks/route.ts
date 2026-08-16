import fs from 'fs/promises'
import path from 'path'
import { jsonWithPublicCache } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { RADIO_AUDIO_DIR, RADIO_THUMBNAIL_DIR } from '@/lib/radio-sync'

export const dynamic = 'force-dynamic'

export async function GET() {
  const tracks = await prisma.radioTrack.findMany({
    where: { status: 'ready', audioFileName: { not: null }, thumbnailFileName: { not: null } },
    orderBy: [{ publishedAt: 'desc' }, { displayTitle: 'asc' }],
  })
  const ready = []
  for (const track of tracks) {
    try {
      const [audio, thumbnail] = await Promise.all([
        fs.stat(path.join(RADIO_AUDIO_DIR, track.audioFileName!)),
        fs.stat(path.join(RADIO_THUMBNAIL_DIR, track.thumbnailFileName!)),
      ])
      if (!audio.isFile() || !thumbnail.isFile()) continue
      ready.push({
        id: track.id, youtubeId: track.youtubeId, title: track.title, displayTitle: track.displayTitle,
        durationSeconds: track.durationSeconds, publishedAt: track.publishedAt,
        audioUrl: `/api/radio/audio/${track.id}`, thumbnailUrl: `/api/radio/thumbnail/${track.id}`,
      })
    } catch { /* repair on next sync */ }
  }
  return jsonWithPublicCache(ready)
}
