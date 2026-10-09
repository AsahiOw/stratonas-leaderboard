import * as THREE from 'three'

// Screen-space fading also covers the students' custom color and depth shaders.
export function playgroundFade(group: THREE.Group) {
  const fade = { value: 1 }, materials = new Set<THREE.Material>()
  group.traverse(object => {
    if (object instanceof THREE.Mesh) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material))
  })
  for (const material of materials) {
    const compile = material.onBeforeCompile, cacheKey = material.customProgramCacheKey()
    material.onBeforeCompile = function (shader, renderer) {
      compile.call(this, shader, renderer)
      shader.uniforms.playgroundFade = fade
      shader.fragmentShader = shader.fragmentShader.replace(/void\s+main\s*\(\s*(?:void)?\s*\)\s*\{/, `uniform float playgroundFade;
void main() {
  if (playgroundFade < 1.0 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) >= playgroundFade) discard;`)
    }
    material.customProgramCacheKey = () => `${cacheKey}:playground-fade-v1`
    material.needsUpdate = true
  }
  return fade
}
