import { useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import * as cuentasService from '../services/cuentas.js'
import * as reportes from '../services/reportes.js'
import * as ejerciciosService from '../services/ejercicios.js'
import { armarPlanilla } from '../lib/planilla.js'
import { num2, hoy, fechaAR } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'

const cel = (n) => (n ? num2(n) : '')

export function PlanillaTabla({ p, todas, hasta }) {
  const filas = p.filas.filter((f) => todas || f.conMovimiento)
  const ganancia = p.resultado >= 0
  return (
    <Card flush>
      <div className="planilla-wrap">
        <table className="planilla">
          <colgroup>
            <col style={{ width: '22%' }} />
            {Array.from({ length: 8 }).map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr className="g1">
              <th rowSpan="2" className="izq">Cuenta</th>
              <th colSpan="2">Sumas</th>
              <th colSpan="2" className="sep">Saldos</th>
              <th colSpan="2" className="sep">Estado patrimonial</th>
              <th colSpan="2" className="sep">Estado de resultados</th>
            </tr>
            <tr className="g2">
              <th className="num">Debe</th><th className="num">Haber</th>
              <th className="num sep">Deudor</th><th className="num">Acreedor</th>
              <th className="num sep">Activo</th><th className="num">Pasivo + PN</th>
              <th className="num sep">Negativos</th><th className="num">Positivos</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan="9" className="vacio">No hay movimientos hasta el {fechaAR(hasta)}.</td></tr>}
            {filas.map((f) => (
              <tr key={f.id}>
                <td className="cuenta" title={`${f.codigo} ${f.nombre}`}><span className="muted mono">{f.codigo}</span> {f.nombre}</td>
                <td className="num">{cel(f.debe)}</td><td className="num">{cel(f.haber)}</td>
                <td className="num sep">{cel(f.deudor)}</td><td className="num">{cel(f.acreedor)}</td>
                <td className="num sep">{cel(f.activo)}</td><td className="num">{cel(f.pasivoPn)}</td>
                <td className="num sep">{cel(f.negativo)}</td><td className="num">{cel(f.positivo)}</td>
              </tr>
            ))}
            {filas.length > 0 && (
              <tr className="sub resultado">
                <td colSpan="5"><b>Resultado del ejercicio ({ganancia ? 'ganancia' : 'pérdida'})</b></td>
                <td className="num sep">{cel(p.ajuste.activo)}</td><td className="num">{cel(p.ajuste.pasivoPn)}</td>
                <td className="num sep">{cel(p.ajuste.negativo)}</td><td className="num">{cel(p.ajuste.positivo)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>
                Totales <span className={p.cuadra ? 'balance-ok' : 'balance-mal'}>{p.cuadra ? '✓ cuadra' : '✗ no cuadra'}</span>
              </td>
              <td className="num">{num2(p.sumas.debe)}</td><td className="num">{num2(p.sumas.haber)}</td>
              <td className="num sep">{num2(p.saldos.deudor)}</td><td className="num">{num2(p.saldos.acreedor)}</td>
              <td className="num sep">{num2(p.final.activo)}</td><td className="num">{num2(p.final.pasivoPn)}</td>
              <td className="num sep">{num2(p.final.negativo)}</td><td className="num">{num2(p.final.positivo)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}

export default function PlanillaTrabajo() {
  // Si todavía no se instaló el script de ejercicios, la planilla funciona igual (sin selector)
  const ejQ = useAsync(() => ejerciciosService.listar().catch(() => []), [])
  return <Estado q={ejQ}>{(ejercicios) => <Planilla ejercicios={ejercicios} />}</Estado>
}

function Planilla({ ejercicios }) {
  const abierto = ejercicios.find((e) => e.estado === 'abierto')
  const [ejId, setEjId] = useState(abierto ? String(abierto.id) : '')   // '' = sin filtrar por ejercicio
  const [fecha, setFecha] = useState('')
  const [todas, setTodas] = useState(false)

  const ej = ejercicios.find((e) => String(e.id) === ejId)
  // Por defecto: hoy (sin pasarse del fin del ejercicio); un ejercicio cerrado se ve completo
  const hasta = fecha || (ej ? (ej.estado === 'cerrado' || ej.hasta < hoy() ? ej.hasta : hoy()) : hoy())

  const q = useAsync(
    async () => {
      const [cuentas, sumas] = await Promise.all([
        cuentasService.listar(),
        reportes.sumasPorCuenta({ desde: ej?.desde, hasta: hasta || undefined, excluirOrigenes: ej ? ['cierre'] : [] }),
      ])
      return armarPlanilla(cuentas, sumas)
    },
    [ej?.id, hasta]
  )

  return (
    <>
      <PageHeader
        titulo="Planilla de trabajo"
        subtitulo={
          ej?.estado === 'cerrado'
            ? 'Ejercicio cerrado: se muestran los saldos antes del cierre (sin los asientos de cierre).'
            : 'Sumas, saldos, estado patrimonial y estado de resultados de cada cuenta, hasta la fecha elegida.'
        }
      >
        {ejercicios.length > 0 && (
          <label className="row" style={{ gap: 8 }}>
            Ejercicio
            <select value={ejId} onChange={(e) => { setEjId(e.target.value); setFecha('') }} style={{ width: 'auto' }}>
              {[...ejercicios].reverse().map((e) => (
                <option key={e.id} value={e.id}>{fechaAR(e.desde)} al {fechaAR(e.hasta)}{e.estado === 'cerrado' ? ' (cerrado)' : ''}</option>
              ))}
              <option value="">Todo el historial</option>
            </select>
          </label>
        )}
        <label className="row" style={{ gap: 8 }}>
          Saldos al
          <input type="date" value={hasta} min={ej?.desde} max={ej?.hasta} onChange={(e) => setFecha(e.target.value)} style={{ width: 'auto' }} />
        </label>
        <label className="row" style={{ cursor: 'pointer', gap: 6 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Cuentas sin movimiento
        </label>
      </PageHeader>

      <Estado q={q}>
        {(p) => <PlanillaTabla p={p} todas={todas} hasta={hasta} />}
      </Estado>
    </>
  )
}
