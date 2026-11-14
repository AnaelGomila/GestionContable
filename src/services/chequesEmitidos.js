import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

// Cheques de propia firma entregados a terceros (Valores diferidos a pagar)
export const listar = () =>
  q(supabase.from('cheques_emitidos').select('*').order('fecha_vencimiento', { ascending: true }))

export const pagar = ({ chequeId, fecha }) => q(supabase.rpc('pagar_cheque_emitido', { p_cheque_id: chequeId, p_fecha: fecha }))
