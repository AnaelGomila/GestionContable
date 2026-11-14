// Arma, en el navegador, el asiento que va a generar cada operación.
// Sirve solo para la VISTA PREVIA: el asiento real lo crea la función de la base de datos.
import { MEDIOS_PAGO, r2 } from './format.js'

const L = (codigo, debe = 0, haber = 0) => ({ codigo, debe: r2(debe), haber: r2(haber) })
const conImporte = (lineas) => lineas.filter((l) => l.debe > 0 || l.haber > 0)

export const asientoCompra = ({ neto, iva, total }) =>
  conImporte([L('1.1.05', neto), L('1.1.06', iva), L('2.1.01', 0, total)])

export const asientoVenta = ({ neto, iva, costo, pagos }) => {
  const porCuenta = {}
  for (const p of pagos) {
    const cuenta = MEDIOS_PAGO.find((m) => m.value === p.medio)?.cuenta
    if (cuenta) porCuenta[cuenta] = (porCuenta[cuenta] || 0) + (Number(p.monto) || 0)
  }
  return conImporte([
    ...Object.entries(porCuenta).map(([cuenta, monto]) => L(cuenta, monto)),
    L('5.1.01', costo),
    L('4.1.01', 0, neto),
    L('2.1.02', 0, iva),
    L('1.1.05', 0, costo),
  ])
}

export const asientoFondos = ({ origen, destino, monto }) =>
  conImporte([L(destino, monto), L(origen, 0, monto)])

export const asientoPagoProveedor = ({ medio, monto }) =>
  conImporte([L('2.1.01', monto), L(medio === 'caja' ? '1.1.01' : '1.1.02', 0, monto)])

export const asientoCobroCheque = (monto) => conImporte([L('1.1.02', monto), L('1.1.03', 0, monto)])

export const asientoPagoChequePropio = (monto) => conImporte([L('2.1.08', monto), L('1.1.02', 0, monto)])

export const asientoManual = (lineas) =>
  conImporte(lineas.filter((l) => l.cuenta).map((l) => L(l.cuenta, l.debe, l.haber)))
