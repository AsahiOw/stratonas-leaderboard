import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string | null
      name?: string | null
      image?: string | null
      role: 'ADMIN' | 'MANAGER' | 'VIEWER'
    }
  }

  interface User {
    role: 'ADMIN' | 'MANAGER' | 'VIEWER'
  }
}
