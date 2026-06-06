'use client'

import { useRef, useState } from 'react'
import { StModal } from '@/components/ui/StModal'
import { getKeiVolume, isKeiGreetingEnabled, setKeiGreetingEnabled, setKeiVolume } from '@/lib/kei-volume'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [volume, setVolume] = useState(() => Math.round(getKeiVolume() * 100))
  const [greetingEnabled, setGreetingEnabled] = useState(() => isKeiGreetingEnabled())
  const previewRef = useRef<HTMLAudioElement | null>(null)

  function handleChange(value: number) {
    setVolume(value)
    setKeiVolume(value / 100)
  }

  function handleGreetingEnabledChange(enabled: boolean) {
    setGreetingEnabled(enabled)
    setKeiGreetingEnabled(enabled)
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <label htmlFor="kei-greeting-enabled" className="text-sm font-semibold text-text">
              Kei greeting toast
            </label>
            <p className="mt-1 text-xs leading-5 text-muted2">
              Show Kei&apos;s greeting when the app opens.
            </p>
          </div>
          <button
            id="kei-greeting-enabled"
            type="button"
            role="switch"
            aria-checked={greetingEnabled}
            aria-label="Toggle Kei greeting toast"
            onClick={() => handleGreetingEnabledChange(!greetingEnabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-card2 ${
              greetingEnabled ? 'border-accent/40 bg-accent' : 'border-border2 bg-card'
            }`}
          >
            <span
              aria-hidden
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-text shadow-sm transition-transform ${
                greetingEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
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
