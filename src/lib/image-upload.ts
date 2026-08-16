import sharp from 'sharp'

const MAX_IMAGE_PIXELS = 16_777_216
const ALLOWED_IMAGE_FORMATS = new Set(['avif', 'gif', 'jpeg', 'png', 'webp'])

export async function validateImage(buffer: Buffer) {
  if (buffer.length === 0) throw new Error('Image file is empty.')
  try {
    const image = sharp(buffer, {
      animated: true,
      failOn: 'warning',
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height || !metadata.format || !ALLOWED_IMAGE_FORMATS.has(metadata.format)) {
      throw new Error('Invalid image')
    }
    return metadata.format === 'jpeg' ? 'jpg' : metadata.format
  } catch {
    throw new Error('Image file is invalid or unsupported.')
  }
}
