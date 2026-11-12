import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si faltan las variables de entorno la app muestra un aviso en vez de romperse.
export const configurado = Boolean(url && key)

export const supabase = createClient(url || 'http://localhost:54321', key || 'sin-configurar')
