import dotenv from 'dotenv'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Pool } from 'pg'

import { getAuthBaseUrl } from '#/lib/auth-base-url'
import { pgPoolConfig } from '#/lib/pg-config'

dotenv.config()

const authBaseUrl = getAuthBaseUrl()
const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', authBaseUrl]

const extraOrigins =
  process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? []

export const auth = betterAuth({
  baseURL: authBaseUrl,
  secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? 'dev-secret-change-me',
  trustedOrigins: [...new Set([...defaultOrigins, ...extraOrigins])],
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
          if (raw && raw !== 'cliente') {
            throw new Error(
              'El registro público solo está disponible para clientes de la tienda. El personal debe ser dado de alta por un administrador.',
            )
          }
          return { data: { ...user, rol: 'cliente' } }
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
})