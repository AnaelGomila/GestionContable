import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PDFViewer, pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { useAsync } from '../hooks/useAsync.js'
import * as facturasService from '../services/facturas.js'
import FacturaPDF from '../components/facturas/FacturaPDF.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'
import Estado from '../components/ui/Estado.jsx'
import Alert from '../components/ui/Alert.jsx'
import { nroComprobante } from '../lib/format.js'

// Datos que se codifican en el QR del comprobante
const datosQR = (f) =>
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

export default function FacturaVista() {
  const { id } = useParams()
  const q = useAsync(() => facturasService.obtener(id), [id])
  const [qr, setQr] = useState(null)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!q.data) return
    QRCode.toDataURL(datosQR(q.data.factura), { margin: 0, width: 240 }).then(setQr)
  }, [q.data])

  const descargar = async () => {
    setDescargando(true)
    setError('')
    try {
      const { factura, items } = q.data
      const blob = await pdf(<FacturaPDF factura={factura} items={items} qr={qr} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Factura-${factura.tipo}-${nroComprobante(factura.punto_venta, factura.numero)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('No se pudo generar el PDF: ' + (e?.message ?? e))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Estado q={q}>
      {({ factura, items }) => (
        <>
          <PageHeader titulo={`Factura ${factura.tipo} ${nroComprobante(factura.punto_venta, factura.numero)}`} subtitulo={factura.receptor?.razon_social}>
            <Link to="/facturas" className="btn">← Facturas</Link>
            <button className="btn primary" onClick={descargar} disabled={!qr || descargando}>{descargando ? 'Generando…' : 'Descargar PDF'}</button>
          </PageHeader>
          <Alert tipo="error">{error}</Alert>
          {qr && (
            <PDFViewer className="pdf-frame" showToolbar={false}>
              <FacturaPDF factura={factura} items={items} qr={qr} />
            </PDFViewer>
          )}
        </>
      )}
    </Estado>
  )
}
