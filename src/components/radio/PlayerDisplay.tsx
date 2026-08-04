'use client'

import { formatRadioTime, type RadioPlayerValue } from './RadioPlayerProvider'
import styles from './RadioPage.module.css'

export function PlayerDisplay({ player }: { player: RadioPlayerValue }) {
  const title = player.currentTrack?.displayTitle || 'NO DISC INSERTED'
  const status = player.error ? 'ERR' : player.loading ? 'LOAD' : player.playing ? 'PLAY' : 'PAUSE'
  const progress = player.duration ? Math.min(100, (player.currentTime / player.duration) * 100) : 0

  return (
    <section className={`${styles.lcd} ${player.loading ? styles.lcdRefreshing : ''}`} aria-label="Player display">
      <div className={styles.lcdTopline}>
        <span>MD-01 / KIVOTOS</span>
        <span className={styles.lcdStatus}>{status}</span>
      </div>
      <div className={styles.lcdTitle} title={title}><span>{title}</span></div>
      <div className={styles.lcdMeta}>BLUE ARCHIVE GLOBAL · OST ARCHIVE</div>
      <div className={styles.visualizer} aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--bar': index % 7 } as React.CSSProperties} className={player.playing ? styles.barActive : ''} />)}
      </div>
      <div className={styles.lcdTime}>
        <strong>{formatRadioTime(player.currentTime)}</strong>
        <span>{formatRadioTime(player.duration)}</span>
      </div>
      <input
        aria-label="Music position"
        type="range"
        min={0}
        max={player.duration || 0}
        value={Math.min(player.currentTime, player.duration || 0)}
        onChange={(event) => player.seek(Number(event.target.value))}
        className={styles.seekTrack}
        style={{ '--progress': `${progress}%` } as React.CSSProperties}
      />
      {player.error && <div className={styles.lcdError}>{player.error}</div>}
    </section>
  )
}
