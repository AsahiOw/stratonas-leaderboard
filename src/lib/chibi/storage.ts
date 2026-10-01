import path from 'node:path'
import { realpath } from 'node:fs/promises'

export function chibiRoots() {
  // These directories are mounted runtime data, never build inputs.
  return {
    source: path.resolve(/*turbopackIgnore: true*/ process.env.CHIBI_SOURCE_DIR || 'Development_data/BAAD'),
    data: path.resolve(/*turbopackIgnore: true*/ process.env.CHIBI_DATA_DIR || 'Development_data/chibi'),
    tools: path.resolve(/*turbopackIgnore: true*/ process.env.CHIBI_TOOLS_DIR || 'Development_data/chibi-tools'),
  }
}

export function artifactPath(key: string, root = chibiRoots().data) {
  if (!key || key.includes('\\') || key.includes(':') || key.includes('\0') || key.startsWith('/')
    || key.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Invalid chibi artifact key')
  }
  const resolved = path.resolve(/*turbopackIgnore: true*/ root, ...key.split('/'))
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw new Error('Invalid chibi artifact key')
  return resolved
}

export async function existingArtifactPath(key: string) {
  const root = await realpath(/*turbopackIgnore: true*/ chibiRoots().data)
  const resolved = await realpath(/*turbopackIgnore: true*/ artifactPath(key, root))
  if (!resolved.startsWith(root + path.sep)) throw new Error('Artifact escapes chibi storage')
  return resolved
}
