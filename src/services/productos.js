import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

// El stock NO es una columna: sale de la vista v_stock (suma de movimientos).
export async function listar() {
  const [productos, stock] = await Promise.all([
    q(supabase.from('productos').select('*').order('codigo')),
    q(supabase.from('v_stock').select('*')),
  ])
  const porId = new Map(stock.map((s) => [s.producto_id, s]))
  return productos.map((p) => ({
    ...p,
    costo: Number(p.costo),
    precio_neto: Number(p.precio_neto),
    alicuota_iva: Number(p.alicuota_iva),
    stock: porId.get(p.id)?.stock ?? 0,
    valor: Number(porId.get(p.id)?.valor ?? 0),
  }))
}

export const crear = (datos) => q(supabase.from('productos').insert(datos))
export const actualizar = (id, datos) => q(supabase.from('productos').update(datos).eq('id', id))

export const movimientos = (productoId) =>
  q(supabase.from('stock_movimientos').select('*').eq('producto_id', productoId).order('id', { ascending: false }))
