import { getImageProps } from 'next/image'

export function imageThumbnail(source: string, width: number, quality = 75) {
  if (source.startsWith('/api/image-proxy?')) {
    const upstream = new URLSearchParams(source.split('?', 2)[1]).get('url')
    // The optimizer caches these public files directly, without consuming the proxy's per-minute quota.
    if (upstream && /^https:\/\/schaledb\.com\/images\/student\/(?:collection|portrait|icon)\/\d+\.webp$/.test(upstream)) source = upstream
  }
  // Only public image routes are eligible for server-side optimization.
  if (!/^\/assets\/|^\/api\/image-proxy\?|^\/api\/memorial-poster\?|^\/api\/radio\/thumbnail\/|^https:\/\/schaledb\.com\/images\/student\//.test(source) || /\.svg(?:\?|$)/i.test(source)) return source
  return getImageProps({ src: source, alt: '', width: Math.max(16, width), height: Math.max(16, width), quality }).props.src
}

export function loadDecodedImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => { image.decode().then(resolve, reject) }
    image.onerror = () => reject(new Error('Image could not be downloaded'))
    image.src = url
  })
}
