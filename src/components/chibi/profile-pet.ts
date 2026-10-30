export type ProfilePet = {
  phase: 'falling' | 'turn-out' | 'walk' | 'turn-in' | 'idle' | 'reaction'
  x: number
  target: number
  wait: number
  direction: number
  angle: number
  y: number
  velocityY: number
}

export function createProfilePet(x: number, y = 0, floorY = 0): ProfilePet {
  return { phase: y < floorY ? 'falling' : 'idle', x, target: x, wait: 2, direction: 0, angle: 0, y: Math.min(y, floorY), velocityY: 0 }
}

// Playground walking is 1.15 world units/sec for a student 1.5 units tall.
export function profilePetWalkSpeed(projectedStudentHeight: number) {
  return projectedStudentHeight * 0.95 / 1.5
}

export function stepProfilePet(pet: ProfilePet, delta: number, maxX: number, speed: number, reactionDuration: number, random = Math.random, floorY = 0) {
  maxX = Math.max(0, maxX)
  pet.x = Math.max(0, Math.min(maxX, pet.x))
  pet.target = Math.max(0, Math.min(maxX, pet.target))
  if (pet.phase === 'falling') {
    const gravity = 1200
    pet.y += pet.velocityY * delta + .5 * gravity * delta * delta
    pet.velocityY += gravity * delta
    if (pet.y >= floorY) { pet.y = floorY; pet.velocityY = 0; pet.phase = 'idle' }
    return
  }
  pet.y = floorY
  if (pet.phase === 'turn-out' || pet.phase === 'turn-in') {
    const targetAngle = pet.phase === 'turn-out' ? pet.direction * Math.PI / 2 : 0
    const difference = targetAngle - pet.angle
    pet.angle += Math.sign(difference) * Math.min(Math.abs(difference), delta * 4)
    if (Math.abs(targetAngle - pet.angle) < .0001) {
      pet.angle = targetAngle
      pet.phase = pet.phase === 'turn-out' ? 'walk' : 'idle'
      if (pet.phase === 'idle') { pet.wait = 2 + random() * 3; pet.direction = 0 }
    }
    return
  }
  if (pet.phase === 'walk') {
    const distance = pet.target - pet.x
    if (Math.abs(distance) <= speed * delta) {
      pet.x = pet.target; pet.phase = 'turn-in'
    } else pet.x += Math.sign(distance) * speed * delta
    return
  }
  pet.wait -= delta
  if (pet.wait > 0) return
  if (pet.phase === 'reaction') {
    pet.phase = 'idle'; pet.wait = 1 + random() * 2
  } else if (reactionDuration > 0 && random() < .3) {
    pet.phase = 'reaction'; pet.wait = reactionDuration
  } else {
    pet.target = random() * maxX
    if (Math.abs(pet.target - pet.x) < 40) pet.target = pet.x < maxX / 2 ? maxX : 0
    if (Math.abs(pet.target - pet.x) < 1) { pet.wait = 2; return }
    pet.direction = Math.sign(pet.target - pet.x); pet.phase = 'turn-out'
  }
}
