import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { calcularItem } from '../../lib/iva.js'
import { fechaAR, num2 } from '../../lib/format.js'

// Catálogo para clientes: solo código, producto y precio final (IVA incluido). Nunca muestra costos.
const MADERA = '#5a3d2b'
const OLIVA = '#5f6b3a'
const GRIS = '#6b6b6b'
const LINEA = '#d8d0c4'

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 60, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  cab: { borderBottomWidth: 2, borderBottomColor: MADERA, paddingBottom: 12, marginBottom: 18 },
  empresa: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: MADERA },
  titulo: { fontSize: 12, color: OLIVA, marginTop: 3, fontFamily: 'Helvetica-Bold' },
  datos: { fontSize: 8.5, color: GRIS, marginTop: 5 },
  thead: { flexDirection: 'row', backgroundColor: MADERA, color: '#fff', paddingVertical: 6, paddingHorizontal: 8, fontFamily: 'Helvetica-Bold' },
  fila: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: LINEA },
  zebra: { backgroundColor: '#faf7f2' },
  cCod: { width: '20%', fontFamily: 'Courier', fontSize: 9, color: GRIS },
  cNom: { width: '55%', fontFamily: 'Helvetica-Bold' },
  cPre: { width: '25%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  pie: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: GRIS, textAlign: 'center' },
})

export const precioFinal = (p) => {
  const { neto, iva } = calcularItem(1, p.precio_neto, p.alicuota_iva)
  return neto + iva
}

export default function CatalogoPDF({ empresa, productos, fecha }) {
  const contacto = [empresa?.domicilio, [empresa?.localidad, empresa?.provincia].filter(Boolean).join(' - '), empresa?.telefono].filter(Boolean).join('  ·  ')
  return (
    <Document title={`Catálogo ${empresa?.razon_social ?? ''}`} author={empresa?.razon_social}>
      <Page size="A4" style={s.page}>
        <View style={s.cab} fixed={false}>
          <Text style={s.empresa}>{empresa?.razon_social}</Text>
          <Text style={s.titulo}>Catálogo de productos · Muebles de oficina</Text>
          <Text style={s.datos}>{contacto}</Text>
          <Text style={s.datos}>Lista vigente al {fechaAR(fecha)}</Text>
        </View>
        <View style={s.thead} fixed>
          <Text style={[s.cCod, { color: '#fff', fontFamily: 'Helvetica-Bold' }]}>Código</Text>
          <Text style={s.cNom}>Producto</Text>
          <Text style={s.cPre}>Precio final</Text>
        </View>
        {productos.map((p, i) => (
          <View key={p.id} style={[s.fila, i % 2 ? s.zebra : {}]} wrap={false}>
            <Text style={[s.cCod, { color: GRIS }]}>{p.codigo}</Text>
            <Text style={s.cNom}>{p.nombre}</Text>
            <Text style={s.cPre}>$ {num2(precioFinal(p))}</Text>
          </View>
        ))}
        <Text style={s.pie} fixed render={({ pageNumber, totalPages }) => `Precios finales en pesos, IVA incluido. Sujetos a disponibilidad y a modificaciones sin previo aviso.  ·  ${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  )
}
