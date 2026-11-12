import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

export const listar = () => q(supabase.from('cuentas').select('*').order('codigo'))

// Saldos calculados por la vista v_saldos (suma de asiento_lineas)
export const saldos = () => q(supabase.from('v_saldos').select('*').order('codigo'))

export const crear = ({ codigo, nombre, tipo }) => q(supabase.from('cuentas').insert({ codigo, nombre, tipo, es_control: false }))
