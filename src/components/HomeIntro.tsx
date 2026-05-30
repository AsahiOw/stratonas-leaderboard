const featureItems = [
  {
    label: 'Latest rankings',
    text: 'See the most recent raid submission from Stratónas discord server.',
  },
  {
    label: 'Top 50 cards',
    text: 'Top 50 stratonas local ranking and their respective student representative.',
  },
  {
    label: 'Profiles and clubs',
    text: 'Check out player profile and club.',
  },
]

interface HomeIntroProps {
  open: boolean
  onClose: () => void
}

export function HomeIntro({ open, onClose }: HomeIntroProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity,transform,margin] duration-300 ease-out ${open
          ? 'mt-5 grid-rows-[1fr] translate-y-0 opacity-100'
          : 'mt-0 grid-rows-[0fr] -translate-y-2 opacity-0 pointer-events-none'
        }`}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
          <div className="relative min-h-[112px] border-b border-border bg-bg">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-55"
              style={{ backgroundImage: 'url(/assets/images/banner.gif)' }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,13,19,0.95),rgba(13,13,19,0.74)_52%,rgba(13,13,19,0.88))]" />
            <div className="relative flex min-h-[112px] items-center gap-4 px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={onClose}
                disabled={!open}
                tabIndex={open ? 0 : -1}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-black/30 text-muted2 transition-colors hover:border-border2 hover:text-text disabled:pointer-events-none"
                aria-label="Close welcome introduction"
              >
                x
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/icons/icon.gif"
                alt=""
                className="hidden h-14 w-14 shrink-0 rounded-full border border-accent/30 object-cover shadow-[0_0_24px_rgba(79,142,247,0.18)] sm:block"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  Glad you are here
                </div>
                <h1 className="text-2xl font-bold leading-tight tracking-[-0.02em] text-text sm:text-3xl">
                  Welcome to Stratónas Leaderboard.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted2">
                  This is the community home for raid results, player highlights, club pages, and season history. Start with the latest boards, or wander through the archive at your own pace.
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {featureItems.map((item) => (
                <div key={item.label} className="border-l border-border2 pl-3">
                  <div className="text-sm font-bold text-text">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-muted2">{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
