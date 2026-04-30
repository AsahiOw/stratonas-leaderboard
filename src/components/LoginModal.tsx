'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { StModal } from '@/components/ui/StModal'
import { StField, inputClass } from '@/components/ui/StField'

interface Props {
  onLogin: () => void
  onClose: () => void
}

export function LoginModal({ onLogin, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      onLogin()
    } else {
      setErr('Invalid credentials.')
    }
  }

  return (
    <StModal title="Admin Login" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <StField label="EMAIL" span2>
          <input
            className={inputClass}
            type="email"
            placeholder="admin@stratonas.gg"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErr('') }}
            required
            autoComplete="email"
          />
        </StField>
        <StField label="PASSWORD" span2>
          <input
            className={inputClass}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErr('') }}
            required
            autoComplete="current-password"
          />
        </StField>
        {err && (
          <div className="text-red text-xs mb-3">{err}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent rounded-lg py-3 text-white font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-70 disabled:cursor-default"
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
        <div className="text-[11px] text-muted text-center mt-3">
          Demo: admin@stratonas.gg / admin123
        </div>
      </form>
    </StModal>
  )
}
