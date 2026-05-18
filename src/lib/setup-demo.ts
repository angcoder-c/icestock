import type { AppRol } from '#/lib/api/permissions'
import { ROLE_LABELS } from '#/lib/auth/role-routes'

/** Cuentas precargadas en `db/schema.sql` (contraseña `secret`). */
export const DEMO_ACCOUNTS: { rol: AppRol; email: string; label: string }[] = [
  { rol: 'superadmin', email: 'superadmin@heladeria.com', label: ROLE_LABELS.superadmin },
  { rol: 'admin', email: 'admin@heladeria.com', label: ROLE_LABELS.admin },
  { rol: 'analista', email: 'analista@heladeria.com', label: ROLE_LABELS.analista },
  { rol: 'cajero', email: 'cajero@heladeria.com', label: ROLE_LABELS.cajero },
  { rol: 'cliente', email: 'cliente@heladeria.com', label: ROLE_LABELS.cliente },
]

export const DEMO_PASSWORD_HINT = 'secret'
