import { createFileRoute } from '@tanstack/react-router'

import { json, mapProductoApi } from '#/lib/api/http'
import { requireAuthAndPermission } from '#/lib/api/guard'
import { withSessionDbRole } from '#/lib/api/with-db-role'
import { cloudinaryConfigured, resolveImageMime, uploadImageBuffer } from '#/lib/cloudinary-upload'
import * as db from '#/lib/db'
import { isUuid } from '#/lib/is-uuid'

export const Route = createFileRoute('/api/upload/imagen')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const gate = await requireAuthAndPermission(request, 'catalog:upload')
        if ('response' in gate) return gate.response
        const user = gate.user
        if (!cloudinaryConfigured()) return json({ error: 'Cloudinary no está configurado (falta CLOUDINARY_URL válida en el servidor)' }, 503)

        let form: FormData
        try {
          form = await request.formData()
        } catch {
          return json({ error: 'Cuerpo multipart inválido' }, 400)
        }
        const file = form.get('file')
        const idProductoRaw = form.get('id_producto')
        if (!(file instanceof File)) {
          return json({ error: 'Falta el campo de archivo "file"' }, 400)
        }
        const mime = resolveImageMime(file)
        const buf = Buffer.from(await file.arrayBuffer())
        let secure_url: string
        let public_id: string
        try {
          const up = await uploadImageBuffer(buf, mime)
          secure_url = up.secure_url
          public_id = up.public_id
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : 'Error al subir' }, 400)
        }

        return withSessionDbRole(user, async () => {
          let producto: ReturnType<typeof mapProductoApi> | undefined
          if (typeof idProductoRaw === 'string' && idProductoRaw.trim()) {
            const id = idProductoRaw.trim()
            if (isUuid(id)) {
              const row = await db.updateProducto(id, { imagen_url: secure_url })
              if (row) {
                const full = await db.getProductoEnriquecido(id)
                if (full) producto = mapProductoApi(full as never)
              }
            }
          }

          return json({ url: secure_url, public_id, producto })
        })
      },
    },
  },
})
