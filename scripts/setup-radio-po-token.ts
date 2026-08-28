import { spawn } from 'node:child_process'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = '1.3.1'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PLUGIN_DIRECTORY = path.join(ROOT, 'Development_data', 'yt-dlp-plugins')
const PLUGIN_PATH = path.join(PLUGIN_DIRECTORY, 'bgutil-ytdlp-pot-provider.zip')
const DOWNLOAD_URL = `https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/${VERSION}/bgutil-ytdlp-pot-provider.zip`

async function main() {
  await mkdir(PLUGIN_DIRECTORY, { recursive: true })
  await downloadPlugin()

  await run('yt-dlp', ['--version'])

  await run('docker', ['compose', 'up', '-d', 'bgutil-provider'])

  console.log(`Radio PO-token plugin ${VERSION} is installed.`)
  console.log('The provider is available at http://127.0.0.1:4416.')
}

async function downloadPlugin() {
  const response = await fetch(DOWNLOAD_URL)
  if (!response.ok) throw new Error(`Plugin download failed with HTTP ${response.status}.`)

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Plugin download was not a ZIP file.')

  const temporaryPath = `${PLUGIN_PATH}.tmp`
  await writeFile(temporaryPath, bytes)
  await rm(PLUGIN_PATH, { force: true })
  await rename(temporaryPath, PLUGIN_PATH)
}

async function run(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit', windowsHide: true })
    child.on('error', (error) => reject(new Error(`${command} could not start: ${error.message}`)))
    child.on('close', (code) => code === 0
      ? resolve()
      : reject(new Error(`${command} failed with exit code ${code}.`)))
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
