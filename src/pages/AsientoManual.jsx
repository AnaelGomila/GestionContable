import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { useCuentas } from '../context/CuentasContext.jsx'
import * as empresaService from '../services/empresa.js'
import * as asientosService from '../services/asientos.js'
import { asientoManual } from '../lib/asientos.js'
import { errMsg, hoy, money, r2 } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'

let contador = 0
const nuevaLinea = () => ({ key: ++contador, cuenta: '', debe: '', haber: '' })

export default function AsientoManual() {
  const q = useAsync(() => empresaService.obtener(), [])
  return (
    <>
      <PageHeader titulo="Asiento manual" subtitulo="Para ajustes y operaciones que no pasan por compras o ventas (alquileres, sueldos, gastos, préstamos…). El debe tiene que ser igual al haber." />
      <Estado q={q}>
        {(empresa) =>
          !empresa?.apertura_registrada ? (
            <Alert tipo="warn">Primero registrá la apertura en <Link to="/empresa">Empresa y capital</Link>.</Alert>
          ) : (
            <Formulario fechaMin={empresa.fecha_apertura} />
          )
        }
      </Estado>
    </>
  )
}

function Formulario({ fechaMin }) {
  const { cuentas } = useCuentas()
  const [fecha, setFecha] = useState(hoy())
  const [descripcion, setDescripcion] = useState('')
  const [lineas, setLineas] = useState([nuevaLinea(), nuevaLinea()])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [enviando, setEnviando] = useState(false)

  const actualizar = (key, cambios) => { setOk(''); setLineas(lineas.map((l) => (l.key === key ? { ...l, ...cambios } : l))) }
  const num = (v) => Number(v) || 0
  const debe = r2(lineas.reduce((a, l) => a + num(l.debe), 0))
  const haber = r2(lineas.reduce((a, l) => a + num(l.haber), 0))
  const conImporte = lineas.filter((l) => l.cuenta && (num(l.debe) > 0 || num(l.haber) > 0))
  const balancea = debe === haber && debe > 0
  const listo = balancea && conImporte.length >= 2 && descripcion.trim() && lineas.every((l) => !(num(l.debe) > 0 && num(l.haber) > 0))

  const guardar = async () => {
    setEnviando(true)
    setError('')
    try {
      await asientosService.manual({
        fecha,
        descripcion,
        lineas: conImporte.map((l) => ({ cuenta: l.cuenta, debe: num(l.debe), haber: num(l.haber) })),
      })
      setDescripcion('')
      setLineas([nuevaLinea(), nuevaLinea()])
      setOk('Asiento registrado en el libro diario.')
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="stack">
      <Alert tipo="info">
        Las cuentas de <b>control</b> (Mercaderías, Cheques diferidos a cobrar y Proveedores) están bloqueadas: solo se mueven con compras, ventas, cobros de cheques y pagos registrados,
        así el libro siempre coincide con el stock, los cheques y las compras.
      </Alert>

      <Card titulo="Datos del asiento">
        <div className="form-grid">
          <Field label="Fecha" col="col-3"><input type="date" min={fechaMin} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
          <Field label="Descripción" col="col-9"><input value={descripcion} onChange={(e) => { setDescripcion(e.target.value); setOk('') }} placeholder="Ej.: Pago de alquiler del local — noviembre" /></Field>
        </div>
      </Card>

      <Card titulo="Líneas" flush>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cuenta</th><th className="num" style={{ width: 170 }}>Debe</th><th className="num" style={{ width: 170 }}>Haber</th><th style={{ width: 44 }}></th></tr></thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={l.key}>
                  <td>
                    <select value={l.cuenta} onChange={(e) => actualizar(l.key, { cuenta: e.target.value })}>
                      <option value="">Elegir cuenta…</option>
                      {cuentas.map((c) => (
                        <option key={c.id} value={c.codigo} disabled={c.es_control}>{c.codigo} · {c.nombre}{c.es_control ? ' (cuenta de control)' : ''}</option>
                      ))}
                    </select>
                  </td>
                  <td><input className="num" type="number" min="0" step="0.01" value={l.debe} onChange={(e) => actualizar(l.key, { debe: e.target.value, haber: e.target.value ? '' : l.haber })} /></td>
                  <td><input className="num" type="number" min="0" step="0.01" value={l.haber} onChange={(e) => actualizar(l.key, { haber: e.target.value, debe: e.target.value ? '' : l.debe })} /></td>
                  <td><button className="btn sm icon" disabled={lineas.length <= 2} onClick={() => setLineas(lineas.filter((x) => x.key !== l.key))}>✕</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <button className="btn sm" onClick={() => setLineas([...lineas, nuevaLinea()])}>+ Agregar línea</button>{' '}
                  <span className={balancea ? 'balance-ok' : 'balance-mal'}>{balancea ? '✓ balancea' : debe === haber ? '' : `Diferencia ${money(Math.abs(debe - haber))}`}</span>
                </td>
                <td className="num">{money(debe)}</td>
                <td className="num">{money(haber)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {conImporte.length >= 2 && <AsientoPreview lineas={asientoManual(conImporte)} titulo="Así va a quedar el asiento" />}

      <Alert tipo="error">{error}</Alert>
      <Alert tipo="ok">{ok}</Alert>
      <div className="row">
        <div className="spacer" />
        <button className="btn primary" onClick={guardar} disabled={!listo || enviando}>{enviando ? 'Registrando…' : 'Registrar asiento'}</button>
      </div>
    </div>
  )
}
