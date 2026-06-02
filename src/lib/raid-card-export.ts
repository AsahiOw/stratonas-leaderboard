'use client'

import { toBlob } from 'html-to-image'

export function safeExportFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'raid-card'
}

export function raidCardFilename(input: { rank?: number; name: string; suffix?: string }) {
  const rank = input.rank ? `rank-${String(input.rank).padStart(2, '0')}-` : ''
  const suffix = input.suffix ? `-${safeExportFilename(input.suffix)}` : ''
  return `${rank}${safeExportFilename(input.name)}${suffix}.png`
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()))
  })
}

async function waitForImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve()
    return new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })
  }))
}

export async function raidCardToBlob(node: HTMLElement) {
  await document.fonts?.ready
  await waitForImages(node)
  await nextFrame()

  const blob = await toBlob(node, {
    width: 1000,
    height: 475,
    pixelRatio: 1,
    cacheBust: false,
    includeQueryParams: true,
    backgroundColor: 'transparent',
  })

  if (!blob) throw new Error('Unable to export raid card image.')
  return blob
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadRaidCardPng(node: HTMLElement, filename: string) {
  const blob = await raidCardToBlob(node)
  downloadBlob(blob, filename)
}
