'use client'

import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { loginAssetSources, loginExpressions, loginSprite, type LoginCharacter, type LoginSceneState } from '@/lib/login-sprites'

type FieldFocus = 'email' | 'password' | null
const KEI_ANGRY_DURATION = 800

interface CharacterSpriteProps {
  character: LoginCharacter
  expression: string
  className: string
}

function CharacterSprite({ character, expression, className }: CharacterSpriteProps) {
  return (
    // Sprite swapping uses browser-preloaded source files instead of image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={loginSprite(character, expression)}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
    />
  )
}

export function LoginScene() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [focus, setFocus] = useState<FieldFocus>(null)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  const [keiAngry, setKeiAngry] = useState(false)

  useEffect(() => {
    loginAssetSources.forEach((source) => {
      const image = new Image()
      image.src = source
    })
  }, [])

  useEffect(() => {
    if (!keiAngry) return

    const timeout = window.setTimeout(() => setKeiAngry(false), KEI_ANGRY_DURATION)
    return () => window.clearTimeout(timeout)
  }, [keiAngry])

  const state: LoginSceneState = failed
    ? 'failed'
    : passwordVisible
      ? 'passwordVisible'
      : focus === 'email'
        ? 'email'
        : focus === 'password'
          ? 'password'
          : 'default'
  const current = loginExpressions[state]

  function handleFieldFocus(field: Exclude<FieldFocus, null>) {
    setFocus(field)
    setFailed(false)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordVisible(false)
    setFocus(null)
    setFailed(false)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.ok) {
      router.replace('/')
    } else {
      setFailed(true)
    }
  }

  function handleKeiClick() {
    if (passwordVisible && !keiAngry) setKeiAngry(true)
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(79,142,247,0.16),transparent_36%),linear-gradient(145deg,#101321_0%,#0d0d13_58%,#171225_100%)] px-4 py-12">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        className="absolute left-5 top-5 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border2 bg-card/90 text-text shadow-[0_8px_22px_rgba(0,0,0,0.3)] transition-colors hover:bg-card2 focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <ArrowLeft size={17} aria-hidden="true" />
      </button>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:36px_36px]" />

        <button
          type="button"
          onClick={handleKeiClick}
          disabled={!passwordVisible || keiAngry}
          aria-label="Make Kei angry"
          className="pointer-events-auto absolute bottom-[-7rem] left-[-10rem] z-10 hidden border-0 bg-transparent p-0 text-left enabled:cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default min-[1245px]:block min-[1245px]:left-[max(0rem,calc(50%-42rem))]"
        >
          <span className={`relative block ${keiAngry ? 'animate-[kei-angry-jump_800ms_ease-in-out]' : ''}`}>
            <CharacterSprite
              character="kei"
              expression={keiAngry ? 'angry' : current.kei}
              className="block h-[50rem] max-w-none select-none"
            />
            {keiAngry && (
              // The effect is preloaded with the sprites and appears over Kei's head during the jump.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/images/angry-effect.png"
                alt=""
                aria-hidden="true"
                className="absolute left-[44%] top-[7%] h-24 w-24 -translate-x-1/2 select-none"
              />
            )}
          </span>
        </button>
        <CharacterSprite
          character="midori"
          expression={current.midori}
          className="absolute bottom-[-4rem] right-[-6rem] z-10 hidden h-[47rem] max-w-none select-none min-[1245px]:block min-[1245px]:right-[max(-1rem,calc(50%-42rem))]"
        />
        <CharacterSprite
          character="aris"
          expression={current.aris}
          className="absolute bottom-[-5rem] left-[max(1rem,calc(50%-30rem))] z-20 hidden h-[48rem] max-w-none select-none min-[873px]:block"
        />
        <CharacterSprite
          character="momoi"
          expression={current.momoi}
          className="absolute bottom-[-6rem] right-[max(-2rem,calc(50%-32rem))] z-20 hidden h-[49rem] max-w-none select-none min-[873px]:block"
        />
        <div
          className="absolute left-1/2 z-20 hidden h-[21rem] w-[26rem] -translate-x-1/2 overflow-hidden [@media(min-height:867px)]:block"
          style={{ top: 'max(2rem, calc(50% - 26rem))' }}
        >
          <CharacterSprite
            character="yuzu"
            expression={current.yuzu}
            className="absolute left-[calc(50%+2rem)] top-0 h-[49rem] max-w-none -translate-x-1/2 select-none"
          />
        </div>
      </div>

      <section className="relative z-30 w-full max-w-md rounded-2xl border border-border2/90 bg-card p-7 shadow-[0_24px_65px_rgba(0,0,0,0.48)] sm:p-8">
        <div className="mb-7 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Stratónas</p>
          <h1 className="mt-2 text-2xl font-bold text-text">Admin Login</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.07em] text-muted2">EMAIL</span>
            <input
              className="w-full rounded-lg border border-border2 bg-card2 px-3 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
              type="email"
              placeholder="admin@stratonas.gg"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={() => handleFieldFocus('email')}
              onBlur={() => setFocus(null)}
              required
              autoComplete="email"
            />
          </label>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.07em] text-muted2">PASSWORD</span>
            <span className="relative block">
              <input
                className="w-full rounded-lg border border-border2 bg-card2 px-3 py-2.5 pr-11 text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
                type={passwordVisible ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onFocus={() => handleFieldFocus('password')}
                onBlur={() => setFocus(null)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={passwordVisible}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => setPasswordVisible((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted2 transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
              >
                {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </span>
          </label>

          {failed && (
            <p className="mb-3 text-xs font-medium text-red" role="alert">
              Email or password is incorrect.
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-card"
          >
            Login
          </button>
        </form>
      </section>
    </main>
  )
}
