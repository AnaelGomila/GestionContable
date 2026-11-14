// Efecto de cada línea del asiento sobre su cuenta, según el tipo de cuenta y si va al Debe o al Haber.
//   Activo (A) y Resultado negativo (RN, egresos): aumentan por el Debe y disminuyen por el Haber.
//   Pasivo (P), Patrimonio neto (PN) y Resultado positivo (RP, ingresos): aumentan por el Haber y disminuyen por el Debe.
const RUBROS = {
  activo: { sigla: 'A', nombre: 'Activo', aumentaEn: 'debe' },
  pasivo: { sigla: 'P', nombre: 'Pasivo', aumentaEn: 'haber' },
  patrimonio: { sigla: 'PN', nombre: 'Patrimonio neto', aumentaEn: 'haber' },
  ingreso: { sigla: 'RP', nombre: 'Resultado positivo', aumentaEn: 'haber' },
  egreso: { sigla: 'RN', nombre: 'Resultado negativo', aumentaEn: 'debe' },
}

export function efectoLinea(tipo, debe, haber) {
  const rubro = RUBROS[tipo]
  if (!rubro) return null
  const lado = Number(debe) > 0 ? 'debe' : Number(haber) > 0 ? 'haber' : null
  if (!lado) return null
  const aumenta = lado === rubro.aumentaEn
  return {
    sigla: `${rubro.sigla}${aumenta ? '+' : '−'}`,
    aumenta,
    texto: `${rubro.nombre} ${aumenta ? 'aumenta' : 'disminuye'}`,
  }
}

export const LEYENDA = Object.values(RUBROS).map((r) => ({ sigla: r.sigla, nombre: r.nombre }))
