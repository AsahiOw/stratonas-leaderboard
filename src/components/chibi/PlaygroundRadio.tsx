'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Radio, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import ProgressiveImage from '@/components/ui/ProgressiveImage'
import { formatRadioTime, useRadioPlayer } from '@/components/radio/RadioPlayerProvider'
import styles from './StudentPlayground.module.css'

export function PlaygroundRadio({ onClose }: { onClose: () => void }) {
  const player = useRadioPlayer()
  const [search, setSearch] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const tracks = player.tracks.filter(track => `${track.displayTitle} ${track.title}`.toLowerCase().includes(search.trim().toLowerCase()))

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLInputElement>('input[aria-label="Search songs"]')?.focus()
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return }
      if (event.key !== 'Tab') return
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')
      if (!controls?.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keyDown)
    return () => { document.removeEventListener('keydown', keyDown); if (previous?.isConnected) previous.focus() }
  }, [onClose])

  const play = (id: string) => { player.setBackgroundMode(true); player.playTrack(id) }

  return <div className={styles.scrim} onClick={onClose}>
    <section ref={dialogRef} id="playground-radio-dialog" role="dialog" aria-modal="true" aria-label="Background music" className={`${styles.dialog} ${styles.radioDialog}`} onClick={event => event.stopPropagation()}>
      <div className={styles.sectionHeading}><h2><Radio size={18} /> Background music</h2><button aria-label="Close background music" onClick={onClose}><X size={18} /></button></div>
      <p className={styles.hint}>Pick a song for the hall. Music keeps playing when you close this panel.</p>
      {player.currentTrack && <div className={styles.radioNowPlaying}>
        <div className={styles.radioSong}><span className={styles.radioArtwork}><ProgressiveImage src={player.currentTrack.thumbnailUrl} alt="" fill sizes="44px" /></span><div><strong>{player.currentTrack.displayTitle}</strong><small>{player.loading ? 'Loading…' : player.playing ? 'Playing' : 'Paused'} · {formatRadioTime(player.currentTime)} / {formatRadioTime(player.duration || player.currentTrack.durationSeconds || 0)}</small></div></div>
        <div className={styles.radioPlayback}>
          <button aria-label="Previous song" onClick={player.previous}><SkipBack size={16} /></button>
          <button aria-label={player.playbackRequested ? 'Pause music' : 'Play music'} onClick={() => { player.setBackgroundMode(true); player.togglePlay() }}>{player.playbackRequested ? <Pause size={16} /> : <Play size={16} />} {player.playbackRequested ? 'Pause' : 'Play'}</button>
          <button aria-label="Next song" onClick={player.next}><SkipForward size={16} /></button>
        </div>
      </div>}
      <div className={styles.radioVolume}><button aria-label={player.muted ? 'Unmute music' : 'Mute music'} onClick={() => player.setMuted(!player.muted)}>{player.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button><input type="range" aria-label="Music volume" min="0" max="1" step="0.05" value={player.volume} onChange={event => player.setVolume(Number(event.target.value))} /><span>{Math.round(player.volume * 100)}%</span></div>
      <input aria-label="Search songs" placeholder="Search songs…" value={search} onChange={event => setSearch(event.target.value)} />
      <div className={styles.radioTracks} aria-label="Song library">
        {tracks.map(track => <button key={track.id} aria-label={`Play ${track.displayTitle}`} aria-pressed={player.currentId === track.id} onClick={() => play(track.id)}>
          <span className={styles.radioArtwork}><ProgressiveImage src={track.thumbnailUrl} alt="" fill sizes="44px" /></span><span className={styles.radioTrackTitle}>{track.displayTitle}<small>{formatRadioTime(track.durationSeconds || 0)}</small></span><Play size={15} />
        </button>)}
        {player.catalogLoading && <p className={styles.hint} role="status">Loading songs…</p>}
        {!player.catalogLoading && !tracks.length && <p className={styles.hint}>{player.tracks.length ? 'No songs match this search.' : 'No songs are available yet.'}</p>}
      </div>
      {player.error && <p className={styles.radioError} role="alert">{player.error}</p>}
    </section>
  </div>
}
