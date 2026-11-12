import { useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import * as chequesService from '../services/cheques.js'
import { asientoCobroCheque } from '../lib/asientos.js'
import { errMsg, fechaAR, hoy, money } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Modal from '../components/ui/Modal.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'

export default function Cheques() {
  const q = useAsync(() => chequesService.listar(), [])
  const [filtro, setFiltro] = useState('pendiente')
  const [cobro, setCobro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const confirmar = async () => {
    setEnviando(true)
    try {
      await chequesService.cobrar({ pagoId: cobro.cheque.id, fecha: cobro.fecha })
      setCobro(null)
      q.reload()
    } catch (e) {
      setCobro({ ...cobro, error: errMsg(e) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <PageHeader titulo="Cheques diferidos" subtitulo="Cheques recibidos en ventas. Al cobrarlos pasan de 'Cheques diferidos a cobrar' al Banco.">
        <div className="tabs">
          {[['pendiente', 'Pendientes'], ['cobrado', 'Cobrados'], ['todos', 'Todos']].map(([v, t]) => (
            <button key={v} className={filtro === v ? 'activo' : ''} onClick={() => setFiltro(v)}>{t}</button>
          ))}
        </div>
      </PageHeader>

      <Card flush>
        <Estado q={q}>
          {(cheques) => {
            const filas = cheques.filter((c) => filtro === 'todos' || c.estado === filtro)
            const total = filas.reduce((a, c) => a + Number(c.monto), 0)
            return (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Vence</th><th>Cliente</th><th>Banco</th><th>Nº cheque</th><th>Venta</th><th className="num">Monto</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filas.length === 0 && <tr><td colSpan="8" className="vacio">No hay cheques en esta vista.</td></tr>}
                    {filas.map((c) => (
                      <tr key={c.id}>
                        <td>{fechaAR(c.fecha_cobro)}</td>
                        <td>{c.ventas?.clientes?.razon_social ?? '—'}</td>
                        <td>{c.banco}</td>
                        <td className="mono">{c.numero_cheque}</td>
                        <td>{fechaAR(c.ventas?.fecha)}</td>
                        <td className="num"><b>{money(c.monto)}</b></td>
                        <td>{c.estado === 'cobrado' ? <Badge tipo="ok">Cobrado {fechaAR(c.fecha_cobrado)}</Badge> : <Badge tipo="warn">Pendiente</Badge>}</td>
                        <td className="right">
                          {c.estado === 'pendiente' && <button className="btn sm primary" onClick={() => setCobro({ cheque: c, fecha: hoy(), error: '' })}>Cobrar</button>}
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
        abierto={!!cobro}
        titulo="Cobrar cheque diferido"
        onClose={() => setCobro(null)}
        pie={<><button className="btn" onClick={() => setCobro(null)}>Cancelar</button><button className="btn primary" onClick={confirmar} disabled={enviando}>Registrar cobro</button></>}
      >
        {cobro && (
          <div className="stack">
            <p>Cheque Nº <b>{cobro.cheque.numero_cheque}</b> ({cobro.cheque.banco}) por <b>{money(cobro.cheque.monto)}</b>.</p>
            <Field label="Fecha de cobro" col="col-6">
              <input type="date" min={cobro.cheque.ventas?.fecha} value={cobro.fecha} onChange={(e) => setCobro({ ...cobro, fecha: e.target.value, error: '' })} />
            </Field>
            <AsientoPreview lineas={asientoCobroCheque(Number(cobro.cheque.monto))} />
            <Alert tipo="error">{cobro.error}</Alert>
          </div>
        )}
      </Modal>
    </>
  )
}
