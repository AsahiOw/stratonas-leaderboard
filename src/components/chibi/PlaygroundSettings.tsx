'use client'

import { useEffect, useRef } from 'react'
import { Check, Settings2, Star, X } from 'lucide-react'
import { PLAYGROUND_DISCOVERIES } from '@/lib/chibi/playground-discovery'
import { isolatePlaygroundPointer } from './playground-camera'
import type { PlaygroundPreferences, PlaygroundQuality } from './playground-quality'
import styles from './StudentPlayground.module.css'

export function PlaygroundSettings({ preferences, visited, fps, onChange, onResetTrail, onClose }: {
  preferences: PlaygroundPreferences; visited: string[]; fps: number; onChange: (patch: Partial<PlaygroundPreferences>) => void; onResetTrail: () => void; onClose: () => void
}) {
  const dialogRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector('button')?.focus()
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose() }
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
  return <div className={styles.scrim} onClick={onClose} onPointerDown={isolatePlaygroundPointer} onPointerMove={isolatePlaygroundPointer} onPointerUp={isolatePlaygroundPointer} onPointerCancel={isolatePlaygroundPointer}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Playground settings" className={`${styles.dialog} ${styles.settingsDialog}`} onClick={event => event.stopPropagation()}>
      <div className={styles.sectionHeading}><h2><Settings2 size={18} /> Playground settings</h2><button aria-label="Close playground settings" onClick={onClose}><X size={18} /></button></div>
      <div className={styles.settingsSection}><h3>Picture quality</h3><p className={styles.hint}>Choose the balance that feels best on your device.{fps > 0 && ` Last measured: ${fps} FPS.`}</p>
        <div className={styles.qualityChoices}>{([
          ['auto', 'Auto', 'Balances clarity and speed'], ['smooth', 'Smooth', 'Lighter rendering for movement'], ['sharp', 'Sharp', 'More detail; uses more battery'],
        ] as [PlaygroundQuality, string, string][]).map(([value, title, description]) => <button key={value} aria-pressed={preferences.quality === value} onClick={() => onChange({ quality: value })}><strong>{title}</strong><small>{description}</small></button>)}</div>
      </div>
      <label className={styles.settingsToggle}><input type="checkbox" checked={preferences.clearView} onChange={event => onChange({ clearView: event.target.checked })} /><span><strong>Clear student view</strong><small>Gently fade scenery that hides your student in third person.</small></span></label>
      <div className={styles.settingsSection}><label className={styles.settingsToggle}><input type="checkbox" checked={preferences.roomTrail} onChange={event => onChange({ roomTrail: event.target.checked })} /><span><strong>Room discovery trail</strong><small>Control a student and walk to the golden stars. Collect all seven room stamps.</small></span></label>
        <div className={styles.discoveryChecklist} aria-label="Room stamps">{PLAYGROUND_DISCOVERIES.map(spot => <span key={spot.id} data-collected={visited.includes(spot.id)}>{visited.includes(spot.id) ? <Check size={14} /> : <Star size={14} />} {spot.name}</span>)}</div>
        <div className={styles.trailSummary}><span>{visited.length === 7 ? 'Hall Explorer · all rooms discovered!' : `${visited.length} / 7 room stamps collected`}</span><button disabled={!visited.length} onClick={onResetTrail}>Restart trail</button></div>
      </div>
      <p className={styles.hint}>Photo saves a clean, high-resolution picture. Quality choices and room stamps are remembered on this browser.</p>
    </section>
  </div>
}
