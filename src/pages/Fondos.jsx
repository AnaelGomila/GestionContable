import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as asientosService from '../services/asientos.js'
import * as cuentasService from '../services/cuentas.js'
import * as empresaService from '../services/empresa.js'
import { asientoFondos } from '../lib/asientos.js'
import { errMsg, fechaAR, hoy, money } from '../lib/format.js'
import { saldoDe } from '../lib/contabilidad.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'

const ORIGENES = [
  { codigo: '1.1.01', nombre: 'Caja' },
  { codigo: '1.1.02', nombre: 'Banco cuenta corriente' },
]
const DESTINOS = [
  ...ORIGENES,
  { codigo: '1.2.01', nombre: 'Muebles y útiles' },
  { codigo: '1.2.02', nombre: 'Equipos de computación' },
  { codigo: '1.2.03', nombre: 'Rodados' },
  { codigo: '1.2.04', nombre: 'Inmuebles' },
]

export default function Fondos() {
  const q = useAsync(async () => {
    const [empresa, saldos, movimientos] = await Promise.all([
      empresaService.obtener(),
      cuentasService.saldos(),
      asientosService.listar({ origen: 'fondos' }),
    ])
    return { empresa, saldos, movimientos }
  }, [])

  return (
    <>
      <PageHeader titulo="Fondos" subtitulo="Reorganizá el capital: pasá plata entre Caja y Banco o destinala a bienes de uso. Cada movimiento genera su asiento." />
      <Estado q={q}>
        {({ empresa, saldos, movimientos }) =>
          !empresa?.apertura_registrada ? (
            <Alert tipo="warn">Primero registrá la apertura en <Link to="/empresa">Empresa y capital</Link>.</Alert>
          ) : (
            <div className="stack">
              <Formulario saldos={saldos} fechaMin={empresa.fecha_apertura} onGuardado={q.reload} />
              <Card titulo="Movimientos de fondos" flush>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nº</th><th>Fecha</th><th>Descripción</th><th className="num">Importe</th></tr></thead>
                    <tbody>
                      {movimientos.length === 0 && <tr><td colSpan="4" className="vacio">Todavía no hay movimientos.</td></tr>}
                      {movimientos.map((m) => (
                        <tr key={m.id}>
                          <td>{m.numero}</td>
                          <td>{fechaAR(m.fecha)}</td>
                          <td>{m.descripcion}</td>
                          <td className="num">{money(m.asiento_lineas.reduce((a, l) => a + Number(l.debe), 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )
        }
      </Estado>
    </>
  )
}

function Formulario({ saldos, fechaMin, onGuardado }) {
  const [f, setF] = useState({ fecha: hoy(), origen: '1.1.02', destino: '1.2.01', monto: '', descripcion: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (c) => (e) => { setF({ ...f, [c]: e.target.value }); setOk('') }

  const monto = Number(f.monto) || 0
  const saldoOrigen = saldoDe(saldos, f.origen)
  const lineas = asientoFondos({ origen: f.origen, destino: f.destino, monto })
  const invalido = monto <= 0 || f.origen === f.destino || monto > saldoOrigen

  const registrar = async () => {
    setEnviando(true)
    setError('')
    try {
      await asientosService.fondos({ ...f, monto })
      setF({ ...f, monto: '', descripcion: '' })
      setOk('Movimiento registrado.')
      onGuardado()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card titulo="Nuevo movimiento">
      <div className="stack">
        <div className="form-grid">
          <Field label="Fecha" col="col-3"><input type="date" min={fechaMin} value={f.fecha} onChange={set('fecha')} /></Field>
          <Field label="Sale de" col="col-3" hint={`Saldo disponible: ${money(saldoOrigen)}`}>
            <select value={f.origen} onChange={set('origen')}>
              {ORIGENES.map((o) => <option key={o.codigo} value={o.codigo}>{o.nombre}</option>)}
            </select>
          </Field>
          <Field label="Va a" col="col-3">
            <select value={f.destino} onChange={set('destino')}>
              {DESTINOS.map((o) => <option key={o.codigo} value={o.codigo}>{o.nombre}</option>)}
            </select>
          </Field>
          <Field label="Monto" col="col-3"><input className="num" type="number" min="0" step="0.01" value={f.monto} onChange={set('monto')} /></Field>
          <Field label="Descripción (opcional)" col="col-12"><input value={f.descripcion} onChange={set('descripcion')} placeholder="Ej.: Compra de escritorios para el local" /></Field>
        </div>
        {monto > saldoOrigen && <Alert tipo="warn">El monto supera el saldo disponible en la cuenta de origen.</Alert>}
        {f.origen === f.destino && <Alert tipo="warn">El origen y el destino deben ser distintos.</Alert>}
        {monto > 0 && <AsientoPreview lineas={lineas} />}
        <Alert tipo="error">{error}</Alert>
        <Alert tipo="ok">{ok}</Alert>
        <div className="row">
          <div className="spacer" />
          <button className="btn primary" onClick={registrar} disabled={enviando || invalido}>{enviando ? 'Registrando…' : 'Registrar movimiento'}</button>
        </div>
      </div>
    </Card>
  )
}
