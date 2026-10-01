import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'

test('3D can decode embedded textures and forwards its nonce policy to Next', async () => {
  const response = await proxy(new NextRequest('http://localhost/3D'))
  const policy = response.headers.get('Content-Security-Policy')!
  const connect = policy.split(';').find((directive) => directive.trim().startsWith('connect-src'))!
  assert.ok(connect.split(/\s+/).includes('blob:'))
  assert.equal(response.headers.get('x-middleware-request-content-security-policy'), policy)
  const nonce = response.headers.get('x-middleware-request-x-nonce')
  assert.ok(nonce)
  assert.ok(policy.includes(`'nonce-${nonce}'`))
})

test('embedded texture permission excludes the main site', async () => {
  const response = await proxy(new NextRequest('http://localhost/'))
  const policy = response.headers.get('Content-Security-Policy')!
  const connect = policy.split(';').find((directive) => directive.trim().startsWith('connect-src'))!
  assert.ok(!connect.split(/\s+/).includes('blob:'))
})

test('only the private admin preview gains embedded texture access', async () => {
  for (const [pathname, expected] of [['/admin/chibi/preview', true], ['/admin', false], ['/admin/chibi', false]] as const) {
    const response = await proxy(new NextRequest(`http://localhost${pathname}`))
    const connect = response.headers.get('Content-Security-Policy')!.split(';').find(part => part.trim().startsWith('connect-src'))!
    assert.equal(connect.split(/\s+/).includes('blob:'), expected)
  }
})
