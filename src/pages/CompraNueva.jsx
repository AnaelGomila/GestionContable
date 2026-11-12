import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as comprasService from '../services/compras.js'
import * as productosService from '../services/productos.js'
import * as empresaService from '../services/empresa.js'
import { proveedores } from '../services/terceros.js'
import { calcularTotales } from '../lib/iva.js'
import { asientoCompra } from '../lib/asientos.js'
import { errMsg, hoy, money } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'
import ItemsEditor, { nuevoItem } from '../components/operaciones/ItemsEditor.jsx'

export default function CompraNueva() {
  const q = useAsync(async () => {
    const [empresa, productos, provs] = await Promise.all([empresaService.obtener(), productosService.listar(), proveedores.listar()])
    return { empresa, productos, provs }
  }, [])

  return (
    <>
      <PageHeader titulo="Nueva compra" subtitulo="Registrá la factura del proveedor. Suma stock, IVA crédito fiscal y deja el total en Proveedores.">
        <Link to="/compras" className="btn">← Volver</Link>
      </PageHeader>
      <Estado q={q}>
        {({ empresa, productos, provs }) =>
          !empresa?.apertura_registrada ? (
            <Alert tipo="warn">Primero registrá la apertura en <Link to="/empresa">Empresa y capital</Link>.</Alert>
          ) : (
            <Formulario empresa={empresa} productos={productos} proveedores={provs} />
          )
        }
      </Estado>
    </>
  )
}

function Formulario({ empresa, productos, proveedores: provs }) {
  const navigate = useNavigate()
  const [fecha, setFecha] = useState(hoy())
  const [proveedorId, setProveedorId] = useState('')
  const [comprobante, setComprobante] = useState('')
  const [items, setItems] = useState([nuevoItem()])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const validos = items.filter((i) => i.producto_id && Number(i.cantidad) > 0 && i.unitario !== '' && Number(i.unitario) >= 0)
  const totales = calcularTotales(
    validos.map((i) => ({ cantidad: i.cantidad, unitario: i.unitario, alicuota: productos.find((p) => String(p.id) === String(i.producto_id))?.alicuota_iva }))
  )
  const lineas = asientoCompra(totales)
  const listo = proveedorId && comprobante.trim() && validos.length > 0 && validos.length === items.length

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      await comprasService.registrar({
        fecha,
        proveedorId: Number(proveedorId),
        comprobante,
        items: validos.map((i) => ({ producto_id: Number(i.producto_id), cantidad: Number(i.cantidad), costo_unitario: Number(i.unitario) })),
      })
      navigate('/compras')
    } catch (e) {
      setError(errMsg(e))
      setEnviando(false)
    }
  }

  return (
    <div className="stack">
      <Card titulo="Comprobante del proveedor">
        <div className="form-grid">
          <Field label="Fecha" col="col-3"><input type="date" min={empresa.fecha_apertura} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
          <Field label="Proveedor" col="col-5" >
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">Elegir proveedor…</option>
              {provs.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
            </select>
          </Field>
          <Field label="Nº de factura del proveedor" col="col-4"><input value={comprobante} onChange={(e) => setComprobante(e.target.value)} placeholder="A 0005-00001234" /></Field>
        </div>
      </Card>

      <Card titulo="Productos comprados" flush>
        <ItemsEditor items={items} onChange={setItems} productos={productos} modo="compra" />
      </Card>

      <div className="grid cols-2">
        <AsientoPreview lineas={lineas} />
        <Card>
          <div className="totales-box" style={{ marginLeft: 0, width: '100%' }}>
            <div className="fila"><span>Neto</span><span className="mono">{money(totales.neto)}</span></div>
            <div className="fila"><span>IVA</span><span className="mono">{money(totales.iva)}</span></div>
            <div className="fila total"><span>Total a pagar al proveedor</span><span className="mono">{money(totales.total)}</span></div>
          </div>
        </Card>
      </div>

      <Alert tipo="error">{error}</Alert>
      <div className="row">
        <div className="spacer" />
        <Link to="/compras" className="btn">Cancelar</Link>
        <button className="btn primary" onClick={confirmar} disabled={!listo || enviando}>{enviando ? 'Registrando…' : 'Confirmar compra'}</button>
      </div>
    </div>
  )
}
