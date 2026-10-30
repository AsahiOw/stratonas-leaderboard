// Match the requested source clips exactly, including the character prefix.
// Do not offer cafe idles or another character's animation as a formation pose.
function formationClip(names: string[], sourceIdentity: string, pose: string) {
  const canonical = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const source = canonical(sourceIdentity)
  return names.find((name) => {
    const key = canonical(name)
    return key === pose || key === `${source}${pose}`
  }) ?? null
}

export function formationIdleClips(names: string[], sourceIdentity: string) {
  return { idle: formationClip(names, sourceIdentity, 'formationidle'), random: formationClip(names, sourceIdentity, 'formationidlerandom') }
}

export function formationPickupClip(names: string[], sourceIdentity: string) {
  return formationClip(names, sourceIdentity, 'formationpickup')
}

export function profileCafeClips(names: string[], sourceIdentity: string) {
  return { idle: formationClip(names, sourceIdentity, 'cafeidle'), walk: formationClip(names, sourceIdentity, 'cafewalk'), reaction: formationClip(names, sourceIdentity, 'cafereaction') }
}
