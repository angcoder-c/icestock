import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('OpenAPI spec', () => {
  it('parses and exposes core REST paths', () => {
    const raw = readFileSync(join(process.cwd(), 'public', 'openapi.json'), 'utf8')
    const spec = JSON.parse(raw) as { openapi: string; paths: Record<string, unknown> }

    expect(spec.openapi).toMatch(/^3\./)
    expect(spec.info.description).toMatch(/JSON/)
    expect(spec.info.description).toMatch(/204/)
    const paths = Object.keys(spec.paths)
    expect(paths).toContain('/api/productos')
    expect(paths).toContain('/api/productos/{id}')
    expect(paths).toContain('/api/ventas')
    expect(paths).toContain('/api/ventas/{id}')
    expect(paths).toContain('/api/clientes')
    expect(paths).toContain('/api/reportes/ventas-del-dia')
    expect(paths).toContain('/api/reportes/stock-disponible')
    expect(paths).toContain('/api/reportes/clientes-frecuentes')
    expect(paths).toContain('/api/upload/imagen')
    expect(paths).toContain('/api/setup/status')
    expect(paths).toContain('/api/setup/bootstrap')
    expect(paths).toContain('/api/auth/sign-in/email')

    const empleadosPost = spec.paths['/api/empleados']?.post as {
      'x-icestock-permission'?: string
    }
    expect(empleadosPost?.['x-icestock-permission']).toBe('staff:invite')
  })
})
