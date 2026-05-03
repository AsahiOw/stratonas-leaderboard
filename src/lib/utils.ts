export function proxyImage(url: string | null | undefined): string {
  if (!url) return ''
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d + (d.includes('T') ? '' : 'T00:00:00')) : d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function hexToRgb(hex: string): string {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#4f8ef7'
  return `${parseInt(normalized.slice(1, 3), 16)},${parseInt(normalized.slice(3, 5), 16)},${parseInt(normalized.slice(5, 7), 16)}`
}

export function imageSrc(url: string | null | undefined, fallback = ''): string {
  if (!url) return fallback
  if (url.startsWith('/')) return url
  return proxyImage(url)
}
