/** Validación cliente para confirmar pedido (CRUD transaccional vía POST /api/ventas). */
export type OrderFormValues = {
  nombre: string
  telefono: string
  email: string
  notas: string
}

export type OrderFormErrors = Partial<Record<keyof OrderFormValues, string>>

const phoneRe = /^[\d\s+()-]{8,}$/
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateOrderForm(v: OrderFormValues): OrderFormErrors {
  const e: OrderFormErrors = {}
  const nombre = v.nombre.trim()
  if (nombre.length < 2) e.nombre = 'Indica al menos 2 caracteres para el nombre.'
  if (nombre.length > 120) e.nombre = 'El nombre es demasiado largo.'

  const tel = v.telefono.trim()
  if (!phoneRe.test(tel)) e.telefono = 'Teléfono inválido (mín. 8 dígitos, puede incluir +, espacios o guiones).'

  const mail = v.email.trim()
  if (mail && !emailRe.test(mail)) e.email = 'Correo electrónico no válido.'

  if (v.notas.length > 500) e.notas = 'Máximo 500 caracteres en notas.'

  return e
}

export function orderFormHasErrors(err: OrderFormErrors) {
  return Object.keys(err).length > 0
}
