export type MouthTileEvent = readonly [number, number, boolean?]

/**
 * Return the action-local clock used by source-authored event timelines.
 * Three.js repeats an action by wrapping its local time; restarting or
 * switching clips always starts at zero.  Keeping this pure makes seek,
 * restart, and loop-boundary behavior deterministic for both mouth and
 * renderer event consumers.
 */
export function normalizePlaybackTime(time: number, duration: number, loop: boolean): number {
  const safeTime = Number.isFinite(time) ? Math.max(0, time) : 0
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0
  if (!loop || safeDuration === 0) return Math.min(safeTime, safeDuration)
  return safeTime % safeDuration
}

export function mouthTileCell(tile: number) {
  return { column: tile % 100, row: Math.floor(tile / 100) }
}

export function mouthTileTextureTransform(tile: number, flip: boolean, columns: number, rows: number, sourceScaleX: number, scaleY: number) {
  const { column, row } = mouthTileCell(tile)
  const scaleX = Math.abs(sourceScaleX), flipX = (sourceScaleX < 0) !== flip
  // Mirror within the selected atlas cell, not across the entire texture.
  return { repeat: [flipX ? -scaleX : scaleX, scaleY] as const,
    offset: [column / columns + (flipX ? 1 / columns : 0), 1 - scaleY - row / rows] as const }
}

export function mouthTileStateAtTime(
  events: readonly MouthTileEvent[], time: number, defaultTile = events[0]?.[1] ?? 704,
) {
  let tile = defaultTile
  let flipX = false
  for (const [eventTime, value, eventFlipX = false] of events) {
    if (eventTime > time) break
    tile = value
    flipX = eventFlipX
  }
  return { tile, flipX }
}

export function mouthTileAtTime(events: readonly MouthTileEvent[], time: number): number {
  return mouthTileStateAtTime(events, time).tile
}
