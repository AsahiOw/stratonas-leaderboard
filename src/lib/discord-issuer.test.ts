import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mock, test } from 'node:test'
import type { NextAuthConfig } from 'next-auth'
import type { OAuthConfig } from 'next-auth/providers'

let config: NextAuthConfig
mock.module('next-auth', { defaultExport: (options: NextAuthConfig) => {
  config = options
  return { auth: () => null, handlers: {}, signIn: () => {}, signOut: () => {} }
} })
mock.module('@/lib/prisma', { namedExports: { prisma: {} } })

test('Discord callbacks accept the configured issuer and reject a different issuer', async () => {
  await import('./auth')
  const provider = config.providers.map((entry) => typeof entry === 'function' ? entry() : entry)
    .find((entry) => entry.id === 'discord') as OAuthConfig<Record<string, unknown>>
  const issuer = provider.options?.issuer ?? provider.issuer
  assert.equal(issuer, 'https://discord.com')

  // Exercise the same installed OAuth validator that Auth.js calls, without
  // exchanging an authorization code or accessing a user's Discord account.
  const require = createRequire(import.meta.url)
  const validatorPath = require.resolve('oauth4webapi', { paths: [require.resolve('@auth/core')] })
  const oauth = await import(pathToFileURL(validatorPath).href)
  const parameters = new URLSearchParams({ code: 'test-code', iss: 'https://discord.com', state: 'test-state' })
  const client = { client_id: 'test-client' }
  assert.throws(() => oauth.validateAuthResponse({ issuer: 'https://authjs.dev' }, client, parameters, 'test-state'), /unexpected "iss"/)
  const result = oauth.validateAuthResponse({ issuer }, client, parameters, 'test-state')
  assert.equal(result.get('code'), 'test-code')
  parameters.set('iss', 'https://other.example')
  assert.throws(() => oauth.validateAuthResponse({ issuer }, client, parameters, 'test-state'), /unexpected "iss"/)
  parameters.set('iss', issuer!)
  assert.throws(() => oauth.validateAuthResponse({ issuer }, client, parameters, 'wrong-state'), /state/)
})
