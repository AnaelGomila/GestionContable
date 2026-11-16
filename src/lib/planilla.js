import { r2 } from './format.js'

const PATRIMONIALES = ['activo', 'pasivo', 'patrimonio']

// Arma la planilla de trabajo (balance de sumas y saldos con estados).
//   cuentas: [{ id, codigo, nombre, tipo }]
//   sumas:   [{ cuenta_id, debe, haber }]   (ya filtradas por fecha)
//
// Cada cuenta va a UNA sola columna de cada estado, según el lado de su saldo:
//   - Cuentas patrimoniales (activo / pasivo / patrimonio): saldo deudor → Activo, saldo acreedor → Pasivo + PN
//   - Cuentas de resultado (ingreso / egreso):               saldo deudor → Negativos (RN), saldo acreedor → Positivos (RP)
// La diferencia entre ambas columnas es el resultado del ejercicio y se agrega al lado más chico
// para que cada estado cierre.
export function armarPlanilla(cuentas, sumas) {
  const porCuenta = new Map(sumas.map((s) => [s.cuenta_id, s]))

  const filas = cuentas.map((c) => {
    const s = porCuenta.get(c.id)
    const debe = r2(s?.debe)
    const haber = r2(s?.haber)
    const dif = r2(debe - haber)
    const deudor = dif > 0 ? dif : 0
    const acreedor = dif < 0 ? -dif : 0
    const patrimonial = PATRIMONIALES.includes(c.tipo)
    return {
      id: c.id, codigo: c.codigo, nombre: c.nombre, tipo: c.tipo,
      debe, haber, deudor, acreedor,
      activo: patrimonial ? deudor : 0,
      pasivoPn: patrimonial ? acreedor : 0,
      negativo: patrimonial ? 0 : deudor,
      positivo: patrimonial ? 0 : acreedor,
      conMovimiento: debe > 0 || haber > 0,
    }
  })

  const total = (campo) => r2(filas.reduce((a, f) => a + f[campo], 0))
  const t = {
    debe: total('debe'), haber: total('haber'),
    deudor: total('deudor'), acreedor: total('acreedor'),
    activo: total('activo'), pasivoPn: total('pasivoPn'),
    negativo: total('negativo'), positivo: total('positivo'),
  }

  // Resultado del ejercicio = resultados positivos - resultados negativos
  const resultado = r2(t.positivo - t.negativo)
  const ajuste = {
    activo: resultado < 0 ? -resultado : 0,     // pérdida: completa el Activo ...
    pasivoPn: resultado > 0 ? resultado : 0,    // ganancia: completa el Pasivo + PN ...
    negativo: resultado > 0 ? resultado : 0,    // ... y el lado de los resultados negativos
    positivo: resultado < 0 ? -resultado : 0,   // pérdida: completa los resultados positivos
  }
  const final = {
    activo: r2(t.activo + ajuste.activo),
    pasivoPn: r2(t.pasivoPn + ajuste.pasivoPn),
    negativo: r2(t.negativo + ajuste.negativo),
    positivo: r2(t.positivo + ajuste.positivo),
  }

  return {
    filas,
    sumas: { debe: t.debe, haber: t.haber },
    saldos: { deudor: t.deudor, acreedor: t.acreedor },
    resultado, ajuste, final,
    cuadra: t.debe === t.haber && t.deudor === t.acreedor && final.activo === final.pasivoPn && final.negativo === final.positivo,
  }
}
