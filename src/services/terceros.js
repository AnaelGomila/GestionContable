import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

// Clientes y proveedores comparten la misma estructura.
const crud = (tabla) => ({
  listar: () => q(supabase.from(tabla).select('*').order('razon_social')),
  crear: (datos) => q(supabase.from(tabla).insert(datos)),
  actualizar: (id, datos) => q(supabase.from(tabla).update(datos).eq('id', id)),
})

export const clientes = crud('clientes')
export const proveedores = crud('proveedores')
