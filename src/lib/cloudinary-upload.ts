import { config as loadDotenv } from 'dotenv'

const MAX_BYTES = 6 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

let dotenvTried = false
function ensureDotenv() {
  if (dotenvTried) return
  dotenvTried = true
  if (typeof process === 'undefined' || !process.cwd) return
  loadDotenv({ path: '.env' })
}

function cloudinaryUrlFromEnv(): string {
  ensureDotenv()
  return process.env.CLOUDINARY_URL?.trim() ?? ''
}

export function cloudinaryConfigured(): boolean {
  const u = cloudinaryUrlFromEnv()
  if (!u) return false
  return u.toLowerCase().startsWith('cloudinary://')
}

/** Si `file.type` viene vacío o como octet-stream, infiere MIME por extensión (p. ej. Windows). */
export function resolveImageMime(file: File): string {
  const t = (file.type || '').trim().toLowerCase()
  if (t && t !== 'application/octet-stream' && ALLOWED.has(t)) return t
  const name = file.name.toLowerCase()
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.gif')) return 'image/gif'
  return t || 'application/octet-stream'
}

export async function uploadImageBuffer(buffer: Buffer, mime: string): Promise<{ secure_url: string; public_id: string }> {
  if (!cloudinaryConfigured()) {
    throw new Error(
      'Cloudinary no está configurado: define CLOUDINARY_URL (formato cloudinary://API_KEY:API_SECRET@nombre_nube)',
    )
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('cloudinary')
  const cloudinary = mod.v2 ?? mod.default?.v2
  if (!cloudinary?.config || !cloudinary?.uploader?.upload) {
    throw new Error('No se pudo cargar el SDK de Cloudinary')
  }
  // El SDK lee process.env.CLOUDINARY_URL y rellena cloud_name, api_key y api_secret
  cloudinary.config(true)

  if (!ALLOWED.has(mime)) {
    throw new Error('Tipo de archivo no permitido (usa JPEG, PNG, WebP o GIF)')
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('Archivo demasiado grande (máx. 6 MB)')
  }
  const b64 = buffer.toString('base64')
  const dataUri = `data:${mime};base64,${b64}`
  const res = await cloudinary.uploader.upload(dataUri, {
    folder: 'icestock/productos',
    resource_type: 'image',
  })
  return { secure_url: res.secure_url, public_id: res.public_id }
}
