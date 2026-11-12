import { useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import * as productosService from '../services/productos.js'
import * as empresaService from '../services/empresa.js'
import { errMsg, fechaAR, money } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Modal from '../components/ui/Modal.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'

const VACIO = { codigo: '', nombre: '', costo: '', precio_neto: '', alicuota_iva: 21, stock_inicial: 0 }

export default function Productos() {
  const q = useAsync(async () => {
    const [productos, empresa] = await Promise.all([productosService.listar(), empresaService.obtener()])
    return { productos, apertura: !!empresa?.apertura_registrada }
  }, [])
  const [form, setForm] = useState(null)
  const [mov, setMov] = useState(null) // { producto, filas }
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (apertura) => {
    setError('')
    if (!form.codigo.trim() || !form.nombre.trim()) return setError('Completá el código y el nombre.')
    if (form.costo === '' || form.precio_neto === '') return setError('Completá el costo y el precio.')
    setGuardando(true)
    try {
      const datos = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        costo: Number(form.costo),
        precio_neto: Number(form.precio_neto),
        alicuota_iva: Number(form.alicuota_iva),
      }
      // El stock inicial solo se puede definir antes de registrar la apertura
      if (!apertura) datos.stock_inicial = Number(form.stock_inicial) || 0
      if (form.id) await productosService.actualizar(form.id, datos)
      else await productosService.crear(datos)
      setForm(null)
      q.reload()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setGuardando(false)
    }
  }

  const verMovimientos = async (producto) => {
    setMov({ producto, filas: null })
    try {
      setMov({ producto, filas: await productosService.movimientos(producto.id) })
    } catch (e) {
      setMov({ producto, filas: [], error: errMsg(e) })
    }
  }

  return (
    <Estado q={q}>
      {({ productos, apertura }) => {
        const totalValor = productos.reduce((a, p) => a + p.valor, 0)
        return (
          <>
            <PageHeader titulo="Productos" subtitulo="Lo que vendemos. El stock es de solo lectura: cambia únicamente con compras y ventas registradas.">
              <button className="btn primary" onClick={() => { setError(''); setForm({ ...VACIO }) }}>+ Nuevo producto</button>
            </PageHeader>

            <Card flush>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Producto</th>
                      <th className="num">Costo</th>
                      <th className="num">Precio neto</th>
                      <th className="num">IVA</th>
                      <th className="num">Stock</th>
                      <th className="num">Valor en stock</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.length === 0 && <tr><td colSpan="8" className="vacio">No hay productos.</td></tr>}
                    {productos.map((p) => (
                      <tr key={p.id}>
                        <td className="mono">{p.codigo}</td>
                        <td><b>{p.nombre}</b></td>
                        <td className="num">{money(p.costo)}</td>
                        <td className="num">{money(p.precio_neto)}</td>
                        <td className="num">{p.alicuota_iva}%</td>
                        <td className="num">
                          {apertura ? p.stock : <span title="Stock inicial (se registra con la apertura)">{p.stock_inicial} <Badge tipo="warn">inicial</Badge></span>}
                        </td>
                        <td className="num">{apertura ? money(p.valor) : money(p.stock_inicial * p.costo)}</td>
                        <td className="right nowrap">
                          <button className="btn sm" onClick={() => verMovimientos(p)}>Movimientos</button>{' '}
                          <button className="btn sm" onClick={() => { setError(''); setForm({ ...p }) }}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="6">{apertura ? 'Stock valorizado' : 'Stock inicial valorizado (será el saldo de Mercaderías)'}</td>
                      <td className="num">{money(apertura ? totalValor : productos.reduce((a, p) => a + p.stock_inicial * p.costo, 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <Modal
              abierto={!!form}
              titulo={form?.id ? 'Editar producto' : 'Nuevo producto'}
              onClose={() => setForm(null)}
              pie={
                <>
                  <button className="btn" onClick={() => setForm(null)}>Cancelar</button>
                  <button className="btn primary" onClick={() => guardar(apertura)} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
                </>
              }
            >
              {form && (
                <div className="stack">
                  <div className="form-grid">
                    <Field label="Código" col="col-4"><input value={form.codigo} onChange={set('codigo')} /></Field>
                    <Field label="Nombre" col="col-8"><input value={form.nombre} onChange={set('nombre')} /></Field>
                    <Field label="Costo" col="col-4"><input className="num" type="number" min="0" step="0.01" value={form.costo} onChange={set('costo')} /></Field>
                    <Field label="Precio neto de venta" col="col-4"><input className="num" type="number" min="0" step="0.01" value={form.precio_neto} onChange={set('precio_neto')} /></Field>
                    <Field label="Alícuota de IVA" col="col-4">
                      <select value={form.alicuota_iva} onChange={set('alicuota_iva')}>
                        <option value="21">21%</option>
                        <option value="10.5">10,5%</option>
                      </select>
                    </Field>
                    <Field
                      label="Stock inicial"
                      col="col-12"
                      hint={apertura ? 'La apertura ya fue registrada: el stock solo cambia con compras y ventas.' : 'Cantidad con la que arranca la empresa. Suma al saldo inicial de Mercaderías.'}
                    >
                      <input className="num" type="number" min="0" step="1" value={apertura ? 0 : form.stock_inicial} onChange={set('stock_inicial')} disabled={apertura} />
                    </Field>
                  </div>
                  <Alert tipo="error">{error}</Alert>
                </div>
              )}
            </Modal>

            <Modal abierto={!!mov} ancho titulo={`Movimientos · ${mov?.producto.nombre ?? ''}`} onClose={() => setMov(null)}>
              {mov && (mov.filas == null ? <p className="muted">Cargando…</p> : (
                <div className="table-wrap">
                  <Alert tipo="error">{mov.error}</Alert>
                  <table>
                    <thead><tr><th>Fecha</th><th>Tipo</th><th className="num">Cantidad</th><th className="num">Costo unitario</th></tr></thead>
                    <tbody>
                      {mov.filas.length === 0 && <tr><td colSpan="4" className="vacio">Sin movimientos todavía.</td></tr>}
                      {mov.filas.map((m) => (
                        <tr key={m.id}>
                          <td>{fechaAR(m.fecha)}</td>
                          <td><Badge tipo={m.cantidad > 0 ? 'ok' : 'wood'}>{m.tipo}</Badge></td>
                          <td className="num">{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                          <td className="num">{money(m.costo_unitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </Modal>
          </>
        )
      }}
    </Estado>
  )
}
