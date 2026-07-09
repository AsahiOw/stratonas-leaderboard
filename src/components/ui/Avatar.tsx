'use client'

import { useState } from 'react'
import { imageSrc } from '@/lib/utils'

interface Props {
  initials: string
  color?: string
  size?: number
  image?: string | null
  alt?: string
}

export function Avatar({ initials, color = 'var(--accent)', size = 32, image, alt = 'Avatar' }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const isLarge = size > 40
  const rounded = isLarge ? 'rounded-xl' : 'rounded-lg'
  if (image && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc(image)}
        alt={alt}
        width={size}
        height={size}
        onError={() => setImageFailed(true)}
        className={`${rounded} object-cover shrink-0 border`}
        style={{ width: size, height: size, borderColor: `${color}55` }}
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center font-mono font-bold shrink-0 border ${
        isLarge ? 'rounded-xl text-sm' : 'rounded-lg text-[10px]'
      }`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg,${color}33,${color}66)`,
        borderColor: `${color}55`,
        color,
      }}
    >
      {initials}
    </div>
  )
}
