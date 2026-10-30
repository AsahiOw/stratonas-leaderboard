import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AccountProfile } from '@/components/AccountProfile'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return <AccountProfile />
}
