import { r2 } from './format.js'

// Cálculo en centavos para coincidir con el redondeo de la base de datos.
const centavos = (n) => Math.round((Number(n) || 0) * 100)

export function calcularItem(cantidad, unitario, alicuota) {
  const netoC = centavos((Number(cantidad) || 0) * (Number(unitario) || 0))
  const ivaC = Math.round((netoC * (Number(alicuota) || 0) * 10) / 1000)
  return { neto: netoC / 100, iva: ivaC / 100 }
}

// items: [{ cantidad, unitario, alicuota }]
export function calcularTotales(items) {
  let neto = 0
  let iva = 0
  for (const it of items) {
    const c = calcularItem(it.cantidad, it.unitario, it.alicuota)
    neto += c.neto
    iva += c.iva
  }
  return { neto: r2(neto), iva: r2(iva), total: r2(neto + iva) }
}
