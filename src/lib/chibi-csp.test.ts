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

test('entry pages allow embedded textures after client navigation to 3D or admin preview', async () => {
  for (const pathname of ['/', '/other', '/news', '/admin', '/admin/chibi', '/admin/chibi/preview']) {
    const response = await proxy(new NextRequest(`http://localhost${pathname}`))
    const policy = response.headers.get('Content-Security-Policy')!
    const connect = policy.split(';').find(part => part.trim().startsWith('connect-src'))!
    assert.ok(connect.split(/\s+/).includes('blob:'), pathname)
    assert.match(policy, /object-src 'none'/)
    assert.match(policy, /frame-ancestors 'none'/)
    assert.equal(response.headers.get('x-middleware-request-content-security-policy'), policy)
  }
})
