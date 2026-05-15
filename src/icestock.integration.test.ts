/// <reference types="vitest/globals" />
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'

import { cartReducer, initialCartState } from '#/context/cart-reducer'
import { useProductosQuery } from '#/hooks/use-icestock-api'
import { orderFormHasErrors, validateOrderForm } from '#/validation/order-form'

describe('cartReducer (estado complejo)', () => {
  it('agrega líneas y acumula cantidad del mismo producto', () => {
    let s = initialCartState
    s = cartReducer(s, { type: 'ADD', product: { id: 1, nombre: 'Mango', precio: 15 }, qty: 2 })
    expect(s.lines).toHaveLength(1)
    expect(s.lines[0].qty).toBe(2)
    expect(s.drawerOpen).toBe(true)
    s = cartReducer(s, { type: 'ADD', product: { id: 1, nombre: 'Mango', precio: 15 }, qty: 1 })
    expect(s.lines[0].qty).toBe(3)
  })

  it('elimina y limpia', () => {
    let s = cartReducer(initialCartState, { type: 'ADD', product: { id: 2, nombre: 'Fresa', precio: 10 }, qty: 1 })
    s = cartReducer(s, { type: 'REMOVE', productId: 2 })
    expect(s.lines).toHaveLength(0)
    s = cartReducer(s, { type: 'ADD', product: { id: 3, nombre: 'Coco', precio: 12 }, qty: 1 })
    s = cartReducer(s, { type: 'CLEAR' })
    expect(s.lines).toHaveLength(0)
    expect(s.drawerOpen).toBe(false)
  })
})

describe('validateOrderForm (formulario controlado CRUD pedido)', () => {
  it('detecta errores típicos', () => {
    const bad = validateOrderForm({ nombre: 'A', telefono: '123', email: 'no', notas: 'x'.repeat(501) })
    expect(orderFormHasErrors(bad)).toBe(true)
    expect(bad.nombre).toBeDefined()
    expect(bad.telefono).toBeDefined()
    expect(bad.email).toBeDefined()
    expect(bad.notas).toBeDefined()
  })

  it('acepta datos válidos', () => {
    const ok = validateOrderForm({
      nombre: 'María Pérez',
      telefono: '+502 5500-0001',
      email: '',
      notas: 'Sin nueces',
    })
    expect(orderFormHasErrors(ok)).toBe(false)
  })
})

describe('integración TanStack Query + fetch', () => {
  it('useProductosQuery obtiene JSON cuando el API responde 200', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const sample = [
      {
        id: 1,
        nombre: 'Test',
        descripcion: null,
        precio: '10.00',
        stock: 5,
        activo: true,
        imagen_url: null,
        categoria: { id: 1, nombre: 'Paleta' },
        proveedor: { id: 1, nombre: 'Prov' },
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(sample),
        } as Response),
      ),
    )

    const { result } = renderHook(() => useProductosQuery('', null, true), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: qc }, children),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].nombre).toBe('Test')

    vi.unstubAllGlobals()
  })
})
