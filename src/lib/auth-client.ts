import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { getAuthClientBaseUrl } from '#/lib/auth-base-url'
import type { auth } from '#/lib/auth'

export const authClient = createAuthClient({
  baseURL: getAuthClientBaseUrl(),
  plugins: [inferAdditionalFields<typeof auth>()],
})
