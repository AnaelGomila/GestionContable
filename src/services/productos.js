import { supabase } from '../lib/supabase.js'
import { q } from './db.js'
import { nroComprobante } from '../lib/format.js'

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

const uno = (x) => (Array.isArray(x) ? x[0] : x)
const agrupar = (items, clave) => {
  const m = new Map()
  for (const it of items) m.set(it[clave], [...(m.get(it[clave]) ?? []), it])
  return m
}

// Historial de un producto: cada movimiento con su detalle (proveedor/cliente y comprobante),
// el total neto de la operación y el stock que quedó después del movimiento. Más nuevo primero.
export async function historial(productoId) {
  const movs = await q(supabase.from('stock_movimientos').select('*').eq('producto_id', productoId).order('id'))
  const idsCompra = movs.filter((m) => m.tipo === 'compra').map((m) => m.referencia_id)
  const idsVenta = movs.filter((m) => m.tipo === 'venta').map((m) => m.referencia_id)

  const [itemsCompra, itemsVenta, compras, ventas] = await Promise.all([
    idsCompra.length ? q(supabase.from('compra_items').select('id, compra_id, neto').eq('producto_id', productoId).order('id')) : [],
    idsVenta.length ? q(supabase.from('venta_items').select('id, venta_id, neto').eq('producto_id', productoId).order('id')) : [],
    idsCompra.length ? q(supabase.from('compras').select('id, comprobante, proveedores(razon_social)').in('id', idsCompra)) : [],
    idsVenta.length ? q(supabase.from('ventas').select('id, clientes(razon_social), facturas(tipo, punto_venta, numero)').in('id', idsVenta)) : [],
  ])

  const lineasCompra = agrupar(itemsCompra, 'compra_id')
  const lineasVenta = agrupar(itemsVenta, 'venta_id')
  const compraPorId = new Map(compras.map((c) => [c.id, c]))
  const ventaPorId = new Map(ventas.map((v) => [v.id, v]))

  let stock = 0
  const filas = movs.map((m) => {
    stock += m.cantidad
    let detalle = 'Stock inicial (apertura)'
    let total = Math.abs(m.cantidad) * Number(m.costo_unitario)
    if (m.tipo === 'compra') {
      const c = compraPorId.get(m.referencia_id)
      detalle = `Compra ${c?.comprobante ?? ''} · ${uno(c?.proveedores)?.razon_social ?? ''}`
      total = Number(lineasCompra.get(m.referencia_id)?.shift()?.neto ?? total)
    } else if (m.tipo === 'venta') {
      const v = ventaPorId.get(m.referencia_id)
      const f = uno(v?.facturas)
      detalle = `Factura ${f?.tipo ?? ''} ${f ? nroComprobante(f.punto_venta, f.numero) : ''} · ${uno(v?.clientes)?.razon_social ?? ''}`
      total = Number(lineasVenta.get(m.referencia_id)?.shift()?.neto ?? total)
    }
    return { ...m, costo_unitario: Number(m.costo_unitario), detalle, total, stock }
  })
  return filas.reverse()
}
