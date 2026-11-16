import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

export const listar = () => q(supabase.from('ejercicios').select('*').order('desde'))

// Cambia la fecha de cierre de un ejercicio abierto
export const cambiarFin = ({ id, hasta }) => q(supabase.rpc('cambiar_fin_ejercicio', { p_id: id, p_hasta: hasta }))

// Genera refundición + cierre patrimonial + apertura del ejercicio siguiente (una sola transacción)
export const cerrar = (id) => q(supabase.rpc('cerrar_ejercicio', { p_id: id }))

// Anula los tres asientos del cierre (solo el último ejercicio cerrado, si el siguiente no tiene movimientos)
export const reabrir = (id) => q(supabase.rpc('reabrir_ejercicio', { p_id: id }))
