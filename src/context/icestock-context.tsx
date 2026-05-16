import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react'

import { authClient } from '#/lib/auth-client'
import { cartReducer, initialCartState, type CartAction, type CartState } from '#/context/cart-reducer'

type IcestockContextValue = {
  cart: CartState
  dispatchCart: React.Dispatch<CartAction>
  addToCart: (product: { id: string; nombre: string; precio: number; imagen_url?: string | null }, qty?: number) => void
  removeFromCart: (productId: string) => void
  setLineQty: (productId: string, qty: number) => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  clearCart: () => void
  cartItemCount: number
  cartSubtotal: number
  session: { user: { id: string; name: string; email: string; rol?: string } } | null
  sessionPending: boolean
  signOut: () => Promise<void>
}

const IcestockContext = createContext<IcestockContextValue | null>(null)

export function IcestockProvider({ children }: { children: ReactNode }) {
  const [cart, dispatchCart] = useReducer(cartReducer, initialCartState)
  const { data: session, isPending: sessionPending } = authClient.useSession()

  const addToCart = useCallback((product: { id: string; nombre: string; precio: number; imagen_url?: string | null }, qty = 1) => {
    dispatchCart({ type: 'ADD', product, qty })
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    dispatchCart({ type: 'REMOVE', productId })
  }, [])

  const setLineQty = useCallback((productId: string, qty: number) => {
    dispatchCart({ type: 'SET_QTY', productId, qty })
  }, [])

  const toggleCart = useCallback(() => {
    dispatchCart({ type: 'TOGGLE_DRAWER' })
  }, [])

  const openCart = useCallback(() => {
    dispatchCart({ type: 'OPEN_DRAWER' })
  }, [])

  const closeCart = useCallback(() => {
    dispatchCart({ type: 'CLOSE_DRAWER' })
  }, [])

  const clearCart = useCallback(() => {
    dispatchCart({ type: 'CLEAR' })
  }, [])

  const { cartItemCount, cartSubtotal } = useMemo(() => {
    const cartItemCount = cart.lines.reduce((n, l) => n + l.qty, 0)
    const cartSubtotal = cart.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
    return { cartItemCount, cartSubtotal }
  }, [cart.lines])

  const signOut = useCallback(async () => {
    await authClient.signOut()
    dispatchCart({ type: 'CLEAR' })
  }, [])

  const value = useMemo<IcestockContextValue>(
    () => ({
      cart,
      dispatchCart,
      addToCart,
      removeFromCart,
      setLineQty,
      toggleCart,
      openCart,
      closeCart,
      clearCart,
      cartItemCount,
      cartSubtotal,
      session,
      sessionPending,
      signOut,
    }),
    [
      cart,
      addToCart,
      removeFromCart,
      setLineQty,
      toggleCart,
      openCart,
      closeCart,
      clearCart,
      cartItemCount,
      cartSubtotal,
      session,
      sessionPending,
      signOut,
    ],
  )

  return <IcestockContext.Provider value={value}>{children}</IcestockContext.Provider>
}

export function useIcestock() {
  const ctx = useContext(IcestockContext)
  if (!ctx) throw new Error('useIcestock debe usarse dentro de IcestockProvider')
  return ctx
}
