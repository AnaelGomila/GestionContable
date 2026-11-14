import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as chequesService from '../services/chequesEmitidos.js'
import { asientoPagoChequePropio } from '../lib/asientos.js'
import { errMsg, fechaAR, hoy, money } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Modal from '../components/ui/Modal.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'

const ESTADOS = { pendiente: <Badge tipo="warn">Pendiente</Badge>, pagado: null, anulado: <Badge>Anulado</Badge> }

export default function ChequesEmitidos() {
  const q = useAsync(() => chequesService.listar(), [])
  const [filtro, setFiltro] = useState('pendiente')
  const [pago, setPago] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const confirmar = async () => {
    setEnviando(true)
    try {
      await chequesService.pagar({ chequeId: pago.cheque.id, fecha: pago.fecha })
      setPago(null)
      q.reload()
    } catch (e) {
      setPago({ ...pago, error: errMsg(e) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <PageHeader titulo="Valores diferidos a pagar" subtitulo="Cheques de propia firma entregados a terceros. Se cargan desde Asiento manual, usando la cuenta Valores diferidos a pagar; acá se pagan el día del vencimiento.">
        <Link to="/asiento-manual" className="btn">Ir a Asiento manual</Link>
        <div className="tabs">
          {[['pendiente', 'Pendientes'], ['pagado', 'Pagados'], ['todos', 'Todos']].map(([v, t]) => (
            <button key={v} className={filtro === v ? 'activo' : ''} onClick={() => setFiltro(v)}>{t}</button>
          ))}
        </div>
      </PageHeader>

      <Card flush>
        <Estado q={q}>
          {(cheques) => {
            const filas = cheques.filter((c) => filtro === 'todos' || c.estado === filtro)
            const total = filas.filter((c) => c.estado !== 'anulado').reduce((a, c) => a + Number(c.monto), 0)
            return (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Vence</th><th>Beneficiario</th><th>Banco</th><th>Nº cheque</th><th>Emitido</th><th className="num">Monto</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filas.length === 0 && <tr><td colSpan="8" className="vacio">No hay cheques en esta vista.</td></tr>}
                    {filas.map((c) => (
                      <tr key={c.id}>
                        <td>{fechaAR(c.fecha_vencimiento)}</td>
                        <td>{c.beneficiario ?? '—'}</td>
                        <td>{c.banco}</td>
                        <td className="mono">{c.numero}</td>
                        <td>{fechaAR(c.fecha_emision)}</td>
                        <td className="num"><b>{money(c.monto)}</b></td>
                        <td>{c.estado === 'pagado' ? <Badge tipo="ok">Pagado {fechaAR(c.fecha_pago)}</Badge> : ESTADOS[c.estado]}</td>
                        <td className="right">
                          {c.estado === 'pendiente' && <button className="btn sm primary" onClick={() => setPago({ cheque: c, fecha: hoy() > c.fecha_vencimiento ? hoy() : c.fecha_vencimiento, error: '' })}>Pagar</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan="5">Total</td><td className="num">{money(total)}</td><td colSpan="2"></td></tr></tfoot>
                </table>
              </div>
            )
          }}
        </Estado>
      </Card>

      <Modal
        abierto={!!pago}
        titulo="Pagar valor diferido"
        onClose={() => setPago(null)}
        pie={<><button className="btn" onClick={() => setPago(null)}>Cancelar</button><button className="btn primary" onClick={confirmar} disabled={enviando}>Registrar pago</button></>}
      >
        {pago && (
          <div className="stack">
            <p>Cheque Nº <b>{pago.cheque.numero}</b> ({pago.cheque.banco}) por <b>{money(pago.cheque.monto)}</b>, con vencimiento el {fechaAR(pago.cheque.fecha_vencimiento)}.</p>
            <Field label="Fecha de pago" col="col-6">
              <input type="date" min={pago.cheque.fecha_emision} value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value, error: '' })} />
            </Field>
            <AsientoPreview lineas={asientoPagoChequePropio(Number(pago.cheque.monto))} />
            <Alert tipo="error">{pago.error}</Alert>
          </div>
        )}
      </Modal>
    </>
  )
}
