import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

// Cada fila compara el saldo del libro contra su registro auxiliar (stock, cheques, compras).
export const controles = async () => {
  const data = await q(supabase.from('v_controles').select('*'))
  return data.map((c) => ({ control: c.control, libro: Number(c.libro), auxiliar: Number(c.auxiliar) }))
}

// Suma debe/haber por cuenta, solo con asientos dentro del rango de fechas.
//   desde / hasta: 'yyyy-mm-dd' (opcionales)
//   excluirOrigenes: orígenes de asiento que no deben contarse (p. ej. ['refundicion', 'cierre'])
// Devuelve [{ cuenta_id, debe, haber }]. Pagina de a 1000 filas (límite de la API).
export async function sumasPorCuenta({ desde, hasta, excluirOrigenes = [] } = {}) {
  const PAGINA = 1000
  const acumulado = new Map()
  for (let inicio = 0; ; inicio += PAGINA) {
    let r = supabase
      .from('asiento_lineas')
      .select('id, cuenta_id, debe, haber, asientos!inner(fecha, origen)')
      .order('id')
      .range(inicio, inicio + PAGINA - 1)
    if (desde) r = r.gte('asientos.fecha', desde)
    if (hasta) r = r.lte('asientos.fecha', hasta)
    for (const o of excluirOrigenes) r = r.neq('asientos.origen', o)
    const filas = await q(r)
    for (const l of filas) {
      const a = acumulado.get(l.cuenta_id) ?? { cuenta_id: l.cuenta_id, debe: 0, haber: 0 }
      a.debe += Number(l.debe)
      a.haber += Number(l.haber)
      acumulado.set(l.cuenta_id, a)
    }
    if (filas.length < PAGINA) break
  }
  return [...acumulado.values()]
}
