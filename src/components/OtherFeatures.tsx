'use client'

import { ArrowUpRight } from 'lucide-react'

type FeatureTab = 'community' | 'calendar' | 'raid' | 'custom-card'

interface Props {
  onSelect: (tab: FeatureTab) => void
}

const features: {
  tab: FeatureTab
  title: string
  description: string
  image: string
}[] = [
    {
      tab: 'community',
      title: 'Community',
      description: 'Explore Stratónas clubs, members, and player profiles.',
      image: '/assets/others/community.jpg',
    },
    {
      tab: 'calendar',
      title: 'Calendar',
      description: 'View upcoming recruitments and student birthdays.',
      image: '/assets/others/calendar.jpg',
    },
    {
      tab: 'raid',
      title: 'Raid Data',
      description: 'Browse history raids and team compositions.',
      image: '/assets/others/raid-data.jpg',
    },
    {
      tab: 'custom-card',
      title: 'Stratónas Custom Card',
      description: 'Create your own custom card Stratónas ranking style.',
      image: '/assets/others/custom-card.jpg',
    }
  ]

export function OtherFeatures({ onSelect }: Props) {
  return (
    <section className="view-transition pt-7">
      <div className="mb-5">
        <div className="mb-1.5 text-[11px] font-bold tracking-[0.14em] text-muted">◈ EXPLORE MORE</div>
        <h1 className="text-xl font-bold tracking-[-0.02em] sm:text-2xl">Other Features</h1>
        <p className="mt-1.5 text-[13px] text-muted2">
          Everything else available across the Stratónas hub.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <button
            key={feature.tab}
            type="button"
            onClick={() => onSelect(feature.tab)}
            className="group relative min-h-[280px] overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_14px_35px_rgba(0,0,0,0.2)] outline-none transition duration-300 hover:-translate-y-1 hover:border-border2 hover:shadow-[0_20px_45px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-accent/70 md:aspect-[4/5]"
            aria-label={`Open ${feature.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={feature.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
            <span
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(13,13,19,0.05)_20%,rgba(13,13,19,0.3)_52%,rgba(13,13,19,0.96)_100%)]"
              aria-hidden="true"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
              <span>
                <span className="block text-xl font-bold tracking-[-0.02em] text-white">{feature.title}</span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-white/75">{feature.description}</span>
              </span>
              <span className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white transition group-hover:border-accent/60 group-hover:bg-accent group-hover:text-white">
                <ArrowUpRight size={17} aria-hidden="true" />
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
