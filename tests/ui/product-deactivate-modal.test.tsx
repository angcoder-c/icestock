import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import { ProductDeactivateModal, ProductInactiveBadge } from '#/components/product-deactivate-modal'

describe('ProductInactiveBadge (UI)', () => {
  it('muestra el texto Inactivo', () => {
    render(<ProductInactiveBadge variant="light" />)
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })
})

describe('ProductDeactivateModal (UI)', () => {
  it('muestra el producto y permite cancelar', () => {
    const onClose = jest.fn()
    const onConfirm = jest.fn()
    render(
      <ProductDeactivateModal
        product={{ id: 1, nombre: 'Helado prueba' }}
        onClose={onClose}
        onConfirm={onConfirm}
        isPending={false}
        variant="light"
      />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/helado prueba/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
