'use client'

import { useEffect, useRef, useState } from 'react'
import localFont from 'next/font/local'
import { DM_Sans, M_PLUS_1 } from 'next/font/google'
import { imageSrc, hexToRgb } from '@/lib/utils'
import { getMemorialOffset, getPortraitOffset } from '@/lib/portrait-offset'
import type { TableEntry } from '@/components/LeaderboardTable'

interface RaidCardRaid {
  raidBoss: { name: string; description: string; image?: string | null }
  season: number
  type: { name: string }
  server: { name: string }
  terrain: { name: string }
  color: string
  color2: string
}

interface Props {
  raid: RaidCardRaid
  entry: TableEntry
  elevated?: boolean
  videoMode?: 'poster' | 'preload' | 'active'
}

function safeHex(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
}

function rgba(hex: string, opacity: number) {
  return `rgba(${hexToRgb(hex)},${opacity})`
}

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  if (max === min) {
    return { hue: 0, saturation: 0, lightness }
  }

  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue = 0

  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0)
  if (max === g) hue = (b - r) / delta + 2
  if (max === b) hue = (r - g) / delta + 4

  return { hue: hue * 60, saturation, lightness }
}

function titleColorFromTint(hex: string) {
  const { hue, saturation } = hexToHsl(hex)
  const textSaturation = Math.min(saturation, 0.64)

  return `hsl(${Math.round(hue)} ${Math.round(textSaturation * 100)}% 22%)`
}

function memorialPosterSrc(memorial: string | null | undefined) {
  if (!memorial?.startsWith('/api/memorial-video')) return FALLBACK_BG

  try {
    const url = new URL(memorial, 'http://localhost')
    const file = url.searchParams.get('file')
    return file ? `/api/memorial-poster?file=${encodeURIComponent(file)}&v=final-frame` : FALLBACK_BG
  } catch {
    return FALLBACK_BG
  }
}

const SCORE_TEXT = '#1a1a1a'
const CLUB_TEXT = '#111111'
// Design default tint — used when the player's club has no color set
const DEFAULT_TINT = '#f0b8d0'

// Local fallback assets shipped under /public/assets/raid-card/
const FALLBACK_BG = '/assets/raid-card/lobby.jpg'
const FALLBACK_PORTRAIT = '/assets/raid-card/portrait.webp'
const FALLBACK_CLUB = '/assets/raid-card/club.webp'

const scoreFont = localFont({
  src: '../../public/font/bukhari_script/Bukhari Script.ttf',
  display: 'swap',
})

const titleFont1 = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const titleFont2 = M_PLUS_1({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export function RaidCard({ raid, entry, elevated = false, videoMode = 'active' }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const touchReleaseTimerRef = useRef<number | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)

  // clubAccent: drives border/shadow/badge-glow; falls back to raid color
  const clubAccent = safeHex(entry.clubColor, safeHex(raid.color, '#4f8ef7'))
  // tintColor: drives the two-tone overlay; falls back to design default pink (not raid color)
  const tintColor = safeHex(entry.clubColor, DEFAULT_TINT)
  const titleTextColor = titleColorFromTint(tintColor)

  const portrait = imageSrc(entry.favouriteStudentPortrait || entry.favouriteStudentImage, FALLBACK_PORTRAIT)
  const clubLogo = imageSrc(entry.clubLogo, FALLBACK_CLUB)
  const background = imageSrc(entry.favouriteStudentMemorial, FALLBACK_BG)
  const poster = memorialPosterSrc(entry.favouriteStudentMemorial)
  const memorialOffset = getMemorialOffset(entry.favouriteStudentMemorialOffset)
  const portraitOffset = getPortraitOffset(entry.favouriteStudentId, entry.favouriteStudentPortraitOffset)
  const seasonLabel = `S${raid.season}: ${raid.raidBoss.name} ${raid.terrain.name}`
  const headerLabel = `Stratonas ${raid.type.name} Leaderboard`

  // Two-tone overlay: left 25% tint, feather 71%–77%, right fully opaque
  const leftCol = rgba(tintColor, 0.25)
  const rightCol = rgba(tintColor, 1.0)
  const gradient = `linear-gradient(90deg, ${leftCol} 0%, ${leftCol} 71%, ${rightCol} 77%, ${rightCol} 100%)`

  // Curved-slash path — quadratic bezier from design defaults
  // cx=1161.8 (116.18% of W), cy=304 (mid + 14% offset), control bends to x=−314
  const slashPath = 'M 1161.8 -1121 Q -314 304 1161.8 1729 L 5161.8 172971 L 5161.8 -1121 Z'
  const shouldMountVideo = Boolean(entry.favouriteStudentMemorial && isInteracting)
  const shouldPlayVideo = shouldMountVideo && isInteracting
  const videoPreload = 'auto'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (!shouldPlayVideo) {
      video.pause()
      return
    }

    let cancelled = false
    let retryTimer: number | null = null
    let retryInterval: number | null = null

    const playVideo = () => {
      if (cancelled) return
      if (!video.paused && !video.ended) return

      if (video.currentTime > Math.max(0, video.duration - 0.2)) {
        video.currentTime = 0
      }

      void video.play().catch((error: unknown) => {
        if (cancelled) return

        const name = error instanceof DOMException ? error.name : ''
        if (name === 'AbortError') return

        retryTimer = window.setTimeout(playVideo, 400)
      })
    }

    const handlePause = () => {
      if (!cancelled) retryTimer = window.setTimeout(playVideo, 120)
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      playVideo()
    } else {
      video.load()
      video.addEventListener('loadeddata', playVideo, { once: true })
      video.addEventListener('canplay', playVideo, { once: true })
    }

    video.addEventListener('pause', handlePause)
    video.addEventListener('stalled', playVideo)
    video.addEventListener('suspend', playVideo)
    retryInterval = window.setInterval(playVideo, 700)

    return () => {
      cancelled = true
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      if (retryInterval !== null) window.clearInterval(retryInterval)
      video.removeEventListener('loadeddata', playVideo)
      video.removeEventListener('canplay', playVideo)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('stalled', playVideo)
      video.removeEventListener('suspend', playVideo)
    }
  }, [shouldPlayVideo, background])

  useEffect(() => {
    return () => {
      if (touchReleaseTimerRef.current !== null) window.clearTimeout(touchReleaseTimerRef.current)
    }
  }, [])

  const clearTouchReleaseTimer = () => {
    if (touchReleaseTimerRef.current !== null) {
      window.clearTimeout(touchReleaseTimerRef.current)
      touchReleaseTimerRef.current = null
    }
  }

  const stopTouchPlaybackSoon = () => {
    clearTouchReleaseTimer()
    touchReleaseTimerRef.current = window.setTimeout(() => {
      setIsInteracting(false)
      touchReleaseTimerRef.current = null
    }, 120)
  }

  return (
    <article
      className="relative isolate aspect-[1000/475] overflow-hidden rounded-md border bg-card"
      data-video-mode={videoMode}
      data-video-interacting={isInteracting}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setIsInteracting(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setIsInteracting(false)
      }}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse') return
        clearTouchReleaseTimer()
        setIsInteracting(true)
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== 'mouse') stopTouchPlaybackSoon()
      }}
      onPointerCancel={(event) => {
        if (event.pointerType !== 'mouse') setIsInteracting(false)
      }}
      style={{
        borderColor: `${clubAccent}${elevated ? '80' : '40'}`,
        boxShadow: elevated
          ? `0 0 0 1px ${clubAccent}44, 0 22px 54px rgba(0,0,0,0.48), 0 0 30px ${clubAccent}18`
          : `0 12px 30px rgba(0,0,0,0.28), 0 0 18px ${clubAccent}10`,
        containerType: 'inline-size',
      }}
    >
      {/* z-0 — Memorial lobby video (design parity: 200%x200% + translate/scale + contain) */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#ddd]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          onError={(e) => {
            const img = e.currentTarget
            if (!img.src.endsWith(FALLBACK_BG)) img.src = FALLBACK_BG
          }}
          className="max-w-none"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '200%',
            height: '200%',
            objectFit: 'contain',
            objectPosition: 'center center',
            transform: `translate(-50%, -50%) translate(${memorialOffset.x}%, ${memorialOffset.y}%) scale(${memorialOffset.scale})`,
            transformOrigin: 'center center',
          }}
        />
        {shouldMountVideo ? (
          <video
            ref={videoRef}
            src={background}
            poster={poster}
            loop
            muted
            playsInline
            preload={videoPreload}
            onLoadedData={() => setVideoReady(true)}
            onCanPlay={() => setVideoReady(true)}
            onError={(e) => {
              e.currentTarget.pause()
              setVideoReady(false)
            }}
            className="max-w-none"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '200%',
              height: '200%',
              objectFit: 'contain',
              objectPosition: 'center center',
              opacity: videoReady ? 1 : 0,
              transition: 'opacity 220ms ease',
              transform: `translate(-50%, -50%) translate(${memorialOffset.x}%, ${memorialOffset.y}%) scale(${memorialOffset.scale})`,
              transformOrigin: 'center center',
            }}
          />
        ) : null}
      </div>

      {/* z-1 — Curved slash (behind gradient) */}
      <svg
        viewBox="0 0 1000 475"
        preserveAspectRatio="none"
        className="absolute inset-0 z-[1] h-full w-full pointer-events-none"
        aria-hidden="true"
      >
        <g transform="rotate(12 1161.8 304)">
          <path d={slashPath} fill={tintColor} fillOpacity="0.5" />
        </g>
      </svg>

      {/* z-2 — Two-tone tint overlay */}
      <div className="absolute inset-0 z-[2]" style={{ background: gradient }} />

      {/* z-3 — Right panel: club badge behind portrait */}
      <div className="absolute inset-y-0 right-0 z-[3] w-[54%] pointer-events-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={clubLogo}
          alt=""
          onError={(e) => {
            const img = e.currentTarget
            if (!img.src.endsWith(FALLBACK_CLUB)) img.src = FALLBACK_CLUB
          }}
          className="absolute z-[1] object-contain opacity-[0.88]"
          style={{
            right: '6%',
            top: '50%',
            width: '85.8%',
            transform: 'translateY(-50%)',
            filter: `drop-shadow(0 0 16px ${rgba(clubAccent, 0.18)})`,
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portrait}
          alt={entry.favouriteStudent || entry.name}
          onError={(e) => {
            const img = e.currentTarget
            if (!img.src.endsWith(FALLBACK_PORTRAIT)) img.src = FALLBACK_PORTRAIT
          }}
          className="absolute z-[2] w-auto max-w-none object-contain"
          style={{
            left: `calc(50% + ${portraitOffset.x}%)`,
            top: `calc(-8.7% + ${portraitOffset.y}%)`,
            height: `${184.68 * portraitOffset.scale}%`,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 7px 14px rgba(0,0,0,0.2))',
          }}
        />
      </div>

      {/* z-6 — Text layer (in front of everything; long text overflows on top of portrait) */}
      <div className="absolute inset-0 z-[6] pointer-events-none">
        {/* Header */}
        <div
          className={`absolute whitespace-nowrap leading-[1.15] ${titleFont1.className}`}
          style={{
            left: '2%',
            top: '5%',
            fontSize: '2.05cqw',
            color: titleTextColor,
            fontWeight: 500,
            letterSpacing: '0',
            textShadow: '0 1px 2px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {headerLabel}
        </div>

        {/* Season + terrain */}
        <div
          className={`absolute whitespace-nowrap leading-[1.05] ${titleFont1.className}`}
          style={{
            left: '4%',
            top: '14%',
            fontSize: '2.65cqw',
            color: titleTextColor,
            fontWeight: 900,
            letterSpacing: '0',
            textShadow: '0 2px 2px rgba(255,255,255,0.35), 0 2px 3px rgba(0,0,0,0.35)',
          }}
        >
          {seasonLabel}
        </div>

        {/* Rank */}
        <div
          className={`absolute whitespace-nowrap leading-[1.05] ${titleFont1.className}`}
          style={{
            left: '4%',
            top: '20.5%',
            fontSize: '2.75cqw',
            color: titleTextColor,
            fontWeight: 900,
            letterSpacing: '0',
            textShadow: '0 2px 2px rgba(255,255,255,0.35), 0 2px 3px rgba(0,0,0,0.35)',
          }}
        >
          Rank {entry.rank}
        </div>

        {/* Player name */}
        <div
          className={`absolute whitespace-nowrap uppercase leading-none ${titleFont2.className}`}
          style={{
            left: '4%',
            top: '28.9%',
            fontSize: '8cqw',
            color: titleTextColor,
            fontWeight: 900,
            letterSpacing: '0',
            textShadow: '0 3px 2px rgba(255,255,255,0.32), 0 3px 4px rgba(0,0,0,0.32)',
          }}
        >
          {entry.name}
        </div>

        {/* Score */}
        <div
          className={`absolute whitespace-nowrap leading-[1.05] ${scoreFont.className}`}
          style={{
            left: '4%',
            top: '48.5%',
            fontSize: '7.6cqw',
            color: SCORE_TEXT,
            fontWeight: 400,
            letterSpacing: '0',
            transform: 'skewX(-8deg)',
            textShadow: '0 4px 0 rgba(255,255,255,0.34), 0 5px 5px rgba(0,0,0,0.42)',
          }}
        >
          {entry.score.toLocaleString()}
        </div>

        {/* Club name */}
        <div
          className={`absolute whitespace-nowrap uppercase leading-[1.05] ${titleFont2.className}`}
          style={{
            left: '4%',
            top: '71.5%',
            fontSize: '3.5cqw',
            color: CLUB_TEXT,
            fontWeight: 500,
            letterSpacing: '0',
            textShadow: '0 2px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.42)',
          }}
        >
          {entry.club || 'GUEST'}
        </div>
      </div>
    </article>
  )
}
