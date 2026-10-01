'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ProgressiveImage from './ProgressiveImage'

/** Article HTML is sanitized by the news API before reaching this component. */
export default function ProgressiveArticle({ html, className }: { html: string; className?: string }) {
  const container = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<{ node: Element; src: string; alt: string }[]>([])
  // Prevent the HTML parser from starting full-size image downloads.
  const deferredHtml = useMemo(() => html.replace(/<img\b[^>]*>/gi, tag => tag.replace(/\bsrc=/gi, 'data-image-src=')), [html])
  useEffect(() => {
    const targets = Array.from(container.current?.querySelectorAll('img[data-image-src]') || [])
    const replacements = targets.map(image => {
      const node = document.createElement('span')
      image.replaceWith(node)
      return { node, src: image.getAttribute('data-image-src') || '', alt: image.getAttribute('alt') || '' }
    })
    setImages(replacements)
    return () => { replacements.forEach(({ node }, index) => node.replaceWith(targets[index])) }
  }, [deferredHtml])
  return <>
    <div key={deferredHtml} ref={container} className={className} dangerouslySetInnerHTML={{ __html: deferredHtml }} />
    {images.map(({ node, src, alt }, index) => createPortal(<ProgressiveImage src={src} alt={alt} className="w-full" />, node, `${src}:${index}`))}
  </>
}
