import dotenv from 'dotenv'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Pool } from 'pg'

import { pgPoolConfig } from '#/lib/pg-config'

dotenv.config()

const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? 'dev-secret-change-me',
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()) ?? defaultOrigins,
  database: new Pool(pgPoolConfig()),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      rol: {
        type: 'string',
        defaultValue: 'cliente',
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const raw = (user as { rol?: string }).rol
          const rol = raw === 'cajero' || raw === 'cliente' ? raw : 'cliente'
          return { data: { ...user, rol } }
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
})