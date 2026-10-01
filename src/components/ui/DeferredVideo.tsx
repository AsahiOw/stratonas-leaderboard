'use client'

import { useEffect, useRef, useState, type VideoHTMLAttributes } from 'react'
import ProgressiveImage from './ProgressiveImage'

/** Decorative video waits for the page and its visible poster before downloading. */
export default function DeferredVideo({ src, poster, className, style, onPlaying, ...props }: VideoHTMLAttributes<HTMLVideoElement>) {
  const stage = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState<string>()
  const [playing, setPlaying] = useState<string>()

  useEffect(() => {
    if (!stage.current || !src) return
    let visible = false, delayed = false, cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const start = () => { if (!cancelled && visible && delayed) setReady(src) }
    const afterLoad = () => { timer = setTimeout(() => { delayed = true; start() }, 1200) }
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting); start()
    }, { threshold: 0.01 })
    observer.observe(stage.current)
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })
    return () => { cancelled = true; clearTimeout(timer); observer.disconnect(); window.removeEventListener('load', afterLoad) }
  }, [src])

  return <div ref={stage} className={className} style={{ ...style, isolation: 'isolate' }}>
    {poster && <ProgressiveImage src={poster} alt="" fill className="object-cover" />}
    {src && ready === src && <video {...props} key={src} src={src} preload="none"
      className="absolute inset-0 h-full w-full object-cover"
      style={{ opacity: playing === src ? 1 : 0, transition: 'opacity 240ms ease-out' }}
      onPlaying={event => { setPlaying(src); onPlaying?.(event) }} />}
  </div>
}
