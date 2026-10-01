'use client'

import ProgressiveImage from '@/components/ui/ProgressiveImage'
import { useState } from 'react'
import styles from './RadioPage.module.css'

export function RadioArtwork({ src, alt = '', sizes = '240px', eager = false }: { src?: string | null; alt?: string; sizes?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span className={styles.artFallback} aria-label={alt || 'Artwork unavailable'}>
        <span>ST</span>
        <small>NO ART</small>
      </span>
    )
  }

  return <ProgressiveImage src={src} alt={alt} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} className={styles.artImage} />
}
