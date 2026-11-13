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

// Compra completa para ver su factura: compra, proveedor, items
export async function obtener(id) {
  const compra = await q(supabase.from('v_compras').select('*').eq('id', id).single())
  const [proveedor, itemsCompra] = await Promise.all([
    q(supabase.from('proveedores').select('*').eq('id', compra.proveedor_id).single()),
    items(id),
  ])
  return { compra, proveedor, items: itemsCompra }
}

// Próximo número de factura sugerido para ese proveedor (en su punto de venta)
export async function proponerNumero(proveedorId, pv) {
  const filas = await q(
    supabase.from('compras').select('nro_comprobante').eq('proveedor_id', proveedorId).eq('tipo_comprobante', 'A').eq('pv_comprobante', pv)
      .order('nro_comprobante', { ascending: false }).limit(1)
  )
  return (filas[0]?.nro_comprobante ?? 0) + 1
}

// items: [{ producto_id, cantidad, costo_unitario }]   origen: 'generada' | 'externa'
export const registrar = ({ fecha, proveedorId, pv, nro, cae, caeVto, origen, items: lineas }) =>
  q(supabase.rpc('registrar_compra', {
    p_fecha: fecha, p_proveedor_id: proveedorId, p_pv: pv, p_nro: nro,
    p_cae: cae, p_cae_vto: caeVto, p_origen: origen, p_items: lineas,
  }))

export const pagar = ({ compraId, fecha, monto, medio }) =>
  q(supabase.rpc('registrar_pago_proveedor', { p_compra_id: compraId, p_fecha: fecha, p_monto: monto, p_medio: medio }))
