import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

const uno = (x) => (Array.isArray(x) ? x[0] : x)

export async function listar() {
  const data = await q(
    supabase
      .from('ventas')
      .select('*, clientes(razon_social), facturas(id, tipo, punto_venta, numero), venta_pagos(medio, monto)')
      .order('id', { ascending: false })
  )
  return data.map((v) => ({
    ...v,
    neto: Number(v.neto),
    iva: Number(v.iva),
    total: Number(v.total),
    cliente: v.clientes?.razon_social ?? '—',
    factura: uno(v.facturas) ?? null,
  }))
}

export const items = (ventaId) => q(supabase.from('venta_items').select('*').eq('venta_id', ventaId).order('id'))
export const pagos = (ventaId) => q(supabase.from('venta_pagos').select('*').eq('venta_id', ventaId).order('id'))

// items: [{ producto_id, cantidad, precio_unitario }]
// pagos: [{ medio, monto, banco?, numero_cheque?, fecha_cobro? }]
// Devuelve { venta_id, factura_id, asiento_id }
export const registrar = ({ fecha, clienteId, items: lineas, pagos: cobros }) =>
  q(supabase.rpc('registrar_venta', { p_fecha: fecha, p_cliente_id: clienteId, p_items: lineas, p_pagos: cobros }))
