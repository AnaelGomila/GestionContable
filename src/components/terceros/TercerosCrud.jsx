import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync.js'
import { CONDICIONES_IVA, errMsg } from '../../lib/format.js'
import PageHeader from '../ui/PageHeader.jsx'
import Card from '../ui/Card.jsx'
import Estado from '../ui/Estado.jsx'
import Modal from '../ui/Modal.jsx'
import Field from '../ui/Field.jsx'
import Alert from '../ui/Alert.jsx'
import Badge from '../ui/Badge.jsx'

const VACIO = { razon_social: '', documento: '', condicion_iva: 'Responsable Inscripto', domicilio: '', localidad: '', provincia: '', telefono: '', email: '' }

const EXTRA_PROVEEDOR = { ingresos_brutos: '', inicio_actividades: '', punto_venta: 1 }

// Listado + alta/edición para clientes y proveedores.
// servicio: { listar, crear, actualizar }   esCliente: muestra el tipo de factura que le corresponde
export default function TercerosCrud({ titulo, subtitulo, singular, servicio, esCliente = false, esProveedor = false }) {
  const q = useAsync(() => servicio.listar(), [])
  const [form, setForm] = useState(null) // null = cerrado
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async () => {
    setError('')
    if (!form.razon_social.trim()) return setError('Ingresá la razón social o el nombre.')
    setGuardando(true)
    try {
      const { id, created_at, ...datos } = form
      if (esProveedor) datos.punto_venta = Number(datos.punto_venta) || 1
      const limpio = Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]))
      if (id) await servicio.actualizar(id, limpio)
      else await servicio.crear(limpio)
      setForm(null)
      q.reload()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <PageHeader titulo={titulo} subtitulo={subtitulo}>
        <button className="btn primary" onClick={() => { setError(''); setForm({ ...VACIO, ...(esProveedor ? EXTRA_PROVEEDOR : {}) }) }}>+ Nuevo {singular}</button>
      </PageHeader>

      <Card flush>
        <Estado q={q}>
          {(filas) => (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Razón social</th>
                    <th>CUIT / DNI</th>
                    <th>Condición IVA</th>
                    {esCliente && <th>Factura</th>}
                    <th>Localidad</th>
                    <th>Teléfono</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filas.length === 0 && <tr><td colSpan="7" className="vacio">Todavía no hay registros.</td></tr>}
                  {filas.map((f) => (
                    <tr key={f.id}>
                      <td><b>{f.razon_social}</b></td>
                      <td className="mono">{f.documento ?? '—'}</td>
                      <td>{f.condicion_iva}</td>
                      {esCliente && (
                        <td><Badge tipo={f.condicion_iva === 'Responsable Inscripto' ? 'olive' : 'wood'}>Factura {f.condicion_iva === 'Responsable Inscripto' ? 'A' : 'B'}</Badge></td>
                      )}
                      <td>{f.localidad ?? '—'}</td>
                      <td>{f.telefono ?? '—'}</td>
                      <td className="right"><button className="btn sm" onClick={() => { setError(''); setForm({ ...VACIO, ...(esProveedor ? EXTRA_PROVEEDOR : {}), ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v ?? ''])) }) }}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Estado>
      </Card>

      <Modal
        abierto={!!form}
        titulo={form?.id ? `Editar ${singular}` : `Nuevo ${singular}`}
        onClose={() => setForm(null)}
        pie={
          <>
            <button className="btn" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        {form && (
          <div className="stack">
            <div className="form-grid">
              <Field label="Razón social / nombre" col="col-12"><input value={form.razon_social} onChange={set('razon_social')} autoFocus /></Field>
              <Field label="CUIT / DNI" col="col-6"><input value={form.documento} onChange={set('documento')} placeholder="30-12345678-9" /></Field>
              <Field label="Condición frente al IVA" col="col-6" hint={esCliente ? 'Define si se emite Factura A o B.' : undefined}>
                <select value={form.condicion_iva} onChange={set('condicion_iva')}>
                  {CONDICIONES_IVA.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Domicilio" col="col-12"><input value={form.domicilio} onChange={set('domicilio')} /></Field>
              <Field label="Localidad" col="col-4"><input value={form.localidad} onChange={set('localidad')} /></Field>
              <Field label="Provincia" col="col-4"><input value={form.provincia} onChange={set('provincia')} /></Field>
              <Field label="Teléfono" col="col-4"><input value={form.telefono} onChange={set('telefono')} /></Field>
              <Field label="Email" col="col-12"><input type="email" value={form.email} onChange={set('email')} /></Field>
              {esProveedor && (
                <>
                  <Field label="Ingresos Brutos" col="col-4"><input value={form.ingresos_brutos} onChange={set('ingresos_brutos')} /></Field>
                  <Field label="Inicio de actividades" col="col-4"><input type="date" value={form.inicio_actividades} onChange={set('inicio_actividades')} /></Field>
                  <Field label="Punto de venta" col="col-4" hint="Se usa al proponer el nº de sus facturas."><input type="number" min="1" max="9999" value={form.punto_venta} onChange={set('punto_venta')} /></Field>
                </>
              )}
            </div>
            <Alert tipo="error">{error}</Alert>
          </div>
        )}
      </Modal>
    </>
  )
}
