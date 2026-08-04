'use client'

import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { formatRadioTime, useRadioPlayer } from './RadioPlayerProvider'
import { RadioArtwork } from './RadioArtwork'
import styles from './RadioPage.module.css'

export function RadioMiniPlayer() {
  const pathname = usePathname()
  const router = useRouter()
  const player = useRadioPlayer()
  if (!player.backgroundMode || !player.currentTrack || ['/radio', '/login', '/admin'].includes(pathname)) return null
  const open = () => router.push('/radio')
  return (
    <aside className={styles.miniPlayer} aria-label="Radio mini player">
      <button type="button" onClick={open} className={`${styles.miniDisc} ${player.playing ? styles.miniDiscPlaying : ''}`} aria-label="Open Radio">
        <RadioArtwork src={player.currentTrack.thumbnailUrl} alt="" sizes="56px" />
        <i />
      </button>
      <div className={styles.miniDisplay}>
        <button type="button" onClick={open}>{player.currentTrack.displayTitle}</button>
        <div><span style={{ width: `${player.duration ? Math.min(100, player.currentTime / player.duration * 100) : 0}%` }} /></div>
        <small>{formatRadioTime(player.currentTime)} / {formatRadioTime(player.duration)}</small>
      </div>
      <div className={styles.miniControls}>
        <button type="button" onClick={player.previous} aria-label="Previous"><SkipBack size={14} /></button>
        <button type="button" onClick={player.togglePlay} aria-label={player.playing ? 'Pause' : 'Play'}>{player.playing ? <Pause size={15} /> : <Play size={15} />}</button>
        <button type="button" onClick={player.next} aria-label="Next"><SkipForward size={14} /></button>
        <button type="button" onClick={() => { player.setBackgroundMode(false); if (player.playing) player.togglePlay() }} aria-label="Exit background mode"><X size={14} /></button>
      </div>
    </aside>
  )
}
