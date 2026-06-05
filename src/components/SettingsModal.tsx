'use client'

import { useRef, useState } from 'react'
import { StModal } from '@/components/ui/StModal'
import { getKeiVolume, setKeiVolume } from '@/lib/kei-volume'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [volume, setVolume] = useState(() => Math.round(getKeiVolume() * 100))
  const previewRef = useRef<HTMLAudioElement | null>(null)

  function handleChange(value: number) {
    setVolume(value)
    setKeiVolume(value / 100)
  }

  function handlePreview() {
    const audio = previewRef.current ?? new Audio('/assets/voice/kei/38.mp3')
    previewRef.current = audio
    audio.volume = volume / 100
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  return (
    <StModal title="Settings" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="kei-volume" className="text-sm font-semibold text-text">
              Kei greeting volume
            </label>
            <span className="font-mono text-xs text-muted2">{volume}%</span>
          </div>
          <input
            id="kei-volume"
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-muted2">
              How loud Kei&apos;s voice plays when she greets you.
            </p>
            <button
              type="button"
              onClick={handlePreview}
              className="shrink-0 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted2 transition-colors hover:border-border2 hover:text-text"
            >
              Preview
            </button>
          </div>
        </div>
      </div>
    </StModal>
  )
}
