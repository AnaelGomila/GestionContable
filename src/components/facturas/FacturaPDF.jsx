import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { calcularItem } from '../../lib/iva.js'
import { fechaAR, nroComprobante, num2 } from '../../lib/format.js'

// Factura A / B en PDF (A4). El diseño sigue el formato de una factura electrónica:
// encabezado con letra y código, datos del receptor, detalle, totales y bloque de CAE.
const NEGRO = '#1a1a1a'
const GRIS = '#555555'
const LINEA = '#6b6b6b'

const s = StyleSheet.create({
  page: { padding: 22, fontFamily: 'Helvetica', fontSize: 8.5, color: NEGRO },
  caja: { borderWidth: 1, borderColor: LINEA },
  fila: { flexDirection: 'row' },
  bold: { fontFamily: 'Helvetica-Bold' },

  // Encabezado
  header: { flexDirection: 'row', minHeight: 118, position: 'relative' },
  headerIzq: { width: '50%', borderRightWidth: 1, borderRightColor: LINEA, paddingTop: 16, paddingHorizontal: 10, alignItems: 'center' },
  empresa: { fontFamily: 'Helvetica-Bold', fontSize: 15, textAlign: 'center', marginBottom: 14 },
  emisorTxt: { fontSize: 8, textAlign: 'center', marginBottom: 2 },
  condEmisor: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, textAlign: 'center', marginTop: 4 },
  headerDer: { width: '50%' },
  headerDerInt: { paddingTop: 14, paddingLeft: 34, paddingRight: 10 },
  titulo: { fontFamily: 'Helvetica-Bold', fontSize: 18, marginBottom: 6 },
  numero: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 4 },
  fecha: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 14 },
  datoDer: { flexDirection: 'row', marginBottom: 3, fontSize: 8.5 },
  datoDerLabel: { fontFamily: 'Helvetica-Bold', width: 92 },

  letraWrap: { position: 'absolute', top: 0, left: '50%', marginLeft: -22, width: 44, alignItems: 'center' },
  letraBox: { width: 44, borderWidth: 1, borderColor: LINEA, backgroundColor: '#fff', alignItems: 'center', paddingTop: 2, paddingBottom: 3 },
  letra: { fontFamily: 'Helvetica-Bold', fontSize: 30, lineHeight: 1 },
  cod: { fontSize: 6.5 },
  original: { width: 44, borderWidth: 1, borderTopWidth: 0, borderColor: LINEA, backgroundColor: '#f1f1f1', alignItems: 'center', paddingVertical: 1 },
  originalTxt: { fontSize: 6.5, color: GRIS },

  // Receptor
  receptor: { marginTop: 7, padding: 8, flexDirection: 'row' },
  recCol: { flex: 1 },
  recFila: { flexDirection: 'row', marginBottom: 3 },
  recLabel: { fontFamily: 'Helvetica-Bold', marginRight: 4 },
  recValor: { flex: 1 },

  // Detalle
  tabla: { marginTop: 7 },
  th: { flexDirection: 'row', backgroundColor: '#ececec', borderWidth: 1, borderColor: LINEA, paddingVertical: 4 },
  thTxt: { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  tr: { flexDirection: 'row', paddingVertical: 3 },
  cCod: { width: '13%', paddingLeft: 10 },
  cDesc: { width: '37%' },
  cCant: { width: '10%', textAlign: 'right' },
  cPrecio: { width: '15%', textAlign: 'right' },
  cAlic: { width: '10%', textAlign: 'right' },
  cImp: { width: '15%', textAlign: 'right', paddingRight: 8 },

  // Totales
  totales: { position: 'absolute', left: 22, right: 22, bottom: 128 },
  totalesCaja: { padding: 8, alignItems: 'flex-end' },
  totalFila: { flexDirection: 'row', marginBottom: 3 },
  totalLabel: { width: 190, textAlign: 'right', fontFamily: 'Helvetica-Bold', paddingRight: 6 },
  totalValor: { width: 86, textAlign: 'right', paddingRight: 4 },
  obs: { marginTop: 6, height: 26, padding: 4 },
  transparencia: { marginTop: 6, fontSize: 7.5, color: GRIS },

  // Pie
  pie: { position: 'absolute', left: 22, right: 22, bottom: 22, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  qr: { width: 82, height: 82 },
  pieDer: { alignItems: 'flex-end' },
  pieCae: { flexDirection: 'row', marginBottom: 3, fontSize: 9 },
  pieGenerado: { fontSize: 7, color: GRIS, marginTop: 8 },
})

const Dato = ({ label, valor }) => (
  <View style={s.recFila}>
    <Text style={s.recLabel}>{label}</Text>
    <Text style={s.recValor}>{valor || '—'}</Text>
  </View>
)

const Total = ({ label, valor, negrita = false }) => (
  <View style={s.totalFila}>
    <Text style={s.totalLabel}>{label}</Text>
    <Text style={[s.totalValor, negrita ? s.bold : null]}>$ {num2(valor)}</Text>
  </View>
)

export default function FacturaPDF({ factura, items, qr }) {
  const esA = factura.tipo === 'A'
  const { emisor, receptor } = factura
  const nro = nroComprobante(factura.punto_venta, factura.numero)
  const docLabel = receptor.documento && /^\d{2}-/.test(receptor.documento) ? 'CUIT:' : 'DNI:'
  const ivaTotal = Number(factura.iva21) + Number(factura.iva105)

  // En la factura B los importes se muestran con el IVA incluido
  const filas = items.map((it) => {
    const alic = Number(it.alicuota_iva)
    const { neto, iva } = calcularItem(it.cantidad, it.precio_unitario, alic)
    return {
      id: it.id,
      codigo: it.codigo,
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      alic,
      unitario: esA ? Number(it.precio_unitario) : Number(it.precio_unitario) * (1 + alic / 100),
      importe: esA ? neto : neto + iva,
    }
  })

  return (
    <Document title={`Factura ${factura.tipo} ${nro}`} author={emisor.razon_social} subject={`Factura ${factura.tipo} ${nro}`}>
      <Page size="A4" style={s.page}>
        {/* ---------- Encabezado ---------- */}
        <View style={[s.caja, s.header]}>
          <View style={s.headerIzq}>
            <Text style={s.empresa}>{emisor.razon_social}</Text>
            <Text style={s.emisorTxt}>Razón Social: {emisor.razon_social}</Text>
            <Text style={s.emisorTxt}>{emisor.domicilio}</Text>
            <Text style={s.emisorTxt}>{[emisor.localidad, emisor.provincia].filter(Boolean).join(' - ')}</Text>
            <Text style={s.emisorTxt}>{emisor.telefono}</Text>
            <Text style={s.condEmisor}>{emisor.condicion_iva}</Text>
          </View>

          <View style={s.headerDer}>
           <View style={s.headerDerInt}>
            <Text style={s.titulo}>FACTURA</Text>
            <Text style={s.numero}>{nro}</Text>
            <Text style={s.fecha}>Fecha de Emisión: {fechaAR(factura.fecha)}</Text>
            <View style={s.datoDer}><Text style={s.datoDerLabel}>CUIT:</Text><Text>{emisor.cuit}</Text></View>
            <View style={s.datoDer}><Text style={s.datoDerLabel}>Ingresos Brutos:</Text><Text>{emisor.ingresos_brutos}</Text></View>
            <View style={s.datoDer}><Text style={s.datoDerLabel}>Inicio de Actividades:</Text><Text>{fechaAR(emisor.inicio_actividades)}</Text></View>
           </View>
          </View>

          <View style={s.letraWrap}>
            <View style={s.letraBox}>
              <Text style={s.letra}>{factura.tipo}</Text>
              <Text style={s.cod}>CÓD. {esA ? '01' : '06'}</Text>
            </View>
            <View style={s.original}><Text style={s.originalTxt}>ORIGINAL</Text></View>
          </View>
        </View>

        {/* ---------- Receptor ---------- */}
        <View style={[s.caja, s.receptor]}>
          <View style={s.recCol}>
            <Dato label="Razón Social:" valor={receptor.razon_social} />
            <Dato label="Domicilio:" valor={receptor.domicilio} />
            <Dato label="Cond. IVA:" valor={receptor.condicion_iva} />
            <Dato label="Cond. Venta:" valor={factura.condicion_venta} />
          </View>
          <View style={s.recCol}>
            <Dato label={docLabel} valor={receptor.documento} />
            <Dato label="Localidad:" valor={receptor.localidad} />
            <Dato label="Provincia:" valor={receptor.provincia} />
            <Dato label="Teléfono:" valor={receptor.telefono} />
          </View>
        </View>

        {/* ---------- Detalle ---------- */}
        <View style={s.tabla}>
          <View style={s.th}>
            <Text style={[s.thTxt, s.cCod]}>Código</Text>
            <Text style={[s.thTxt, s.cDesc]}>Descripción</Text>
            <Text style={[s.thTxt, s.cCant]}>Cantidad</Text>
            <Text style={[s.thTxt, s.cPrecio]}>P. Unitario</Text>
            <Text style={[s.thTxt, s.cAlic]}>Alic. IVA</Text>
            <Text style={[s.thTxt, s.cImp]}>Importe</Text>
          </View>
          {filas.map((f) => (
            <View key={f.id} style={s.tr} wrap={false}>
              <Text style={s.cCod}>{f.codigo}</Text>
              <Text style={s.cDesc}>{f.descripcion}</Text>
              <Text style={s.cCant}>{f.cantidad}</Text>
              <Text style={s.cPrecio}>{num2(f.unitario)}</Text>
              <Text style={s.cAlic}>{f.alic.toString().replace('.', ',')}%</Text>
              <Text style={s.cImp}>{num2(f.importe)}</Text>
            </View>
          ))}
        </View>

        {/* ---------- Totales ---------- */}
        <View style={s.totales}>
          <View style={[s.caja, s.totalesCaja]}>
            {esA ? (
              <>
                <Total label="Importe Neto Gravado: $" valor={factura.neto} />
                <Total label="IVA 21%: $" valor={factura.iva21} />
                <Total label="IVA 10,5%: $" valor={factura.iva105} />
                <Total label="Importe Otros Tributos: $" valor={0} />
                <Total label="Total: $" valor={factura.total} negrita />
              </>
            ) : (
              <>
                <Total label="Subtotal: $" valor={factura.total} />
                <Total label="Importe Otros Tributos: $" valor={0} />
                <Total label="Importe Total: $" valor={factura.total} negrita />
              </>
            )}
          </View>
          <View style={[s.caja, s.obs]}><Text> </Text></View>
          {!esA && (
            <Text style={s.transparencia}>
              Régimen de Transparencia Fiscal al Consumidor (Ley 27.743) · IVA Contenido: $ {num2(ivaTotal)}
            </Text>
          )}
        </View>

        {/* ---------- Pie: QR y CAE ---------- */}
        <View style={s.pie} fixed>
          {qr ? <Image src={qr} style={s.qr} /> : <View style={s.qr} />}
          <View style={s.pieDer}>
            <View style={s.pieCae}><Text style={s.bold}>CAE Nº:  </Text><Text>{factura.cae}</Text></View>
            <View style={s.pieCae}><Text style={s.bold}>Fecha de Vto. de CAE:  </Text><Text>{fechaAR(factura.cae_vto)}</Text></View>
            <Text style={s.pieGenerado}>Comprobante generado con Ergo Oficinas · Gestor contable</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
