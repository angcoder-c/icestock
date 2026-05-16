import type { PoolConfig } from 'pg'

/** URL de PostgreSQL: Neon/producción suele usar solo `DATABASE_URL`. */
export function resolveDatabaseUrl(): string {
  const dbUser = process.env.DB_USER ?? process.env.VITE_DB_USER ?? 'postgres'
  const dbPassword = process.env.DB_PASSWORD ?? process.env.VITE_DB_PASSWORD ?? 'postgres'
  const dbHost = process.env.DB_HOST ?? process.env.VITE_DB_HOST ?? 'localhost'
  const dbName = process.env.DB_NAME ?? process.env.VITE_DB_NAME ?? 'icestock'
  const dbPort = Number(process.env.DB_PORT ?? process.env.VITE_DB_PORT ?? 5432)

  return (
    process.env.VITE_DATABASE_URL ??
    process.env.DATABASE_URL ??
    `postgres://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`
  )
}

/** Neon y otros hosts en la nube requieren TLS. */
export function pgPoolConfig(): PoolConfig {
  const connectionString = resolveDatabaseUrl()
  const needsSsl =
    process.env.PG_SSL === 'true' ||
    /neon\.tech|supabase\.co|sslmode=require/i.test(connectionString)

  return {
    connectionString,
    ...(needsSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  }
}
