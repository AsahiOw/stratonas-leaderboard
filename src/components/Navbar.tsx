'use client'
import { useEffect, useRef, useState } from 'react'
import { lockBodyScroll } from '@/lib/body-scroll-lock'

type Tab = 'leaderboard' | 'previous' | 'stats' | 'community' | 'admin'
type ServerFilter = 'all' | 'global' | 'jp'
type Indicator = { left: number; width: number }

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
  loggedIn: boolean
  onLoginClick: () => void
  introOpen?: boolean
  onIntroToggle?: () => void
  serverFilter: ServerFilter
  setServerFilter: (s: ServerFilter) => void
  previousRaidCount: number
}

export function Navbar({
  tab, setTab, loggedIn, onLoginClick,
  introOpen = false, onIntroToggle, serverFilter, setServerFilter, previousRaidCount,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [navIndicator, setNavIndicator] = useState<Indicator | null>(null)
  const [showNavIndicator, setShowNavIndicator] = useState(false)
  const [serverIndicator, setServerIndicator] = useState<Indicator | null>(null)
  const navRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const navIndicatorTimerRef = useRef<number | null>(null)
  const serverRefs = useRef<Record<ServerFilter, HTMLButtonElement | null>>({
    all: null,
    global: null,
    jp: null,
  })

  const tabs = [
    { id: 'leaderboard' as Tab, label: 'Leaderboard' },
    { id: 'previous' as Tab, label: 'History' },
    { id: 'stats' as Tab, label: 'Statistic' },
    { id: 'community' as Tab, label: 'Community' },
    ...(loggedIn ? [{ id: 'admin' as Tab, label: 'Admin' }] : []),
  ]

  const showFilter = tab === 'leaderboard' || tab === 'previous'
  const servers: ServerFilter[] = ['all', 'global', 'jp']

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return
    return lockBodyScroll()
  }, [menuOpen])

  useEffect(() => {
    function updateIndicator() {
      if (!showNavIndicator) {
        const activeTab = navRefs.current[tab]
        if (activeTab) {
          setNavIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth })
        }
      }

      const activeServer = serverRefs.current[serverFilter]
      if (activeServer) {
        setServerIndicator({ left: activeServer.offsetLeft, width: activeServer.offsetWidth })
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => {
      window.removeEventListener('resize', updateIndicator)
      if (navIndicatorTimerRef.current !== null) window.clearTimeout(navIndicatorTimerRef.current)
    }
  }, [tab, serverFilter, loggedIn, previousRaidCount, showNavIndicator])

  function handleTabSelect(t: Tab) {
    setTab(t)
    setMenuOpen(false)
  }

  function handleDesktopTabSelect(nextTab: Tab) {
    const currentTab = navRefs.current[tab]
    const nextTabNode = navRefs.current[nextTab]

    if (currentTab && nextTabNode) {
      setNavIndicator({ left: currentTab.offsetLeft, width: currentTab.offsetWidth })
      setShowNavIndicator(true)

      window.requestAnimationFrame(() => {
        setNavIndicator({ left: nextTabNode.offsetLeft, width: nextTabNode.offsetWidth })
      })

      if (navIndicatorTimerRef.current !== null) window.clearTimeout(navIndicatorTimerRef.current)
      navIndicatorTimerRef.current = window.setTimeout(() => setShowNavIndicator(false), 560)
    }

    setTab(nextTab)
  }

  function handleLogin() {
    onLoginClick()
    setMenuOpen(false)
  }

  function handleIntroToggle() {
    onIntroToggle?.()
    setMenuOpen(false)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[rgba(13,13,19,0.94)] backdrop-blur-md border-b border-border">
        <div className="relative flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          {/* Logo */}
          <button
            type="button"
            onClick={() => {
              setTab('leaderboard')
              setMenuOpen(false)
            }}
            className="relative z-10 flex shrink-0 items-center gap-2.5 rounded-md bg-transparent p-0 text-left text-text transition-colors hover:text-accent"
            aria-label="Go to leaderboard home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/icons/icon.gif"
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
            <span className="font-bold text-lg tracking-tight">Stratónas</span>
          </button>

          {/* Desktop tabs */}
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center md:flex">
            <div className="relative flex items-center gap-0.5">
              {navIndicator && (
                <span
                  className={`absolute inset-y-0 rounded-md bg-accent/[0.12] transition-[left,width,opacity,transform] duration-300 ease-out ${
                    showNavIndicator ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                  }`}
                  style={{ left: navIndicator.left, width: navIndicator.width }}
                  aria-hidden="true"
                />
              )}
            {tabs.map((t) => (
              <button
                key={t.id}
                ref={(node) => { navRefs.current[t.id] = node }}
                onClick={(event) => {
                  handleDesktopTabSelect(t.id)
                  event.currentTarget.blur()
                }}
                className={`relative z-10 inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm outline-none transition-colors duration-200 focus-visible:ring-1 focus-visible:ring-accent/45 ${tab === t.id
                  ? 'text-accent font-semibold'
                  : 'text-muted2 hover:text-text hover:bg-white/5'
                  }`}
              >
                {t.label}
                {t.id === 'previous' && (
                  <span className="text-[10px] font-mono text-muted bg-card border border-border rounded px-1.5 py-px">
                    {previousRaidCount}
                  </span>
                )}
              </button>
            ))}
            </div>
          </div>

          {/* Desktop right controls */}
          <div className="relative z-10 ml-auto hidden items-center gap-2.5 shrink-0 [@media(min-width:1280px)]:flex">
            {onIntroToggle && (
              <button
                type="button"
                onClick={handleIntroToggle}
                className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  introOpen
                    ? 'border-accent/30 bg-accent/[0.12] text-accent'
                    : 'border-border bg-card text-muted2 hover:border-border2 hover:text-text'
                }`}
                aria-pressed={introOpen}
              >
                Welcome!
              </button>
            )}
            <div className={`overflow-hidden transition-[max-width,opacity,transform] duration-[250ms] ease-out ${
              showFilter ? 'max-w-[180px] scale-100 opacity-100' : 'max-w-0 scale-95 opacity-0 pointer-events-none'
            }`}>
              <div className="relative flex gap-0.5 bg-card border border-border rounded-lg p-[3px]">
                {serverIndicator && (
                  <span
                    className="absolute inset-y-[3px] rounded bg-border2 transition-[left,width] duration-300 ease-out"
                    style={{ left: serverIndicator.left, width: serverIndicator.width }}
                    aria-hidden="true"
                  />
                )}
                {servers.map((s) => (
                  <button
                    key={s}
                    ref={(node) => { serverRefs.current[s] = node }}
                    onClick={() => setServerFilter(s)}
                    className={`relative z-10 rounded px-2.5 py-1 text-xs uppercase tracking-[0.05em] transition-colors duration-200 ${serverFilter === s
                      ? 'text-text font-semibold'
                      : 'text-muted hover:text-text'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={onLoginClick}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold border transition-colors ${loggedIn
                ? 'bg-red/[0.12] text-red border-red/30 hover:bg-red/20'
                : 'bg-accent/[0.12] text-accent border-accent/30 hover:bg-accent/20'
                }`}
            >
              {loggedIn ? '→ Logout' : '⊙ Admin Login'}
            </button>
          </div>

          {/* Responsive overflow menu */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card text-muted2 hover:text-text hover:border-border2 transition-colors [@media(min-width:1280px)]:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile and tablet overflow panel */}
        <div
          className={`border-t border-border transition-[max-height,opacity] duration-200 ease-out [@media(min-width:1280px)]:hidden ${
            menuOpen
              ? 'scrollbar-hidden max-h-[80vh] opacity-100 overflow-y-auto overscroll-contain'
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="px-4 py-4 flex flex-col gap-2 bg-[rgba(13,13,19,0.98)]">
            <div className="flex flex-col gap-2 md:hidden">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTabSelect(t.id)}
                  className={`w-full inline-flex items-center justify-between rounded-lg px-4 min-h-11 text-sm transition-colors ${tab === t.id
                    ? 'bg-accent/15 text-accent font-semibold border border-accent/30'
                    : 'text-muted2 bg-card border border-border'
                    }`}
                >
                  <span>{t.label}</span>
                  {t.id === 'previous' && (
                    <span className="text-[10px] font-mono text-muted bg-bg border border-border rounded px-1.5 py-px">
                      {previousRaidCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-[250ms] ease-out ${
              showFilter ? 'mt-2 max-h-24 scale-100 opacity-100' : 'max-h-0 scale-95 opacity-0 pointer-events-none'
            }`}>
                <div className="text-[10px] font-bold text-muted tracking-[0.12em] mb-1.5 px-1">SERVER FILTER</div>
                <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
                  {servers.map((s) => (
                    <button
                      key={s}
                      onClick={() => setServerFilter(s)}
                      className={`flex-1 rounded-md py-2 text-xs uppercase tracking-[0.05em] transition-colors duration-200 ${serverFilter === s
                        ? 'bg-border2 text-text font-semibold'
                        : 'text-muted hover:text-text'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

            {onIntroToggle && (
              <button
                type="button"
                onClick={handleIntroToggle}
                className={`mt-2 w-full rounded-lg border min-h-11 px-4 text-sm font-semibold transition-colors ${
                  introOpen
                    ? 'border-accent/30 bg-accent/15 text-accent'
                    : 'border-border bg-card text-muted2 hover:border-border2 hover:text-text'
                }`}
                aria-pressed={introOpen}
              >
                Welcome!
              </button>
            )}

            <button
              onClick={handleLogin}
              className={`mt-2 w-full rounded-lg min-h-11 px-4 text-sm font-semibold border transition-colors ${loggedIn
                ? 'bg-red/[0.12] text-red border-red/30'
                : 'bg-accent/[0.12] text-accent border-accent/30'
                }`}
            >
              {loggedIn ? '→ Logout' : '⊙ Admin Login'}
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop for mobile menu */}
      {menuOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 top-14 z-40 bg-black/40 [@media(min-width:1280px)]:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}
