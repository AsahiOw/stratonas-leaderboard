'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { applyPlayerIdentity, PLAYER_IDENTITY_STORAGE_KEY, PLAYER_IDENTITY_TTL_MS, readPlayerIdentity, type SavedPlayerIdentity } from '@/lib/player-identity-cache'

type IdentityUpdate = Pick<SavedPlayerIdentity, 'playerId' | 'ign' | 'favouriteStudentData'>
const Context = createContext<{ saved: SavedPlayerIdentity | null; remember: (identity: IdentityUpdate) => void }>({ saved: null, remember: () => {} })

export function PlayerIdentityProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const userId = session?.user?.id
  const [saved, setSaved] = useState<SavedPlayerIdentity | null>(null)
  useEffect(() => {
    if (status === 'loading') return
    function load() {
      try {
        if (!userId) { localStorage.removeItem(PLAYER_IDENTITY_STORAGE_KEY); setSaved(null); return }
        setSaved(readPlayerIdentity(localStorage.getItem(PLAYER_IDENTITY_STORAGE_KEY), userId))
      } catch { setSaved(null) }
    }
    load()
    const changed = (event: StorageEvent) => { if (event.key === PLAYER_IDENTITY_STORAGE_KEY || event.key === null) load() }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [userId, status])
  const remember = useCallback((identity: IdentityUpdate) => {
    if (!userId || status !== 'authenticated') return
    const next = { ...identity, userId, expiresAt: Date.now() + PLAYER_IDENTITY_TTL_MS }
    try { localStorage.setItem(PLAYER_IDENTITY_STORAGE_KEY, JSON.stringify(next)) } catch { /* Same-tab updates still work without persistent storage. */ }
    setSaved(next)
  }, [userId, status])
  const visible = status === 'authenticated' && saved?.userId === userId ? saved : null
  const value = useMemo(() => ({ saved: visible, remember }), [visible, remember])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export const usePlayerIdentityCache = () => useContext(Context)

export function useLocalPlayerData<T>(data: T): T {
  const { saved } = useContext(Context)
  // Keep an already-rendered snapshot stable; new data/navigation checks expiry.
  return useMemo(() => applyPlayerIdentity(data, saved), [data, saved])
}

export function LocalPlayerName({ playerId, name }: { playerId?: string; name: string }) {
  const player = useLocalPlayerData(useMemo(() => ({ playerId, name }), [playerId, name]))
  return <>{player.name}</>
}
