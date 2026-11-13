import { r2 } from './format.js'

// CAE de 14 dígitos (simulado)
export const caeAleatorio = () => '7' + String(Math.floor(Math.random() * 1e13)).padStart(13, '0')

// Suma días a una fecha yyyy-mm-dd
export const sumarDias = (iso, dias) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toLocaleDateString('sv-SE')
}

// Arma el objeto "factura" que espera FacturaPDF a partir de una compra.
// El emisor es el proveedor y el receptor es nuestra empresa.
export function facturaDesdeCompra(compra, proveedor, empresa, items) {
  let iva21 = 0
  let iva105 = 0
  for (const it of items) {
    const iva = r2((Number(it.neto) * Number(it.alicuota_iva)) / 100)
    if (Number(it.alicuota_iva) === 10.5) iva105 += iva
    else iva21 += iva
  }
  return {
    tipo: 'A',
    punto_venta: compra.pv_comprobante,
    numero: compra.nro_comprobante,
    fecha: compra.fecha,
    cae: compra.cae,
    cae_vto: compra.cae_vto,
    neto: Number(compra.neto),
    iva21: r2(iva21),
    iva105: r2(iva105),
    total: Number(compra.total),
    condicion_venta: 'Cuenta corriente',
    emisor: {
      razon_social: proveedor.razon_social,
      cuit: proveedor.documento,
      ingresos_brutos: proveedor.ingresos_brutos ?? proveedor.documento,
      inicio_actividades: proveedor.inicio_actividades,
      domicilio: proveedor.domicilio,
      localidad: proveedor.localidad,
      provincia: proveedor.provincia,
      telefono: proveedor.telefono,
      condicion_iva: proveedor.condicion_iva,
    },
    receptor: {
      razon_social: empresa.razon_social,
      documento: empresa.cuit,
      domicilio: empresa.domicilio,
      localidad: empresa.localidad,
      provincia: empresa.provincia,
      telefono: empresa.telefono,
      condicion_iva: empresa.condicion_iva,
    },
  }
}

// Ítems de compra con la forma que usa FacturaPDF
export const itemsParaPDF = (items) =>
  items.map((i) => ({ id: i.id, codigo: i.codigo, descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: i.costo_unitario, alicuota_iva: i.alicuota_iva }))

// Datos que se codifican en el QR de la factura
export const datosQR = (f) =>
  JSON.stringify({
    ver: 1,
    fecha: f.fecha,
    cuit: String(f.emisor.cuit).replace(/\D/g, ''),
    ptoVta: f.punto_venta,
    tipoCmp: f.tipo === 'A' ? 1 : 6,
    nroCmp: f.numero,
    importe: Number(f.total),
    moneda: 'PES',
    ctz: 1,
    tipoCodAut: 'E',
    codAut: f.cae,
  })
