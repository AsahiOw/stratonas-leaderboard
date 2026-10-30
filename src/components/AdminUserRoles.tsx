'use client'

import { useEffect, useState } from 'react'
import { inputClass } from '@/components/ui/StField'

interface RoleUser {
  id: string; name: string | null; email: string | null; role: 'ADMIN' | 'MANAGER' | 'VIEWER'
  accounts: { providerAccountId: string }[]
  player: { id: string; ign: string } | null
}

export function AdminUserRoles() {
  const [users, setUsers] = useState<RoleUser[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [changedUser, setChangedUser] = useState<string | null>(null)

  useEffect(() => {
    if (!saving && changedUser) document.getElementById(`role-user-${changedUser}`)?.focus()
  }, [users, saving, changedUser])

  useEffect(() => {
    fetch('/api/admin/user-roles', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Could not load users. Administrator access is required.')
      setUsers(await response.json())
    }).catch((error: Error) => setError(error.message))
  }, [])

  async function changeRole(user: RoleUser) {
    const role = user.role === 'MANAGER' ? 'VIEWER' : 'MANAGER'
    setSaving(user.id)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/user-roles', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, role }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not update role.')
      setChangedUser(user.id)
      setUsers((current) => current?.map((item) => item.id === user.id ? { ...item, role } : item) || null)
      setMessage(`${user.name || user.email || 'User'} is now ${role === 'MANAGER' ? 'a manager' : 'a viewer'}.`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not update role.') }
    finally { setSaving(null) }
  }

  const query = search.trim().toLowerCase()
  const filtered = users?.filter((user) => [user.name, user.email, user.role, user.player?.ign, ...user.accounts.map((account) => account.providerAccountId)].some((value) => value?.toLowerCase().includes(query)))
  return <section>
    <h2 className="text-lg font-bold">User roles</h2>
    <p className="mt-2 text-sm text-muted2">Managers can manage all dashboard data. Only administrators can change user roles.</p>
    <label className="mt-5 block"><span className="sr-only">Search users</span><input className={inputClass} type="search" placeholder="Search by name, IGN, Discord ID, or role…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
    {message && <p role="status" className="mt-4 text-sm text-green-400">{message}</p>}
    {!users && !error && <p className="mt-5 text-muted2">Loading users…</p>}
    <div className="mt-6 space-y-7">
      {users && ([['MANAGER', 'Managers'], ['VIEWER', 'Users'], ['ADMIN', 'Administrators']] as const).map(([role, label]) => {
        const group = filtered?.filter(user => user.role === role) || []
        return <section key={role} aria-label={label}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">{label}<span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted2">{group.length}</span></h3>
          <div className="space-y-3">
            {group.map((user) => <div key={user.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <div className="break-words font-semibold">{user.name || user.email || 'Discord member'}</div>
                {user.player && <div className="mt-1 text-muted2">IGN: {user.player.ign}</div>}
                <div className="mt-1 break-all text-xs text-muted">{user.accounts[0] ? `Discord ID: ${user.accounts[0].providerAccountId}` : user.email || 'Legacy account'}</div>
                <div className="mt-2 text-xs font-semibold text-accent">{user.role === 'VIEWER' ? 'Viewer' : user.role === 'MANAGER' ? 'Manager' : 'Administrator'}</div>
              </div>
              {user.role !== 'ADMIN' && <button id={`role-user-${user.id}`} disabled={saving !== null} onClick={() => changeRole(user)} className="shrink-0 rounded-lg border border-border2 px-4 py-2 text-sm hover:bg-card2 disabled:opacity-50">{saving === user.id ? 'Saving…' : user.role === 'MANAGER' ? 'Remove manager role' : 'Promote to manager'}</button>}
            </div>)}
            {group.length === 0 && <p className="text-sm text-muted2">{query ? 'No matching users in this group.' : `No ${label.toLowerCase()} yet.`}</p>}
          </div>
        </section>
      })}
    </div>
  </section>
}
