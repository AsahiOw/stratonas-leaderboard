export type PortraitOffset = {
  x: number
  y: number
  scale: number
}

export const DEFAULT_PORTRAIT_OFFSET: PortraitOffset = {
  x: 0,
  y: 0,
  scale: 1,
}

export const DEFAULT_MEMORIAL_OFFSET: PortraitOffset = {
  x: -7.6,
  y: 0,
  scale: 0.5,
}

const PORTRAIT_OFFSETS: Record<number, Partial<PortraitOffset>> = {
  // Add sparse student-specific visual nudges here as screenshots reveal them.
}

function cleanOffset(offset?: Partial<PortraitOffset> | null): Partial<PortraitOffset> {
  if (!offset) return {}

  return {
    ...(Number.isFinite(offset.x) ? { x: offset.x } : {}),
    ...(Number.isFinite(offset.y) ? { y: offset.y } : {}),
    ...(Number.isFinite(offset.scale) && offset.scale && offset.scale > 0 ? { scale: offset.scale } : {}),
  }
}

export function getPortraitOffset(
  studentId?: number | null,
  offset?: Partial<PortraitOffset> | null
): PortraitOffset {
  return {
    ...DEFAULT_PORTRAIT_OFFSET,
    ...(studentId ? PORTRAIT_OFFSETS[studentId] : {}),
    ...cleanOffset(offset),
  }
}

export function getMemorialOffset(offset?: Partial<PortraitOffset> | null): PortraitOffset {
  return {
    ...DEFAULT_MEMORIAL_OFFSET,
    ...cleanOffset(offset),
  }
}
