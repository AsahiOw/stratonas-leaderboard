'use client'
import { useEffect, useState } from 'react'

type Tab = 'leaderboard' | 'previous' | 'stats' | 'community' | 'admin'
type ServerFilter = 'all' | 'global' | 'jp'

interface Props {
  tab: Tab
  setTab: (t: Tab) => void
  loggedIn: boolean
  onLoginClick: () => void
  serverFilter: ServerFilter
  setServerFilter: (s: ServerFilter) => void
  previousRaidCount: number
}

export function Navbar({
  tab, setTab, loggedIn, onLoginClick,
  serverFilter, setServerFilter, previousRaidCount,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  const tabs = [
    { id: 'leaderboard' as Tab, label: 'Leaderboard' },
    { id: 'previous' as Tab, label: 'Previous Raids' },
    { id: 'stats' as Tab, label: 'Statistic' },
    { id: 'community' as Tab, label: 'Community' },
    ...(loggedIn ? [{ id: 'admin' as Tab, label: 'Admin' }] : []),
  ]

  const showFilter = tab === 'leaderboard' || tab === 'previous'

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [menuOpen])

  function handleTabSelect(t: Tab) {
    setTab(t)
    setMenuOpen(false)
  }

  function handleLogin() {
    onLoginClick()
    setMenuOpen(false)
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[rgba(13,13,19,0.94)] backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14">
          {/* Logo */}
          <button
            type="button"
            onClick={() => {
              setTab('leaderboard')
              setMenuOpen(false)
            }}
            className="flex items-center gap-2.5 shrink-0 rounded-md bg-transparent p-0 text-left text-text transition-colors hover:text-accent"
            aria-label="Go to leaderboard home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/icons/icon.gif"
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
            <span className="font-bold text-lg tracking-tight">Stratonas</span>
          </button>

          {/* Desktop tabs */}
          <div className="hidden md:flex items-center gap-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-md px-3.5 py-1.5 text-sm transition-colors inline-flex items-center gap-1.5 ${tab === t.id
                    ? 'bg-accent/[0.12] text-accent font-semibold'
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

          {/* Desktop right controls */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {showFilter && (
              <div className="flex gap-0.5 bg-card border border-border rounded-lg p-[3px]">
                {(['all', 'global', 'jp'] as ServerFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setServerFilter(s)}
                    className={`rounded px-2.5 py-1 text-xs uppercase tracking-[0.05em] transition-colors ${serverFilter === s
                        ? 'bg-border2 text-text font-semibold'
                        : 'text-muted hover:text-text'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
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

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-card text-muted2 hover:text-text hover:border-border2 transition-colors"
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

        {/* Mobile slide-down panel */}
        <div
          className={`md:hidden overflow-hidden border-t border-border transition-[max-height,opacity] duration-200 ease-out ${menuOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
          <div className="px-4 py-4 flex flex-col gap-2 bg-[rgba(13,13,19,0.98)]">
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

            {showFilter && (
              <div className="mt-2">
                <div className="text-[10px] font-bold text-muted tracking-[0.12em] mb-1.5 px-1">SERVER FILTER</div>
                <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
                  {(['all', 'global', 'jp'] as ServerFilter[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setServerFilter(s)}
                      className={`flex-1 rounded-md py-2 text-xs uppercase tracking-[0.05em] transition-colors ${serverFilter === s
                          ? 'bg-border2 text-text font-semibold'
                          : 'text-muted hover:text-text'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
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
          className="md:hidden fixed inset-0 top-14 z-40 bg-black/40"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}
