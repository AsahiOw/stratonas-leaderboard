export type PlaygroundQuality = 'auto' | 'smooth' | 'sharp'
export type PlaygroundPreferences = { quality: PlaygroundQuality; clearView: boolean; roomTrail: boolean }
export const DEFAULT_PLAYGROUND_PREFERENCES: PlaygroundPreferences = { quality: 'auto', clearView: true, roomTrail: true }
export const PLAYGROUND_PREFERENCES_KEY = 'stratonas:playground-preferences'

export function playgroundFrameTiming(previous: number, time: number) {
  const delta = previous ? Math.min(0.2, Math.max(0, (time - previous) / 1000)) : 0
  const steps = Math.max(1, Math.ceil(delta / 0.05))
  return { delta, steps, stepDelta: delta / steps }
}

export function playgroundCameraDamping(delta: number) { return 1 - Math.exp(-8 * delta) }

export function readPlaygroundPreferences(value: string | null): PlaygroundPreferences {
  try {
    const saved = JSON.parse(value || 'null')
    return { quality: ['auto', 'smooth', 'sharp'].includes(saved?.quality) ? saved.quality : 'auto', clearView: saved?.clearView !== false, roomTrail: saved?.roomTrail !== false }
  } catch { return { ...DEFAULT_PLAYGROUND_PREFERENCES } }
}

// Pixel count, rather than device density alone, bounds the cost of a large screen.
export function playgroundQualityLimits(quality: PlaygroundQuality, deviceRatio: number, width: number, height: number) {
  const budget = quality === 'sharp' ? 3_000_000 : 2_000_000
  const maximum = Math.min(quality === 'sharp' ? 2 : Math.min(deviceRatio, quality === 'smooth' ? 1 : 1.75), Math.sqrt(budget / Math.max(1, width * height)))
  return { minimum: Math.min(0.75, maximum), maximum, initial: Math.min(maximum, quality === 'sharp' ? 2 : quality === 'smooth' ? 1 : 1.5) }
}
