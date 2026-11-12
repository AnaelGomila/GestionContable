import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

const SELECT_ASIENTO = 'id, numero, fecha, descripcion, origen, referencia_id, anula_asiento_id, asiento_lineas(id, debe, haber, cuentas(codigo, nombre))'

// Normaliza las líneas: primero las del debe, después las del haber
export const normalizarLineas = (a) =>
  [...(a.asiento_lineas ?? [])]
    .map((l) => ({ id: l.id, codigo: l.cuentas?.codigo, nombre: l.cuentas?.nombre, debe: Number(l.debe), haber: Number(l.haber) }))
    .sort((x, y) => (x.haber > 0) - (y.haber > 0) || x.id - y.id)

export function listar({ desde, hasta, origen } = {}) {
  let r = supabase.from('asientos').select(SELECT_ASIENTO).order('numero', { ascending: false })
  if (desde) r = r.gte('fecha', desde)
  if (hasta) r = r.lte('fecha', hasta)
  if (origen) r = r.eq('origen', origen)
  return q(r)
}

export const obtener = (id) => q(supabase.from('asientos').select(SELECT_ASIENTO).eq('id', id).single())

export const ultimos = (n = 6) =>
  q(supabase.from('asientos').select('id, numero, fecha, descripcion, origen').order('numero', { ascending: false }).limit(n))

// Movimientos de una cuenta para el libro mayor
export const mayor = (cuentaId) =>
  q(
    supabase
      .from('asiento_lineas')
      .select('id, debe, haber, asientos!inner(id, numero, fecha, descripcion)')
      .eq('cuenta_id', cuentaId)
  )

export const fondos = ({ fecha, origen, destino, monto, descripcion }) =>
  q(supabase.rpc('registrar_fondos', { p_fecha: fecha, p_origen: origen, p_destino: destino, p_monto: monto, p_descripcion: descripcion || null }))

// lineas: [{ cuenta: '5.2.02', debe: 100, haber: 0 }]
export const manual = ({ fecha, descripcion, lineas }) =>
  q(supabase.rpc('registrar_asiento_manual', { p_fecha: fecha, p_descripcion: descripcion, p_lineas: lineas }))

export const anular = ({ id, fecha, motivo }) =>
  q(supabase.rpc('anular_asiento', { p_asiento_id: id, p_fecha: fecha, p_motivo: motivo || null }))
