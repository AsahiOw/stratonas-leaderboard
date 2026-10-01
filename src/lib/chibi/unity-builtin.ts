export const UNITY_BUILTIN_RESOURCES_GUID = '00000000000000000e00000000000000'
export const UNITY_BUILTIN_RESOURCES_FILE = 'unity default resources'
export const UNITY_BUILTIN_QUAD_PATH_ID = '10210'
export const UNITY_BUILTIN_QUAD_NAME = 'Quad'

export interface InventoryBuiltinResourceReference {
  kind: 'unity-builtin-resource'
  guid: typeof UNITY_BUILTIN_RESOURCES_GUID
  file: typeof UNITY_BUILTIN_RESOURCES_FILE
  pathId: typeof UNITY_BUILTIN_QUAD_PATH_ID
  name: typeof UNITY_BUILTIN_QUAD_NAME
}

interface BuiltinPointer {
  file: string
  pathId: string
  externalGuid?: string | null
  builtinResource?: InventoryBuiltinResourceReference | null
}

function normalizedBuiltinFile(value: unknown) {
  return typeof value === 'string' ? value.replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() ?? '' : ''
}

function normalizedBuiltinGuid(value: unknown) {
  return typeof value === 'string' ? value.replaceAll('-', '').toLowerCase() : ''
}

/**
 * Return the canonical built-in Quad identity only for the complete Unity
 * external reference. Names, array order, and partial/null pointers never
 * qualify; callers must keep those unresolved.
 */
export function unityBuiltinQuadReference(pointer: BuiltinPointer | null | undefined): InventoryBuiltinResourceReference | null {
  if (!pointer || normalizedBuiltinFile(pointer.file) !== UNITY_BUILTIN_RESOURCES_FILE || String(pointer.pathId) !== UNITY_BUILTIN_QUAD_PATH_ID) return null
  const typed = pointer.builtinResource
  if (typed && (typed.kind !== 'unity-builtin-resource'
    || normalizedBuiltinGuid(typed.guid) !== UNITY_BUILTIN_RESOURCES_GUID
    || normalizedBuiltinFile(typed.file) !== UNITY_BUILTIN_RESOURCES_FILE
    || String(typed.pathId) !== UNITY_BUILTIN_QUAD_PATH_ID
    || typed.name !== UNITY_BUILTIN_QUAD_NAME)) return null
  const guid = normalizedBuiltinGuid(pointer.externalGuid ?? typed?.guid)
  if (guid !== UNITY_BUILTIN_RESOURCES_GUID) return null
  return {
    kind: 'unity-builtin-resource', guid: UNITY_BUILTIN_RESOURCES_GUID,
    file: UNITY_BUILTIN_RESOURCES_FILE, pathId: UNITY_BUILTIN_QUAD_PATH_ID, name: UNITY_BUILTIN_QUAD_NAME,
  }
}
