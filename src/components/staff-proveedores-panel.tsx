import { type FormEvent, useMemo, useState } from 'react'
import { Building2, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'

import {
  useCreateProveedorMutation,
  useDeleteProveedorMutation,
  useProveedoresQuery,
  useUpdateProveedorMutation,
  type ProveedorApi,
} from '#/hooks/use-icestock-api'
import { can } from '#/lib/api/permissions'
import type { SessionUser } from '#/lib/api/session'

type Props = {
  session: SessionUser
  enabled: boolean
  variant?: 'light' | 'dark'
}

type FormState = {
  nombre: string
  telefono: string
  email: string
  direccion: string
}

const emptyForm = (): FormState => ({ nombre: '', telefono: '', email: '', direccion: '' })

function fromProveedor(p: ProveedorApi): FormState {
  return {
    nombre: p.nombre,
    telefono: p.telefono ?? '',
    email: p.email ?? '',
    direccion: p.direccion ?? '',
  }
}

export function StaffProveedoresPanel({ session, enabled, variant = 'light' }: Props) {
  const isLight = variant === 'light'
  const q = useProveedoresQuery(enabled && can(session, 'catalog:read'))
  const createMut = useCreateProveedorMutation()
  const updateMut = useUpdateProveedorMutation()
  const deleteMut = useDeleteProveedorMutation()
  const canWrite = can(session, 'catalog:write')

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [err, setErr] = useState<string | null>(null)

  const rows = useMemo(() => {
    const list = q.data ?? []
    const qstr = search.trim().toLowerCase()
    if (!qstr) return list
    return list.filter(
      (p) =>
        p.nombre.toLowerCase().includes(qstr) ||
        (p.email?.toLowerCase().includes(qstr) ?? false) ||
        (p.telefono?.toLowerCase().includes(qstr) ?? false) ||
        (p.direccion?.toLowerCase().includes(qstr) ?? false),
    )
  }, [q.data, search])

  const panel = isLight ? 'rounded-2xl border border-slate-200 bg-white shadow-sm' : 'rounded-2xl border border-white/10 bg-slate-900 shadow-lg'
  const labelCls = isLight ? 'text-xs font-semibold uppercase text-slate-500' : 'text-xs font-semibold uppercase text-slate-400'
  const inputCls = isLight
    ? 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm'
    : 'mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white'
  const titleCls = isLight ? 'text-teal-900' : 'text-white'
  const mutedCls = isLight ? 'text-slate-600' : 'text-slate-400'
  const btnPrimary = isLight ? 'bg-teal-800 hover:bg-teal-900' : 'bg-violet-600 hover:bg-violet-500'

  const bodyPayload = () => ({
    nombre: form.nombre.trim(),
    telefono: form.telefono.trim() || null,
    email: form.email.trim() || null,
    direccion: form.direccion.trim() || null,
  })

  const resetForm = () => {
    setForm(emptyForm())
    setErr(null)
    setShowCreate(false)
    setEditingId(null)
  }

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!form.nombre.trim()) {
      setErr('El nombre es obligatorio')
      return
    }
    try {
      await createMut.mutateAsync(bodyPayload())
      resetForm()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo crear el proveedor')
    }
  }

  const onUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    setErr(null)
    if (!form.nombre.trim()) {
      setErr('El nombre es obligatorio')
      return
    }
    try {
      await updateMut.mutateAsync({ id: editingId, ...bodyPayload() })
      resetForm()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo actualizar')
    }
  }

  const onDelete = async (p: ProveedorApi) => {
    if (!window.confirm(`¿Eliminar el proveedor «${p.nombre}»? No se puede si tiene productos asociados.`)) return
    setErr(null)
    try {
      await deleteMut.mutateAsync(p.id)
      if (editingId === p.id) resetForm()
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo eliminar')
    }
  }

  const formFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">
        <span className={labelCls}>Nombre *</span>
        <input
          value={form.nombre}
          onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
          required
          className={inputCls}
        />
      </label>
      <label className="block text-sm">
        <span className={labelCls}>Correo</span>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className={inputCls}
        />
      </label>
      <label className="block text-sm">
        <span className={labelCls}>Teléfono</span>
        <input
          value={form.telefono}
          onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
          className={inputCls}
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className={labelCls}>Dirección</span>
        <input
          value={form.direccion}
          onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
          className={inputCls}
        />
      </label>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={`font-[family-name:var(--font-heading)] text-2xl font-bold ${titleCls}`}>Proveedores</h1>
          <p className={`text-sm ${mutedCls}`}>
            {canWrite ? 'Alta, edición y baja de proveedores del catálogo.' : 'Listado de proveedores (solo lectura).'}
          </p>
        </div>
        {canWrite && !editingId && (
          <button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v)
              setEditingId(null)
              setForm(emptyForm())
              setErr(null)
            }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ${btnPrimary}`}
          >
            <Plus className="h-4 w-4" />
            Nuevo proveedor
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o teléfono…"
          className={inputCls.replace('mt-1 ', '')}
        />
      </div>

      {showCreate && canWrite && !editingId && (
        <form onSubmit={(e) => void onCreate(e)} className={`${panel} space-y-4 p-6`}>
          <p className={`text-sm font-semibold ${titleCls}`}>Nuevo proveedor</p>
          {formFields}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className={`rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-50 ${btnPrimary}`}
            >
              {createMut.isPending ? 'Guardando…' : 'Crear proveedor'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {editingId && canWrite && (
        <form onSubmit={(e) => void onUpdate(e)} className={`${panel} space-y-4 p-6 ring-2 ${isLight ? 'ring-teal-200' : 'ring-violet-500/40'}`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${titleCls}`}>Editar proveedor</p>
            <button type="button" onClick={resetForm} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
          {formFields}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={updateMut.isPending}
              className={`rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-50 ${btnPrimary}`}
            >
              {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className={`overflow-hidden ${panel}`}>
        {q.isLoading ? (
          <p className={`flex items-center gap-2 p-6 text-sm ${mutedCls}`}>
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </p>
        ) : rows.length === 0 ? (
          <p className={`flex items-center gap-2 p-8 text-sm ${mutedCls}`}>
            <Building2 className="h-5 w-5 opacity-50" />
            {search.trim() ? 'Sin resultados para la búsqueda.' : 'No hay proveedores registrados.'}
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className={isLight ? 'bg-slate-50 text-xs uppercase text-slate-500' : 'border-b border-slate-800 bg-slate-800/50 text-xs uppercase text-slate-400'}>
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Dirección</th>
                {canWrite && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className={
                    editingId === p.id
                      ? isLight
                        ? 'bg-teal-50/80'
                        : 'bg-violet-500/10'
                      : isLight
                        ? 'border-t border-slate-100'
                        : 'border-t border-slate-800'
                  }
                >
                  <td className={`px-4 py-3 font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.nombre}</td>
                  <td className={`px-4 py-3 ${mutedCls}`}>{p.email ?? '—'}</td>
                  <td className={`px-4 py-3 ${mutedCls}`}>{p.telefono ?? '—'}</td>
                  <td className={`max-w-[200px] truncate px-4 py-3 ${mutedCls}`} title={p.direccion ?? undefined}>
                    {p.direccion ?? '—'}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() => {
                          setEditingId(p.id)
                          setForm(fromProveedor(p))
                          setShowCreate(false)
                          setErr(null)
                        }}
                        className={`inline-flex rounded-lg p-2 ${isLight ? 'text-teal-800 hover:bg-teal-50' : 'text-violet-400 hover:bg-violet-500/10'}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        disabled={deleteMut.isPending}
                        onClick={() => void onDelete(p)}
                        className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!showCreate && !editingId && err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  )
}
