// Formatos para Argentina (es-AR)

const monedaFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
const num2Fmt = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const money = (n) => monedaFmt.format(Number(n) || 0)
export const num2 = (n) => num2Fmt.format(Number(n) || 0)

// '2026-11-12' -> '12/11/2026'
export const fechaAR = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Fecha de hoy en formato yyyy-mm-dd (zona horaria local)
export const hoy = () => new Date().toLocaleDateString('sv-SE')

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// Número de comprobante: 0001-00000001
export const nroComprobante = (puntoVenta, numero) =>
  `${String(puntoVenta).padStart(4, '0')}-${String(numero).padStart(8, '0')}`

export const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo', cuenta: '1.1.01' },
  { value: 'transferencia', label: 'Transferencia', cuenta: '1.1.02' },
  { value: 'cheque_dia', label: 'Cheque al día', cuenta: '1.1.02' },
  { value: 'cheque_diferido', label: 'Cheque diferido', cuenta: '1.1.03' },
]

export const etiquetaMedio = (v) => MEDIOS_PAGO.find((m) => m.value === v)?.label ?? v

export const ORIGENES = {
  apertura: 'Apertura',
  compra: 'Compra',
  venta: 'Venta',
  fondos: 'Fondos',
  cobro_cheque: 'Cobro de cheque',
  pago_proveedor: 'Pago a proveedor',
  manual: 'Manual',
  anulacion: 'Anulación',
}

export const CONDICIONES_IVA = ['Responsable Inscripto', 'Monotributo', 'Exento', 'Consumidor Final']

export const errMsg = (e) => e?.message || String(e)
