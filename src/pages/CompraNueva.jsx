import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as comprasService from '../services/compras.js'
import * as productosService from '../services/productos.js'
import * as archivosService from '../services/archivos.js'
import * as empresaService from '../services/empresa.js'
import { proveedores } from '../services/terceros.js'
import { calcularTotales } from '../lib/iva.js'
import { asientoCompra } from '../lib/asientos.js'
import { caeAleatorio, sumarDias } from '../lib/comprobantes.js'
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
      <PageHeader titulo="Nueva compra" subtitulo="Se registra con una Factura A del proveedor: suma stock, IVA crédito fiscal y deja el total en Proveedores.">
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
  const [origen, setOrigen] = useState('generada')
  const [pv, setPv] = useState('')
  const [nro, setNro] = useState('')
  const [cae, setCae] = useState(caeAleatorio())
  const [caeVto, setCaeVto] = useState('')
  const [archivo, setArchivo] = useState(null)
  const archivoRef = useRef(null)
  const [items, setItems] = useState([nuevoItem()])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const proveedor = provs.find((p) => String(p.id) === String(proveedorId))

  // Al elegir proveedor se propone su punto de venta y el próximo número (editables)
  useEffect(() => {
    if (!proveedor || origen !== 'generada') return
    let vigente = true
    setPv(String(proveedor.punto_venta))
    comprasService.proponerNumero(proveedor.id, proveedor.punto_venta).then((n) => vigente && setNro(String(n))).catch(() => {})
    return () => { vigente = false }
  }, [proveedorId, origen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setCaeVto(sumarDias(fecha, 10)) }, [fecha])

  const cambiarOrigen = (o) => {
    setOrigen(o)
    setError('')
    if (o === 'externa') { setPv(''); setNro(''); setCae('') }
    else setCae(caeAleatorio())
  }

  const errArchivo = archivo ? archivosService.validar(archivo) : ''
  const validos = items.filter((i) => i.producto_id && Number(i.cantidad) > 0 && i.unitario !== '' && Number(i.unitario) >= 0)
  const totales = calcularTotales(
    validos.map((i) => ({ cantidad: i.cantidad, unitario: i.unitario, alicuota: productos.find((p) => String(p.id) === String(i.producto_id))?.alicuota_iva }))
  )
  const lineas = asientoCompra(totales)
  const listo = proveedorId && pv && nro && /^\d{14}$/.test(cae) && caeVto && !errArchivo && validos.length > 0 && validos.length === items.length

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      const id = await comprasService.registrar({
        fecha,
        proveedorId: Number(proveedorId),
        pv: Number(pv),
        nro: Number(nro),
        cae,
        caeVto,
        origen,
        items: validos.map((i) => ({ producto_id: Number(i.producto_id), cantidad: Number(i.cantidad), costo_unitario: Number(i.unitario) })),
      })
      let aviso
      if (archivo) {
        try { await archivosService.subir(id, archivo) } catch (e2) { aviso = 'La compra se registró, pero el archivo no se pudo adjuntar: ' + errMsg(e2) }
      }
      navigate(`/facturas/recibida/${id}`, { state: { aviso } })
    } catch (e) {
      setError(errMsg(e))
      setEnviando(false)
    }
  }

  return (
    <div className="stack">
      <Card titulo="Factura A del proveedor">
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button className={origen === 'generada' ? 'activo' : ''} onClick={() => cambiarOrigen('generada')}>Generar factura</button>
          <button className={origen === 'externa' ? 'activo' : ''} onClick={() => cambiarOrigen('externa')}>Cargar factura externa</button>
        </div>
        <div className="form-grid">
          <Field label="Fecha" col="col-3"><input type="date" min={empresa.fecha_apertura} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
          <Field label="Proveedor" col="col-5">
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">Elegir proveedor…</option>
              {provs.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
            </select>
          </Field>
          <Field label="Punto de venta" col="col-2"><input type="number" min="1" max="9999" value={pv} onChange={(e) => setPv(e.target.value)} /></Field>
          <Field label="Nº de factura" col="col-2" hint={origen === 'generada' ? 'Propuesto, editable' : undefined}><input type="number" min="1" value={nro} onChange={(e) => setNro(e.target.value)} /></Field>
          <Field label="CAE (14 dígitos)" col="col-6" hint={origen === 'generada' ? 'Generado por el sistema, editable' : 'Copialo de la factura original'}>
            <input className="mono" value={cae} onChange={(e) => setCae(e.target.value.replace(/\D/g, '').slice(0, 14))} />
          </Field>
          <Field label="Vencimiento del CAE" col="col-3"><input type="date" value={caeVto} onChange={(e) => setCaeVto(e.target.value)} /></Field>
          <Field label="Archivo original (opcional)" col="col-12" hint="PDF, JPG o PNG, hasta 5 MB. También se puede adjuntar después.">
            <input ref={archivoRef} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setArchivo(e.target.files[0] ?? null)} />
          </Field>
        </div>
        {errArchivo && <Alert tipo="error">{errArchivo}</Alert>}
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
