import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { access, chmod, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const BAAD_VERSION = '3.1.0'
const releases: Record<string, { name: string; sha256: string }> = {
  win32: { name: 'windows-x86_64', sha256: 'bf313041ddf91a81c78a4a62210b2118e12cfe64009c7ca7b98ec074b40407c4' },
  darwin: { name: 'macos-x86_64', sha256: '6b4a3081ce3030ea4721b1f58d7f370fecc8e44416606406bf7d34d3e2ee41d5' },
  linux: { name: 'linux-x86_64', sha256: 'e1550a45bf21a53f5cc45ad626107073d4288f983e76d76a3ac637347fbbfe4b' },
}

export function runBaadCommand(command: string, args: string[], options: { cwd?: string; signal?: AbortSignal; onProgress?: (line: string) => void } = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, signal: options.signal, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let failedDownload = false
    let tail = ''
    for (const stream of [child.stdout, child.stderr]) {
      let pending = ''
      stream.on('data', chunk => {
        const text = String(chunk).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
        tail = (tail + text).slice(-4000)
        pending += text
        const lines = pending.split(/[\r\n]+/)
        pending = lines.pop()!.slice(-4000)
        for (const line of lines) {
          if (/Some downloads failed/i.test(line)) failedDownload = true
          if (line.trim()) options.onProgress?.(line.trim().slice(0, 1000))
        }
      })
      stream.on('end', () => {
        if (/Some downloads failed/i.test(pending)) failedDownload = true
        if (pending.trim()) options.onProgress?.(pending.trim().slice(0, 1000))
      })
    }
    child.on('error', reject)
    child.on('close', code => code === 0 && !failedDownload ? resolve() : reject(new Error(`BA-AD download failed (${code}): ${tail.slice(-1000)}`)))
  })
}

export async function installBaad(toolsRoot: string, python: string, onProgress: (line: string) => void = () => {}) {
  const directory = path.join(toolsRoot, 'baad')
  const executable = path.join(directory, process.platform === 'win32' ? 'baad.exe' : 'baad')
  try { await access(executable); return executable } catch { /* Install the pinned release when absent. */ }
  if (process.arch !== 'x64' || !releases[process.platform]) throw new Error('BA-AD requires an x64 Windows, Intel Mac, or Linux worker.')
  const release = releases[process.platform]
  onProgress(`Installing BA-AD ${BAAD_VERSION} for ${release.name}.`)
  const response = await fetch(`https://github.com/Deathemonic/BA-AD/releases/download/v${BAAD_VERSION}/baad-${release.name}.zip`, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok) throw new Error(`BA-AD download returned HTTP ${response.status}.`)
  const archive = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(archive).digest('hex') !== release.sha256) throw new Error('BA-AD release checksum did not match.')
  await mkdir(directory, { recursive: true })
  const zip = path.join(directory, 'release.zip')
  const unpack = path.join(directory, 'unpacked')
  await writeFile(zip, archive)
  await runBaadCommand(python, ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, unpack])
  const locate = async (folder: string): Promise<string | null> => {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, item.name)
      if (item.isDirectory()) { const found = await locate(file); if (found) return found }
      else if (item.name === path.basename(executable)) return file
    }
    return null
  }
  const binary = await locate(unpack)
  if (!binary) throw new Error('BA-AD release did not contain its executable.')
  await rename(binary, executable)
  if (process.platform !== 'win32') await chmod(executable, 0o755)
  await rm(zip)
  await rm(unpack, { recursive: true, force: true })
  return executable
}

export const baadAssetArgs = (output: string) => ['--update', 'download', 'japan', '--assets', '--platform', 'android', '--limit', '5', '--retries', '3', '--output', output]

export async function prepareBaadSource(sourceRoot: string) {
  const current = path.join(sourceRoot, 'AssetBundles')
  try { await access(current) } catch {
    const previous = path.join(sourceRoot, '.baad-previous')
    try { await access(previous); await rename(previous, current) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; await mkdir(current, { recursive: true }) }
  }
}

export async function downloadAssetBundles(options: {
  sourceRoot: string; toolsRoot: string; jobId: string; signal?: AbortSignal; onProgress: (line: string) => void
  run?: (command: string, args: string[], options: { cwd: string; signal?: AbortSignal; onProgress: (line: string) => void }) => Promise<void>
  executable?: string
}) {
  if (!/^[a-zA-Z0-9-]+$/.test(options.jobId)) throw new Error('Invalid download job ID.')
  const { sourceRoot, onProgress, signal } = options
  const stage = path.join(sourceRoot, '.baad-download', options.jobId)
  const current = path.join(sourceRoot, 'AssetBundles')
  const previous = path.join(sourceRoot, '.baad-previous')
  const exists = async (file: string) => { try { await access(file); return true } catch { return false } }
  // Restore an interrupted directory swap before another download or import.
  if (!await exists(current) && await exists(previous)) await rename(previous, current)
  await mkdir(stage, { recursive: true })
  const install = JSON.parse(await readFile(path.join(options.toolsRoot, 'install.json'), 'utf8'))
  const executable = options.executable ?? await installBaad(options.toolsRoot, install.unityPy.python, onProgress)
  onProgress('Downloading Japan Android AssetBundles only. Current models remain available.')
  await (options.run ?? runBaadCommand)(executable, baadAssetArgs(stage), { cwd: stage, signal, onProgress })
  signal?.throwIfAborted()
  const downloaded = path.join(stage, 'AssetBundles')
  const files = await readdir(downloaded, { recursive: true, withFileTypes: true })
  const count = files.filter(file => file.isFile() && /\.(zip|bundle)$/i.test(file.name)).length
  if (!count) throw new Error('BA-AD returned no AssetBundles. The existing source was preserved.')
  if (files.some(file => file.isSymbolicLink())) throw new Error('BA-AD output contains an unexpected symbolic link.')
  signal?.throwIfAborted()
  onProgress(`Download finished: ${count} archives/bundles. Activating the new source.`)
  await rm(previous, { recursive: true, force: true })
  if (await exists(current)) await rename(current, previous)
  try { await rename(downloaded, current) }
  catch (error) { if (await exists(previous)) await rename(previous, current); throw error }
  await rm(stage, { recursive: true, force: true })
  onProgress('AssetBundles are ready. You can now update all students.')
  return count
}
