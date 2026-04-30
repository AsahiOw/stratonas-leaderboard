'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { StModal } from '@/components/ui/StModal'
import { StField, inputStyle } from '@/components/ui/StField'

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
            style={inputStyle}
            type="email"
            placeholder="admin@stratonas.gg"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErr('') }}
            required
          />
        </StField>
        <StField label="PASSWORD" span2>
          <input
            style={inputStyle}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErr('') }}
            required
          />
        </StField>
        {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{err}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', background: 'var(--accent)', border: 'none', borderRadius: 8,
            padding: 12, color: '#fff', fontWeight: 700, fontSize: 14,
            cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>
          Demo: admin@stratonas.gg / admin123
        </div>
      </form>
    </StModal>
  )
}
