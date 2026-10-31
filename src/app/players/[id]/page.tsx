import { PublicPlayerProfile } from '@/components/PublicPlayerProfile'

export const dynamic = 'force-dynamic'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PublicPlayerProfile playerId={id} />
}
