export const CHIBI_INSTANTIATE_FX_EVENT_FUNCTIONS = ['AniEvt_InstantiateFx', 'InstantiateFx'] as const
export type ChibiInstantiateFxEventFunction = typeof CHIBI_INSTANTIATE_FX_EVENT_FUNCTIONS[number]

export function isChibiInstantiateFxEventFunction(value: unknown): value is ChibiInstantiateFxEventFunction {
  return typeof value === 'string' && (CHIBI_INSTANTIATE_FX_EVENT_FUNCTIONS as readonly string[]).includes(value)
}
