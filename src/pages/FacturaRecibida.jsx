import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PDFViewer, pdf } from '@react-pdf/renderer'
import QRCode from 'qrcode'
import { useAsync } from '../hooks/useAsync.js'
import * as comprasService from '../services/compras.js'
import * as archivosService from '../services/archivos.js'
import * as empresaService from '../services/empresa.js'
import FacturaPDF from '../components/facturas/FacturaPDF.jsx'
import { facturaDesdeCompra, itemsParaPDF, datosQR } from '../lib/comprobantes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Estado from '../components/ui/Estado.jsx'
import Card from '../components/ui/Card.jsx'
import Alert from '../components/ui/Alert.jsx'
import { errMsg } from '../lib/format.js'

export default function FacturaRecibida() {
  const { id } = useParams()
  const aviso = useLocation().state?.aviso
  const q = useAsync(async () => {
    const [datos, empresa, archivos] = await Promise.all([comprasService.obtener(id), empresaService.obtener(), archivosService.listar(id)])
    return { ...datos, empresa, archivos }
  }, [id])
  const [qr, setQr] = useState(null)
  const [error, setError] = useState('')
  const [descargando, setDescargando] = useState(false)

  useEffect(() => {
    if (!q.data) return
    const f = facturaDesdeCompra(q.data.compra, q.data.proveedor, q.data.empresa, q.data.items)
    QRCode.toDataURL(datosQR(f), { margin: 0, width: 240 }).then(setQr)
  }, [q.data])

  const descargar = async () => {
    setDescargando(true)
    setError('')
    try {
      const { compra, proveedor, empresa, items } = q.data
      const factura = facturaDesdeCompra(compra, proveedor, empresa, items)
      const blob = await pdf(<FacturaPDF factura={factura} items={itemsParaPDF(items)} qr={qr} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Factura-recibida-${compra.comprobante.replace(/\s/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError('No se pudo generar el PDF: ' + errMsg(e))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <Estado q={q}>
      {({ compra, proveedor, empresa, items, archivos }) => {
        const factura = facturaDesdeCompra(compra, proveedor, empresa, items)
        return (
          <>
            <PageHeader titulo={`Factura recibida ${compra.comprobante}`} subtitulo={proveedor.razon_social}>
              <Link to="/facturas" className="btn">← Facturas</Link>
              <button className="btn primary" onClick={descargar} disabled={!qr || descargando}>{descargando ? 'Generando…' : 'Descargar PDF'}</button>
            </PageHeader>
            <div className="stack">
              <Alert tipo="warn">{aviso}</Alert>
              <Alert tipo="error">{error}</Alert>
              <Adjuntos compraId={compra.id} archivos={archivos} externa={compra.origen_comprobante === 'externa'} onCambio={q.reload} />
              {qr && (
                <PDFViewer className="pdf-frame" showToolbar={false}>
                  <FacturaPDF factura={factura} items={itemsParaPDF(items)} qr={qr} />
                </PDFViewer>
              )}
            </div>
          </>
        )
      }}
    </Estado>
  )
}

function Adjuntos({ compraId, archivos, externa, onCambio }) {
  const input = useRef(null)
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const abrir = async (a) => {
    try {
      window.open(await archivosService.urlFirmada(a.ruta), '_blank', 'noopener')
    } catch (e) {
      setError(errMsg(e))
    }
  }
  const subir = async (e) => {
    const archivo = e.target.files[0]
    e.target.value = ''
    if (!archivo) return
    setSubiendo(true)
    setError('')
    try {
      await archivosService.subir(compraId, archivo)
      onCambio()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSubiendo(false)
    }
  }
  const quitar = async (a) => {
    if (!window.confirm(`¿Quitar el archivo "${a.nombre}"?`)) return
    try {
      await archivosService.borrar(a)
      onCambio()
    } catch (err) {
      setError(errMsg(err))
    }
  }

  return (
    <Card titulo="Archivos adjuntos" acciones={<button className="btn sm" onClick={() => input.current.click()} disabled={subiendo}>{subiendo ? 'Subiendo…' : '+ Adjuntar archivo'}</button>}>
      <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={subir} />
      {externa && archivos.length === 0 && <p className="muted">Esta factura es externa y todavía no tiene el archivo original adjunto.</p>}
      {!externa && archivos.length === 0 && <p className="muted">Sin archivos. Podés adjuntar el comprobante original (PDF, JPG o PNG, hasta 5 MB).</p>}
      {archivos.map((a) => (
        <div key={a.id} className="row" style={{ padding: '4px 0' }}>
          <button className="btn sm" onClick={() => abrir(a)}>Abrir</button>
          <span>{a.nombre}</span>
          <div className="spacer" />
          <button className="btn sm" onClick={() => quitar(a)}>Quitar</button>
        </div>
      ))}
      <Alert tipo="error">{error}</Alert>
    </Card>
  )
}
