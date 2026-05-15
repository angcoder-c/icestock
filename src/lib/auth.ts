import dotenv from 'dotenv'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Pool } from 'pg'

dotenv.config()

const dbUser = process.env.DB_USER ?? process.env.VITE_DB_USER ?? 'postgres'
const dbPassword = process.env.DB_PASSWORD ?? process.env.VITE_DB_PASSWORD ?? 'postgres'
const dbHost = process.env.DB_HOST ?? process.env.VITE_DB_HOST ?? 'localhost'
const dbName = process.env.DB_NAME ?? process.env.VITE_DB_NAME ?? 'icestock'
const dbPort = Number(process.env.DB_PORT ?? process.env.VITE_DB_PORT ?? 5432)

const connectionString =
  process.env.VITE_DATABASE_URL ??
  process.env.DATABASE_URL ??
  `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? 'dev-secret-change-me',
  database: new Pool({
    connectionString,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      rol: {
        type: 'string',
        defaultValue: 'cajero',
      },
    },
  },
  plugins: [tanstackStartCookies()],
})