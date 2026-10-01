import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

import {
  UNITY_BUILTIN_QUAD_NAME,
  UNITY_BUILTIN_QUAD_PATH_ID,
  UNITY_BUILTIN_RESOURCES_FILE,
  UNITY_BUILTIN_RESOURCES_GUID,
  unityBuiltinQuadReference,
} from './unity-builtin'
import {
  UNITY_BUILTIN_QUAD_NAME as serverQuadName,
  UNITY_BUILTIN_QUAD_PATH_ID as serverQuadPathId,
  UNITY_BUILTIN_RESOURCES_FILE as serverResourcesFile,
  UNITY_BUILTIN_RESOURCES_GUID as serverResourcesGuid,
  unityBuiltinQuadReference as serverUnityBuiltinQuadReference,
} from './inventory'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const sourceRoot = path.join(projectRoot, 'src')
const clientEntry = path.join(sourceRoot, 'components', 'chibi', 'ChibiBrowser.tsx')

type ClientImport = { from: string; specifier: string; resolved: string | null }

function sourceFileKind(file: string) {
  return file.endsWith('.tsx') ? ts.ScriptKind.TSX
    : file.endsWith('.jsx') ? ts.ScriptKind.JSX
      : file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS
}

function candidateFiles(file: string) {
  return ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
    .map(extension => `${file}${extension}`)
    .concat(['index.ts', 'index.tsx', 'index.js', 'index.jsx'].map(name => path.join(file, name)))
}

function resolveProjectImport(from: string, specifier: string) {
  const candidate = specifier.startsWith('@/')
    ? path.join(sourceRoot, specifier.slice(2))
    : specifier.startsWith('.') ? path.resolve(path.dirname(from), specifier) : null
  if (!candidate) return null
  const resolved = candidateFiles(candidate).find(item => existsSync(item) && statSync(item).isFile())
  return resolved ? path.normalize(resolved) : null
}

function hasRuntimeBindings(clause: ts.ImportClause | undefined) {
  if (!clause) return true
  if (clause.isTypeOnly) return false
  if (clause.name) return true
  if (!clause.namedBindings) return false
  if (ts.isNamespaceImport(clause.namedBindings)) return true
  return clause.namedBindings.elements.some(element => !element.isTypeOnly)
}

function hasRuntimeExport(statement: ts.ExportDeclaration) {
  if (statement.isTypeOnly || !statement.exportClause) return !statement.isTypeOnly
  if (ts.isNamespaceExport(statement.exportClause)) return true
  if (ts.isNamedExports(statement.exportClause)) return statement.exportClause.elements.some(element => !element.isTypeOnly)
  return true
}

function clientImports(file: string): ClientImport[] {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, sourceFileKind(file))
  const imports: ClientImport[] = []
  const add = (specifier: string) => imports.push({ from: file, specifier, resolved: resolveProjectImport(file, specifier) })
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) && hasRuntimeBindings(node.importClause)) add(node.moduleSpecifier.text)
    } else if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) && hasRuntimeExport(node)) add(node.moduleSpecifier.text)
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const argument = node.arguments[0]
      const expression = node.expression
      if (ts.isStringLiteral(argument) && (expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(expression) && expression.text === 'require'))) add(argument.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return imports
}

function forbiddenSpecifier(specifier: string) {
  return specifier.startsWith('node:')
    || /^(?:assert|buffer|child_process|cluster|crypto|dgram|dns|fs|http|https|module|net|os|path|process|readline|stream|tls|url|util|worker_threads|zlib)(?:\/|$)/.test(specifier)
    || /^(?:@prisma\/|prisma(?:\/|$))/i.test(specifier)
}

function forbiddenSource(file: string) {
  const relative = path.relative(projectRoot, file).replaceAll('\\', '/').toLowerCase()
  return relative === 'src/lib/chibi/inventory.ts'
    || relative === 'src/lib/chibi/storage.ts'
    || relative === 'src/lib/prisma.ts'
    || relative.startsWith('src/generated/prisma/')
}

function traceClientGraph(entry: string) {
  const visited = new Set<string>(), imports: ClientImport[] = []
  function visit(file: string) {
    if (visited.has(file)) return
    visited.add(file)
    for (const edge of clientImports(file)) {
      imports.push(edge)
      if (edge.resolved) visit(edge.resolved)
    }
  }
  visit(entry)
  return { visited, imports }
}

test('the /3D client graph stays free of Node, Prisma, and server-only modules', () => {
  const graph = traceClientGraph(clientEntry)
  const violations = graph.imports.flatMap(edge => {
    const reasons = [
      forbiddenSpecifier(edge.specifier) ? `forbidden import ${edge.specifier}` : null,
      edge.resolved && forbiddenSource(edge.resolved) ? `server-only module ${path.relative(projectRoot, edge.resolved)}` : null,
    ].filter((reason): reason is string => Boolean(reason))
    return reasons.map(reason => `${path.relative(projectRoot, edge.from)} → ${reason}`)
  })
  assert.deepEqual(violations, [])
  assert.ok(graph.visited.has(path.normalize(path.join(sourceRoot, 'components/chibi/ChibiViewer.tsx'))))
  assert.ok(graph.visited.has(path.normalize(path.join(sourceRoot, 'lib/chibi/rendering-profile.ts'))))
  assert.ok(graph.visited.has(path.normalize(path.join(sourceRoot, 'lib/chibi/fx-event-policy.ts'))))
  assert.ok(graph.visited.has(path.normalize(path.join(sourceRoot, 'lib/chibi/unity-builtin.ts'))))
  assert.ok(!graph.visited.has(path.normalize(path.join(sourceRoot, 'lib/chibi/inventory.ts'))))
})

test('inventory keeps the server-side builtin identity exports pointing at the pure module', () => {
  assert.equal(serverQuadName, UNITY_BUILTIN_QUAD_NAME)
  assert.equal(serverQuadPathId, UNITY_BUILTIN_QUAD_PATH_ID)
  assert.equal(serverResourcesFile, UNITY_BUILTIN_RESOURCES_FILE)
  assert.equal(serverResourcesGuid, UNITY_BUILTIN_RESOURCES_GUID)
  assert.strictEqual(serverUnityBuiltinQuadReference, unityBuiltinQuadReference)
})
