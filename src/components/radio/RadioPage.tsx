'use client'

import { Disc3, ListMusic, RadioTower } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { suppressNextKeiGreeting } from '@/lib/kei-volume'
import { PhysicalPlayer } from './PhysicalPlayer'
import { RadioArtwork } from './RadioArtwork'
import { TrackLibrary } from './TrackLibrary'
import { type RadioTrack, useRadioPlayer } from './RadioPlayerProvider'
import styles from './RadioPage.module.css'

type MobilePanel = 'player' | 'media' | 'queue'

export function RadioPage({ onReturnToOther }: { onReturnToOther: () => void }) {
  const player = useRadioPlayer()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [queueSearch, setQueueSearch] = useState('')
  const [availableSearch, setAvailableSearch] = useState('')
  const [shuffling, setShuffling] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('player')
  const playSwitchSfx = player.playSwitchSfx
  const setPlayerQueue = player.setQueue
  const playerQueue = player.queue
  const playerTracks = player.tracks
  const currentPlayerId = player.currentId

  const selected = player.tracks.find((track) => track.id === selectedId) || player.currentTrack || player.tracks[0] || null
  const queued = useMemo(() => player.queue.map((id) => player.tracks.find((track) => track.id === id)).filter(Boolean) as RadioTrack[], [player.queue, player.tracks])
  const available = useMemo(() => player.tracks.filter((track) => !player.queue.includes(track.id)), [player.queue, player.tracks])

  useEffect(() => {
    if (!selectedId && selected) setSelectedId(selected.id)
  }, [selected, selectedId])

  const selectTrack = useCallback((id: string) => {
    setSelectedId(id)
    playSwitchSfx()
  }, [playSwitchSfx])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!player.tracks.length || isTypingTarget(event.target)) return
    const index = Math.max(0, player.tracks.findIndex((track) => track.id === selected?.id))
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const direction = event.key === 'ArrowRight' ? 1 : -1
      selectTrack(player.tracks[(index + direction + player.tracks.length) % player.tracks.length].id)
    } else if (event.key === 'Enter' && selected) {
      event.preventDefault()
      player.playTrack(selected.id)
    } else if (event.code === 'Space' && player.currentTrack) {
      event.preventDefault()
      player.togglePlay()
    }
  }

  const moveTrack = useCallback((id: string, delta: number) => {
    const queue = [...playerQueue]
    const from = queue.indexOf(id)
    const to = Math.max(0, Math.min(queue.length - 1, from + delta))
    if (from < 0 || from === to) return
    queue.splice(from, 1)
    queue.splice(to, 0, id)
    setPlayerQueue(queue)
    setAnnouncement(`Moved ${playerTracks.find((track) => track.id === id)?.displayTitle}.`)
  }, [playerQueue, playerTracks, setPlayerQueue])

  const removeTrack = useCallback((id: string) => {
    if (id === currentPlayerId) return
    setPlayerQueue(playerQueue.filter((trackId) => trackId !== id))
    setAnnouncement('Disc returned to the archive.')
  }, [currentPlayerId, playerQueue, setPlayerQueue])

  function shuffleAll() {
    if (!player.tracks.length || shuffling) return
    setShuffling(true)
    player.playSwitchSfx()
    const ids = player.tracks.map((track) => track.id)
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
        ;[ids[index], ids[randomIndex]] = [ids[randomIndex], ids[index]]
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => {
      player.setQueue(ids)
      player.playTrack(ids[0])
      setSelectedId(ids[0])
      setShuffling(false)
      setMobilePanel('player')
    }, reducedMotion ? 120 : 900)
  }

  function ejectAndExit() {
    if (exiting) {
      window.setTimeout(() => {
        suppressNextKeiGreeting()
        onReturnToOther()
      }, 450)
      return
    }
    if (!player.currentTrack) {
      suppressNextKeiGreeting()
      onReturnToOther()
      return
    }
    setExiting(true)
    player.setBackgroundMode(false)
    player.eject()
    window.setTimeout(() => setExiting(false), 450)
  }

  function enterBackgroundMode() {
    player.setBackgroundMode(true)
    suppressNextKeiGreeting()
    onReturnToOther()
  }

  function returnToOther() {
    suppressNextKeiGreeting()
    onReturnToOther()
  }

  if (player.catalogLoading) return <RadioMachineState mode="loading" onExit={returnToOther} />
  if (!player.tracks.length) return <RadioMachineState mode="empty" message={player.error} onExit={returnToOther} />

  return (
    <main className={styles.radioWorld} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className={styles.roomGlow} style={selected ? { '--artwork': `url("${selected.thumbnailUrl}")` } as React.CSSProperties : undefined} />
      <div className={styles.station}>
        <div className={styles.stationTop}>
          <div className={styles.stationId}><span>KIVOTOS AUDIO SERVICE</span><b>FIELD UNIT 01</b></div>
          <div className={styles.broadcastBadge}><i /> NOW BROADCASTING / 107.3</div>
          <div className={styles.warningLabel}>CAUTION · LASER / PHONO HYBRID</div>
        </div>

        <div className={`${styles.stationBody} ${styles[`show_${mobilePanel}`]}`}>
          <div className={styles.playerColumn}>
            <PhysicalPlayer
              player={player}
              selectedTrack={selected}
              shuffling={shuffling}
              visible={mobilePanel === 'player'}
              onShuffle={shuffleAll}
              onExit={ejectAndExit}
              onBackground={enterBackgroundMode}
            />
          </div>
          <div className={styles.libraryColumn}>
            <TrackLibrary
              tracks={player.tracks}
              queued={queued}
              available={available}
              currentId={player.currentId}
              selectedId={selected?.id || null}
              queueSearch={queueSearch}
              availableSearch={availableSearch}
              mobilePanel={mobilePanel}
              onQueueSearch={setQueueSearch}
              onAvailableSearch={setAvailableSearch}
              onSelect={selectTrack}
              onPlay={player.playTrack}
              onPlayNext={player.playNext}
              onQueue={player.setQueue}
              onMove={moveTrack}
              onRemove={removeTrack}
              onAnnounce={setAnnouncement}
            />
          </div>
        </div>

        <nav className={styles.mobileModes} aria-label="Radio sections">
          <button type="button" className={mobilePanel === 'player' ? styles.mobileModeActive : ''} onClick={() => setMobilePanel('player')}><RadioTower size={18} /><span>PLAYER</span></button>
          <button type="button" className={mobilePanel === 'media' ? styles.mobileModeActive : ''} onClick={() => setMobilePanel('media')}><Disc3 size={18} /><span>MEDIA</span></button>
          <button type="button" className={mobilePanel === 'queue' ? styles.mobileModeActive : ''} onClick={() => setMobilePanel('queue')}><ListMusic size={18} /><span>QUEUE</span></button>
        </nav>

        <div className={styles.stationFooter}><span>PROPERTY OF SCHALE AUDIO-VISUAL DEPT.</span><span>AC 100–240V / DIGITAL LINK</span><span>LULLABY OF MIRACLE</span></div>
      </div>

      {shuffling && (
        <div className={styles.shuffleMechanism} role="status" aria-live="polite">
          <div className={styles.shuffleFan}>
            {player.tracks.slice(0, 9).map((track, index) => <span key={track.id} style={{ '--fan-index': index, '--fan-count': Math.min(9, player.tracks.length) } as React.CSSProperties}><RadioArtwork src={track.thumbnailUrl} alt="" sizes="150px" /></span>)}
          </div>
          <div className={styles.shuffleText}>RANDOM ACCESS…</div>
        </div>
      )}
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </main>
  )
}

function RadioMachineState({ mode, message, onExit }: { mode: 'loading' | 'empty'; message?: string | null; onExit: () => void }) {
  return (
    <main className={styles.radioWorld}>
      <div className={styles.stateMachine}>
        <span className={`${styles.screw} ${styles.screwTl}`} /><span className={`${styles.screw} ${styles.screwTr}`} />
        <div className={styles.stateDisplay}>
          <b>{mode === 'loading' ? 'INITIALIZING MEDIA BANK' : 'NO MEDIA DETECTED'}</b>
          <div className={mode === 'loading' ? styles.loadingSegments : ''}>▰ ▰ ▰ ▰ ▰ ▰ ▰ ▰</div>
          <small>{message || (mode === 'loading' ? 'PLEASE WAIT / READING INDEX' : 'RUN RADIO OST MEDIA IMPORT FROM ADMIN')}</small>
        </div>
        <button type="button" onClick={onExit} className={styles.stateExit}>EJECT / RETURN TO SITE</button>
      </div>
    </main>
  )
}

function isTypingTarget(target: EventTarget) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}
