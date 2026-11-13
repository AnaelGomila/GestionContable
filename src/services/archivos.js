import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

const BUCKET = 'comprobantes'
export const TIPOS_OK = ['application/pdf', 'image/jpeg', 'image/png']
export const MAX_BYTES = 5 * 1024 * 1024

export function validar(archivo) {
  if (!TIPOS_OK.includes(archivo.type)) return 'El archivo debe ser PDF, JPG o PNG.'
  if (archivo.size > MAX_BYTES) return 'El archivo no puede pesar más de 5 MB.'
  return ''
}

export const listar = (compraId) =>
  q(supabase.from('compra_archivos').select('*').eq('compra_id', compraId).order('id'))

export async function subir(compraId, archivo) {
  const error = validar(archivo)
  if (error) throw new Error(error)
  const limpio = archivo.name.replace(/[^\w.-]+/g, '_')
  const ruta = `${compraId}/${Date.now()}-${limpio}`
  const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type })
  if (errSubida) throw new Error('No se pudo subir el archivo: ' + errSubida.message)
  try {
    await q(supabase.from('compra_archivos').insert({ compra_id: compraId, ruta, nombre: archivo.name, mime: archivo.type }))
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([ruta])
    throw e
  }
}

export async function urlFirmada(ruta) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 300)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function borrar(archivo) {
  await q(supabase.from('compra_archivos').delete().eq('id', archivo.id))
  await supabase.storage.from(BUCKET).remove([archivo.ruta])
}
