'use client'

import { useCallback, useEffect, useRef, type PointerEvent } from 'react'
import type { Point } from '@/lib/chibi/playground-simulation'
import styles from './StudentPlayground.module.css'

export function joystickDirection(x: number, y: number, travel: number): Point {
  const distance = Math.hypot(x, y)
  if (distance < travel * 0.18) return [0, 0]
  const scale = Math.max(travel, distance)
  return [x / scale, -y / scale]
}

export function PlaygroundJoystick({ disabled, onMove }: { disabled: boolean; onMove: (direction: Point) => void }) {
  const surface = useRef<HTMLButtonElement>(null), thumb = useRef<HTMLSpanElement>(null), pointer = useRef<number | null>(null)
  const reset = useCallback(() => {
    const id = pointer.current; pointer.current = null
    if (id !== null && surface.current?.hasPointerCapture(id)) surface.current.releasePointerCapture(id)
    if (thumb.current) thumb.current.style.transform = 'translate(-50%, -50%)'
    onMove([0, 0])
  }, [onMove])
  useEffect(() => {
    window.addEventListener('blur', reset); window.addEventListener('resize', reset); document.addEventListener('visibilitychange', reset)
    return () => { reset(); window.removeEventListener('blur', reset); window.removeEventListener('resize', reset); document.removeEventListener('visibilitychange', reset) }
  }, [reset])
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current !== event.pointerId || disabled) return
    const rect = event.currentTarget.getBoundingClientRect(), travel = rect.width * 0.28
    const direction = joystickDirection(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, travel)
    if (thumb.current) thumb.current.style.transform = `translate(calc(-50% + ${direction[0] * travel}px), calc(-50% - ${direction[1] * travel}px))`
    onMove(direction)
  }
  const release = (event: PointerEvent<HTMLButtonElement>) => { if (pointer.current === event.pointerId) reset() }
  return <button ref={surface} className={styles.joystick} type="button" aria-label="Walk joystick" title="Hold and drag to walk; release to stop" disabled={disabled}
    onPointerDown={event => {
      if (disabled || event.button !== 0 || pointer.current !== null) return
      event.preventDefault(); pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); move(event)
    }} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
    <span className={styles.joystickAxis} aria-hidden="true" /><span ref={thumb} className={styles.joystickThumb} aria-hidden="true" />
  </button>
}
