import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Resolve the repository from this module rather than from process.cwd().
 * The worker invokes several conversion helpers that still resolve their
 * script paths relative to the current directory, so the worker bootstrap
 * establishes the documented repository-root working directory first.
 */
export const chibiRepositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Worker/doctor processes are not launched by Next's dotenv loader. Load the
// repository environment before their other static imports (notably Prisma)
// are evaluated, while preserving variables explicitly supplied by the host.
dotenv.config({ path: path.join(chibiRepositoryRoot, '.env') })
if (process.cwd() !== chibiRepositoryRoot) process.chdir(chibiRepositoryRoot)
