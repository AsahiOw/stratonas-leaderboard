import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { access, chmod, cp, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { chibiRoots } from '../src/lib/chibi/storage'

type Platform = 'win32-x64' | 'darwin-x64' | 'linux-x64'
type Manifest = {
  assetStudioModCli: {
    version: string
    archive: { url: string; sha256: string; directory: string }
    entrypoint: string
    cecilAssembly: string
  }
  dotnetSdk: {
    version: string
    runtimeVersion: string
    platforms: Record<Platform, { url: string; sha512: string; archiveType: 'zip' | 'tar.gz' }>
  }
  fbx2gltf: {
    version: string
    platforms: Record<Platform, { url: string; sha256: string; directory: string; entrypoint: string }>
  }
  unityPy: {
    package: string
    version: string
    requirementsFile: string
  }
  animationPatch: {
    id: string
    sourceAssemblySha256: string
    patchedAssemblySha256: string
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const manifestPath = path.join(scriptDir, 'chibi-tools', 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
const roots = chibiRoots()
const toolsRoot = roots.tools
const archiveRoot = path.join(toolsRoot, 'archives')
const assetStudioRoot = path.join(toolsRoot, 'assetstudio')
const fbxRoot = path.join(toolsRoot, 'fbx2gltf')
const pythonRoot = path.join(toolsRoot, 'python')
const patcherRoot = path.join(toolsRoot, 'patcher')

function platform(): Platform {
  if (process.arch !== 'x64') throw new Error(`Unsupported CPU architecture ${process.arch}; Chibi tools require x64.`)
  if (process.platform === 'win32') return 'win32-x64'
  if (process.platform === 'darwin') return 'darwin-x64'
  if (process.platform === 'linux') return 'linux-x64'
  throw new Error(`Unsupported platform ${process.platform}; use Windows x64, Intel macOS, or Linux x64.`)
}

function commandForPython() {
  if (process.env.CHIBI_PYTHON) return { command: process.env.CHIBI_PYTHON, args: [] }
  if (process.platform === 'win32') return { command: 'py', args: ['-3.12'] }
  return { command: 'python3.12', args: [] }
}

async function run(command: string, args: string[], options: { cwd?: string; capture?: boolean } = {}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: options.capture === false ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    if (child.stdout) child.stdout.on('data', (chunk) => { stdout += chunk })
    if (child.stderr) child.stderr.on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 'no status'}${stderr.trim() ? `: ${stderr.trim()}` : ''}`))
    })
  })
}

async function sha256(filePath: string) {
  return fileHash(filePath, 'sha256')
}

async function fileHash(filePath: string, algorithm: 'sha256' | 'sha512') {
  const hash = createHash(algorithm)
  const stream = (await import('node:fs')).createReadStream(filePath)
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk))
    stream.once('error', reject)
    stream.once('end', () => resolve(hash.digest('hex')))
  })
}

async function download(url: string, expectedHash: string, destination: string, algorithm: 'sha256' | 'sha512' = 'sha256') {
  await mkdir(path.dirname(destination), { recursive: true })
  if (await exists(destination) && (await fileHash(destination, algorithm)) === expectedHash) return
  await rm(destination, { force: true })
  const temporaryPath = `${destination}.part`
  await rm(temporaryPath, { force: true })
  const curl = process.platform === 'win32' ? 'curl.exe' : 'curl'
  await run(curl, ['--fail', '--location', '--retry', '3', '--retry-delay', '2', '--output', temporaryPath, url], { capture: false })
  const actualHash = await fileHash(temporaryPath, algorithm)
  if (actualHash !== expectedHash) {
    await rm(temporaryPath, { force: true })
    throw new Error(`Checksum mismatch for ${url}. Expected ${expectedHash}, got ${actualHash}.`)
  }
  await rename(temporaryPath, destination)
}

function powershellQuote(value: string) {
  return `'${value.replaceAll("'", "''")}'`
}

async function extractArchive(archivePath: string, destination: string, archiveDirectory: string) {
  const temporaryDirectory = `${destination}.staging`
  await rm(temporaryDirectory, { recursive: true, force: true })
  await mkdir(temporaryDirectory, { recursive: true })

  if (process.platform === 'win32') {
    await run('powershell', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
      `Expand-Archive -LiteralPath ${powershellQuote(archivePath)} -DestinationPath ${powershellQuote(temporaryDirectory)} -Force`,
    ])
  } else {
    await run('unzip', ['-q', '-o', archivePath, '-d', temporaryDirectory])
  }

  const extractedRoot = path.join(temporaryDirectory, archiveDirectory)
  if (!(await exists(extractedRoot))) throw new Error(`Archive ${archivePath} did not contain ${archiveDirectory}.`)
  await rm(destination, { recursive: true, force: true })
  await mkdir(path.dirname(destination), { recursive: true })
  await rename(extractedRoot, destination)
  await rm(temporaryDirectory, { recursive: true, force: true })
}

async function extractArchiveContents(archivePath: string, destination: string, archiveType: 'zip' | 'tar.gz') {
  const temporaryDirectory = `${destination}.staging`
  await rm(temporaryDirectory, { recursive: true, force: true })
  await mkdir(temporaryDirectory, { recursive: true })
  if (archiveType === 'zip') {
    if (process.platform === 'win32') {
      await run('powershell', [
        '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command',
        `Expand-Archive -LiteralPath ${powershellQuote(archivePath)} -DestinationPath ${powershellQuote(temporaryDirectory)} -Force`,
      ])
    } else {
      await run('unzip', ['-q', '-o', archivePath, '-d', temporaryDirectory])
    }
  } else {
    await run('tar', ['-xzf', archivePath, '-C', temporaryDirectory])
  }
  await rm(destination, { recursive: true, force: true })
  await mkdir(destination, { recursive: true })
  for (const entry of await (await import('node:fs/promises')).readdir(temporaryDirectory)) {
    await cp(path.join(temporaryDirectory, entry), path.join(destination, entry), { recursive: true, force: true })
  }
  await rm(temporaryDirectory, { recursive: true, force: true })
}

async function exists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function installAssetStudio() {
  const archive = manifest.assetStudioModCli.archive
  const archiveName = path.basename(new URL(archive.url).pathname)
  const archivePath = path.join(archiveRoot, archiveName)
  await download(archive.url, archive.sha256, archivePath)

  const assemblyPath = path.join(assetStudioRoot, manifest.assetStudioModCli.entrypoint)
  if (!(await exists(assemblyPath))) {
    await extractArchive(archivePath, assetStudioRoot, archive.directory)
  } else {
    const currentHash = await sha256(assemblyPath)
    if (currentHash !== manifest.animationPatch.sourceAssemblySha256 && currentHash !== manifest.animationPatch.patchedAssemblySha256) {
      await extractArchive(archivePath, assetStudioRoot, archive.directory)
    }
  }
  return { archivePath, assemblyPath }
}

async function installFbx2Gltf(hostPlatform: Platform) {
  const archive = manifest.fbx2gltf.platforms[hostPlatform]
  const archiveName = path.basename(new URL(archive.url).pathname)
  const archivePath = path.join(archiveRoot, archiveName)
  await download(archive.url, archive.sha256, archivePath)
  const executablePath = path.join(fbxRoot, archive.entrypoint)
  if (!(await exists(executablePath))) await extractArchive(archivePath, fbxRoot, archive.directory)
  if (process.platform !== 'win32') await run('chmod', ['+x', executablePath])
  return { archivePath, executablePath }
}

async function systemDotnetHasSdk() {
  try {
    const result = await run('dotnet', ['--list-sdks'])
    return result.stdout.split(/\r?\n/).some((line) => /^9\./.test(line.trim()))
  } catch {
    return false
  }
}

async function installManagedDotnetSdk(hostPlatform: Platform) {
  if (process.env.CHIBI_DOTNET) return process.env.CHIBI_DOTNET
  if (await systemDotnetHasSdk()) return 'dotnet'

  const sdk = manifest.dotnetSdk.platforms[hostPlatform]
  const archiveName = path.basename(new URL(sdk.url).pathname)
  const archivePath = path.join(archiveRoot, archiveName)
  await download(sdk.url, sdk.sha512, archivePath, 'sha512')
  const sdkRoot = path.join(toolsRoot, 'dotnet-sdk', manifest.dotnetSdk.version)
  const dotnetExecutable = process.platform === 'win32'
    ? path.join(sdkRoot, 'dotnet.exe')
    : path.join(sdkRoot, 'dotnet')
  if (!(await exists(dotnetExecutable))) await extractArchiveContents(archivePath, sdkRoot, sdk.archiveType)
  if (process.platform !== 'win32') await run('chmod', ['+x', dotnetExecutable])
  if (!(await exists(dotnetExecutable))) throw new Error(`Managed .NET SDK archive did not contain ${dotnetExecutable}.`)
  return dotnetExecutable
}

async function installPython() {
  const source = commandForPython()
  try {
    await run(source.command, [...source.args, '--version'])
  } catch {
    throw new Error('Python 3.12 is required. Install Python 3.12 and ensure `py -3.12` (Windows) or `python3.12` (macOS/Linux) is available.')
  }

  const pythonExecutable = process.platform === 'win32'
    ? path.join(pythonRoot, 'Scripts', 'python.exe')
    : path.join(pythonRoot, 'bin', 'python')
  if (!(await exists(pythonExecutable))) {
    await mkdir(path.dirname(pythonRoot), { recursive: true })
    await run(source.command, [...source.args, '-m', 'venv', pythonRoot])
  }

  const requirementsPath = path.join(scriptDir, 'chibi-tools', manifest.unityPy.requirementsFile)
  await run(pythonExecutable, ['-m', 'pip', 'install', '--disable-pip-version-check', '--require-hashes', '-r', requirementsPath])
  const version = await run(pythonExecutable, ['-c', 'import UnityPy; print(UnityPy.__version__)'])
  if (version.stdout.trim() !== manifest.unityPy.version) {
    throw new Error(`UnityPy ${manifest.unityPy.version} was required, but the managed environment reports ${version.stdout.trim() || 'an unknown version'}.`)
  }
  return { executablePath: pythonExecutable }
}

async function patchAssetStudio(assemblyPath: string, dotnetCommand: string) {
  const dotnetProject = path.join(scriptDir, 'chibi-tools', 'AssetStudioPatch', 'AssetStudioPatch.csproj')
  const cecilPath = path.join(assetStudioRoot, manifest.assetStudioModCli.cecilAssembly)
  if (!(await exists(cecilPath))) throw new Error(`AssetStudio's expected ${manifest.assetStudioModCli.cecilAssembly} is missing from ${assetStudioRoot}.`)

  try {
    const sdk = await run(dotnetCommand, ['--list-sdks'])
    if (!sdk.stdout.split(/\r?\n/).some((line) => /^9\./.test(line.trim()))) throw new Error('no .NET 9 SDK')
  } catch {
    throw new Error('The .NET 9 runtime is required to run AssetStudio, and the .NET 9 SDK is required to build the portable animation patch helper. The setup downloads the pinned SDK into CHIBI_TOOLS_DIR when no system SDK is available.')
  }

  await mkdir(patcherRoot, { recursive: true })
  const intermediateRoot = path.join(patcherRoot, 'build')
  await run(dotnetCommand, [
    'build', dotnetProject, '--nologo', '--configuration', 'Release', '--output', patcherRoot,
    `-p:AssetStudioDir=${assetStudioRoot}`,
    `-p:BaseIntermediateOutputPath=${intermediateRoot}${path.sep}`,
  ], { capture: false })
  const patcher = path.join(patcherRoot, 'AssetStudioPatch.dll')
  await run(dotnetCommand, [
    patcher, assemblyPath,
    manifest.animationPatch.sourceAssemblySha256,
    manifest.animationPatch.patchedAssemblySha256,
  ], { capture: false })
  if ((await sha256(assemblyPath)) !== manifest.animationPatch.patchedAssemblySha256) {
    throw new Error('AssetStudio animation patch helper completed without producing the pinned patched assembly.')
  }
}

async function writePosixAssetStudioLauncher(dotnetCommand: string) {
  if (process.platform === 'win32') return null
  const launcherPath = path.join(assetStudioRoot, 'AssetStudioModCLI')
  const quote = (value: string) => `'${value.replaceAll("'", "'\\\"'\\\"'")}'`
  await writeFile(launcherPath, `#!/bin/sh\nset -eu\nSCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nexec ${quote(dotnetCommand)} "$SCRIPT_DIR/${manifest.assetStudioModCli.entrypoint}" "$@"\n`, 'utf8')
  await chmod(launcherPath, 0o755)
  return launcherPath
}

async function verifyDotnetRuntime(dotnetCommand: string) {
  try {
    const runtimes = await run(dotnetCommand, ['--list-runtimes'])
    if (!runtimes.stdout.split(/\r?\n/).some((line) => /^Microsoft\.NETCore\.App\s+9\./.test(line.trim()))) {
      throw new Error('Microsoft.NETCore.App 9 was not listed')
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('was not listed')) throw error
    throw new Error('The .NET 9 runtime is required by AssetStudioModCLI 0.19.0. Install it and rerun npm run chibi:setup.')
  }
}

async function main() {
  const hostPlatform = platform()
  await mkdir(toolsRoot, { recursive: true })
  const dotnetCommand = await installManagedDotnetSdk(hostPlatform)
  await verifyDotnetRuntime(dotnetCommand)
  const assetStudio = await installAssetStudio()
  const fbx2gltf = await installFbx2Gltf(hostPlatform)
  const python = await installPython()
  await patchAssetStudio(assetStudio.assemblyPath, dotnetCommand)
  const assetStudioLauncher = await writePosixAssetStudioLauncher(dotnetCommand)

  await writeFile(path.join(toolsRoot, 'install.json'), JSON.stringify({
    schemaVersion: 1,
    platform: hostPlatform,
    assetStudioModCli: {
      version: manifest.assetStudioModCli.version,
      directory: assetStudioRoot,
      assembly: assetStudio.assemblyPath,
      launcher: assetStudioLauncher ?? path.join(assetStudioRoot, 'AssetStudioModCLI.exe'),
      archive: assetStudio.archivePath,
      patchedSha256: await sha256(assetStudio.assemblyPath),
    },
    fbx2gltf: {
      version: manifest.fbx2gltf.version,
      executable: fbx2gltf.executablePath,
      archive: fbx2gltf.archivePath,
    },
    unityPy: { version: manifest.unityPy.version, python: python.executablePath },
    dotnet: { sdk: manifest.dotnetSdk.version, command: dotnetCommand },
    animationPatch: { id: manifest.animationPatch.id, sha256: manifest.animationPatch.patchedAssemblySha256 },
  }, null, 2) + '\n', 'utf8')

  console.log(`Chibi tools ready for ${hostPlatform}.`)
  console.log(`  AssetStudioModCLI ${manifest.assetStudioModCli.version}: ${assetStudio.assemblyPath}`)
  console.log(`  FBX2glTF ${manifest.fbx2gltf.version}: ${fbx2gltf.executablePath}`)
  console.log(`  UnityPy ${manifest.unityPy.version}: ${python.executablePath}`)
}

main().catch((error) => {
  console.error(`chibi:setup failed: ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
})
