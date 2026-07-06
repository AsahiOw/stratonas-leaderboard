import fs from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const OPTIMIZED_LOBBIES_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'Development_data', 'lobbies-optimized')
const ORIGINAL_LOBBIES_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'Development_data', 'lobbies')
const POSTERS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), 'Development_data', 'lobby-posters')

function videoUrl(fileName: string) {
  return `/api/memorial-video?file=${encodeURIComponent(fileName)}`
}

function posterUrl(fileName: string) {
  return `/api/memorial-poster?file=${encodeURIComponent(fileName)}&v=final-frame`
}

async function isFile(filePath: string) {
  try {
    const stats = await fs.stat(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

async function readMp4FileNames(dir: string) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mp4') && !entry.name.toLowerCase().endsWith('.tmp.mp4'))
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  const [optimizedFileNames, sourceFileNames] = await Promise.all([
    readMp4FileNames(OPTIMIZED_LOBBIES_DIR),
    readMp4FileNames(ORIGINAL_LOBBIES_DIR),
  ])
  const optimizedSet = new Set(optimizedFileNames)
  const sourceSet = new Set(sourceFileNames)
  const fileNames = Array.from(new Set([...optimizedFileNames, ...sourceFileNames]))
    .sort((a, b) => a.localeCompare(b))

  const assets = fileNames.length > 0
    ? await prisma.memorialVideoAsset.findMany({
      where: { fileName: { in: fileNames } },
    })
    : []
  const assetsByFileName = new Map(assets.map((asset) => [asset.fileName, asset]))

  const videos = await Promise.all(fileNames.map(async (fileName) => {
    const baseName = path.parse(fileName).name
    const hasJpgPoster = await isFile(path.join(POSTERS_DIR, `${baseName}.jpg`))
    const hasWebpPoster = await isFile(path.join(POSTERS_DIR, `${baseName}.webp`))
    const hasPoster = hasJpgPoster || hasWebpPoster
    const hasOptimized = optimizedSet.has(fileName)
    const asset = assetsByFileName.get(fileName)

    return {
      id: asset?.id || fileName,
      youtubeId: asset?.youtubeId || null,
      title: baseName,
      fileName,
      youtubeUrl: asset?.youtubeUrl || null,
      videoUrl: videoUrl(fileName),
      posterUrl: hasPoster ? posterUrl(fileName) : null,
      status: hasOptimized && hasPoster ? 'ready' : hasOptimized ? 'optimized' : sourceSet.has(fileName) ? 'source' : 'missing',
      downloadedAt: asset?.downloadedAt || null,
      optimizedAt: asset?.optimizedAt || null,
      posterGeneratedAt: asset?.posterGeneratedAt || null,
      error: asset?.error || null,
      updatedAt: asset?.updatedAt || null,
    }
  }))

  return NextResponse.json(videos)
}
