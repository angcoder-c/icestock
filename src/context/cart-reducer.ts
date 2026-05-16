export type CartLine = {
  productId: string
  name: string
  unitPrice: number
  qty: number
  imagen_url?: string | null
}

export type CartState = {
  lines: CartLine[]
  drawerOpen: boolean
}

export type CartAction =
  | { type: 'ADD'; product: { id: string; nombre: string; precio: number; imagen_url?: string | null }; qty: number }
  | { type: 'REMOVE'; productId: string }
  | { type: 'SET_QTY'; productId: string; qty: number }
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'CLEAR' }

export const initialCartState: CartState = { lines: [], drawerOpen: false }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const { product, qty } = action
      if (qty < 1) return state
      const i = state.lines.findIndex((l) => l.productId === product.id)
      const lines = [...state.lines]
      if (i >= 0) lines[i] = { ...lines[i], qty: lines[i].qty + qty }
      else
        lines.push({
          productId: product.id,
          name: product.nombre,
          unitPrice: product.precio,
          qty,
          imagen_url: product.imagen_url ?? null,
        })
      return { lines, drawerOpen: true }
    }
    case 'REMOVE':
      return {
        ...state,
        lines: state.lines.filter((l) => l.productId !== action.productId),
      }
    case 'SET_QTY': {
      const q = Math.max(0, Math.floor(action.qty))
      if (q === 0) return { ...state, lines: state.lines.filter((l) => l.productId !== action.productId) }
      return {
        ...state,
        lines: state.lines.map((l) => (l.productId === action.productId ? { ...l, qty: q } : l)),
      }
    }
    case 'TOGGLE_DRAWER':
      return { ...state, drawerOpen: !state.drawerOpen }
    case 'OPEN_DRAWER':
      return { ...state, drawerOpen: true }
    case 'CLOSE_DRAWER':
      return { ...state, drawerOpen: false }
    case 'CLEAR':
      return { ...state, lines: [], drawerOpen: false }
    default:
      return state
  }
}
