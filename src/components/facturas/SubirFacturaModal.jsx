import { useState } from 'react'
import * as facturasSubidas from '../../services/facturasSubidas.js'
import * as archivosService from '../../services/archivos.js'
import { errMsg, hoy } from '../../lib/format.js'
import Modal from '../ui/Modal.jsx'
import Field from '../ui/Field.jsx'
import Alert from '../ui/Alert.jsx'

const INICIAL = { tipo: 'A', pv: '', nro: '', fecha: hoy(), proveedorId: '', cae: '', total: '', archivo: null }

// Sube el archivo de una factura recibida y guarda sus datos. No genera asiento.
export default function SubirFacturaModal({ abierto, proveedores, onClose, onHecho }) {
  const [f, setF] = useState(INICIAL)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (c) => (e) => setF({ ...f, [c]: e.target.value })

  const errArchivo = f.archivo ? archivosService.validar(f.archivo) : ''
  const listo = f.proveedorId && f.pv && f.nro && f.fecha && Number(f.total) > 0 && f.archivo && !errArchivo && (!f.cae || /^\d{14}$/.test(f.cae))

  const cerrar = () => { setF(INICIAL); setError(''); onClose() }

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      await facturasSubidas.subir({
        tipo: f.tipo, pv: Number(f.pv), nro: Number(f.nro), fecha: f.fecha, proveedorId: Number(f.proveedorId),
        cae: f.cae, total: Number(f.total), archivo: f.archivo,
      })
      setF(INICIAL)
      onHecho()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      ancho
      titulo="Subir factura recibida"
      onClose={cerrar}
      pie={<><button className="btn" onClick={cerrar}>Cancelar</button><button className="btn primary" onClick={confirmar} disabled={!listo || enviando}>{enviando ? 'Subiendo…' : 'Subir factura'}</button></>}
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Tipo" col="col-3">
            <select value={f.tipo} onChange={set('tipo')}><option>A</option><option>B</option><option>C</option></select>
          </Field>
          <Field label="Punto de venta" col="col-3"><input type="number" min="1" max="9999" value={f.pv} onChange={set('pv')} placeholder="1" /></Field>
          <Field label="Nº de factura" col="col-3"><input type="number" min="1" value={f.nro} onChange={set('nro')} placeholder="45" /></Field>
          <Field label="Fecha" col="col-3"><input type="date" value={f.fecha} onChange={set('fecha')} /></Field>
          <Field label="Proveedor" col="col-8" hint="Si no está, cargalo antes en Proveedores.">
            <select value={f.proveedorId} onChange={set('proveedorId')}>
              <option value="">Elegir proveedor…</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
            </select>
          </Field>
          <Field label="Total" col="col-4"><input className="num" type="number" min="0" step="0.01" value={f.total} onChange={set('total')} /></Field>
          <Field label="CAE (opcional)" col="col-12"><input className="mono" value={f.cae} onChange={(e) => setF({ ...f, cae: e.target.value.replace(/\D/g, '').slice(0, 14) })} placeholder="14 dígitos" /></Field>
          <Field label="Archivo" col="col-12" hint="PDF, JPG o PNG, hasta 5 MB.">
            <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setF({ ...f, archivo: e.target.files[0] ?? null })} />
          </Field>
        </div>
        {errArchivo && <Alert tipo="error">{errArchivo}</Alert>}
        <Alert tipo="error">{error}</Alert>
        <p className="muted">Se guarda como respaldo. No genera asiento: registralo en Asiento manual.</p>
      </div>
    </Modal>
  )
}
