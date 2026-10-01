import './chibi-runtime'

import { chibiRepositoryRoot } from './chibi-runtime'
import { resolveChibiRoots, runChibiPreflight } from './chibi-preflight'

// npm 10 exposes `npm run chibi:doctor -- --tools-only` as a config flag
// instead of forwarding it to tsx's process.argv.
const toolsOnly = process.argv.includes('--tools-only') || process.env.npm_config_tools_only === 'true'

function resultLine(ok: boolean, label: string, detail: string) {
  console.log(`${ok ? '[OK]  ' : '[FAIL]'} ${label}: ${detail}`)
}

async function main() {
  const preflight = await runChibiPreflight({
    roots: resolveChibiRoots(chibiRepositoryRoot),
    toolsOnly,
  })
  console.log(`Chibi doctor · ${preflight.platform ?? `${process.platform}/${process.arch}`}`)
  for (const check of preflight.checks) {
    resultLine(check.ok, check.label, `${check.detail}${!check.ok && check.remediation ? ` — ${check.remediation}` : ''}`)
  }
  const failed = preflight.failures.length
  console.log(`${failed ? '[FAIL]' : '[OK]  '} ${preflight.checks.length - failed}/${preflight.checks.length} checks passed${toolsOnly ? ' (tools only)' : ''}.`)
  if (failed) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
