import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as comprasService from '../services/compras.js'
import { asientoPagoProveedor } from '../lib/asientos.js'
import { errMsg, fechaAR, hoy, money } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Modal from '../components/ui/Modal.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'

export default function Compras() {
  const q = useAsync(() => comprasService.listar(), [])
  const [detalle, setDetalle] = useState(null) // { compra, items }
  const [pago, setPago] = useState(null)

  const abrirDetalle = async (compra) => {
    setDetalle({ compra, items: null })
    try {
      setDetalle({ compra, items: await comprasService.items(compra.id) })
    } catch (e) {
      setDetalle({ compra, items: [], error: errMsg(e) })
    }
  }

  return (
    <>
      <PageHeader titulo="Compras" subtitulo="Cada compra suma stock y IVA crédito fiscal, y queda en Proveedores hasta que se paga.">
        <Link to="/compras/nueva" className="btn primary">+ Nueva compra</Link>
      </PageHeader>

      <Card flush>
        <Estado q={q}>
          {(compras) => (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Proveedor</th><th>Comprobante</th>
                    <th className="num">Neto</th><th className="num">IVA</th><th className="num">Total</th>
                    <th className="num">Saldo</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {compras.length === 0 && <tr><td colSpan="9" className="vacio">Todavía no hay compras registradas.</td></tr>}
                  {compras.map((c) => (
                    <tr key={c.id}>
                      <td>{fechaAR(c.fecha)}</td>
                      <td>{c.proveedor}</td>
                      <td className="mono">{c.comprobante}</td>
                      <td className="num">{money(c.neto)}</td>
                      <td className="num">{money(c.iva)}</td>
                      <td className="num"><b>{money(c.total)}</b></td>
                      <td className="num">{money(c.saldo)}</td>
                      <td>{c.saldo === 0 ? <Badge tipo="ok">Pagada</Badge> : c.pagado > 0 ? <Badge tipo="warn">Pago parcial</Badge> : <Badge tipo="wood">Impaga</Badge>}</td>
                      <td className="right nowrap">
                        <button className="btn sm" onClick={() => abrirDetalle(c)}>Detalle</button>{' '}
                        <Link to={`/facturas/recibida/${c.id}`} className="btn sm">Factura</Link>{' '}
                        {c.saldo > 0 && <button className="btn sm primary" onClick={() => setPago({ compra: c, fecha: hoy(), monto: c.saldo, medio: 'banco', error: '' })}>Pagar</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Estado>
      </Card>

      <Modal abierto={!!detalle} ancho titulo={`Compra ${detalle?.compra.comprobante ?? ''}`} onClose={() => setDetalle(null)}>
        {detalle && (
          <div className="stack">
            <div className="row"><b>{detalle.compra.proveedor}</b><span className="muted">{fechaAR(detalle.compra.fecha)}</span></div>
            {detalle.items == null ? <p className="muted">Cargando…</p> : (
              <div className="table-wrap">
                <Alert tipo="error">{detalle.error}</Alert>
                <table>
                  <thead><tr><th>Código</th><th>Producto</th><th className="num">Cant.</th><th className="num">Costo unit.</th><th className="num">IVA</th><th className="num">Neto</th></tr></thead>
                  <tbody>
                    {detalle.items.map((i) => (
                      <tr key={i.id}>
                        <td className="mono">{i.codigo}</td><td>{i.descripcion}</td><td className="num">{i.cantidad}</td>
                        <td className="num">{money(i.costo_unitario)}</td><td className="num">{i.alicuota_iva}%</td><td className="num">{money(i.neto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan="5">Neto</td><td className="num">{money(detalle.compra.neto)}</td></tr>
                    <tr><td colSpan="5">IVA crédito fiscal</td><td className="num">{money(detalle.compra.iva)}</td></tr>
                    <tr><td colSpan="5">Total</td><td className="num">{money(detalle.compra.total)}</td></tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <PagoModal pago={pago} setPago={setPago} onHecho={() => { setPago(null); q.reload() }} />
    </>
  )
}

function PagoModal({ pago, setPago, onHecho }) {
  const [enviando, setEnviando] = useState(false)
  if (!pago) return null
  const set = (c) => (e) => setPago({ ...pago, [c]: e.target.value, error: '' })
  const monto = Number(pago.monto) || 0

  const confirmar = async () => {
    setEnviando(true)
    try {
      await comprasService.pagar({ compraId: pago.compra.id, fecha: pago.fecha, monto, medio: pago.medio })
      onHecho()
    } catch (e) {
      setPago({ ...pago, error: errMsg(e) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo={`Pagar compra ${pago.compra.comprobante}`}
      onClose={() => setPago(null)}
      pie={<><button className="btn" onClick={() => setPago(null)}>Cancelar</button><button className="btn primary" onClick={confirmar} disabled={enviando || monto <= 0 || monto > pago.compra.saldo}>Registrar pago</button></>}
    >
      <div className="stack">
        <p>Saldo pendiente con <b>{pago.compra.proveedor}</b>: <b>{money(pago.compra.saldo)}</b></p>
        <div className="form-grid">
          <Field label="Fecha" col="col-4"><input type="date" min={pago.compra.fecha} value={pago.fecha} onChange={set('fecha')} /></Field>
          <Field label="Monto" col="col-4"><input className="num" type="number" min="0" step="0.01" value={pago.monto} onChange={set('monto')} /></Field>
          <Field label="Se paga desde" col="col-4">
            <select value={pago.medio} onChange={set('medio')}><option value="banco">Banco</option><option value="caja">Caja</option></select>
          </Field>
        </div>
        {monto > 0 && <AsientoPreview lineas={asientoPagoProveedor({ medio: pago.medio, monto })} />}
        <Alert tipo="error">{pago.error}</Alert>
      </div>
    </Modal>
  )
}
