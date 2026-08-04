'use client'

import { ArrowLeft, Minimize2, Pause, Play, Power, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RadioArtwork } from './RadioArtwork'
import { PlayerDisplay } from './PlayerDisplay'
import type { LoopMode, RadioPlayerValue, RadioTrack } from './RadioPlayerProvider'
import styles from './RadioPage.module.css'

type Props = {
  player: RadioPlayerValue
  selectedTrack: RadioTrack | null
  shuffling: boolean
  onShuffle: () => void
  onExit: () => void
  onBackground: () => void
}

export function PhysicalPlayer({ player, selectedTrack, shuffling, onShuffle, onExit, onBackground }: Props) {
  const knobRotation = -135 + player.volume * 270
  const cycleLoop = () => player.setLoopMode(nextLoop(player.loopMode))
  const currentTrack = player.currentTrack
  const playMechanismSfx = player.playMechanismSfx
  const [displayedTrack, setDisplayedTrack] = useState<RadioTrack | null>(player.currentTrack)
  const [discPhase, setDiscPhase] = useState<'idle' | 'ejecting' | 'inserting' | 'empty'>(player.currentTrack ? 'idle' : 'empty')
  const displayedTrackRef = useRef(displayedTrack)
  const operatePlatter = () => player.currentTrack ? player.togglePlay() : selectedTrack && player.playTrack(selectedTrack.id)

  useEffect(() => {
    if (displayedTrackRef.current?.id === currentTrack?.id) return
    const outgoing = displayedTrackRef.current
    const incoming = currentTrack
    let insertTimer: number | undefined
    let finishTimer: number | undefined

    if (outgoing) {
      setDiscPhase('ejecting')
      playMechanismSfx('eject')
      insertTimer = window.setTimeout(() => {
        displayedTrackRef.current = incoming
        setDisplayedTrack(incoming)
        if (incoming) {
          setDiscPhase('inserting')
          playMechanismSfx('insert')
          finishTimer = window.setTimeout(() => setDiscPhase('idle'), 380)
        } else {
          setDiscPhase('empty')
        }
      }, 420)
    } else if (incoming) {
      displayedTrackRef.current = incoming
      setDisplayedTrack(incoming)
      setDiscPhase('inserting')
      playMechanismSfx('insert')
      finishTimer = window.setTimeout(() => setDiscPhase('idle'), 380)
    }

    return () => {
      if (insertTimer) window.clearTimeout(insertTimer)
      if (finishTimer) window.clearTimeout(finishTimer)
    }
  }, [currentTrack, playMechanismSfx])

  return (
    <section className={styles.hardware} aria-label="Kivotos MD-01 music player">
      <span className={`${styles.screw} ${styles.screwTl}`} /><span className={`${styles.screw} ${styles.screwTr}`} />
      <span className={`${styles.screw} ${styles.screwBl}`} /><span className={`${styles.screw} ${styles.screwBr}`} />
      <header className={styles.hardwareHeader}>
        <div>
          <span className={styles.brandMark}>STRATÓNAS</span>
          <strong>MD-01 BROADCAST DECK</strong>
        </div>
        <div className={styles.powerGroup}><span className={`${styles.powerLight} ${player.currentTrack ? styles.powerOn : ''}`} /><Power size={13} /><span>POWER</span></div>
      </header>

      <div className={styles.hardwareBody}>
        <div className={styles.turntableBay}>
          <div className={styles.lidReflection} />
          <div className={styles.platterRim}>
            <button type="button" onClick={operatePlatter} className={`${styles.disc} ${player.playing && discPhase === 'idle' ? styles.discPlaying : ''} ${discPhase === 'ejecting' ? styles.discEjecting : ''} ${discPhase === 'inserting' ? styles.discInserting : ''} ${discPhase === 'empty' ? styles.discEmpty : ''}`} aria-label={player.playing ? 'Pause current track' : player.currentTrack ? 'Play current track' : 'Load and play selected track'}>
              {displayedTrack && <RadioArtwork src={displayedTrack.thumbnailUrl} alt={displayedTrack.displayTitle} sizes="min(42vw, 370px)" eager />}
              <span className={styles.discGrooves} /><span className={styles.discLabel}><b>ST</b><small>KVT</small></span>
            </button>
          </div>
          <div className={`${styles.tonearm} ${player.playing ? styles.tonearmDown : ''}`}><span /><i /></div>
          <div className={styles.deckCaption}><span>DIRECT DRIVE</span><span>33⅓ DIGITAL RPM</span></div>
        </div>

        <div className={styles.controlBay}>
          <PlayerDisplay player={player} />

          <div className={styles.transport} aria-label="Playback controls">
            <button type="button" onClick={player.previous} className={styles.metalButton} aria-label="Previous track"><SkipBack size={21} /></button>
            <button type="button" onClick={operatePlatter} className={`${styles.metalButton} ${styles.playButton}`} aria-label={player.playing ? 'Pause' : player.currentTrack ? 'Play' : 'Load and play selected track'}>{player.playing ? <Pause size={24} /> : <Play size={24} />}</button>
            <button type="button" onClick={player.next} className={styles.metalButton} aria-label="Next track"><SkipForward size={21} /></button>
            <button type="button" onClick={onShuffle} disabled={shuffling || !player.tracks.length} className={`${styles.squareSwitch} ${shuffling ? styles.switchActive : ''}`} aria-label="Shuffle all tracks"><Shuffle size={18} /><span>RANDOM</span></button>
            <button type="button" onClick={cycleLoop} className={`${styles.squareSwitch} ${player.loopMode !== 'off' ? styles.switchActive : ''}`} aria-label={`Repeat mode: ${player.loopMode}`}>{player.loopMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}<span>{player.loopMode.toUpperCase()}</span></button>
          </div>

          <div className={styles.lowerControls}>
            <div className={styles.volumeModule}>
              <div className={styles.printLabel}>OUTPUT LEVEL</div>
              <button type="button" onClick={() => player.setMuted(!player.muted)} className={styles.knob} style={{ '--knob-angle': `${knobRotation}deg` } as React.CSSProperties} aria-label={player.muted ? 'Unmute' : 'Mute'}>
                <span>{player.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</span>
              </button>
              <input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={player.volume} onChange={(event) => player.setVolume(Number(event.target.value))} className={styles.hiddenVolume} />
              <div className={styles.knobScale}><span>MIN</span><span>MAX</span></div>
            </div>

            <div className={styles.rateModule}>
              <span className={styles.printLabel}>PITCH LOCK / SPEED</span>
              <div className={styles.rateSwitches}>{[0.75, 1, 1.25, 1.5].map((rate) => <button type="button" key={rate} onClick={() => player.setPlaybackRate(rate)} className={player.playbackRate === rate ? styles.rateActive : ''}>{rate}×</button>)}</div>
            </div>
          </div>

          <div className={styles.utilityStrip}>
            <button type="button" onClick={onExit}><ArrowLeft size={15} /> EJECT / EXIT</button>
            <button type="button" onClick={onBackground}><Minimize2 size={15} /> BACKGROUND</button>
          </div>
        </div>
      </div>
    </section>
  )
}

function nextLoop(mode: LoopMode): LoopMode {
  if (mode === 'off') return 'queue'
  if (mode === 'queue') return 'one'
  return 'off'
}
