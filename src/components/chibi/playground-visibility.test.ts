import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { playgroundFade } from './playground-visibility'

test('departure fading updates a shared uniform in standard and raw shaders while preserving existing hooks', () => {
  const group = new THREE.Group(), standard = new THREE.MeshStandardMaterial(), raw = new THREE.RawShaderMaterial()
  let previousCalls = 0
  standard.onBeforeCompile = () => { previousCalls++ }
  group.add(new THREE.Mesh(new THREE.BoxGeometry(), standard), new THREE.Mesh(new THREE.BoxGeometry(), raw))
  const fade = playgroundFade(group)
  for (const material of [standard, raw]) {
    const shader = { uniforms: {}, vertexShader: '', fragmentShader: 'precision highp float; void main(void) { gl_FragColor = vec4(1.0); }' } as Parameters<THREE.Material['onBeforeCompile']>[0]
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)
    assert.equal(shader.uniforms.playgroundFade, fade)
    assert.match(shader.fragmentShader, /uniform float playgroundFade;/)
    assert.match(shader.fragmentShader, /discard;/)
    assert.match(material.customProgramCacheKey(), /playground-fade-v1$/)
    fade.value = 0.4; assert.equal(shader.uniforms.playgroundFade.value, 0.4)
  }
  assert.equal(previousCalls, 1)
})
