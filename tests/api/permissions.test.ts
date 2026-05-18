import { can, permissionsMatrix, resolveStaffRolForCreate } from '#/lib/api/permissions'
import type { SessionUser } from '#/lib/api/session'

function user(rol: string): SessionUser {
  return { id: 'u1', name: 'Test', email: 't@test.com', rol }
}

describe('permissions matrix', () => {
  it('cliente puede comprar pero no anular ventas', () => {
    expect(can(user('cliente'), 'sales:create_self')).toBe(true)
    expect(can(user('cliente'), 'sales:void')).toBe(false)
    expect(can(user('cliente'), 'clients:me')).toBe(true)
  })

  it('cajero puede POS y clientes, no reportes ni catálogo write', () => {
    expect(can(user('cajero'), 'sales:create_pos')).toBe(true)
    expect(can(user('cajero'), 'clients:write')).toBe(true)
    expect(can(user('cajero'), 'reports:read')).toBe(false)
    expect(can(user('cajero'), 'catalog:write')).toBe(false)
  })

  it('analista lee reportes sin escribir catálogo', () => {
    expect(can(user('analista'), 'reports:read')).toBe(true)
    expect(can(user('analista'), 'catalog:write')).toBe(false)
    expect(can(user('analista'), 'clients:write')).toBe(false)
  })

  it('admin y superadmin gestionan personal', () => {
    expect(can(user('admin'), 'staff:write')).toBe(true)
    expect(can(user('superadmin'), 'staff:read')).toBe(true)
    expect(can(user('superadmin'), 'staff:invite')).toBe(true)
    expect(can(user('admin'), 'staff:invite')).toBe(false)
  })

  it('roles asignables al crear empleado', () => {
    expect(resolveStaffRolForCreate(user('admin'), undefined)).toBe('cajero')
    expect(resolveStaffRolForCreate(user('admin'), 'analista')).toBeNull()
    expect(resolveStaffRolForCreate(user('superadmin'), 'analista')).toBe('analista')
  })

  it('matriz exportada tiene los cinco roles', () => {
    const m = permissionsMatrix()
    expect(Object.keys(m).sort()).toEqual(['admin', 'analista', 'cajero', 'cliente', 'superadmin'])
  })
})
