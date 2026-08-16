'use client'

import Image from 'next/image'
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

  return <Image src={src} alt={alt} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'} unoptimized onError={() => setFailed(true)} className={styles.artImage} />
}
