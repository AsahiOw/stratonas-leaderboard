import { createHash } from 'node:crypto'
import { access, readdir, stat } from 'node:fs/promises'
import { constants, createReadStream, readFileSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export type ChibiPlatform = 'win32-x64' | 'darwin-x64' | 'linux-x64'

export type ChibiToolManifest = {
  assetStudioModCli: { version: string; entrypoint: string; cecilAssembly: string }
  dotnetSdk: { version: string }
  fbx2gltf: { version: string; platforms: Record<ChibiPlatform, { entrypoint: string }> }
  unityPy: { version: string }
  animationPatch: { id: string; sourceAssemblySha256: string; patchedAssemblySha256: string }
}

export type ChibiPreflightCheck = {
  id: string
  label: string
  ok: boolean
  detail: string
  remediation?: string
}

export type ChibiPreflightRoots = { source: string; data: string; tools: string }

export type ChibiPreflightResult = {
  ready: boolean
  checkedAt: string
  platform: ChibiPlatform | null
  roots: ChibiPreflightRoots
  checks: ChibiPreflightCheck[]
  failures: ChibiPreflightCheck[]
}

type CommandResult = { stdout: string; stderr: string }
export type ChibiCommandRunner = (command: string, args: string[]) => Promise<CommandResult>

export type ChibiPreflightOptions = {
  roots?: ChibiPreflightRoots
  toolsOnly?: boolean
  downloadSource?: boolean
  manifest?: ChibiToolManifest | null
  installRecord?: Record<string, any> | null
  runCommand?: ChibiCommandRunner
  now?: Date
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(repositoryRoot, 'scripts', 'chibi-tools', 'manifest.json')

export function resolveChibiRoots(root = repositoryRoot): ChibiPreflightRoots {
  const resolve = (value: string | undefined, fallback: string) => path.resolve(root, value || fallback)
  return {
    source: resolve(process.env.CHIBI_SOURCE_DIR, path.join('Development_data', 'BAAD')),
    data: resolve(process.env.CHIBI_DATA_DIR, path.join('Development_data', 'chibi')),
    tools: resolve(process.env.CHIBI_TOOLS_DIR, path.join('Development_data', 'chibi-tools')),
  }
}

export function summarizePreflight(checks: readonly ChibiPreflightCheck[], options: { checkedAt?: Date; platform?: ChibiPlatform | null; roots?: ChibiPreflightRoots } = {}): ChibiPreflightResult {
  const all = [...checks]
  const failures = all.filter(check => !check.ok)
  return {
    ready: failures.length === 0,
    checkedAt: (options.checkedAt ?? new Date()).toISOString(),
    platform: options.platform ?? null,
    roots: options.roots ?? resolveChibiRoots(),
    checks: all,
    failures,
  }
}

function check(id: string, label: string, ok: boolean, detail: string, remediation?: string): ChibiPreflightCheck {
  return { id, label, ok, detail, ...(remediation ? { remediation } : {}) }
}

function detectPlatform(): { value: ChibiPlatform | null; check: ChibiPreflightCheck } {
  if (process.arch !== 'x64') return {
    value: null,
    check: check('platform', 'host platform', false, `${process.platform}/${process.arch} is unsupported; Chibi tools require x64.`, 'Run the worker on Windows x64, Intel macOS, or Linux x64.'),
  }
  if (process.platform === 'win32') return { value: 'win32-x64', check: check('platform', 'host platform', true, 'win32/x64') }
  if (process.platform === 'darwin') return { value: 'darwin-x64', check: check('platform', 'host platform', true, 'darwin/x64') }
  if (process.platform === 'linux') return { value: 'linux-x64', check: check('platform', 'host platform', true, 'linux/x64') }
  return {
    value: null,
    check: check('platform', 'host platform', false, `${process.platform}/${process.arch} is unsupported.`, 'Run the worker on Windows x64, Intel macOS, or Linux x64.'),
  }
}

function runCommand(command: string, args: string[]) {
  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', chunk => { stdout += chunk })
    child.stderr?.on('data', chunk => { stderr += chunk })
    child.once('error', reject)
    child.once('close', code => code === 0
      ? resolve({ stdout, stderr })
      : reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? 'no status'}`)))
  })
}

async function exists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function hashFile(filePath: string) {
  const digest = createHash('sha256')
  const stream = createReadStream(filePath)
  return new Promise<string>((resolve, reject) => {
    stream.on('data', chunk => digest.update(chunk))
    stream.once('error', reject)
    stream.once('end', () => resolve(digest.digest('hex')))
  })
}

function readManifest() {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8')) as Partial<ChibiToolManifest>
    const platforms = parsed.fbx2gltf?.platforms
    const platformEntriesReady = !!platforms && (['win32-x64', 'darwin-x64', 'linux-x64'] as const).every(platform => typeof platforms[platform]?.entrypoint === 'string')
    if (!parsed.assetStudioModCli || typeof parsed.assetStudioModCli.version !== 'string' || typeof parsed.assetStudioModCli.entrypoint !== 'string'
      || typeof parsed.assetStudioModCli.cecilAssembly !== 'string' || typeof parsed.dotnetSdk?.version !== 'string'
      || typeof parsed.fbx2gltf?.version !== 'string' || !platformEntriesReady || typeof parsed.unityPy?.version !== 'string'
      || typeof parsed.animationPatch?.sourceAssemblySha256 !== 'string' || typeof parsed.animationPatch.patchedAssemblySha256 !== 'string') return null
    return parsed as ChibiToolManifest
  } catch {
    return null
  }
}

function nodeCheck() {
  const version = process.versions.node
  const major = Number(version.split('.')[0])
  return check('node', 'Node.js', major === 22, `${version}${major === 22 ? '' : ' (requires 22.x)'}`, 'Use Node.js 22.x for the worker process.')
}

function dotnetCommand(record: Record<string, any> | null) {
  if (process.env.CHIBI_DOTNET) return process.env.CHIBI_DOTNET
  if (typeof record?.dotnet?.command === 'string') return record.dotnet.command
  return 'dotnet'
}

async function dotnetChecks(record: Record<string, any> | null, manifest: ChibiToolManifest | null, runner: ChibiCommandRunner) {
  const command = dotnetCommand(record)
  const sdkVersion = manifest?.dotnetSdk?.version ?? '9.x'
  try {
    const runtime = await runner(command, ['--list-runtimes'])
    const hasRuntime = runtime.stdout.split(/\r?\n/).some(line => /^Microsoft\.NETCore\.App\s+9\./.test(line.trim()))
    const sdk = await runner(command, ['--list-sdks'])
    const hasSdk = sdk.stdout.split(/\r?\n/).some(line => /^9\./.test(line.trim()))
    return [
      check('dotnet-runtime', '.NET runtime', hasRuntime, hasRuntime ? `Microsoft.NETCore.App 9 via ${command}` : `Microsoft.NETCore.App 9 is missing via ${command}`, 'Install the .NET 9 runtime or set CHIBI_DOTNET to a compatible executable.'),
      check('dotnet-sdk', '.NET SDK', hasSdk, hasSdk ? `9.x via ${command}` : `the .NET ${sdkVersion} SDK is missing`, 'Install the .NET 9 SDK; the animation patch helper requires it.'),
    ]
  } catch (error) {
    const detail = `could not run ${command}: ${error instanceof Error ? error.message : String(error)}`
    return [
      check('dotnet-runtime', '.NET runtime', false, detail, 'Install the .NET 9 runtime or set CHIBI_DOTNET to a compatible executable.'),
      check('dotnet-sdk', '.NET SDK', false, detail, 'Install the .NET 9 SDK; the animation patch helper requires it.'),
    ]
  }
}

function pythonCommand(record: Record<string, any> | null) {
  if (process.env.CHIBI_PYTHON) return { command: process.env.CHIBI_PYTHON, args: ['--version'] }
  if (typeof record?.unityPy?.python === 'string') return { command: record.unityPy.python, args: ['--version'] }
  return process.platform === 'win32' ? { command: 'py', args: ['-3.12', '--version'] } : { command: 'python3.12', args: ['--version'] }
}

async function pythonChecks(record: Record<string, any> | null, manifest: ChibiToolManifest | null, runner: ChibiCommandRunner) {
  const executable = pythonCommand(record)
  try {
    const version = await runner(executable.command, executable.args)
    const text = version.stdout || version.stderr
    const valid = /Python 3\.12(?:\.|$)/.test(text)
    const checks = [check('python', 'Python', valid, `${text.trim()}${valid ? '' : ' (requires 3.12.x)'}`, 'Use Python 3.12.x via CHIBI_PYTHON or rerun npm run chibi:setup.')]
    if (!valid) return checks.concat(check('unitypy', 'UnityPy', false, 'not checked because Python is not 3.12.x', 'Install the managed Python 3.12 environment with UnityPy.'))
    const unity = await runner(executable.command, [...(executable.command === 'py' ? ['-3.12'] : []), '-c', 'import UnityPy; print(UnityPy.__version__)'])
    const actual = unity.stdout.trim()
    const expected = manifest?.unityPy?.version ?? 'the pinned version'
    const packageReady = !!manifest && actual === expected
    return checks.concat(check('unitypy', 'UnityPy', packageReady, packageReady ? actual : `expected ${expected}, got ${actual || 'missing'}`, 'Install the pinned UnityPy version with npm run chibi:setup.'))
  } catch (error) {
    const detail = `could not run ${executable.command}: ${error instanceof Error ? error.message : String(error)}`
    return [
      check('python', 'Python', false, detail, 'Install Python 3.12.x or set CHIBI_PYTHON to the managed interpreter.'),
      check('unitypy', 'UnityPy', false, 'not checked because Python could not be started', 'Install the managed Python 3.12 environment with UnityPy.'),
    ]
  }
}

async function toolChecks(hostPlatform: ChibiPlatform | null, roots: ChibiPreflightRoots, record: Record<string, any> | null, manifest: ChibiToolManifest | null) {
  if (!manifest) return [
    check('tool-manifest', 'tool manifest', false, `could not parse ${manifestPath}`, 'Restore scripts/chibi-tools/manifest.json and rerun npm run chibi:setup.'),
    check('assetstudio', 'AssetStudioModCLI', false, 'not checked because the tool manifest is unavailable', 'Restore the pinned Chibi tool installation.'),
    check('fbx2gltf', 'FBX2glTF', false, 'not checked because the tool manifest is unavailable', 'Restore the pinned Chibi tool installation.'),
    check('install-record', 'install record', false, 'not checked because the tool manifest is unavailable', 'Restore the pinned Chibi tool installation.'),
  ]
  const assemblyPath = path.join(roots.tools, 'assetstudio', manifest.assetStudioModCli.entrypoint)
  const fbxEntry = hostPlatform ? manifest.fbx2gltf.platforms[hostPlatform]?.entrypoint : undefined
  const fbxExecutable = fbxEntry ? path.join(roots.tools, 'fbx2gltf', fbxEntry) : null
  const assemblyReady = await exists(assemblyPath)
  let assemblyDetail = `missing ${assemblyPath}`
  let assemblyOk = false
  if (assemblyReady) {
    try {
      const assemblyHash = await hashFile(assemblyPath)
      assemblyOk = assemblyHash === manifest.animationPatch.patchedAssemblySha256
      assemblyDetail = assemblyOk
        ? `AssetStudioModCLI ${manifest.assetStudioModCli.version}, patched ${assemblyHash.slice(0, 12)}…`
        : assemblyHash === manifest.animationPatch.sourceAssemblySha256
          ? 'the pinned assembly is unpatched; rerun npm run chibi:setup'
          : `unexpected assembly checksum ${assemblyHash}`
    } catch (error) {
      assemblyDetail = `cannot read ${assemblyPath}: ${error instanceof Error ? error.message : String(error)}`
    }
  }
  const fbxOk = !!fbxExecutable && await exists(fbxExecutable)
  const recordPath = path.join(roots.tools, 'install.json')
  const recordOk = !!record && record.platform === hostPlatform
    && record.assetStudioModCli?.patchedSha256 === manifest.animationPatch.patchedAssemblySha256
    && record.fbx2gltf?.version === manifest.fbx2gltf.version
    && record.unityPy?.version === manifest.unityPy.version
  return [
    check('assetstudio', 'AssetStudioModCLI', assemblyOk, assemblyDetail, 'Run npm run chibi:setup to install and patch the pinned AssetStudioModCLI.'),
    check('fbx2gltf', 'FBX2glTF', fbxOk, fbxOk ? `${manifest.fbx2gltf.version} at ${fbxExecutable}` : fbxExecutable ? `missing ${fbxExecutable}` : `no FBX2glTF entry for ${hostPlatform ?? 'this platform'}`, 'Run npm run chibi:setup for the host platform.'),
    check('install-record', 'install record', recordOk, recordOk ? recordPath : `does not describe the pinned ${hostPlatform ?? 'host'} toolchain`, 'Run npm run chibi:setup so install.json records the pinned toolchain.'),
  ]
}

export async function sourceLayoutCheck(sourceRoot: string) {
  try {
    const source = await stat(sourceRoot)
    if (!source.isDirectory()) return check('source', 'source directory', false, `${sourceRoot} is not a directory`, 'Set CHIBI_SOURCE_DIR to the original BAAD directory.')
    await access(sourceRoot, constants.R_OK)
    const entries = await readdir(sourceRoot, { withFileTypes: true })
    const requiredDirectories = ['AssetBundles']
    const missing = requiredDirectories.filter(directory => !entries.some(entry => entry.isDirectory() && entry.name.toLowerCase() === directory.toLowerCase()))
    return missing.length
      ? check('source', 'source directory', false, `missing BAAD directories: ${missing.join(', ')} under ${sourceRoot}`, 'Set CHIBI_SOURCE_DIR to a BAAD directory containing AssetBundles.')
      : check('source', 'source directory', true, `${sourceRoot} (AssetBundles present)`)
  } catch (error) {
    return check('source', 'source directory', false, `cannot read ${sourceRoot}: ${error instanceof Error ? error.message : String(error)}`, 'Set CHIBI_SOURCE_DIR to the existing, readable BAAD directory.')
  }
}

export async function outputStorageCheck(dataRoot: string) {
  try {
    const output = await stat(dataRoot)
    if (!output.isDirectory()) return check('output', 'output storage', false, `${dataRoot} is not a directory`, 'Create CHIBI_DATA_DIR as an empty writable directory.')
    await access(dataRoot, constants.W_OK)
    return check('output', 'output storage', true, `${dataRoot} is writable`)
  } catch (error) {
    return check('output', 'output storage', false, `cannot access writable ${dataRoot}: ${error instanceof Error ? error.message : String(error)}`, 'Create CHIBI_DATA_DIR as an empty writable directory; the readiness check does not create files.')
  }
}

export async function databaseCheck(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) return check('database', 'database', false, 'DATABASE_URL is not set', 'Set DATABASE_URL to the PostgreSQL database shared by the app and worker.')
  let client: { connect: () => Promise<unknown>; query: (sql: string) => Promise<unknown>; end: () => Promise<void> } | null = null
  try {
    const { Client } = await import('pg')
    const candidate = new Client({ connectionString, connectionTimeoutMillis: 5_000 })
    client = candidate
    await candidate.connect()
    await candidate.query('SELECT 1')
    return check('database', 'database', true, 'PostgreSQL connection and SELECT 1 succeeded')
  } catch (error) {
    return check('database', 'database', false, `could not connect to PostgreSQL: ${error instanceof Error ? error.message : String(error)}`, 'Start PostgreSQL and ensure app/worker use the same DATABASE_URL.')
  } finally {
    await client?.end().catch(() => undefined)
  }
}

export async function runChibiPreflight(options: ChibiPreflightOptions = {}): Promise<ChibiPreflightResult> {
  const roots = options.roots ?? resolveChibiRoots()
  const runner = options.runCommand ?? runCommand
  const manifest = options.manifest === undefined ? readManifest() : options.manifest
  const record = options.installRecord === undefined
    ? await (async () => {
      const installPath = path.join(roots.tools, 'install.json')
      if (!(await exists(installPath))) return null
      try { return JSON.parse(readFileSync(installPath, 'utf8')) as Record<string, any> } catch { return null }
    })()
    : options.installRecord
  const host = detectPlatform()
  const checks: ChibiPreflightCheck[] = [host.check, nodeCheck()]
  checks.push(...await dotnetChecks(record, manifest, runner))
  checks.push(...await pythonChecks(record, manifest, runner))
  checks.push(...await toolChecks(host.value, roots, record, manifest))
  if (!options.toolsOnly) {
    checks.push(options.downloadSource ? check('source', 'source directory', true, 'A queued AssetBundle download will prepare the source directory.') : await sourceLayoutCheck(roots.source))
    checks.push(await outputStorageCheck(roots.data))
    checks.push(await databaseCheck())
  }
  return summarizePreflight(checks, { checkedAt: options.now, platform: host.value, roots })
}
