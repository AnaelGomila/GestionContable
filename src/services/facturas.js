import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

export const listar = () => q(supabase.from('facturas').select('*').order('fecha', { ascending: false }).order('id', { ascending: false }))

// Devuelve la factura y sus ítems (los ítems vienen de la venta)
export async function obtener(id) {
  const factura = await q(supabase.from('facturas').select('*').eq('id', id).single())
  const items = await q(supabase.from('venta_items').select('*').eq('venta_id', factura.venta_id).order('id'))
  return { factura, items }
}
