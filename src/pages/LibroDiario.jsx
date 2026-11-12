import { Fragment, useMemo, useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import * as asientosService from '../services/asientos.js'
import { errMsg, fechaAR, hoy, money, ORIGENES } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Modal from '../components/ui/Modal.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'

const ANULABLES = ['manual', 'fondos']

export default function LibroDiario() {
  const q = useAsync(() => asientosService.listar(), [])
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', origen: '' })
  const [anulando, setAnulando] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const confirmarAnulacion = async () => {
    setEnviando(true)
    try {
      await asientosService.anular({ id: anulando.asiento.id, fecha: anulando.fecha, motivo: anulando.motivo })
      setAnulando(null)
      q.reload()
    } catch (e) {
      setAnulando({ ...anulando, error: errMsg(e) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <PageHeader titulo="Libro diario" subtitulo="Todos los asientos en orden cronológico. No se editan ni se borran: un error se corrige con un contraasiento." />
      <Estado q={q}>
        {(asientos) => <Listado asientos={asientos} filtros={filtros} setFiltros={setFiltros} onAnular={(a) => setAnulando({ asiento: a, fecha: hoy(), motivo: '', error: '' })} />}
      </Estado>

      <Modal
        abierto={!!anulando}
        titulo={`Anular asiento Nº ${anulando?.asiento.numero ?? ''}`}
        onClose={() => setAnulando(null)}
        pie={<><button className="btn" onClick={() => setAnulando(null)}>Cancelar</button><button className="btn danger" onClick={confirmarAnulacion} disabled={enviando}>Generar contraasiento</button></>}
      >
        {anulando && (
          <div className="stack">
            <p className="muted">Se agrega un nuevo asiento con los importes invertidos. El original queda en el libro como anulado.</p>
            <div className="form-grid">
              <Field label="Fecha de la anulación" col="col-5"><input type="date" min={anulando.asiento.fecha} value={anulando.fecha} onChange={(e) => setAnulando({ ...anulando, fecha: e.target.value, error: '' })} /></Field>
              <Field label="Motivo" col="col-7"><input value={anulando.motivo} onChange={(e) => setAnulando({ ...anulando, motivo: e.target.value })} placeholder="Ej.: error de carga" /></Field>
            </div>
            <AsientoPreview
              titulo="Contraasiento"
              lineas={asientosService.normalizarLineas(anulando.asiento).map((l) => ({ codigo: l.codigo, debe: l.haber, haber: l.debe }))}
            />
            <Alert tipo="error">{anulando.error}</Alert>
          </div>
        )}
      </Modal>
    </>
  )
}

function Listado({ asientos, filtros, setFiltros, onAnular }) {
  const anulados = useMemo(() => new Set(asientos.filter((a) => a.anula_asiento_id).map((a) => a.anula_asiento_id)), [asientos])

  // Orden cronológico: por número de asiento
  const filas = useMemo(
    () =>
      asientos
        .filter((a) => (!filtros.desde || a.fecha >= filtros.desde) && (!filtros.hasta || a.fecha <= filtros.hasta) && (!filtros.origen || a.origen === filtros.origen))
        .sort((x, y) => x.numero - y.numero),
    [asientos, filtros]
  )
  const set = (c) => (e) => setFiltros({ ...filtros, [c]: e.target.value })

  return (
    <div className="stack">
      <Card>
        <div className="form-grid">
          <Field label="Desde" col="col-3"><input type="date" value={filtros.desde} onChange={set('desde')} /></Field>
          <Field label="Hasta" col="col-3"><input type="date" value={filtros.hasta} onChange={set('hasta')} /></Field>
          <Field label="Origen" col="col-3">
            <select value={filtros.origen} onChange={set('origen')}>
              <option value="">Todos</option>
              {Object.entries(ORIGENES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Field>
          <div className="field col-3" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setFiltros({ desde: '', hasta: '', origen: '' })}>Limpiar filtros</button>
          </div>
        </div>
      </Card>

      <Card flush>
        <div className="table-wrap">
          <table>
            <thead><tr><th style={{ width: 70 }}>Nº</th><th style={{ width: 100 }}>Fecha</th><th>Cuenta / descripción</th><th className="num" style={{ width: 150 }}>Debe</th><th className="num" style={{ width: 150 }}>Haber</th></tr></thead>
            <tbody>
              {filas.length === 0 && <tr><td colSpan="5" className="vacio">No hay asientos para mostrar.</td></tr>}
              {filas.map((a) => {
                const anulado = anulados.has(a.id)
                return (
                  <Fragment key={a.id}>
                    <tr className="sub">
                      <td><b>{a.numero}</b></td>
                      <td>{fechaAR(a.fecha)}</td>
                      <td colSpan="3">
                        <span className="row" style={{ gap: 8 }}>
                          <b>{a.descripcion}</b>
                          <Badge tipo="olive">{ORIGENES[a.origen] ?? a.origen}</Badge>
                          {anulado && <Badge tipo="bad">Anulado</Badge>}
                          <span className="spacer" />
                          {ANULABLES.includes(a.origen) && !anulado && <button className="btn sm danger" onClick={() => onAnular(a)}>Anular</button>}
                        </span>
                      </td>
                    </tr>
                    {asientosService.normalizarLineas(a).map((l) => (
                      <tr key={l.id}>
                        <td></td><td></td>
                        <td style={{ paddingLeft: l.haber > 0 ? 44 : 14 }}><span className="muted mono">{l.codigo}</span> {l.nombre}</td>
                        <td className="num">{l.debe > 0 ? money(l.debe) : ''}</td>
                        <td className="num">{l.haber > 0 ? money(l.haber) : ''}</td>
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
