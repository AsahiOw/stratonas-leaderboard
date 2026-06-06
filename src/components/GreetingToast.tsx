'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getKeiVolume, isKeiGreetingEnabled, KEI_GREETING_ENABLED_EVENT, KEI_GREETING_REQUEST_EVENT } from '@/lib/kei-volume'

// Kei video expressions (1:1, white background):
//  1 - turns around, shy + surprised
//  2 - honest tone, sounds worried
//  3 - light excitement, still shy
//  4 - book held to mouth, talks briefly
//  5 - book held to mouth, talks at length (~7s)
type KeiVideo = 1 | 2 | 3 | 4 | 5

interface Phrase {
  eyebrow: string
  text: string
  video: KeiVideo
  // Voice clip number in /assets/voice/kei/<voice>.mp3, in voice.md order.
  voice: number
}

function getTimePhrases(hour: number): Phrase[] {
  if (hour >= 5 && hour < 8) {
    return [
      { eyebrow: 'Good morning', text: 'You are up this early? ...G-good. Not that I was waiting, Sensei.', video: 3, voice: 1 },
      { eyebrow: 'Good morning', text: 'Oh— you startled me. Morning, Sensei.', video: 1, voice: 2 },
      { eyebrow: 'Good morning', text: 'Do not skip breakfast just to check rankings, Sensei.', video: 2, voice: 3 },
      { eyebrow: 'Good morning', text: 'The sunrise is nice... n-not that I woke up to see it with you, Sensei.', video: 1, voice: 4 },
      { eyebrow: 'Good morning', text: 'Tea is ready. ...I made extra, for efficiency, Sensei.', video: 2, voice: 5 },
      { eyebrow: 'Good morning', text: 'Up before the others, huh. ...Impressive, I suppose, Sensei.', video: 3, voice: 6 },
    ]
  }
  if (hour >= 8 && hour < 12) {
    return [
      { eyebrow: 'Good morning', text: 'You are back. ...Welcome, Sensei.', video: 4, voice: 7 },
      { eyebrow: 'Good morning', text: 'Morning, Sensei. The standings will not read themselves, you know.', video: 3, voice: 8 },
      { eyebrow: 'Good morning', text: 'O-oh, it is you. Good morning, Sensei.', video: 1, voice: 9 },
      { eyebrow: 'Good morning', text: 'There you are. I was about to start without you, Sensei.', video: 1, voice: 10 },
      { eyebrow: 'Good morning', text: 'Have you stretched yet? ...Sitting all day is bad for you, Sensei.', video: 2, voice: 11 },
      { eyebrow: 'Good morning', text: 'Let us make today count, Sensei.', video: 4, voice: 12 },
    ]
  }
  if (hour >= 12 && hour < 17) {
    return [
      { eyebrow: 'Good afternoon', text: 'Afternoon, Sensei.', video: 4, voice: 13 },
      { eyebrow: 'Good afternoon', text: 'Did you even eat lunch? ...Honestly, Sensei.', video: 2, voice: 14 },
      { eyebrow: 'Good afternoon', text: 'Hmph, took you long enough. Afternoon, Sensei.', video: 1, voice: 15 },
      { eyebrow: 'Good afternoon', text: 'Halfway through the day. Keep it up, Sensei.', video: 3, voice: 16 },
      { eyebrow: 'Good afternoon', text: 'You look tired. ...Take a break, that is an order, Sensei.', video: 2, voice: 17 },
      { eyebrow: 'Good afternoon', text: 'Back so soon? ...Hmph. I do not mind, Sensei.', video: 1, voice: 18 },
    ]
  }
  if (hour >= 17 && hour < 21) {
    return [
      { eyebrow: 'Good evening', text: 'Good evening, Sensei.', video: 4, voice: 19 },
      { eyebrow: 'Good evening', text: 'You worked hard today. ...D-do not get the wrong idea, Sensei.', video: 2, voice: 20 },
      { eyebrow: 'Good evening', text: 'Evening, Sensei. One more look at the board with me?', video: 3, voice: 21 },
      { eyebrow: 'Good evening', text: 'Dinner first, rankings later. ...I mean it, Sensei.', video: 2, voice: 22 },
      { eyebrow: 'Good evening', text: 'You stayed busy today. ...I am a little proud, okay, Sensei?', video: 3, voice: 23 },
      { eyebrow: 'Good evening', text: 'Welcome home, Sensei.', video: 4, voice: 24 },
    ]
  }
  if (hour >= 21 && hour < 24) {
    return [
      { eyebrow: 'Good evening', text: 'It is getting late, Sensei. You should rest soon.', video: 2, voice: 25 },
      { eyebrow: 'Good evening', text: 'Still here at this hour? Fine, I will stay a little longer. But only because I would worry otherwise, Sensei.', video: 5, voice: 26 },
      { eyebrow: 'Good evening', text: 'Late again, Sensei?', video: 4, voice: 27 },
      { eyebrow: 'Good evening', text: 'Do not stay up too late tonight, Sensei.', video: 2, voice: 28 },
      { eyebrow: 'Good evening', text: 'One more check, then bed. Promise me, Sensei.', video: 4, voice: 29 },
      { eyebrow: 'Good evening', text: 'I will keep you company a while longer. ...Only because the night is quiet, not because I want to, Sensei.', video: 5, voice: 30 },
    ]
  }
  return [
    { eyebrow: 'Late night', text: 'It is past midnight, Sensei. Please do not push yourself.', video: 2, voice: 31 },
    { eyebrow: 'Late night', text: 'A night owl, are you? ...I suppose someone has to make sure you do not overdo it, Sensei.', video: 5, voice: 32 },
    { eyebrow: 'Late night', text: 'You are STILL awake? ...Fine, I am too. Do not read into it, Sensei.', video: 1, voice: 33 },
    { eyebrow: 'Late night', text: 'This is no hour to be working, Sensei.', video: 2, voice: 34 },
    { eyebrow: 'Late night', text: 'You really should sleep. ...But fine, I will wait up with you, Sensei.', video: 5, voice: 35 },
    { eyebrow: 'Late night', text: 'Caught you. ...Again, Sensei.', video: 4, voice: 36 },
  ]
}

const GENERAL_PHRASES: Phrase[] = [
  { eyebrow: 'Hello', text: 'Do you feel productive today, Sensei? ...Not that I am checking on you.', video: 1, voice: 37 },
  { eyebrow: 'Hello', text: 'Good to see you, Sensei.', video: 4, voice: 38 },
  { eyebrow: 'Hello', text: 'You have been doing well lately. ...I noticed, that is all, Sensei.', video: 2, voice: 39 },
  { eyebrow: 'Hello', text: 'So, what are we conquering today, Sensei?', video: 3, voice: 40 },
  { eyebrow: 'Hello', text: 'Ready for another run? ...I-I will help, if you insist, Sensei.', video: 3, voice: 41 },
  { eyebrow: 'Hello', text: 'Oh, there you are, Sensei.', video: 4, voice: 42 },
  { eyebrow: 'Hello', text: 'I was not waiting for you. ...You just happened to show up, that is all, Sensei.', video: 1, voice: 43 },
  { eyebrow: 'Hello', text: 'Whatever you are planning, I am coming too. So do not leave me behind, Sensei.', video: 5, voice: 44 },
  { eyebrow: 'Hello', text: 'Try not to overwork yourself today, Sensei.', video: 2, voice: 45 },
  { eyebrow: 'Hello', text: 'Let us get to it, Sensei.', video: 3, voice: 46 },
]

function getDayPhrases(day: number): Phrase[] {
  if (day === 1) {
    return [
      { eyebrow: 'New week', text: 'A new week already. Do not fall behind, Sensei— I will be watching.', video: 3, voice: 47 },
      { eyebrow: 'New week', text: 'Mondays are rough. ...Pace yourself, alright, Sensei?', video: 2, voice: 48 },
      { eyebrow: 'New week', text: 'A fresh week begins. We will climb that board together— n-not that I need your help, Sensei.', video: 5, voice: 49 },
      { eyebrow: 'New week', text: 'Back to work already? ...I will keep you on track, Sensei.', video: 3, voice: 50 },
      { eyebrow: 'New week', text: 'A long week ahead. Lean on me if you must, Sensei.', video: 2, voice: 51 },
    ]
  }
  if (day === 5) {
    return [
      { eyebrow: 'Almost the weekend', text: 'You made it to Friday, Sensei.', video: 4, voice: 52 },
      { eyebrow: 'Almost the weekend', text: 'The week is almost done. Finish strong, Sensei!', video: 3, voice: 53 },
      { eyebrow: 'Almost the weekend', text: 'One more push before you rest, Sensei. Do not slack now.', video: 2, voice: 54 },
      { eyebrow: 'Almost the weekend', text: 'Hang in there, Sensei. You are nearly free.', video: 3, voice: 55 },
      { eyebrow: 'Almost the weekend', text: 'You earned this weekend. ...Do not waste it overworking, alright, Sensei?', video: 2, voice: 56 },
    ]
  }
  if (day === 0 || day === 6) {
    return [
      { eyebrow: 'Weekend', text: 'It is the weekend. You are allowed to relax, Sensei.', video: 2, voice: 57 },
      { eyebrow: 'Weekend', text: 'Where are we heading this weekend, Sensei? ...I-I just want to know your plans, that is all.', video: 5, voice: 58 },
      { eyebrow: 'Weekend', text: 'The weekend already? ...G-good. Take it easy, Sensei.', video: 1, voice: 59 },
      { eyebrow: 'Weekend', text: 'No work today. ...So, did you want to spend it together, Sensei?', video: 1, voice: 60 },
      { eyebrow: 'Weekend', text: 'Rest properly this time, Sensei.', video: 4, voice: 61 },
    ]
  }
  return []
}

interface GreetingContent {
  eyebrow: string
  phrase: string
  day: string
  video: KeiVideo
  voice: number
}

const TYPE_SPEED_MS = 38
const CALL_TRANSITION_MS = 400
const KEI_CALLER_IMAGE_URL = '/assets/images/kei-avatar.jpg'

const KEI_VIDEOS: KeiVideo[] = [1, 2, 3, 4, 5]

function getGreetingContent(): GreetingContent {
  const now = new Date()
  const candidates: Phrase[] = [
    ...getTimePhrases(now.getHours()),
    ...GENERAL_PHRASES,
    ...getDayPhrases(now.getDay()),
  ]
  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  const day = now.toLocaleDateString(undefined, { weekday: 'long' })
  return { eyebrow: picked.eyebrow, phrase: picked.text, day, video: picked.video, voice: picked.voice }
}

export function GreetingToast() {
  const speechCleanupRef = useRef<(() => void) | null>(null)
  const transitionTimerRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [greetingEnabled, setGreetingEnabled] = useState(() => isKeiGreetingEnabled())
  const [content, setContent] = useState<GreetingContent | null>(null)
  const [ready, setReady] = useState(false)
  const [started, setStarted] = useState(false)
  const [render, setRender] = useState(true)
  const [callVisible, setCallVisible] = useState(false)
  const [callBusy, setCallBusy] = useState(false)
  const [answering, setAnswering] = useState(false)
  const [visible, setVisible] = useState(false)
  const [typed, setTyped] = useState('')
  const [typingDone, setTypingDone] = useState(false)
  const [speechDone, setSpeechDone] = useState(false)
  const [callDots, setCallDots] = useState(1)

  useEffect(() => {
    function handleGreetingEnabledChange(event: Event) {
      if (event instanceof CustomEvent) setGreetingEnabled(Boolean(event.detail))
    }

    window.addEventListener(KEI_GREETING_ENABLED_EVENT, handleGreetingEnabledChange)
    return () => window.removeEventListener(KEI_GREETING_ENABLED_EVENT, handleGreetingEnabledChange)
  }, [])

  const startGreeting = useCallback(() => {
    clearTransitionWork()
    speechCleanupRef.current?.()
    speechCleanupRef.current = null
    setCallBusy(false)
    setCallVisible(false)
    setAnswering(false)
    setTyped('')
    setTypingDone(false)
    setSpeechDone(false)
    setRender(true)
    setReady(false)
    setStarted(false)
    setVisible(false)
    setContent(getGreetingContent())
  }, [])

  useEffect(() => {
    if (!greetingEnabled) return

    startGreeting()
  }, [greetingEnabled, startGreeting])

  useEffect(() => {
    if (!greetingEnabled) return

    function handleGreetingRequest() {
      if (render) return
      startGreeting()
    }

    window.addEventListener(KEI_GREETING_REQUEST_EVENT, handleGreetingRequest)
    return () => window.removeEventListener(KEI_GREETING_REQUEST_EVENT, handleGreetingRequest)
  }, [greetingEnabled, render, startGreeting])

  useEffect(() => {
    if (greetingEnabled) return

    clearTransitionWork()
    speechCleanupRef.current?.()
    speechCleanupRef.current = null
    setContent(null)
    setReady(false)
    setStarted(false)
    setRender(false)
    setCallVisible(false)
    setCallBusy(false)
    setAnswering(false)
    setVisible(false)
  }, [greetingEnabled])

  // Warm the browser cache for all five clips and the selected voice before
  // showing the prompt.
  useEffect(() => {
    if (!content) return

    let cancelled = false
    const voiceUrl = `/assets/voice/kei/${content.voice}.mp3`

    Promise.all(
      [
        fetch(KEI_CALLER_IMAGE_URL)
          .then((res) => res.blob())
          .catch(() => null),
        ...KEI_VIDEOS.map((n) =>
          fetch(`/assets/greeting/Kei${n}.mp4`)
            .then((res) => res.blob())
            .catch(() => null)
        ),
        fetch(voiceUrl)
          .then((res) => res.blob())
          .catch(() => null),
      ]
    ).then(() => {
      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
      speechCleanupRef.current?.()
      speechCleanupRef.current = null
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current)
    }
  }, [content])

  function clearTransitionWork() {
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  function handlePlayKei() {
    if (!content || !ready || callBusy) return

    setCallBusy(true)
    const audio = new Audio(`/assets/voice/kei/${content.voice}.mp3`)
    speechCleanupRef.current?.()
    audio.volume = getKeiVolume()
    audio.currentTime = 0

    const cleanup = () => {
      audio.removeEventListener('ended', onSpeechEnd)
      audio.removeEventListener('error', onSpeechEnd)
      audio.pause()
      if (speechCleanupRef.current === cleanup) speechCleanupRef.current = null
    }

    const onSpeechEnd = () => {
      cleanup()
      setSpeechDone(true)
    }

    audio.addEventListener('ended', onSpeechEnd)
    audio.addEventListener('error', onSpeechEnd)
    speechCleanupRef.current = cleanup

    audio.play()
      .then(() => {
        setTyped('')
        setTypingDone(false)
        setSpeechDone(false)
        setAnswering(true)
        clearTransitionWork()
        transitionTimerRef.current = window.setTimeout(() => {
          setStarted(true)
          setVisible(true)
          setAnswering(false)
          setCallBusy(false)
          transitionTimerRef.current = null
        }, CALL_TRANSITION_MS)
      })
      .catch(() => {
        cleanup()
        setStarted(false)
        setAnswering(false)
        setVisible(false)
        setCallBusy(false)
      })
  }

  function handleHangUp() {
    if (callBusy) return
    setCallBusy(true)
    setCallVisible(false)
    clearTransitionWork()
    transitionTimerRef.current = window.setTimeout(() => {
      speechCleanupRef.current?.()
      speechCleanupRef.current = null
      setRender(false)
      transitionTimerRef.current = null
    }, CALL_TRANSITION_MS)
  }

  useEffect(() => {
    if (!render || !ready || started) return

    animationFrameRef.current = window.requestAnimationFrame(() => {
      setCallVisible(true)
      animationFrameRef.current = null
    })

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [ready, render, started])

  useEffect(() => {
    return () => {
      clearTransitionWork()
      speechCleanupRef.current?.()
      speechCleanupRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!render || !ready || started) return

    const dotsTimer = setInterval(() => {
      setCallDots((current) => current === 3 ? 1 : current + 1)
    }, 420)

    return () => clearInterval(dotsTimer)
  }, [ready, render, started])

  useEffect(() => {
    if (!content || !started || !visible) return
    const full = content.phrase

    let i = 0
    const typeId = setInterval(() => {
      i += 1
      setTyped(full.slice(0, i))
      if (i >= full.length) {
        clearInterval(typeId)
        setTypingDone(true)
      }
    }, TYPE_SPEED_MS)

    return () => {
      clearInterval(typeId)
    }
  }, [content, started, visible])

  useEffect(() => {
    if (!speechDone) return
    const hideTimer = setTimeout(() => setVisible(false), 1200)
    const unmountTimer = setTimeout(() => setRender(false), 1200 + 400)
    return () => {
      clearTimeout(hideTimer)
      clearTimeout(unmountTimer)
    }
  }, [speechDone])

  if (!greetingEnabled || !render || !content || !ready) return null

  if (!started) {
    return (
      <div
        role="dialog"
        aria-label="Kei video call"
        className={`fixed bottom-5 right-5 z-[500] w-[264px] overflow-hidden rounded-2xl border border-border2 bg-card2 shadow-[0_18px_45px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transform-none ${callVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
          }`}
      >
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-card">
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-cover bg-center transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transform-none ${answering ? 'scale-100 opacity-0' : 'scale-105 opacity-100'
              }`}
            style={{ backgroundImage: `url(${KEI_CALLER_IMAGE_URL})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,13,19,0.08),rgba(13,13,19,0.74))]" />
          <video
            key={content.video}
            src={`/assets/greeting/Kei${content.video}.mp4`}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transform-none ${answering ? 'scale-100 opacity-100' : 'scale-110 opacity-0'
              }`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-card2" />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-accent/20" />
          <div className={`absolute inset-x-0 bottom-0 px-4 pb-3 text-center transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transform-none ${answering ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
            }`}>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              Incoming video call
            </div>
            <div className="mt-1 text-sm font-semibold leading-snug text-text">
              Kei Kei is calling{'.'.repeat(callDots)}
            </div>
          </div>
        </div>
        <div className={`flex items-center justify-center gap-4 px-4 py-3 transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transform-none ${answering ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
          }`}>
          <button
            type="button"
            onClick={handleHangUp}
            disabled={callBusy}
            aria-label="Hang up Kei call"
            className="h-10 min-w-24 rounded-lg border border-red/30 bg-red px-4 text-sm font-bold text-white transition-colors hover:bg-red/90 focus:outline-none focus:ring-2 focus:ring-red/50 focus:ring-offset-2 focus:ring-offset-card2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hang up
          </button>
          <button
            type="button"
            onClick={handlePlayKei}
            disabled={callBusy}
            aria-label="Answer Kei call"
            className="h-10 min-w-24 rounded-lg border border-green/30 bg-green px-4 text-sm font-bold text-bg transition-colors hover:bg-green/90 focus:outline-none focus:ring-2 focus:ring-green/50 focus:ring-offset-2 focus:ring-offset-card2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Answer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-[500] w-[264px] overflow-hidden rounded-2xl border border-border2 bg-card2 shadow-[0_18px_45px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transform-none ${visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
    >
      <div className="relative aspect-square w-full bg-white">
        <video
          key={content.video}
          src={`/assets/greeting/Kei${content.video}.mp4`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-card2" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-accent/20" />
      </div>
      <div className="px-4 pb-3 pt-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
          {content.eyebrow}
        </div>
        <div className="relative mt-0.5 text-sm font-semibold leading-snug">
          <span className="invisible">{content.phrase}</span>
          <span className="absolute inset-0 text-text">
            {typed}
            {!typingDone && (
              <span
                className="ml-0.5 inline-block w-[2px] -translate-y-px align-middle bg-accent motion-safe:animate-pulse"
                style={{ height: '0.95em' }}
                aria-hidden
              />
            )}
          </span>
        </div>
        <div className="mt-1 text-xs leading-5 text-muted2">{content.day}</div>
      </div>
    </div>
  )
}
