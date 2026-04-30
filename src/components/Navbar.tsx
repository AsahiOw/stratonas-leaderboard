'use client'

type Tab = 'leaderboard' | 'previous' | 'stats' | 'admin'
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

export function Navbar({ tab, setTab, loggedIn, onLoginClick, serverFilter, setServerFilter, previousRaidCount }: Props) {
  const tabs = [
    { id: 'leaderboard' as Tab, label: 'Leaderboard' },
    { id: 'previous' as Tab,    label: 'Previous Raids' },
    { id: 'stats' as Tab,       label: 'Stats' },
    ...(loggedIn ? [{ id: 'admin' as Tab, label: 'Admin' }] : []),
  ]

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(13,13,19,0.94)', backdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 58, gap: 16,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent2), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700, color: '#fff',
        }}>
          S
        </div>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>Stratonas</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
          background: 'rgba(79,142,247,0.15)', color: 'var(--accent)',
          border: '1px solid rgba(79,142,247,0.3)', letterSpacing: '0.08em', marginLeft: 2,
        }}>
          S3
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? 'rgba(79,142,247,0.12)' : 'none',
              border: 'none', borderRadius: 7, padding: '7px 15px',
              color: tab === t.id ? 'var(--accent)' : 'var(--muted2)',
              fontWeight: tab === t.id ? 600 : 400, fontSize: 14,
              cursor: 'pointer', fontFamily: 'var(--font), Space Grotesk, sans-serif',
              transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            {t.id === 'previous' && (
              <span style={{
                fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '1px 5px',
              }}>
                {previousRaidCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {(tab === 'leaderboard' || tab === 'previous') && (
          <div style={{
            display: 'flex', gap: 2, background: 'var(--card)',
            border: '1px solid var(--border)', borderRadius: 8, padding: 3,
          }}>
            {(['all', 'global', 'jp'] as ServerFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setServerFilter(s)}
                style={{
                  background: serverFilter === s ? 'var(--border2)' : 'none',
                  border: 'none', borderRadius: 5, padding: '5px 11px',
                  color: serverFilter === s ? 'var(--text)' : 'var(--muted)',
                  fontSize: 12, fontWeight: serverFilter === s ? 600 : 400,
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                  transition: 'all 0.15s',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={onLoginClick}
          style={{
            background: loggedIn ? 'rgba(248,113,113,0.12)' : 'rgba(79,142,247,0.12)',
            border: loggedIn ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(79,142,247,0.3)',
            borderRadius: 8, padding: '7px 16px',
            color: loggedIn ? 'var(--red)' : 'var(--accent)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {loggedIn ? '→ Logout' : '⊙ Admin Login'}
        </button>
      </div>
    </nav>
  )
}
