import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { backfillMemorialVideoAssets } from '../src/lib/memorial-media-sync'

async function main() {
  const count = await backfillMemorialVideoAssets()
  console.log(`Backfilled ${count.toLocaleString()} memorial video asset records.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
