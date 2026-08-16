'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export interface RadioTrack {
  id: string
  youtubeId: string
  title: string
  displayTitle: string
  durationSeconds: number | null
  publishedAt: string | null
  audioUrl: string
  thumbnailUrl: string
}

export type LoopMode = 'off' | 'queue' | 'one'

interface PersistedState {
  queue: string[]; currentId: string | null; currentTime: number; volume: number; muted: boolean
  playbackRate: number; loopMode: LoopMode; backgroundMode: boolean; sfxEnabled: boolean; sfxVolume: number
}

export interface RadioPlayerValue extends PersistedState {
  tracks: RadioTrack[]; currentTrack: RadioTrack | null; playing: boolean; loading: boolean; catalogLoading: boolean; error: string | null
  duration: number; setQueue: (ids: string[]) => void; playTrack: (id: string) => void; playNext: (id: string) => void
  togglePlay: () => void; previous: () => void; next: () => void; seek: (value: number) => void; eject: () => void
  setVolume: (value: number) => void; setMuted: (value: boolean) => void; setPlaybackRate: (value: number) => void
  setLoopMode: (value: LoopMode) => void; setBackgroundMode: (value: boolean) => void
  setSfxEnabled: (value: boolean) => void; setSfxVolume: (value: number) => void; playSwitchSfx: () => void
  playMechanismSfx: (kind: 'eject' | 'insert') => void
  readFrequencyData: () => Uint8Array<ArrayBuffer> | null
}

const STORAGE_KEY = 'stratonas:radio-player'
const RATES = [0.75, 1, 1.25, 1.5]
const defaults: PersistedState = {
  queue: [], currentId: null, currentTime: 0, volume: 0.8, muted: false,
  playbackRate: 1, loopMode: 'off', backgroundMode: false, sfxEnabled: true, sfxVolume: 0.35,
}

const RadioPlayerContext = createContext<RadioPlayerValue | null>(null)

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stateRef = useRef<PersistedState>(defaults)
  const restoredTime = useRef(0)
  const lastPreviousRef = useRef(0)
  const failedRef = useRef(new Set<string>())
  const suppressAudioErrorRef = useRef(false)
  const sfxTimeRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const [tracks, setTracks] = useState<RadioTrack[]>([])
  const [state, setState] = useState<PersistedState>(defaults)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)

  const currentTrack = useMemo(() => tracks.find((track) => track.id === state.currentId) || null, [state.currentId, tracks])
  const update = useCallback((patch: Partial<PersistedState>) => setState((value) => ({ ...value, ...patch })), [])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<PersistedState> | null
      if (saved) {
        const rate = RATES.includes(Number(saved.playbackRate)) ? Number(saved.playbackRate) : 1
        restoredTime.current = Math.max(0, Number(saved.currentTime) || 0)
        setState({ ...defaults, ...saved, playbackRate: rate, queue: Array.isArray(saved.queue) ? saved.queue : [] })
      }
    } catch { localStorage.removeItem(STORAGE_KEY) }
    setReady(true)
    fetch('/api/radio/tracks')
      .then((response) => {
        if (!response.ok) throw new Error('Radio catalog request failed.')
        return response.json()
      })
      .then((items: RadioTrack[]) => setTracks(Array.isArray(items) ? items : []))
      .catch(() => setError('Could not load the Radio library.'))
      .finally(() => setCatalogLoading(false))
  }, [])

  useEffect(() => {
    if (!tracks.length) return
    const valid = new Set(tracks.map((track) => track.id))
    setState((value) => {
      const queue = value.queue.filter((id, index) => valid.has(id) && value.queue.indexOf(id) === index)
      const currentId = value.currentId && valid.has(value.currentId) ? value.currentId : queue[0] || null
      return queue === value.queue && currentId === value.currentId ? value : { ...value, queue, currentId }
    })
  }, [tracks])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), 400)
    return () => window.clearTimeout(timer)
  }, [ready, state])

  const goTo = useCallback((direction: 1 | -1, autoplay = true) => {
    setState((value) => {
      if (!value.queue.length) return value
      const currentIndex = Math.max(0, value.queue.indexOf(value.currentId || ''))
      let nextIndex = currentIndex + direction
      if (nextIndex < 0 || nextIndex >= value.queue.length) {
        if (value.loopMode !== 'queue') return value
        nextIndex = nextIndex < 0 ? value.queue.length - 1 : 0
      }
      restoredTime.current = 0
      if (autoplay) window.setTimeout(() => audioRef.current?.play().catch(() => undefined), 0)
      return { ...value, currentId: value.queue[nextIndex], currentTime: 0 }
    })
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      const context = new AudioContextClass()
      const analyser = context.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.62
      context.createMediaElementSource(audio).connect(analyser)
      analyser.connect(context.destination)
      audioContextRef.current = context
      analyserRef.current = analyser
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount)
    }
    const onTime = () => update({ currentTime: audio.currentTime })
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const onPlay = () => { setPlaying(true); setLoading(false); setError(null) }
    const onPause = () => setPlaying(false)
    const onWaiting = () => setLoading(true)
    const onCanPlay = () => setLoading(false)
    const onEnded = () => {
      if (stateRef.current.loopMode === 'one') { audio.currentTime = 0; void audio.play(); return }
      goTo(1)
    }
    const onError = () => {
      if (suppressAudioErrorRef.current) return
      if (stateRef.current.currentId) failedRef.current.add(stateRef.current.currentId)
      setError('This track could not be played. Skipping to the next disk.')
      goTo(1)
    }
    audio.addEventListener('timeupdate', onTime); audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('play', onPlay); audio.addEventListener('pause', onPause)
    audio.addEventListener('waiting', onWaiting); audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('ended', onEnded); audio.addEventListener('error', onError)
    return () => {
      audio.pause(); audio.src = ''; audioRef.current = null
      analyserRef.current = null; frequencyDataRef.current = null
      void audioContextRef.current?.close(); audioContextRef.current = null
    }
  }, [goTo, update])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    const wasPlaying = playing
    audio.src = currentTrack.audioUrl
    audio.load()
    const restore = () => {
      audio.currentTime = Math.min(restoredTime.current, Number.isFinite(audio.duration) ? audio.duration : restoredTime.current)
      restoredTime.current = 0
      if (wasPlaying) void audio.play().catch(() => setPlaying(false))
    }
    audio.addEventListener('loadedmetadata', restore, { once: true })
  }, [currentTrack?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (audioRef.current) { audioRef.current.volume = state.volume; audioRef.current.muted = state.muted } }, [state.muted, state.volume])
  useEffect(() => { if (audioRef.current) { audioRef.current.playbackRate = state.playbackRate; audioRef.current.preservesPitch = true } }, [state.playbackRate])

  const playTrack = useCallback((id: string) => {
    void audioContextRef.current?.resume()
    suppressAudioErrorRef.current = false
    setState((value) => {
      const without = value.queue.filter((trackId) => trackId !== id)
      const currentIndex = Math.max(-1, without.indexOf(value.currentId || ''))
      without.splice(currentIndex + 1, 0, id)
      restoredTime.current = 0
      return { ...value, queue: without, currentId: id, currentTime: 0 }
    })
    window.setTimeout(() => audioRef.current?.play().catch(() => setError('Press Play to start this track.')), 30)
  }, [])

  const playNext = useCallback((id: string) => setState((value) => {
    const queue = value.queue.filter((trackId) => trackId !== id)
    const index = Math.max(0, queue.indexOf(value.currentId || ''))
    queue.splice(index + 1, 0, id)
    return { ...value, queue }
  }), [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audioContextRef.current?.resume()
      void audio.play().catch(() => setError('Playback was blocked. Try pressing Play again.'))
    }
    else audio.pause()
  }, [])

  const readFrequencyData = useCallback(() => {
    const analyser = analyserRef.current
    const data = frequencyDataRef.current
    if (!analyser || !data) return null
    analyser.getByteFrequencyData(data)
    return data
  }, [])

  const previous = useCallback(() => {
    const audio = audioRef.current
    const now = Date.now()
    if (audio && audio.currentTime > 5 && now - lastPreviousRef.current > 1200) {
      audio.currentTime = 0; lastPreviousRef.current = now; return
    }
    goTo(-1)
  }, [goTo])

  const next = useCallback(() => goTo(1), [goTo])
  const seek = useCallback((value: number) => { if (audioRef.current) { audioRef.current.currentTime = value; update({ currentTime: value }) } }, [update])

  const eject = useCallback(() => {
    const audio = audioRef.current
    suppressAudioErrorRef.current = true
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    restoredTime.current = 0
    setPlaying(false)
    setLoading(false)
    setDuration(0)
    setError(null)
    update({ currentId: null, currentTime: 0 })
    window.setTimeout(() => { suppressAudioErrorRef.current = false }, 100)
  }, [update])

  const playSwitchSfx = useCallback(() => {
    if (!state.sfxEnabled || Date.now() - sfxTimeRef.current < 90) return
    sfxTimeRef.current = Date.now()
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(620, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.055)
    gain.gain.setValueAtTime(state.sfxVolume * 0.12, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.075)
    oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.08)
    oscillator.addEventListener('ended', () => void context.close())
  }, [state.sfxEnabled, state.sfxVolume])

  const playMechanismSfx = useCallback((kind: 'eject' | 'insert') => {
    if (!state.sfxEnabled) return
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const context = new AudioContextClass()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = kind === 'eject' ? 'sawtooth' : 'square'
    oscillator.frequency.setValueAtTime(kind === 'eject' ? 150 : 260, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'eject' ? 85 : 125, context.currentTime + .11)
    gain.gain.setValueAtTime(state.sfxVolume * .08, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .13)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(); oscillator.stop(context.currentTime + .14)
    oscillator.addEventListener('ended', () => void context.close())
  }, [state.sfxEnabled, state.sfxVolume])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return
    navigator.mediaSession.metadata = new MediaMetadata({ title: currentTrack.displayTitle, artist: 'Blue Archive', artwork: [{ src: currentTrack.thumbnailUrl, sizes: '512x512', type: 'image/webp' }] })
    navigator.mediaSession.setActionHandler('play', togglePlay); navigator.mediaSession.setActionHandler('pause', togglePlay)
    navigator.mediaSession.setActionHandler('previoustrack', previous); navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('seekto', (details) => { if (typeof details.seekTime === 'number') seek(details.seekTime) })
  }, [currentTrack, next, previous, seek, togglePlay])

  const value: RadioPlayerValue = {
    ...state, tracks, currentTrack, playing, loading, catalogLoading, error, duration: duration || currentTrack?.durationSeconds || 0,
    setQueue: (queue) => update({ queue }), playTrack, playNext, togglePlay, previous, next, seek, eject,
    setVolume: (volume) => update({ volume }), setMuted: (muted) => update({ muted }),
    setPlaybackRate: (playbackRate) => update({ playbackRate }), setLoopMode: (loopMode) => update({ loopMode }),
    setBackgroundMode: (backgroundMode) => update({ backgroundMode }), setSfxEnabled: (sfxEnabled) => update({ sfxEnabled }),
    setSfxVolume: (sfxVolume) => update({ sfxVolume }), playSwitchSfx, playMechanismSfx,
    readFrequencyData,
  }
  return <RadioPlayerContext.Provider value={value}>{children}</RadioPlayerContext.Provider>
}

export function useRadioPlayer() {
  const value = useContext(RadioPlayerContext)
  if (!value) throw new Error('useRadioPlayer must be used inside RadioPlayerProvider')
  return value
}

export function formatRadioTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
