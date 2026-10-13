import { Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three'

export function playgroundPhotoScale(width: number, height: number, maximumSize = 2560) {
  return Math.min(maximumSize / Math.max(1, width, height), Math.sqrt(4_000_000 / Math.max(1, width * height)))
}

export function capturePlaygroundPhoto(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): Promise<Blob | null> {
  const size = renderer.getSize(new Vector2()), originalRatio = renderer.getPixelRatio()
  try {
    renderer.setDrawingBufferSize(size.x, size.y, playgroundPhotoScale(size.x, size.y, Math.min(2560, renderer.capabilities.maxTextureSize)))
    renderer.render(scene, camera)
    // toBlob snapshots the rendered buffer before asynchronous PNG encoding.
    return new Promise(resolve => renderer.domElement.toBlob(resolve, 'image/png'))
  } finally {
    renderer.setDrawingBufferSize(size.x, size.y, originalRatio)
  }
}
