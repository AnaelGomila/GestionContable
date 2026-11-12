import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

// Cada fila compara el saldo del libro contra su registro auxiliar (stock, cheques, compras).
export const controles = async () => {
  const data = await q(supabase.from('v_controles').select('*'))
  return data.map((c) => ({ control: c.control, libro: Number(c.libro), auxiliar: Number(c.auxiliar) }))
}
