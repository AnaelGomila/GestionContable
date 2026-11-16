import { r2 } from './format.js'

export const CUENTA_RESULTADO = '3.2.03'   // "Resultado del ejercicio"

// Vista previa de los tres asientos del cierre. Es el mismo cálculo que hace la función
// cerrar_ejercicio() de la base (que es la que realmente graba los asientos).
//   cuentas: [{ id, codigo, tipo }]    sumas: [{ cuenta_id, debe, haber }]  (acumulado hasta hoy)
// Devuelve { refundicion, cierre, apertura, resultado }, cada asiento como [{ codigo, debe, haber }].
export function armarCierre(cuentas, sumas) {
  const neto = new Map(sumas.map((s) => [s.cuenta_id, r2(Number(s.debe) - Number(s.haber))]))
  const porCodigo = new Map(cuentas.map((c) => [c.codigo, neto.get(c.id) ?? 0]))

  // Lleva a cero cada cuenta con saldo: si el neto es deudor va al haber, y al revés
  const llevarACero = (tipos) =>
    cuentas
      .filter((c) => tipos.includes(c.tipo))
      .map((c) => ({ codigo: c.codigo, d: porCodigo.get(c.codigo) ?? 0 }))
      .filter((x) => x.d !== 0)
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .map((x) => ({ codigo: x.codigo, debe: x.d < 0 ? -x.d : 0, haber: x.d > 0 ? x.d : 0 }))

  const refundicion = llevarACero(['ingreso', 'egreso'])
  const debe = r2(refundicion.reduce((a, l) => a + l.debe, 0))
  const haber = r2(refundicion.reduce((a, l) => a + l.haber, 0))
  const resultado = refundicion.length ? r2(debe - haber) : 0      // + ganancia / - pérdida
  if (resultado > 0) refundicion.push({ codigo: CUENTA_RESULTADO, debe: 0, haber: resultado })
  if (resultado < 0) refundicion.push({ codigo: CUENTA_RESULTADO, debe: -resultado, haber: 0 })

  // El cierre patrimonial ya incluye el Resultado del ejercicio recién calculado
  for (const l of refundicion) porCodigo.set(l.codigo, r2((porCodigo.get(l.codigo) ?? 0) + l.debe - l.haber))
  const cierre = llevarACero(['activo', 'pasivo', 'patrimonio'])
  const apertura = cierre.map((l) => ({ codigo: l.codigo, debe: l.haber, haber: l.debe }))

  return { refundicion, cierre, apertura, resultado }
}
