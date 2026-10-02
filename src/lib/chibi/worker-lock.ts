import { Pool, type PoolClient } from 'pg'

export const CHIBI_WORKER_LOCK = 724310001

export async function acquireWorkerLock(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required.')
  const pool = new Pool({ connectionString, max: 1 })
  const client = await pool.connect()
  const lost = new Promise<never>((_, reject) => client.once('error', error => reject(new Error(`Chibi advisory-lock connection was lost: ${error.message}`, { cause: error }))))
  const result = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [CHIBI_WORKER_LOCK])
  if (!result.rows[0]?.locked) {
    client.release()
    await pool.end()
    return null
  }
  return {
    async release() {
      try { await client.query('SELECT pg_advisory_unlock($1)', [CHIBI_WORKER_LOCK]) }
      finally { client.release(); await pool.end() }
    },
    client: client as PoolClient,
    lost,
  }
}
