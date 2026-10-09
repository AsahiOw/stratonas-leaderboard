import type { ReactNode } from 'react'
import Image from 'next/image'
import styles from './StudentPlayground.module.css'

export function PlaygroundLoading({ loaded = 0, total = 0, mapReady = false, children }: { loaded?: number; total?: number; mapReady?: boolean; children?: ReactNode }) {
  return <section className={styles.loadingScreen} aria-label="Loading Schale Residence Hall" aria-busy="true">
    <a href="/other" className={styles.loadingBack}>← Other Features</a>
    <div className={styles.loadingCard}>
      <div className={styles.loadingEmblem}><Image src="/icons/Schale_Icon.webp" alt="Schale" width={80} height={80} loading="eager" unoptimized /></div>
      <h1>Schale Residence Hall</h1>
      <p>Getting the rooms and your visitors ready…</p>
      <progress aria-label="Residence hall loading progress" value={loaded + Number(mapReady)} max={total + 1} />
      <div className={styles.loadingDetails} role="status"><span>{mapReady ? 'Hall ready' : 'Preparing the hall'}</span><span>{total ? `${loaded} / ${total} students ready` : 'Preparing the guest list'}</span></div>
      {children}
    </div>
  </section>
}
