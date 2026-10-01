'use client'

import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'
import { imageSrc } from '@/lib/utils'
import { imageThumbnail, loadDecodedImage } from '@/lib/progressive-image'

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean
  priority?: boolean
  unoptimized?: boolean
}

const EMPTY_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E'

/** Keep the existing image layout; reveal the larger file only after decoding. */
export default function ProgressiveImage({ src = '', alt = '', fill, priority, unoptimized, loading, style, sizes: _sizes, ...props }: Props) {
  const imageRef = useRef<HTMLImageElement>(null)
  const source = imageSrc(src)
  const direct = unoptimized || /^(blob:|data:)/.test(source)
  const preview = source ? imageThumbnail(source, 16) : EMPTY_IMAGE
  const [display, setDisplay] = useState({ source, url: preview, ready: false })

  useEffect(() => {
    const element = imageRef.current
    if (!element || !source || direct) return
    let cancelled = false
    let request = 0
    let lastUrl = ''
    const intrinsicSizing = element.getBoundingClientRect().width <= 1
    const preview = imageThumbnail(source, 16)
    setDisplay({ source, url: preview, ready: false })

    const load = () => {
      const { width, height } = element.getBoundingClientRect()
      const containerWidth = element.parentElement?.getBoundingClientRect().width || 320
      const aspect = element.naturalHeight ? element.naturalWidth / element.naturalHeight : 1
      const coverWidth = window.getComputedStyle(element).objectFit === 'cover' ? height * aspect : 0
      const renderedWidth = Math.max(intrinsicSizing ? containerWidth : width, coverWidth)
      // The helper selects a 2x URL; retain at least 2x detail, including cropped artwork.
      const url = imageThumbnail(source, Math.ceil(renderedWidth * Math.max(2, Math.min(window.devicePixelRatio || 1, 3)) / 2), 90)
      if (url === lastUrl) return
      lastUrl = url
      const currentRequest = ++request
      let completedUrl = url
      loadDecodedImage(url).catch(() => {
        if (cancelled || currentRequest !== request) return
        // A transient optimizer failure should not permanently hide the student.
        completedUrl = source
        return loadDecodedImage(source)
      }).then(() => {
        if (!cancelled && currentRequest === request) setDisplay({ source, url: completedUrl, ready: true })
      }, () => {
        // Let the real img dispatch its error so existing fallback handlers work.
        if (!cancelled && currentRequest === request) setDisplay({ source, url: completedUrl, ready: true })
      })
    }

    const resize = new ResizeObserver(load)
    const start = () => { load(); resize.observe(element); element.addEventListener('load', load) }
    let observer: IntersectionObserver | undefined
    if (priority || loading === 'eager') start()
    else {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); start() }
      }, { rootMargin: '160px' })
      observer.observe(element)
    }
    return () => { cancelled = true; observer?.disconnect(); resize.disconnect(); element.removeEventListener('load', load) }
  }, [source, direct, loading, priority])

  const current = display.source === source ? display : { url: preview, ready: false }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} ref={imageRef} alt={alt} src={direct ? source : current.url}
      loading={priority ? 'eager' : loading || 'lazy'} decoding="async"
      data-image-state={direct || current.ready ? 'ready' : 'preview'}
      onError={event => {
        if (!direct && !current.ready) { event.currentTarget.src = EMPTY_IMAGE; return }
        props.onError?.(event)
      }}
      style={{ ...(fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const : {}), ...style,
        filter: direct || current.ready ? style?.filter : 'blur(5px)',
        transition: [style?.transition, 'filter 240ms ease-out'].filter(Boolean).join(', '),
      }} />
  )
}
