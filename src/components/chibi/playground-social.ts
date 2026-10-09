import * as THREE from 'three'
import type { PlaygroundActor } from '@/lib/chibi/playground-simulation'

export function createSocialEffects() {
  const textures = new Map<string, THREE.CanvasTexture>()
  for (const [key, emoji] of Object.entries({ heart: '❤️', sparkle: '✨', music: '🎵', idea: '💡', question: '❔' })) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!; ctx.font = '84px "Segoe UI Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = '#25466a55'; ctx.shadowBlur = 5; ctx.fillText(emoji, 64, 66)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.set(key, texture)
  }
  const geometry = new THREE.SphereGeometry(0.085, 8, 6)
  const speaking = new THREE.MeshBasicMaterial({ color: '#f8fbff' }), listening = new THREE.MeshBasicMaterial({ color: '#93cfe8' })
  return {
    create: () => {
      const group = new THREE.Group(); group.visible = false
      const dots = Array.from({ length: 3 }, (_, i) => { const dot = new THREE.Mesh(geometry, speaking); dot.position.x = (i - 1) * 0.24; group.add(dot); return dot })
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); group.add(sprite)
      return { group, update: (actor: PlaygroundActor, elapsed: number, visible: boolean) => {
        group.visible = visible && actor.ready && !actor.leaving && !!actor.social
        group.position.set(actor.position[0], 2.05 + (actor.state === 'dragging' ? 0.4 : 0), actor.position[1])
        if (!group.visible) return
        dots.forEach((dot, i) => {
          dot.visible = actor.social === 'chat'; dot.material = actor.speaking ? speaking : listening
          dot.position.y = actor.speaking ? 0.06 + Math.sin(elapsed * 7 - i * 0.9) * 0.13 : 0
          dot.scale.setScalar(actor.speaking ? 1 + Math.sin(elapsed * 7 - i * 0.9) * 0.2 : 0.65)
        })
        sprite.visible = actor.social !== 'chat'; sprite.material.map = textures.get(actor.social!) ?? null
        sprite.position.set(Math.sin(elapsed * 2 + actor.id) * 0.12, 0.12 + Math.sin(elapsed * 4) * 0.12, 0)
        sprite.material.rotation = Math.sin(elapsed * 3) * 0.12; sprite.scale.setScalar(0.8 + Math.sin(elapsed * 5) * 0.08)
      }, dispose: () => { sprite.material.dispose(); group.removeFromParent() } }
    },
    dispose: () => { textures.forEach(texture => texture.dispose()); geometry.dispose(); speaking.dispose(); listening.dispose() },
  }
}
