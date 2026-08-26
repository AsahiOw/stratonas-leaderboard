'use client'

import { useEffect, useRef, useState } from 'react'
import { formatRadioTime, type RadioPlayerValue } from './RadioPlayerProvider'
import styles from './RadioPage.module.css'

export function PlayerDisplay({ player }: { player: RadioPlayerValue }) {
  const visualizerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const titleTextRef = useRef<HTMLSpanElement>(null)
  const [titleOverflow, setTitleOverflow] = useState(0)
  const playing = player.playing
  const readFrequencyData = player.readFrequencyData
  const title = player.currentTrack?.displayTitle || 'NO DISC INSERTED'
  const status = player.error ? 'ERR' : player.loading ? 'LOAD' : player.playing ? 'PLAY' : 'PAUSE'
  const progress = player.duration ? Math.min(100, (player.currentTime / player.duration) * 100) : 0

  useEffect(() => {
    const titleElement = titleRef.current
    const titleTextElement = titleTextRef.current
    if (!titleElement || !titleTextElement) return
    const updateOverflow = () => setTitleOverflow(Math.max(0, titleTextElement.scrollWidth - titleElement.clientWidth))
    updateOverflow()
    const observer = new ResizeObserver(updateOverflow)
    observer.observe(titleElement)
    observer.observe(titleTextElement)
    return () => observer.disconnect()
  }, [title])

  useEffect(() => {
    const visualizer = visualizerRef.current
    if (!visualizer) return
    const bars = Array.from(visualizer.children) as HTMLElement[]
    const reset = () => bars.forEach((bar) => { bar.style.transform = 'scaleY(.08)' })
    if (!playing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reset()
      return
    }

    let frame = 0
    const levels = bars.map(() => 0.08)
    const previousEnergy = bars.map(() => 0)
    const traits = bars.map((_, index) => {
      const variation = Math.abs(Math.sin((index + 1) * 91.173) * 43758.5453) % 1
      const region = index < 7 ? 'low' : index < 17 ? 'mid' : 'high'
      return {
        gain: 0.76 + variation * 0.5 + (index % 6 === 2 ? 0.18 : 0),
        phase: variation * Math.PI * 2,
        speed: region === 'low' ? 0.0012 : region === 'mid' ? 0.0026 : 0.0048,
        rise: region === 'low' ? 0.48 : region === 'mid' ? 0.7 : 0.82,
        fall: region === 'low' ? 0.1 : region === 'mid' ? 0.17 : 0.25,
        transient: index % 5 === 2 || index % 7 === 4 ? 1.45 : 0.72,
      }
    })
    const draw = (now: number) => {
      const frequencies = readFrequencyData()
      if (frequencies) {
        const bandLevels = bars.map((_, index) => {
          const start = Math.floor(Math.pow(frequencies.length, index / bars.length)) - 1
          const end = Math.max(start + 1, Math.floor(Math.pow(frequencies.length, (index + 1) / bars.length)) - 1)
          let total = 0
          for (let bin = Math.max(0, start); bin <= Math.min(frequencies.length - 1, end); bin += 1) total += frequencies[bin]
          const average = total / (Math.min(frequencies.length - 1, end) - Math.max(0, start) + 1) / 255
          return average * (1 + index / bars.length * 0.85)
        })
        const regionPeaks = [
          Math.max(0.16, ...bandLevels.slice(0, 7)),
          Math.max(0.12, ...bandLevels.slice(7, 17)),
          Math.max(0.08, ...bandLevels.slice(17)),
        ]
        bars.forEach((bar, index) => {
          const region = index < 7 ? 0 : index < 17 ? 1 : 2
          const regionStart = region === 0 ? 0 : region === 1 ? 7 : 17
          const regionEnd = region === 0 ? 6 : region === 1 ? 16 : bars.length - 1
          const neighborIndex = index % 4 === 1 ? Math.max(regionStart, index - 1) : index % 5 === 3 ? Math.min(regionEnd, index + 1) : index
          const ownEnergy = bandLevels[index] / regionPeaks[region]
          const neighborEnergy = bandLevels[neighborIndex] / regionPeaks[region]
          const energy = Math.min(1, ownEnergy * 0.84 + neighborEnergy * 0.16)
          const attack = Math.max(0, energy - previousEnergy[index])
          previousEnergy[index] += (energy - previousEnergy[index]) * (energy > previousEnergy[index] ? 0.58 : 0.14)
          const pulse = 0.93 + Math.sin(now * traits[index].speed + traits[index].phase) * 0.07
          const body = Math.pow(energy, 0.78) * 0.72 * traits[index].gain * pulse
          const spike = attack * traits[index].transient
          const target = Math.min(1, 0.1 + body + spike)
          const response = target > levels[index] ? traits[index].rise : traits[index].fall
          levels[index] += (target - levels[index]) * response
          bar.style.transform = `scaleY(${levels[index].toFixed(3)})`
        })
      }
      frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)
    return () => {
      window.cancelAnimationFrame(frame)
      reset()
    }
  }, [playing, readFrequencyData])

  return (
    <section className={`${styles.lcd} ${player.loading ? styles.lcdRefreshing : ''}`} aria-label="Player display">
      <div className={styles.lcdTopline}>
        <span>MD-01 / KIVOTOS</span>
        <span className={styles.lcdStatus}>{status}</span>
      </div>
      <div
        ref={titleRef}
        className={`${styles.lcdTitle} ${titleOverflow > 0 ? styles.lcdTitleScrolling : ''}`}
        title={title}
        style={{ '--title-overflow': `${titleOverflow}px`, '--title-duration': `${Math.max(8, title.length * 0.16)}s` } as React.CSSProperties}
      >
        <span ref={titleTextRef}>{title}</span>
      </div>
      <div className={styles.lcdMeta}>BLUE ARCHIVE GLOBAL · OST ARCHIVE</div>
      <div ref={visualizerRef} className={styles.visualizer} aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <i key={index} />)}
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
