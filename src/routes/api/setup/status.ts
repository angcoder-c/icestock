import { createFileRoute } from '@tanstack/react-router'

import { json } from '#/lib/api/http'
import { runWithoutDbRole } from '#/lib/api/with-db-role'
import * as db from '#/lib/db'
import { DEMO_ACCOUNTS, DEMO_PASSWORD_HINT } from '#/lib/setup-demo'

export const Route = createFileRoute('/api/setup/status')({
  server: {
    handlers: {
      GET: async () => {
        const status = await runWithoutDbRole(() => db.getSetupStatus())
        return json({
          ...status,
          demoAccounts: DEMO_ACCOUNTS,
          demoPasswordHint: DEMO_PASSWORD_HINT,
        })
      },
    },
  },
})
