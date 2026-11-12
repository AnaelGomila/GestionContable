import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as ventasService from '../services/ventas.js'
import * as productosService from '../services/productos.js'
import * as empresaService from '../services/empresa.js'
import { clientes } from '../services/terceros.js'
import { calcularTotales } from '../lib/iva.js'
import { asientoVenta } from '../lib/asientos.js'
import { errMsg, hoy, money, r2 } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'
import ItemsEditor, { nuevoItem } from '../components/operaciones/ItemsEditor.jsx'
import PagosEditor, { nuevoPago } from '../components/operaciones/PagosEditor.jsx'

export default function VentaNueva() {
  const q = useAsync(async () => {
    const [empresa, productos, cls] = await Promise.all([empresaService.obtener(), productosService.listar(), clientes.listar()])
    return { empresa, productos, cls }
  }, [])

  return (
    <>
      <PageHeader titulo="Nueva venta" subtitulo="El tipo de factura (A o B) se define solo según la condición del cliente. El cobro puede combinar varios medios de pago.">
        <Link to="/ventas" className="btn">← Volver</Link>
      </PageHeader>
      <Estado q={q}>
        {({ empresa, productos, cls }) =>
          !empresa?.apertura_registrada ? (
            <Alert tipo="warn">Primero registrá la apertura en <Link to="/empresa">Empresa y capital</Link>.</Alert>
          ) : (
            <Formulario empresa={empresa} productos={productos} clientes={cls} />
          )
        }
      </Estado>
    </>
  )
}

function Formulario({ empresa, productos, clientes: cls }) {
  const navigate = useNavigate()
  const [fecha, setFecha] = useState(hoy())
  const [clienteId, setClienteId] = useState('')
  const [items, setItems] = useState([nuevoItem()])
  const [pagos, setPagos] = useState([nuevoPago('efectivo')])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cliente = cls.find((c) => String(c.id) === clienteId)
  const tipoFactura = cliente ? (cliente.condicion_iva === 'Responsable Inscripto' ? 'A' : 'B') : null

  const prodDe = (id) => productos.find((p) => String(p.id) === String(id))
  const validos = items.filter((i) => i.producto_id && Number(i.cantidad) > 0 && i.unitario !== '' && Number(i.unitario) >= 0)
  const totales = calcularTotales(validos.map((i) => ({ cantidad: i.cantidad, unitario: i.unitario, alicuota: prodDe(i.producto_id)?.alicuota_iva })))
  const costo = r2(validos.reduce((a, i) => a + Number(i.cantidad) * (prodDe(i.producto_id)?.costo ?? 0), 0))

  // Controles previos al envío (la base de datos vuelve a validar todo)
  const problemas = []
  if (!cliente) problemas.push('Elegí un cliente.')
  if (validos.length === 0 || validos.length !== items.length) problemas.push('Completá todos los productos (producto, cantidad y precio).')
  const pedido = {}
  for (const i of validos) pedido[i.producto_id] = (pedido[i.producto_id] || 0) + Number(i.cantidad)
  for (const [id, cant] of Object.entries(pedido)) {
    const p = prodDe(id)
    if (p && cant > p.stock) problemas.push(`Stock insuficiente de ${p.nombre} (disponible ${p.stock}).`)
  }
  const asignado = r2(pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0))
  if (totales.total > 0 && asignado !== totales.total) problemas.push('Los medios de pago deben sumar el total de la venta.')
  for (const p of pagos) {
    if (!(Number(p.monto) > 0)) { problemas.push('Cada medio de pago necesita un monto.'); break }
  }
  for (const p of pagos) {
    if ((p.medio === 'cheque_dia' || p.medio === 'cheque_diferido') && (!p.banco.trim() || !p.numero_cheque.trim())) {
      problemas.push('Completá banco y número de cada cheque.'); break
    }
  }
  for (const p of pagos) {
    if (p.medio === 'cheque_diferido' && (!p.fecha_cobro || p.fecha_cobro < fecha)) {
      problemas.push('Indicá la fecha de cobro del cheque diferido (no puede ser anterior a la venta).'); break
    }
  }

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      const r = await ventasService.registrar({
        fecha,
        clienteId: Number(clienteId),
        items: validos.map((i) => ({ producto_id: Number(i.producto_id), cantidad: Number(i.cantidad), precio_unitario: Number(i.unitario) })),
        pagos: pagos.map((p) => ({
          medio: p.medio,
          monto: Number(p.monto),
          banco: p.banco || null,
          numero_cheque: p.numero_cheque || null,
          fecha_cobro: p.medio === 'cheque_diferido' ? p.fecha_cobro : null,
        })),
      })
      navigate(`/facturas/${r.factura_id}`)
    } catch (e) {
      setError(errMsg(e))
      setEnviando(false)
    }
  }

  const lineas = asientoVenta({ ...totales, costo, pagos })

  return (
    <div className="stack">
      <Card titulo="Cliente">
        <div className="form-grid">
          <Field label="Fecha" col="col-3"><input type="date" min={empresa.fecha_apertura} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
          <Field label="Cliente" col="col-6">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Elegir cliente…</option>
              {cls.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
          </Field>
          <div className="field col-3">
            <label>Comprobante</label>
            <div style={{ paddingTop: 6 }}>
              {tipoFactura ? <Badge tipo={tipoFactura === 'A' ? 'olive' : 'wood'}>Factura {tipoFactura}</Badge> : <span className="muted">—</span>}
              {cliente && <small className="muted"> · {cliente.condicion_iva}</small>}
            </div>
          </div>
        </div>
      </Card>

      <Card titulo="Productos vendidos" flush>
        <ItemsEditor items={items} onChange={setItems} productos={productos} modo="venta" />
        <div style={{ padding: '14px 20px' }}>
          <div className="totales-box">
            <div className="fila"><span>Importe neto</span><span className="mono">{money(totales.neto)}</span></div>
            <div className="fila"><span>IVA</span><span className="mono">{money(totales.iva)}</span></div>
            <div className="fila total"><span>Total</span><span className="mono">{money(totales.total)}</span></div>
          </div>
        </div>
      </Card>

      <Card titulo="Cobro">
        <PagosEditor pagos={pagos} onChange={setPagos} total={totales.total} fechaVenta={fecha} />
      </Card>

      {totales.total > 0 && <AsientoPreview lineas={lineas} />}

      {problemas.length > 0 && (
        <Alert tipo="warn">
          <b>Falta completar:</b>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{[...new Set(problemas)].map((p) => <li key={p}>{p}</li>)}</ul>
        </Alert>
      )}
      <Alert tipo="error">{error}</Alert>
      <div className="row">
        <div className="spacer" />
        <Link to="/ventas" className="btn">Cancelar</Link>
        <button className="btn primary" onClick={confirmar} disabled={problemas.length > 0 || enviando}>
          {enviando ? 'Registrando…' : `Confirmar venta y emitir factura ${tipoFactura ?? ''}`}
        </button>
      </div>
    </div>
  )
}
