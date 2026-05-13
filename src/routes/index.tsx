import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

type DashboardPayload = {
  vistaVentas: Array<Record<string, unknown>>
  joins: {
    ventasJoin: Array<Record<string, unknown>>
    productosJoin: Array<Record<string, unknown>>
    detalleJoin: Array<Record<string, unknown>>
  }
  subqueries: {
    clientesSubquery: Array<Record<string, unknown>>
    productosSinVentasSubquery: Array<Record<string, unknown>>
  }
  aggregates: Array<Record<string, unknown>>
  cte: Array<Record<string, unknown>>
}

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [txMessage, setTxMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/')
      const json = (await response.json()) as { ok: boolean; data?: DashboardPayload; error?: string }

      if (!response.ok || !json.ok || !json.data) {
        throw new Error(json.error ?? 'No se pudo cargar dashboard')
      }

      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const registrarVentaDemo = async () => {
    setTxMessage('Registrando venta con transacción...')

    try {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'usr_emp_002',
          id_cliente: 1,
          items: [
            { id_producto: 1, cantidad: 1 },
            { id_producto: 2, cantidad: 2 },
          ],
        }),
      })

      const json = (await response.json()) as {
        ok: boolean
        result?: { ventaId: number; total: number }
        error?: string
      }

      if (!response.ok || !json.ok || !json.result) {
        throw new Error(json.error ?? 'La transacción falló y se hizo rollback')
      }

      setTxMessage(`Venta ${json.result.ventaId} registrada. Total: Q${json.result.total}`)
      await loadDashboard()
    } catch (err) {
      setTxMessage(err instanceof Error ? err.message : 'Error transaccional')
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard SQL (ORM + UI)</h1>

      <div className="flex gap-3">
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => void loadDashboard()}>
          Recargar consultas
        </button>
        <button className="px-3 py-2 rounded bg-green-700 text-white" onClick={() => void registrarVentaDemo()}>
          Registrar venta demo (BEGIN/COMMIT/ROLLBACK)
        </button>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {txMessage && <p className="text-emerald-700">{txMessage}</p>}

      <Section title="VIEW usada por backend: vista_ventas_completa">
        <JsonPreview rows={data?.vistaVentas ?? []} />
      </Section>

      <Section title="JOIN #1: Venta + Cliente + User + DetalleVenta">
        <JsonPreview rows={data?.joins.ventasJoin ?? []} />
      </Section>

      <Section title="JOIN #2: Producto + Categoria + Proveedor">
        <JsonPreview rows={data?.joins.productosJoin ?? []} />
      </Section>

      <Section title="JOIN #3: DetalleVenta + Producto + Categoria">
        <JsonPreview rows={data?.joins.detalleJoin ?? []} />
      </Section>

      <Section title="Subquery #1 (IN): clientes con compras altas">
        <JsonPreview rows={data?.subqueries.clientesSubquery ?? []} />
      </Section>

      <Section title="Subquery #2 (NOT EXISTS): productos sin ventas">
        <JsonPreview rows={data?.subqueries.productosSinVentasSubquery ?? []} />
      </Section>

      <Section title="GROUP BY + HAVING + agregaciones por categoria">
        <JsonPreview rows={data?.aggregates ?? []} />
      </Section>

      <Section title="CTE (WITH): ranking de productos vendidos">
        <JsonPreview rows={data?.cte ?? []} />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded p-4">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </section>
  )
}

function JsonPreview({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-600">Sin resultados</p>
  }

  return (
    <pre className="overflow-x-auto text-xs bg-gray-50 p-3 rounded">
      {JSON.stringify(rows.slice(0, 10), null, 2)}
    </pre>
  )
}
