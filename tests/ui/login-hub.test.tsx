import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

beforeAll(async () => {
  await jest.unstable_mockModule('#/lib/auth-client', () => ({
    authClient: {
      signIn: { email: jest.fn(), social: jest.fn() },
      signUp: { email: jest.fn() },
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
  }))
})

describe('LoginHub (UI)', () => {
  beforeEach(() => {
    window.scrollTo = jest.fn()
  })

  it('renderiza el hub de acceso con cliente y personal', async () => {
    const { LoginHub } = await import('#/components/login-page')

    const rootRoute = createRootRoute()
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'login',
      component: LoginHub,
    })
    const routeTree = rootRoute.addChildren([loginRoute])

    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/login'] }),
      scrollRestoration: false,
    })

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /acceso al sistema/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: /^cliente$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /personal de caja/i })).toBeInTheDocument()
  })
})
