'use client'

import { useEffect, useState } from 'react'

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
}

function getTimePhrases(hour: number): Phrase[] {
  if (hour >= 5 && hour < 8) {
    return [
      { eyebrow: 'Good morning', text: 'You are up this early? ...G-good. Not that I was waiting, Sensei.', video: 3 },
      { eyebrow: 'Good morning', text: 'Oh— you startled me. Morning, Sensei.', video: 1 },
      { eyebrow: 'Good morning', text: 'Do not skip breakfast just to check rankings, Sensei.', video: 2 },
      { eyebrow: 'Good morning', text: 'The sunrise is nice... n-not that I woke up to see it with you, Sensei.', video: 1 },
      { eyebrow: 'Good morning', text: 'Tea is ready. ...I made extra, for efficiency, Sensei.', video: 2 },
      { eyebrow: 'Good morning', text: 'Up before the others, huh. ...Impressive, I suppose, Sensei.', video: 3 },
    ]
  }
  if (hour >= 8 && hour < 12) {
    return [
      { eyebrow: 'Good morning', text: 'You are back. ...Welcome, Sensei.', video: 4 },
      { eyebrow: 'Good morning', text: 'Morning, Sensei. The standings will not read themselves, you know.', video: 3 },
      { eyebrow: 'Good morning', text: 'O-oh, it is you. Good morning, Sensei.', video: 1 },
      { eyebrow: 'Good morning', text: 'There you are. I was about to start without you, Sensei.', video: 1 },
      { eyebrow: 'Good morning', text: 'Have you stretched yet? ...Sitting all day is bad for you, Sensei.', video: 2 },
      { eyebrow: 'Good morning', text: 'Let us make today count, Sensei.', video: 4 },
    ]
  }
  if (hour >= 12 && hour < 17) {
    return [
      { eyebrow: 'Good afternoon', text: 'Afternoon, Sensei.', video: 4 },
      { eyebrow: 'Good afternoon', text: 'Did you even eat lunch? ...Honestly, Sensei.', video: 2 },
      { eyebrow: 'Good afternoon', text: 'Hmph, took you long enough. Afternoon, Sensei.', video: 1 },
      { eyebrow: 'Good afternoon', text: 'Halfway through the day. Keep it up, Sensei.', video: 3 },
      { eyebrow: 'Good afternoon', text: 'You look tired. ...Take a break, that is an order, Sensei.', video: 2 },
      { eyebrow: 'Good afternoon', text: 'Back so soon? ...Hmph. I do not mind, Sensei.', video: 1 },
    ]
  }
  if (hour >= 17 && hour < 21) {
    return [
      { eyebrow: 'Good evening', text: 'Good evening, Sensei.', video: 4 },
      { eyebrow: 'Good evening', text: 'You worked hard today. ...D-do not get the wrong idea, Sensei.', video: 2 },
      { eyebrow: 'Good evening', text: 'Evening, Sensei. One more look at the board with me?', video: 3 },
      { eyebrow: 'Good evening', text: 'Dinner first, rankings later. ...I mean it, Sensei.', video: 2 },
      { eyebrow: 'Good evening', text: 'You stayed busy today. ...I am a little proud, okay, Sensei?', video: 3 },
      { eyebrow: 'Good evening', text: 'Welcome home, Sensei.', video: 4 },
    ]
  }
  if (hour >= 21 && hour < 24) {
    return [
      { eyebrow: 'Good evening', text: 'It is getting late, Sensei. You should rest soon.', video: 2 },
      { eyebrow: 'Good evening', text: 'Still here at this hour? Fine, I will stay a little longer. But only because I would worry otherwise, Sensei.', video: 5 },
      { eyebrow: 'Good evening', text: 'Late again, Sensei?', video: 4 },
      { eyebrow: 'Good evening', text: 'Do not stay up too late tonight, Sensei.', video: 2 },
      { eyebrow: 'Good evening', text: 'One more check, then bed. Promise me, Sensei.', video: 4 },
      { eyebrow: 'Good evening', text: 'I will keep you company a while longer. ...Only because the night is quiet, not because I want to, Sensei.', video: 5 },
    ]
  }
  return [
    { eyebrow: 'Late night', text: 'It is past midnight, Sensei. Please do not push yourself.', video: 2 },
    { eyebrow: 'Late night', text: 'A night owl, are you? ...I suppose someone has to make sure you do not overdo it, Sensei.', video: 5 },
    { eyebrow: 'Late night', text: 'You are STILL awake? ...Fine, I am too. Do not read into it, Sensei.', video: 1 },
    { eyebrow: 'Late night', text: 'This is no hour to be working, Sensei.', video: 2 },
    { eyebrow: 'Late night', text: 'You really should sleep. ...But fine, I will wait up with you, Sensei.', video: 5 },
    { eyebrow: 'Late night', text: 'Caught you. ...Again, Sensei.', video: 4 },
  ]
}

const GENERAL_PHRASES: Phrase[] = [
  { eyebrow: 'Hello', text: 'Do you feel productive today, Sensei? ...Not that I am checking on you.', video: 1 },
  { eyebrow: 'Hello', text: 'Good to see you, Sensei.', video: 4 },
  { eyebrow: 'Hello', text: 'You have been doing well lately. ...I noticed, that is all, Sensei.', video: 2 },
  { eyebrow: 'Hello', text: 'So, what are we conquering today, Sensei?', video: 3 },
  { eyebrow: 'Hello', text: 'Ready for another run? ...I-I will help, if you insist, Sensei.', video: 3 },
  { eyebrow: 'Hello', text: 'Oh, there you are, Sensei.', video: 4 },
  { eyebrow: 'Hello', text: 'I was not waiting for you. ...You just happened to show up, that is all, Sensei.', video: 1 },
  { eyebrow: 'Hello', text: 'Whatever you are planning, I am coming too. So do not leave me behind, Sensei.', video: 5 },
  { eyebrow: 'Hello', text: 'Try not to overwork yourself today, Sensei.', video: 2 },
  { eyebrow: 'Hello', text: 'Let us get to it, Sensei.', video: 3 },
]

function getDayPhrases(day: number): Phrase[] {
  if (day === 1) {
    return [
      { eyebrow: 'New week', text: 'A new week already. Do not fall behind, Sensei— I will be watching.', video: 3 },
      { eyebrow: 'New week', text: 'Mondays are rough. ...Pace yourself, alright, Sensei?', video: 2 },
      { eyebrow: 'New week', text: 'A fresh week begins. We will climb that board together— n-not that I need your help, Sensei.', video: 5 },
      { eyebrow: 'New week', text: 'Back to work already? ...I will keep you on track, Sensei.', video: 3 },
      { eyebrow: 'New week', text: 'A long week ahead. Lean on me if you must, Sensei.', video: 2 },
    ]
  }
  if (day === 5) {
    return [
      { eyebrow: 'Almost the weekend', text: 'You made it to Friday, Sensei.', video: 4 },
      { eyebrow: 'Almost the weekend', text: 'The week is almost done. Finish strong, Sensei!', video: 3 },
      { eyebrow: 'Almost the weekend', text: 'One more push before you rest, Sensei. Do not slack now.', video: 2 },
      { eyebrow: 'Almost the weekend', text: 'Hang in there, Sensei. You are nearly free.', video: 3 },
      { eyebrow: 'Almost the weekend', text: 'You earned this weekend. ...Do not waste it overworking, alright, Sensei?', video: 2 },
    ]
  }
  if (day === 0 || day === 6) {
    return [
      { eyebrow: 'Weekend', text: 'It is the weekend. You are allowed to relax, Sensei.', video: 2 },
      { eyebrow: 'Weekend', text: 'Where are we heading this weekend, Sensei? ...I-I just want to know your plans, that is all.', video: 5 },
      { eyebrow: 'Weekend', text: 'The weekend already? ...G-good. Take it easy, Sensei.', video: 1 },
      { eyebrow: 'Weekend', text: 'No work today. ...So, did you want to spend it together, Sensei?', video: 1 },
      { eyebrow: 'Weekend', text: 'Rest properly this time, Sensei.', video: 4 },
    ]
  }
  return []
}

interface GreetingContent {
  eyebrow: string
  phrase: string
  day: string
  video: KeiVideo
}

const TYPE_SPEED_MS = 38

const KEI_VIDEOS: KeiVideo[] = [1, 2, 3, 4, 5]

export function GreetingToast() {
  const [content, setContent] = useState<GreetingContent | null>(null)
  const [ready, setReady] = useState(false)
  const [render, setRender] = useState(true)
  const [visible, setVisible] = useState(false)
  const [typed, setTyped] = useState('')
  const [typingDone, setTypingDone] = useState(false)

  useEffect(() => {
    const now = new Date()
    const candidates: Phrase[] = [
      ...getTimePhrases(now.getHours()),
      ...GENERAL_PHRASES,
      ...getDayPhrases(now.getDay()),
    ]
    const picked = candidates[Math.floor(Math.random() * candidates.length)]
    const day = now.toLocaleDateString(undefined, { weekday: 'long' })
    setContent({ eyebrow: picked.eyebrow, phrase: picked.text, day, video: picked.video })
  }, [])

  // Warm the browser cache for all five clips before showing anything. On a
  // slow first visit this waits for the full downloads; on later visits the
  // cached responses resolve almost instantly.
  useEffect(() => {
    let cancelled = false
    Promise.all(
      KEI_VIDEOS.map((n) =>
        fetch(`/assets/greeting/Kei${n}.mp4`)
          .then((res) => res.blob())
          .catch(() => null)
      )
    ).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!content || !ready) return
    const showTimer = setTimeout(() => setVisible(true), 350)
    return () => clearTimeout(showTimer)
  }, [content, ready])

  useEffect(() => {
    if (!content || !visible) return
    const full = content.phrase
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(full.slice(0, i))
      if (i >= full.length) {
        clearInterval(id)
        setTypingDone(true)
      }
    }, TYPE_SPEED_MS)
    return () => clearInterval(id)
  }, [content, visible])

  useEffect(() => {
    if (!typingDone) return
    const hideTimer = setTimeout(() => setVisible(false), 3000)
    const unmountTimer = setTimeout(() => setRender(false), 3000 + 400)
    return () => {
      clearTimeout(hideTimer)
      clearTimeout(unmountTimer)
    }
  }, [typingDone])

  if (!render || !content) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-[500] w-[264px] overflow-hidden rounded-2xl border border-border2 bg-card2 shadow-[0_18px_45px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-[400ms] ease-out motion-reduce:transform-none ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="relative aspect-square w-full bg-white">
        <video
          key={content.video}
          src={`/assets/greeting/Kei${content.video}.mp4`}
          autoPlay
          muted
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
