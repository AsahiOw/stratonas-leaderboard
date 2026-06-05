'use client'

import { StModal } from '@/components/ui/StModal'

type CreditGroup = 'site' | 'kei'

interface Credit {
  label: string
  detail: string
  href: string
  group: CreditGroup
  initial: string
}

const credits: Credit[] = [
  { label: 'SchaleDB', detail: 'Game data & assets', href: 'https://schaledb.com/home', group: 'site', initial: 'S' },
  { label: 'Jaymie', detail: 'L2D Animation', href: 'https://www.youtube.com/@JaymieArclight/videos', group: 'site', initial: 'J' },
  { label: 'MiiverseI', detail: 'Kei animation', href: 'https://x.com/MiiverseI', group: 'kei', initial: 'M' },
  { label: 'Fish Audio', detail: 'Kei voice', href: 'https://fish.audio/app/', group: 'kei', initial: 'F' },
]

const groups: { id: CreditGroup; title: string; description: string }[] = [
  { id: 'site', title: 'Leaderboard', description: 'Data and community resources that power the site.' },
  { id: 'kei', title: 'Kei greeting', description: 'Animation and voice that bring her welcome to life.' },
]

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export function CreditModal({ onClose }: { onClose: () => void }) {
  return (
    <StModal title="Credits" onClose={onClose} wide>
      <div className="space-y-6">
        <p className="text-sm leading-6 text-muted2">
          Stratónas Leaderboard is built with help from these creators and projects.
        </p>

        {groups.map((group) => {
          const items = credits.filter((c) => c.group === group.id)
          const isKei = group.id === 'kei'

          return (
            <section key={group.id}>
              <div className="mb-3">
                <div className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isKei ? 'text-accent' : 'text-muted'}`}>
                  {group.title}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted2">{group.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {items.map((credit) => (
                  <a
                    key={credit.href}
                    href={credit.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative overflow-hidden rounded-xl border px-4 py-3.5 transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-px ${
                      isKei
                        ? 'border-accent/20 bg-accent/[0.06] hover:border-accent/35 hover:bg-accent/[0.1] hover:shadow-[0_8px_24px_rgba(79,142,247,0.12)]'
                        : 'border-border bg-card hover:border-border2 hover:bg-card2 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${
                          isKei
                            ? 'border-accent/25 bg-accent/10 text-accent'
                            : 'border-border2 bg-bg text-muted2'
                        }`}
                      >
                        {credit.initial}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-text">{credit.label}</span>
                          <span className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100">
                            <ExternalIcon />
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs leading-5 text-muted2">{credit.detail}</div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </StModal>
  )
}
