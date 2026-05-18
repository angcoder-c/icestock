import type { SessionUser } from '#/lib/api/session'

/** Roles de aplicación (`user.rol`), alineados con `db/roles.sql`. */
export const APP_ROLES = ['cliente', 'cajero', 'analista', 'admin', 'superadmin'] as const

export type AppRol = (typeof APP_ROLES)[number]

/** Capacidades HTTP de la API (capa aplicación; PostgreSQL aplica `SET LOCAL ROLE`). */
export const PERMISSIONS = [
  'meta:dashboard',
  'catalog:read_public',
  'catalog:read',
  'catalog:write',
  'catalog:upload',
  'clients:me',
  'clients:read',
  'clients:write',
  'sales:read',
  'sales:create_pos',
  'sales:create_self',
  'sales:void',
  'reports:read',
  'staff:read',
  'staff:write',
  'staff:invite',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<AppRol, ReadonlySet<Permission>> = {
  cliente: new Set([
    'catalog:read_public',
    'catalog:read',
    'clients:me',
    'sales:create_self',
  ]),
  cajero: new Set([
    'catalog:read_public',
    'catalog:read',
    'clients:read',
    'clients:write',
    'sales:read',
    'sales:create_pos',
  ]),
  analista: new Set([
    'catalog:read_public',
    'catalog:read',
    'clients:read',
    'sales:read',
    'reports:read',
    'meta:dashboard',
  ]),
  admin: new Set([
    'catalog:read_public',
    'catalog:read',
    'catalog:write',
    'catalog:upload',
    'clients:read',
    'clients:write',
    'sales:read',
    'sales:create_pos',
    'sales:void',
    'reports:read',
    'staff:read',
    'staff:write',
    'meta:dashboard',
  ]),
  superadmin: new Set([
    'catalog:read_public',
    'catalog:read',
    'catalog:write',
    'catalog:upload',
    'clients:read',
    'clients:write',
    'sales:read',
    'sales:create_pos',
    'sales:create_self',
    'sales:void',
    'reports:read',
    'staff:read',
    'staff:write',
    'staff:invite',
    'meta:dashboard',
  ]),
}

const PERMISSION_LABELS: Record<Permission, string> = {
  'meta:dashboard': 'panel de resumen (/api/)',
  'catalog:read_public': 'catálogo público (productos activos sin sesión)',
  'catalog:read': 'consultar catálogo, categorías y proveedores',
  'catalog:write': 'crear/editar/eliminar catálogo',
  'catalog:upload': 'subir imágenes de producto',
  'clients:me': 'perfil y compras propias (/api/clientes/me)',
  'clients:read': 'listar y ver clientes',
  'clients:write': 'crear/editar/eliminar clientes',
  'sales:read': 'listar y ver detalle de ventas',
  'sales:create_pos': 'registrar venta en POS (con vendedor)',
  'sales:create_self': 'comprar en tienda en línea',
  'sales:void': 'anular ventas y restaurar stock',
  'reports:read': 'reportes analíticos',
  'staff:read': 'listar personal',
  'staff:write': 'alta, edición y baja de personal',
  'staff:invite': 'invitar personal (reservado superadmin)',
}

/** Roles que un actor puede asignar al crear/editar cuentas de personal. */
export const ASSIGNABLE_STAFF_ROLES: Record<AppRol, readonly AppRol[]> = {
  cliente: [],
  cajero: [],
  analista: [],
  admin: ['cajero', 'admin'],
  superadmin: ['cajero', 'analista', 'admin', 'superadmin'],
}

export function isAppRol(value: string | undefined | null): value is AppRol {
  return !!value && (APP_ROLES as readonly string[]).includes(value)
}

export function normalizeAppRol(user: SessionUser | null | undefined): AppRol | null {
  return isAppRol(user?.rol) ? user.rol : null
}

export function can(user: SessionUser | null | undefined, permission: Permission): boolean {
  const rol = normalizeAppRol(user)
  if (!rol) return false
  return ROLE_PERMISSIONS[rol].has(permission)
}

export function canAny(user: SessionUser | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(user, p))
}

export function forbiddenMessage(permission: Permission): string {
  return `Sin permiso: ${PERMISSION_LABELS[permission]}`
}

/** Matriz rol → permisos (para documentación y tests). */
export function permissionsMatrix(): Record<AppRol, Permission[]> {
  return Object.fromEntries(
    APP_ROLES.map((rol) => [rol, [...ROLE_PERMISSIONS[rol]]]),
  ) as Record<AppRol, Permission[]>
}

export function assignableStaffRoles(actor: SessionUser | null | undefined): readonly AppRol[] {
  const rol = normalizeAppRol(actor)
  if (!rol) return []
  return ASSIGNABLE_STAFF_ROLES[rol]
}

/** Alta de personal: sin `rol` en body → `cajero`. */
export function resolveStaffRolForCreate(
  actor: SessionUser,
  requested: string | undefined,
): AppRol | null {
  const raw = requested?.trim()
  const target = raw === '' || raw === undefined ? 'cajero' : raw
  const allowed = assignableStaffRoles(actor)
  return isAppRol(target) && allowed.includes(target) ? target : null
}

/** Edición: `undefined` = no cambiar rol; valor inválido → `null`. */
export function resolveStaffRolForUpdate(
  actor: SessionUser,
  requested: string | undefined,
): AppRol | null | undefined {
  if (requested === undefined) return undefined
  const raw = requested.trim()
  if (raw === '') return null
  const allowed = assignableStaffRoles(actor)
  return isAppRol(raw) && allowed.includes(raw) ? raw : null
}
