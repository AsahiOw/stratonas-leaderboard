'use client'

import { useEffect, useState } from 'react'

export const FALLBACK_STUDENT_ACCENT = 'oklch(0.55 0.10 250)'
const accentCache = new Map<string, string | null>()

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  if (max === min) return { hue: 0, saturation: 0, lightness }

  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue = 0

  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0)
  if (max === g) hue = (b - r) / delta + 2
  if (max === b) hue = (r - g) / delta + 4

  return { hue: hue * 60, saturation, lightness }
}

function isSkinTone(hue: number, saturation: number, lightness: number) {
  return hue >= 5 && hue <= 50 && saturation >= 0.1 && saturation <= 0.55 && lightness >= 0.45 && lightness <= 0.88
}

function rgbToOklchString(r: number, g: number, b: number) {
  const sr = r / 255
  const sg = g / 255
  const sb = b / 255
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const lr = lin(sr)
  const lg = lin(sg)
  const lb = lin(sb)
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)
  const okL = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot
  const okA = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot
  const okB = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot
  const chroma = Math.sqrt(okA * okA + okB * okB)
  let hue = Math.atan2(okB, okA) * 180 / Math.PI
  if (hue < 0) hue += 360

  return `oklch(${Math.max(0.42, Math.min(0.72, okL)).toFixed(3)} ${Math.min(0.2, chroma).toFixed(3)} ${hue.toFixed(1)})`
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

async function extractAccent(url: string) {
  if (!url) return null
  if (accentCache.has(url)) return accentCache.get(url) || null

  try {
    const image = await loadImage(url)
    const width = 80
    const height = Math.max(1, Math.round(width * image.height / image.width))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, width, height)

    const data = context.getImageData(0, 0, width, height).data
    const buckets = new Map<string, { count: number; r: number; g: number; b: number; saturation: number }>()

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3]
      if (alpha < 128) continue

      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const { hue, saturation, lightness } = rgbToHsl(r, g, b)
      if (saturation < 0.18 || lightness < 0.12 || lightness > 0.92 || isSkinTone(hue, saturation, lightness)) continue

      const key = `${Math.round(hue / 15) * 15}|${Math.round(lightness * 10) / 10}`
      const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, saturation: 0 }
      bucket.count += 1
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.saturation += saturation
      buckets.set(key, bucket)
    }

    const best = Array.from(buckets.values())
      .map((bucket) => ({
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
        score: bucket.count * (bucket.saturation / bucket.count) ** 2,
      }))
      .sort((a, b) => b.score - a.score)[0]

    const accent = best ? rgbToOklchString(best.r, best.g, best.b) : null
    accentCache.set(url, accent)
    return accent
  } catch {
    accentCache.set(url, null)
    return null
  }
}

export function useStudentAccent(studentId: number, imageUrl: string, storedAccent?: string | null) {
  const [accent, setAccent] = useState(storedAccent || FALLBACK_STUDENT_ACCENT)

  useEffect(() => {
    let alive = true
    if (storedAccent) {
      setAccent(storedAccent)
      return () => { alive = false }
    }

    setAccent(FALLBACK_STUDENT_ACCENT)
    extractAccent(imageUrl).then((sampled) => {
      if (!alive || !sampled) return
      setAccent(sampled)
      void fetch('/api/students/accent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, accentColor: sampled }),
      }).catch(() => {})
    })
    return () => { alive = false }
  }, [imageUrl, storedAccent, studentId])

  return accent
}
