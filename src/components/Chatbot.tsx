'use client'

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type ChatRole = 'user' | 'assistant'
type PlanaExpression =
  | 'neutral'
  | 'friendly'
  | 'happy'
  | 'affection'
  | 'concerned'
  | 'serious'
  | 'surprised'
  | 'confused'
  | 'frustrated'
  | 'excited'
  | 'sleeping'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  expression?: PlanaExpression
  expressionIntensity?: number
  failed?: boolean
}

interface ChatResponse {
  message?: string
  model?: string
  memory?: ChatMemory
  expression?: string
  expressionIntensity?: number
  error?: string
}

interface ChatMemoryEntity {
  id: string
  name: string
}

interface ChatMemory {
  players: ChatMemoryEntity[]
  clubs: ChatMemoryEntity[]
  raids: ChatMemoryEntity[]
  students: ChatMemoryEntity[]
  notes: string[]
}

const MAX_HISTORY_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 1400
const GREETING_TYPING_DELAY_MS = 900
const MOMOTALK_ICON = '/assets/images/favicon-momotalk.ico'
const PLANA_IMAGE_ROOT = '/assets/images/plana'
const DEFAULT_EXPRESSION: PlanaExpression = 'neutral'
const EMPTY_GREETING = 'Welcome back, Sensei. I am ready when you are.'
const SLEEPING_FAILURE_MESSAGE = 'Zzz... Sorry, Sensei. I feel a little tired. Please try again in a moment.'

const PLANA_EXPRESSIONS = new Set<string>([
  'neutral',
  'friendly',
  'happy',
  'affection',
  'concerned',
  'serious',
  'surprised',
  'confused',
  'frustrated',
  'excited',
  'sleeping',
])

const EMPTY_MEMORY: ChatMemory = {
  players: [],
  clubs: [],
  raids: [],
  students: [],
  notes: [],
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeExpression(value: unknown): PlanaExpression {
  return typeof value === 'string' && PLANA_EXPRESSIONS.has(value)
    ? value as PlanaExpression
    : DEFAULT_EXPRESSION
}

function expressionImage(expression: PlanaExpression) {
  return `${PLANA_IMAGE_ROOT}/${expression}.jpg`
}

function createGreetingMessage(): ChatMessage {
  return {
    id: createId(),
    role: 'assistant',
    content: EMPTY_GREETING,
    expression: 'friendly',
    expressionIntensity: 0.34,
  }
}

function apiMessages(messages: ChatMessage[]) {
  return messages
    .filter((message) => !message.failed)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_MESSAGE_LENGTH),
    }))
}

function latestPreview(messages: ChatMessage[]) {
  const latest = [...messages].reverse().find((message) => message.role === 'assistant' && !message.failed)
  return latest?.content || EMPTY_GREETING
}

function latestExpression(messages: ChatMessage[]) {
  const latest = [...messages].reverse().find((message) => message.role === 'assistant' && !message.failed)
  return latest?.expression || 'friendly'
}

function ChatIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 4h14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-7.7L6.2 20.3A.75.75 0 0 1 5 19.7V17a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" />
      <path d="M7 9.25h10v1.5H7v-1.5Zm0 3h6.5v1.5H7v-1.5Z" className="text-[#58677c]" fill="currentColor" />
    </svg>
  )
}

function PersonIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="31" height="31" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0v1H5v-1Z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <path d="M5 5l14 14" />
      <path d="M19 5L5 19" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function MomoTalkIcon({ className }: { className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={MOMOTALK_ICON} alt="" className={className} draggable={false} />
}

function PlanaAvatar({
  expression,
  sizeClass,
  className = '',
}: {
  expression: PlanaExpression
  sizeClass: string
  className?: string
}) {
  return (
    <Image
      src={expressionImage(expression)}
      alt="Plana"
      width={96}
      height={96}
      priority
      data-expression={expression}
      className={`${sizeClass} shrink-0 rounded-full bg-white object-cover object-top ${className}`}
      draggable={false}
    />
  )
}

function PlanaBubble({
  content,
  expression,
  failed = false,
  onRetry,
}: {
  content: string
  expression: PlanaExpression
  failed?: boolean
  onRetry?: () => void
}) {
  return (
    <div className="mb-3 grid grid-cols-[54px_minmax(0,1fr)] gap-x-3 px-3 sm:grid-cols-[64px_minmax(0,1fr)] sm:px-5">
      <PlanaAvatar expression={expression} sizeClass="h-[54px] w-[54px] sm:h-[64px] sm:w-[64px]" className="border border-[#dce5ec]" />
      <div className="min-w-0">
        <div className="mb-1 text-[16px] font-black leading-5 text-[#2a323e] sm:text-[18px]">Plana</div>
        <div className="relative inline-block max-w-[min(100%,620px)] whitespace-pre-wrap rounded-[8px] bg-[#4b5a6f] px-3 py-2 text-[15px] font-semibold leading-5 text-[#ecf2fb] shadow-sm before:absolute before:left-[-10px] before:top-[11px] before:border-y-[6px] before:border-r-[10px] before:border-y-transparent before:border-r-[#4b5a6f] before:content-[''] sm:text-[17px] sm:leading-6">
          {content}
        </div>
        {failed && onRetry && (
          <div>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 rounded-[6px] border border-[#cdd3dc] bg-white px-3 py-1.5 text-xs font-bold text-[#4b5a6f] shadow-sm transition-colors hover:bg-[#e1e7ec] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SenseiBubble({ content }: { content: string }) {
  return (
    <div className="mb-3 flex justify-end px-3 sm:px-5">
      <div className="relative max-w-[min(82%,620px)] whitespace-pre-wrap rounded-[8px] bg-[#4a8ac6] px-3 py-2 text-[15px] font-semibold leading-5 text-white shadow-sm before:absolute before:right-[-10px] before:top-[11px] before:border-y-[6px] before:border-l-[10px] before:border-y-transparent before:border-l-[#4a8ac6] before:content-[''] sm:text-[17px] sm:leading-6">
        {content}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex h-5 items-center gap-1 text-current" aria-hidden>
      <span className="momotalk-typing-dot momotalk-typing-dot-1" />
      <span className="momotalk-typing-dot momotalk-typing-dot-2" />
      <span className="momotalk-typing-dot momotalk-typing-dot-3" />
    </span>
  )
}

function PlanaTypingBubble() {
  return (
    <div className="mb-3 grid grid-cols-[54px_minmax(0,1fr)] gap-x-3 px-3 sm:grid-cols-[64px_minmax(0,1fr)] sm:px-5">
      <PlanaAvatar expression="friendly" sizeClass="h-[54px] w-[54px] sm:h-[64px] sm:w-[64px]" className="border border-[#dce5ec]" />
      <div className="min-w-0">
        <div className="mb-1 text-[16px] font-black leading-5 text-[#2a323e] sm:text-[18px]">Plana</div>
        <div className="relative inline-flex min-h-[36px] min-w-14 items-center justify-center rounded-[8px] bg-[#4b5a6f] px-3 py-2 text-[#ecf2fb] shadow-sm before:absolute before:left-[-10px] before:top-[11px] before:border-y-[6px] before:border-r-[10px] before:border-y-transparent before:border-r-[#4b5a6f] before:content-[''] sm:min-h-[40px]">
          <TypingDots />
        </div>
      </div>
    </div>
  )
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [introPending, setIntroPending] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [memory, setMemory] = useState<ChatMemory>(EMPTY_MEMORY)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const introTimerRef = useRef<number | null>(null)
  const chatSessionRef = useRef(0)

  function clearIntroTimer() {
    if (introTimerRef.current === null) return
    window.clearTimeout(introTimerRef.current)
    introTimerRef.current = null
  }

  useEffect(() => {
    if (!open) return
    const viewport = window.visualViewport
    if (!viewport) return
    const activeViewport = viewport

    function updateViewportSize() {
      document.documentElement.style.setProperty('--momotalk-viewport-height', `${activeViewport.height}px`)
      document.documentElement.style.setProperty('--momotalk-viewport-top', `${activeViewport.offsetTop}px`)
    }

    updateViewportSize()
    activeViewport.addEventListener('resize', updateViewportSize)
    activeViewport.addEventListener('scroll', updateViewportSize)

    return () => {
      activeViewport.removeEventListener('resize', updateViewportSize)
      activeViewport.removeEventListener('scroll', updateViewportSize)
      document.documentElement.style.removeProperty('--momotalk-viewport-height')
      document.documentElement.style.removeProperty('--momotalk-viewport-top')
    }
  }, [open])

  useEffect(() => {
    if (!open || messages.length > 0 || introTimerRef.current !== null) return

    setIntroPending(true)
    const timer = window.setTimeout(() => {
      introTimerRef.current = null
      setMessages((current) => current.length ? current : [createGreetingMessage()])
      setIntroPending(false)
    }, GREETING_TYPING_DELAY_MS)

    introTimerRef.current = timer
    return () => {
      window.clearTimeout(timer)
      if (introTimerRef.current === timer) introTimerRef.current = null
      setIntroPending(false)
    }
  }, [open, messages.length, refreshKey])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, pending, introPending, open])

  async function requestAssistantResponse(history: ChatMessage[]) {
    const chatSession = chatSessionRef.current
    setPending(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages(history), memory }),
      })
      const data = await response.json().catch(() => ({})) as ChatResponse

      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed.')
      }

      const answer = data.message?.trim()
      if (!answer) {
        throw new Error('The chat model returned an empty answer.')
      }

      if (chatSession !== chatSessionRef.current) return
      if (data.memory) setMemory(data.memory)
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: 'assistant',
          content: answer,
          expression: normalizeExpression(data.expression),
          expressionIntensity: data.expressionIntensity,
        },
      ])
    } catch {
      if (chatSession !== chatSessionRef.current) return
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: 'assistant',
          content: SLEEPING_FAILURE_MESSAGE,
          expression: 'sleeping',
          expressionIntensity: 0.45,
          failed: true,
        },
      ])
    } finally {
      if (chatSession === chatSessionRef.current) setPending(false)
    }
  }

  function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (pending) return

    const content = draft.trim()
    if (!content) return

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content,
    }
    const baseMessages = messages.filter((message) => !message.failed)
    const nextMessages = [
      ...(introPending && baseMessages.length === 0 ? [createGreetingMessage()] : baseMessages),
      userMessage,
    ]

    clearIntroTimer()
    setIntroPending(false)
    setMessages(nextMessages)
    setDraft('')
    void requestAssistantResponse(nextMessages)
  }

  function handleRetry(failedMessageId: string) {
    if (pending) return
    const nextMessages = messages.filter((message) => message.id !== failedMessageId && !message.failed)
    if (!nextMessages.some((message) => message.role === 'user')) return

    setMessages(nextMessages)
    void requestAssistantResponse(nextMessages)
  }

  function handleRefreshChat() {
    chatSessionRef.current += 1
    clearIntroTimer()
    setMessages([])
    setDraft('')
    setPending(false)
    setIntroPending(false)
    setInfoOpen(false)
    setMemory(EMPTY_MEMORY)
    setRefreshKey((current) => current + 1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    handleSubmit()
  }

  const preview = latestPreview(messages)
  const currentExpression = latestExpression(messages)

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-0 top-0 z-[1000] flex items-stretch justify-center bg-black/45 sm:items-center sm:p-4"
          style={{
            height: 'var(--momotalk-viewport-height, 100dvh)',
            top: 'var(--momotalk-viewport-top, 0px)',
          }}
        >
          <section
            role="dialog"
            aria-label="MomoTalk chat with Plana"
            className="momotalk-dialog relative h-full w-full overflow-hidden text-[#2a323e] sm:h-[min(82dvh,760px)] sm:max-w-[1080px] sm:rounded-[10px]"
          >
            <div className="momotalk-open-curtain" aria-hidden>
              <div className="momotalk-open-brand">
                <MomoTalkIcon className="h-[74px] w-[74px] rounded-[18px] object-cover sm:h-[82px] sm:w-[82px]" />
                <div className="text-[30px] font-black leading-none tracking-normal text-white sm:text-[38px]">MomoTalk</div>
              </div>
            </div>

            <div className="momotalk-chat-shell flex h-full w-full flex-col bg-white">
              <header className="flex h-[58px] shrink-0 items-center justify-between bg-[#fc96ab] px-4 text-white sm:h-[64px] sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <MomoTalkIcon className="h-8 w-8 rounded-[7px] object-cover" />
                  <div className="truncate text-[28px] font-black leading-none sm:text-[34px]">MomoTalk</div>
                  <button
                    type="button"
                    onClick={() => setInfoOpen(true)}
                    aria-label="About Plana AI"
                    className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-white text-[22px] font-black leading-none text-[#fc96ab] shadow-sm transition-colors hover:bg-[#fff4f7] focus:outline-none focus:ring-2 focus:ring-white/75"
                  >
                    ?
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close MomoTalk"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  <CloseIcon />
                </button>
              </header>

              <div className="flex min-h-0 flex-1">
                <aside className="flex w-[54px] shrink-0 flex-col bg-[#4b5a6f] sm:w-[72px]">
                  <div className="flex h-[96px] items-center justify-center bg-[#56667d] text-white sm:h-[112px]">
                    <PersonIcon className="opacity-95" />
                  </div>
                  <div className="relative flex h-[86px] items-center justify-center bg-[#68788f] text-white sm:h-[100px]">
                    <ChatIcon />
                  </div>
                  <div className="flex-1" />
                </aside>

                <aside className="hidden w-[310px] shrink-0 flex-col border-r border-[#cdd3dc] bg-[#f3f7f8] md:flex">
                  <div className="flex h-[72px] shrink-0 items-center gap-2 border-b border-[#dce5ec] px-5">
                    <div className="min-w-0 flex-1 whitespace-nowrap text-[18px] font-black leading-tight text-[#2a323e]">Unread Messages (0)</div>
                    <button
                      type="button"
                      onClick={handleRefreshChat}
                      className="h-10 min-w-[78px] skew-x-[-12deg] rounded-[5px] border border-[#dce5ec] bg-white px-3 text-[15px] font-semibold text-[#4b5a6f] shadow-sm transition-colors hover:bg-[#e1e7ec] focus:outline-none focus:ring-2 focus:ring-[#4a8ac6]/35"
                    >
                      <span className="inline-block skew-x-[12deg]">Refresh</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-[#dce5ec] bg-[#e1e7ec] px-5 py-3 text-left transition-colors hover:bg-[#d7e1ea]"
                  >
                    <PlanaAvatar expression={currentExpression} sizeClass="h-16 w-16" className="border border-[#dce5ec]" />
                    <span className="min-w-0 self-center">
                      <span className="block truncate text-[24px] font-black leading-7 text-[#2a323e]">Plana</span>
                      <span className="block truncate text-[18px] font-semibold leading-6 text-[#87929e]">{preview}</span>
                    </span>
                  </button>
                </aside>

                <main className="flex min-w-0 flex-1 flex-col bg-white">
                  <div className="flex h-[56px] shrink-0 items-center border-b border-[#e1e7ec] px-4 md:hidden">
                    <PlanaAvatar expression={currentExpression} sizeClass="h-10 w-10" className="border border-[#dce5ec]" />
                    <div className="ml-3 min-w-0">
                      <div className="truncate text-lg font-black leading-6 text-[#2a323e]">Plana</div>
                    </div>
                  </div>

                  <div className="scrollbar-hidden flex-1 overflow-y-auto py-4">
                    {introPending && messages.length === 0 && <PlanaTypingBubble />}

                    {messages.map((message) => (
                      message.role === 'user'
                        ? <SenseiBubble key={message.id} content={message.content} />
                        : (
                          <PlanaBubble
                            key={message.id}
                            content={message.content}
                            expression={message.expression || DEFAULT_EXPRESSION}
                            failed={message.failed}
                            onRetry={message.failed ? () => handleRetry(message.id) : undefined}
                          />
                        )
                    ))}

                    {pending && <PlanaTypingBubble />}

                    <div ref={scrollRef} />
                  </div>

                  <form onSubmit={handleSubmit} className="shrink-0 border-t border-[#dce5ec] bg-[#eeeeee] px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={inputRef}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        maxLength={MAX_MESSAGE_LENGTH}
                        placeholder="Aa"
                        aria-label="Message Plana"
                        className="max-h-28 min-h-10 flex-1 resize-none rounded-full border-2 border-[#dce5ec] bg-white px-4 py-2 text-[16px] font-semibold leading-5 text-[#2a323e] outline-none transition-colors placeholder:text-[#9e9ea7] focus:border-[#ffb342]"
                      />
                      <button
                        type="submit"
                        disabled={pending || !draft.trim()}
                        aria-label="Send message"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4a8ac6] text-white shadow-sm transition-colors hover:bg-[#3f7bb3] focus:outline-none focus:ring-2 focus:ring-[#4a8ac6]/45 disabled:cursor-not-allowed disabled:bg-[#bdbdbd]"
                      >
                        <SendIcon />
                      </button>
                    </div>
                  </form>
                </main>
              </div>
            </div>

            {infoOpen && (
              <div
                className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 p-4"
                onClick={() => setInfoOpen(false)}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="About Plana AI"
                  className="w-full max-w-[430px] overflow-hidden rounded-[8px] bg-white text-[#2a323e] shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="flex items-center justify-between bg-[#fc96ab] px-4 py-3 text-white">
                    <div className="text-xl font-black leading-none">About Plana</div>
                    <button
                      type="button"
                      onClick={() => setInfoOpen(false)}
                      aria-label="Close about Plana AI"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] text-white transition-colors hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="space-y-3 px-4 py-4 text-sm font-semibold leading-6 text-[#4b5a6f] sm:text-base">
                    <p>
                      Plana is a Fan-made chatbot experience for Stratónas. It does not represent, replace, or speak for the actual Blue Archive character.
                    </p>
                    <p>
                      Responses are generated through multiple free AI models, so wording, accuracy, and personality can vary between messages.
                    </p>
                    <p>
                      Chat messages are sent to the configured AI provider only to generate replies. Stratónas does not use these conversations to represent official character canon, and chat memory is kept only as lightweight context for the current conversation.
                    </p>
                    <p>
                      Please do not share important private information, passwords, access tokens, financial details, or anything sensitive with the AI.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {!open && (
        <div className="fixed bottom-5 left-4 z-30 sm:left-5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open MomoTalk"
            aria-expanded={open}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#fc96ab]/60 bg-[#fc96ab] p-1.5 text-white shadow-[0_12px_34px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#fc96ab]/50 focus:ring-offset-2 focus:ring-offset-bg"
          >
            <MomoTalkIcon className="h-11 w-11 rounded-full object-cover" />
          </button>
        </div>
      )}
    </>
  )
}
