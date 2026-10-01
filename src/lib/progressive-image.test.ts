import assert from 'node:assert/strict'
import test from 'node:test'
import { imageThumbnail, loadDecodedImage } from './progressive-image'
import { imageConfigDefault } from 'next/dist/shared/lib/image-config'

imageConfigDefault.remotePatterns = [{ protocol: 'https', hostname: 'schaledb.com', port: '', pathname: '/images/student/**', search: '' }]

test('SchaleDB student thumbnails avoid the rate-limited nested image proxy', () => {
  for (const folder of ['collection', 'portrait', 'icon']) {
    const upstream = `https://schaledb.com/images/student/${folder}/26000.webp`
    const source = `/api/image-proxy?url=${encodeURIComponent(upstream)}`
    assert.equal(new URL(imageThumbnail(source, 48), 'http://localhost').searchParams.get('url'), upstream)
  }
  const other = '/api/image-proxy?url=https%3A%2F%2Fi.imgur.com%2Fphoto.jpg'
  assert.equal(new URL(imageThumbnail(other, 48), 'http://localhost').searchParams.get('url'), other)
})

test('public images get tiny previews and container-sized thumbnails', () => {
  const src = '/api/image-proxy?url=https%3A%2F%2Fschaledb.com%2Fstudent.webp'
  assert.equal(new URL(imageThumbnail(src, 16), 'http://localhost').searchParams.get('w'), '32')
  assert.equal(new URL(imageThumbnail(src, 26), 'http://localhost').searchParams.get('w'), '64')
  assert.equal(new URL(imageThumbnail('/api/radio/thumbnail/track', 120), 'http://localhost').searchParams.get('w'), '256')
})

test('private sources, uploaded previews and vector images bypass optimization', () => {
  for (const src of ['/api/admin/private-image', 'blob:local', 'data:image/png;base64,abc', '/assets/icon.svg']) {
    assert.equal(imageThumbnail(src, 16), src)
  }
})

test('completion waits for decoding, not just the image load event', async () => {
  let downloaded!: { onload: () => void; onerror: () => void; src: string }
  let finishDecode!: () => void
  const originalImage = globalThis.Image
  globalThis.Image = class {
    onload = () => {}; onerror = () => {}; src = ''
    constructor() { downloaded = this }
    decode() { return new Promise<void>(resolve => { finishDecode = resolve }) }
  } as unknown as typeof Image
  try {
    let complete = false
    const result = loadDecodedImage('/thumbnail').then(() => { complete = true })
    assert.equal(downloaded.src, '/thumbnail')
    downloaded.onload(); await Promise.resolve()
    assert.equal(complete, false)
    finishDecode(); await result
    assert.equal(complete, true)
    const failure = loadDecodedImage('/missing')
    downloaded.onerror()
    await assert.rejects(failure, /could not be downloaded/)
  } finally { globalThis.Image = originalImage }
})
