import { useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import * as ejerciciosService from '../services/ejercicios.js'
import * as cuentasService from '../services/cuentas.js'
import * as reportes from '../services/reportes.js'
import { armarCierre } from '../lib/cierre.js'
import { errMsg, fechaAR, hoy, money } from '../lib/format.js'
import { sumarDias } from '../lib/comprobantes.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Modal from '../components/ui/Modal.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'

export default function CierreEjercicio() {
  const q = useAsync(async () => {
    const ejercicios = await ejerciciosService.listar()
    const [cuentas, sumas] = await Promise.all([cuentasService.listar(), reportes.sumasPorCuenta()])
    return { ejercicios, cuentas, sumas }
  }, [])

  return (
    <>
      <PageHeader
        titulo="Cierre de ejercicio"
        subtitulo="Al terminar el ejercicio se cierran las cuentas de resultado y las patrimoniales, y se abre el ejercicio siguiente. Los importes los calcula el sistema."
      />
      <Estado q={q}>{(d) => <Contenido d={d} recargar={q.reload} />}</Estado>
    </>
  )
}

function Contenido({ d, recargar }) {
  const { ejercicios, cuentas, sumas } = d
  const abierto = ejercicios.find((e) => e.estado === 'abierto')
  const [hasta, setHasta] = useState(abierto?.hasta ?? '')
  const [modal, setModal] = useState(null)        // { tipo: 'cerrar' | 'reabrir', ejercicio }
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState('')

  if (!abierto) {
    return <Alert tipo="warn">Todavía no hay un ejercicio abierto. Registrá primero la apertura en "Empresa y capital".</Alert>
  }

  const cierre = armarCierre(cuentas, sumas)
  const cambioFecha = hasta && hasta !== abierto.hasta
  const siguiente = hasta ? sumarDias(hasta, 1) : ''

  // Solo se puede reabrir el último ejercicio cerrado (el que está justo antes del abierto)
  const reabrible = [...ejercicios].reverse().find((e) => e.estado === 'cerrado' && sumarDias(e.hasta, 1) === abierto.desde)

  const ejecutar = async (fn, mensaje) => {
    setEnviando(true)
    setError('')
    try {
      await fn()
      setModal(null)
      setAviso(mensaje)
      recargar()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setEnviando(false)
    }
  }

  const guardarFecha = () =>
    ejecutar(() => ejerciciosService.cambiarFin({ id: abierto.id, hasta }), `Fecha de cierre actualizada: ${fechaAR(hasta)}.`)

  return (
    <div className="stack">
      {aviso && <Alert tipo="ok">{aviso}</Alert>}
      {error && !modal && <Alert tipo="error">{error}</Alert>}

      <Card titulo="Ejercicio abierto">
        <div className="row" style={{ gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div className="muted">Inicio</div>
            <b>{fechaAR(abierto.desde)}</b>
          </div>
          <div>
            <div className="muted">Fecha de cierre</div>
            <div className="row" style={{ gap: 8 }}>
              <input type="date" value={hasta} min={abierto.desde} onChange={(e) => setHasta(e.target.value)} style={{ width: 'auto' }} />
              {cambioFecha && <button className="btn sm" disabled={enviando} onClick={guardarFecha}>Guardar fecha</button>}
            </div>
          </div>
          <div>
            <div className="muted">Resultado hasta ahora</div>
            <b>{money(cierre.resultado)}</b> <Badge tipo={cierre.resultado >= 0 ? 'ok' : 'bad'}>{cierre.resultado >= 0 ? 'ganancia' : 'pérdida'}</Badge>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn primary" disabled={cambioFecha || enviando} onClick={() => { setError(''); setModal({ tipo: 'cerrar' }) }}>
              Cerrar ejercicio
            </button>
          </div>
        </div>
        {cambioFecha && <Alert tipo="info" className="sep-arriba">Guardá la nueva fecha de cierre para poder cerrar el ejercicio.</Alert>}
        {!cambioFecha && abierto.hasta > hoy() && (
          <Alert tipo="info" className="sep-arriba">La fecha de cierre ({fechaAR(abierto.hasta)}) es posterior a hoy. Se puede cerrar igual; después, para cargar asientos hay que usar fechas del ejercicio siguiente o reabrir.</Alert>
        )}
      </Card>

      <h2 style={{ fontSize: 16 }}>Asientos que se van a generar</h2>
      {cierre.cierre.length === 0 ? (
        <Alert tipo="warn">Todavía no hay saldos para cerrar.</Alert>
      ) : (
        <>
          {cierre.refundicion.length > 0 && (
            <AsientoPreview titulo={`1 · Refundición de cuentas de resultado · ${fechaAR(abierto.hasta)}`} lineas={cierre.refundicion} />
          )}
          <AsientoPreview titulo={`${cierre.refundicion.length > 0 ? 2 : 1} · Cierre de cuentas patrimoniales · ${fechaAR(abierto.hasta)}`} lineas={cierre.cierre} />
          <AsientoPreview titulo={`${cierre.refundicion.length > 0 ? 3 : 2} · Apertura del ejercicio siguiente · ${fechaAR(sumarDias(abierto.hasta, 1))}`} lineas={cierre.apertura} />
        </>
      )}

      <Card titulo="Ejercicios" flush>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ejercicio</th><th>Estado</th><th className="num">Resultado</th><th>Cerrado el</th><th></th></tr></thead>
            <tbody>
              {[...ejercicios].reverse().map((e) => (
                <tr key={e.id}>
                  <td>{fechaAR(e.desde)} al {fechaAR(e.hasta)}</td>
                  <td>{e.estado === 'abierto' ? <Badge tipo="ok">Abierto</Badge> : <Badge>Cerrado</Badge>}</td>
                  <td className="num">{e.resultado != null ? money(e.resultado) : ''}</td>
                  <td>{e.cerrado_at ? fechaAR(e.cerrado_at) : ''}</td>
                  <td className="num">
                    {reabrible?.id === e.id && (
                      <button className="btn sm danger" onClick={() => { setError(''); setModal({ tipo: 'reabrir', ejercicio: e }) }}>Reabrir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {modal?.tipo === 'cerrar' && (
        <Modal
          titulo="¿Cerrar el ejercicio?"
          onClose={() => setModal(null)}
          pie={
            <>
              <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn primary" disabled={enviando} onClick={() => ejecutar(() => ejerciciosService.cerrar(abierto.id), `Ejercicio cerrado. El ejercicio siguiente empieza el ${fechaAR(siguiente)}.`)}>
                {enviando ? 'Cerrando…' : 'Cerrar ejercicio'}
              </button>
            </>
          }
        >
          <p>
            Se generan los tres asientos de la vista previa. Después del cierre no se pueden cargar asientos con fecha hasta el <b>{fechaAR(abierto.hasta)}</b>.
            Si te equivocás, podés reabrir el ejercicio mientras el siguiente no tenga movimientos.
          </p>
          {error && <Alert tipo="error" className="sep-arriba">{error}</Alert>}
        </Modal>
      )}

      {modal?.tipo === 'reabrir' && (
        <Modal
          titulo="¿Reabrir el ejercicio?"
          onClose={() => setModal(null)}
          pie={
            <>
              <button className="btn" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn danger" disabled={enviando} onClick={() => ejecutar(() => ejerciciosService.reabrir(modal.ejercicio.id), 'Ejercicio reabierto: los asientos del cierre quedaron anulados.')}>
                {enviando ? 'Reabriendo…' : 'Reabrir ejercicio'}
              </button>
            </>
          }
        >
          <p>
            Se anulan con contraasientos la refundición, el cierre patrimonial y la apertura del ejercicio del {fechaAR(modal.ejercicio.desde)} al {fechaAR(modal.ejercicio.hasta)}.
            Los asientos originales quedan en el libro diario, como todo lo que se anula.
          </p>
          {error && <Alert tipo="error" className="sep-arriba">{error}</Alert>}
        </Modal>
      )}
    </div>
  )
}
