import { LoginScene } from '@/components/LoginScene'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return <LoginScene oauthError={Boolean(error)} />
}
