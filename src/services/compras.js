import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

export async function listar() {
  const [compras, proveedores] = await Promise.all([
    q(supabase.from('v_compras').select('*').order('id', { ascending: false })),
    q(supabase.from('proveedores').select('id, razon_social')),
  ])
  const nombres = new Map(proveedores.map((p) => [p.id, p.razon_social]))
  return compras.map((c) => ({
    ...c,
    neto: Number(c.neto),
    iva: Number(c.iva),
    total: Number(c.total),
    pagado: Number(c.pagado),
    saldo: Number(c.saldo),
    proveedor: nombres.get(c.proveedor_id) ?? '—',
  }))
}

export const items = (compraId) => q(supabase.from('compra_items').select('*').eq('compra_id', compraId).order('id'))

// items: [{ producto_id, cantidad, costo_unitario }]
export const registrar = ({ fecha, proveedorId, comprobante, items: lineas }) =>
  q(supabase.rpc('registrar_compra', { p_fecha: fecha, p_proveedor_id: proveedorId, p_comprobante: comprobante, p_items: lineas }))

export const pagar = ({ compraId, fecha, monto, medio }) =>
  q(supabase.rpc('registrar_pago_proveedor', { p_compra_id: compraId, p_fecha: fecha, p_monto: monto, p_medio: medio }))
