import { supabase } from './supabase'

const BUCKET = 'fotos'

/** 5 MB. Una foto de celular ronda 2-4 MB; arriba de esto es un archivo raro. */
export const TAMANO_MAXIMO = 5 * 1024 * 1024

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/**
 * Valida antes de subir. Descubrir que el archivo no servía después de
 * esperar la subida completa, con la señal del estudio, es lo peor.
 */
export function revisarImagen(archivo: File): string | null {
  if (archivo.size > TAMANO_MAXIMO) {
    return `La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB. El máximo son 5 MB.`
  }
  // Algunos Android mandan type vacío; en ese caso se deja pasar y que
  // decida el servidor, en vez de rechazar una foto buena.
  if (archivo.type && !TIPOS.includes(archivo.type)) {
    return 'Ese archivo no es una imagen. Usa JPG, PNG o WEBP.'
  }
  return null
}

const extensionDe = (archivo: File) => {
  const porNombre = archivo.name.split('.').pop()?.toLowerCase()
  if (porNombre && porNombre.length <= 5) return porNombre
  return archivo.type.split('/')[1] ?? 'jpg'
}

/**
 * Sube y devuelve la URL pública.
 *
 * El nombre lleva timestamp en vez de sobrescribir la ruta anterior: si se
 * reusara la misma, el CDN seguiría sirviendo la foto vieja por su caché y
 * parecería que la subida no funcionó.
 */
export async function subirImagen(carpeta: string, nombreBase: string, archivo: File) {
  const error = revisarImagen(archivo)
  if (error) throw new Error(error)

  const limpio = nombreBase.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 40)
  const ruta = `${carpeta}/${limpio}-${Date.now()}.${extensionDe(archivo)}`

  const { error: errSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { cacheControl: '31536000', upsert: false })
  if (errSubida) throw errSubida

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta)
  return { url: data.publicUrl, ruta }
}

/** De una URL pública de vuelta a la ruta dentro del bucket. */
export function rutaDesdeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  return i === -1 ? null : url.slice(i + marca.length)
}

/**
 * Borra la imagen anterior. Se llama best-effort: si falla, el registro ya
 * apunta a la nueva y lo único que queda es un archivo huérfano — no vale
 * la pena romperle el guardado al usuario por eso.
 */
export async function borrarImagenPorUrl(url: string | null | undefined) {
  const ruta = rutaDesdeUrl(url)
  if (!ruta) return
  await supabase.storage.from(BUCKET).remove([ruta])
}
