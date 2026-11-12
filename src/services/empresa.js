import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

export const obtener = () => q(supabase.from('empresa').select('*').maybeSingle())

export const actualizar = (datos) => q(supabase.from('empresa').update(datos).eq('id', 1))

// montos: { '1.1.01': 1000000, '1.1.02': 6000000, ... }  (Mercaderías sale del stock inicial)
export const registrarApertura = (fecha, montos) =>
  q(supabase.rpc('registrar_apertura', { p_fecha: fecha, p_montos: montos }))
