import { supabase } from '../lib/supabase.js'
import { q } from './db.js'

// Cheques diferidos de todas las ventas
export const listar = () =>
  q(
    supabase
      .from('venta_pagos')
      .select('*, ventas(id, fecha, clientes(razon_social))')
      .eq('medio', 'cheque_diferido')
      .order('fecha_cobro', { ascending: true })
  )

export const cobrar = ({ pagoId, fecha }) => q(supabase.rpc('cobrar_cheque', { p_pago_id: pagoId, p_fecha: fecha }))
