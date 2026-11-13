import { supabase } from '../lib/supabase.js'
import { q } from './db.js'
import * as archivos from './archivos.js'

const BUCKET = 'comprobantes'

export async function listar() {
  const filas = await q(supabase.from('facturas_subidas').select('*').order('fecha', { ascending: false }).order('id', { ascending: false }))
  return filas.map((f) => ({ ...f, total: Number(f.total) }))
}

// Sube el archivo y registra los datos de la factura. Si falla el registro, borra el archivo.
export async function subir({ tipo, pv, nro, fecha, emisor, cuit, cae, total, archivo }) {
  const error = archivos.validar(archivo)
  if (error) throw new Error(error)
  const limpio = archivo.name.replace(/[^\w.-]+/g, '_')
  const ruta = `subidas/${crypto.randomUUID()}-${limpio}`
  const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: archivo.type })
  if (errSubida) throw new Error('No se pudo subir el archivo: ' + errSubida.message)
  const comprobante = `${tipo} ${String(pv).padStart(4, '0')}-${String(nro).padStart(8, '0')}`
  try {
    await q(supabase.from('facturas_subidas').insert({
      tipo, pv, nro, comprobante, fecha, emisor: emisor.trim(), cuit: cuit?.trim() || null, cae: cae || null, total, ruta, nombre: archivo.name, mime: archivo.type,
    }))
  } catch (e) {
    await supabase.storage.from(BUCKET).remove([ruta])
    if (e?.code === '23505') throw new Error(`Ya subiste la factura ${comprobante} de este emisor.`)
    throw e
  }
}

export const abrir = async (f) => window.open(await archivos.urlFirmada(f.ruta), '_blank', 'noopener')

export async function borrar(f) {
  await q(supabase.from('facturas_subidas').delete().eq('id', f.id))
  await supabase.storage.from(BUCKET).remove([f.ruta])
}
