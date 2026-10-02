import path from 'node:path'
import { readdir, realpath, readFile } from 'node:fs/promises'
import { chibiRoots, artifactPath } from './storage'

export type StudioBackground = { key: string; label: string; url: string }
const imageExtension = /\.(jpe?g|png|webp)$/i
export function studioBackgroundRoot() {
  return path.join(chibiRoots().source, 'MediaResources', 'GameData', 'UIs', '03_Scenario', '01_Background')
}
export async function getStudioBackgrounds(root = studioBackgroundRoot()): Promise<StudioBackground[]> {
  const entries = await readdir(/*turbopackIgnore: true*/ root, { recursive: true, withFileTypes: true })
  return entries.filter(entry => entry.isFile() && imageExtension.test(entry.name)).map(entry => {
    const key = path.relative(root, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/')
    return { key, label: key.replace(imageExtension, '').replace(/^BG_/, '').replaceAll('_', ' '), url: `/api/studio/background?file=${encodeURIComponent(key)}` }
  }).sort((a, b) => a.label.localeCompare(b.label))
}
export async function readStudioBackground(key: string, root = studioBackgroundRoot()) {
  if (!imageExtension.test(key)) throw new Error('Invalid background')
  const canonicalRoot = await realpath(/*turbopackIgnore: true*/ root)
  const filename = await realpath(/*turbopackIgnore: true*/ artifactPath(key, canonicalRoot))
  if (!filename.startsWith(canonicalRoot + path.sep)) throw new Error('Invalid background')
  const data = await readFile(/*turbopackIgnore: true*/ filename)
  const type = /\.png$/i.test(key) ? 'image/png' : /\.webp$/i.test(key) ? 'image/webp' : 'image/jpeg'
  return { data, type }
}
