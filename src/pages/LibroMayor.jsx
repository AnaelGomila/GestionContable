import { useMemo, useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import { useCuentas } from '../context/CuentasContext.jsx'
import * as asientosService from '../services/asientos.js'
import { fechaAR, money, r2 } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Field from '../components/ui/Field.jsx'
import Loading from '../components/ui/Loading.jsx'

export default function LibroMayor() {
  const { cuentas } = useCuentas()
  const [cuentaId, setCuentaId] = useState('')
  const cuenta = cuentas.find((c) => String(c.id) === cuentaId)

  return (
    <>
      <PageHeader titulo="Libro mayor" subtitulo="Movimientos de una cuenta con su saldo acumulado." />
      <div className="stack">
        <Card>
          <div className="form-grid">
            <Field label="Cuenta" col="col-6">
              <select value={cuentaId} onChange={(e) => setCuentaId(e.target.value)}>
                <option value="">Elegir cuenta…</option>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
              </select>
            </Field>
          </div>
        </Card>
        {cuenta && <Movimientos key={cuenta.id} cuenta={cuenta} />}
      </div>
    </>
  )
}

function Movimientos({ cuenta }) {
  const q = useAsync(() => asientosService.mayor(cuenta.id), [cuenta.id])
  const deudora = cuenta.tipo === 'activo' || cuenta.tipo === 'egreso'

  const filas = useMemo(() => {
    if (!q.data) return []
    let saldo = 0
    return [...q.data]
      .sort((a, b) => a.asientos.fecha.localeCompare(b.asientos.fecha) || a.asientos.numero - b.asientos.numero)
      .map((l) => {
        saldo = r2(saldo + (deudora ? Number(l.debe) - Number(l.haber) : Number(l.haber) - Number(l.debe)))
        return { ...l, saldo }
      })
  }, [q.data, deudora])

  if (q.loading && !q.data) return <Loading />
  return (
    <Estado q={q}>
      {() => {
        const totalDebe = r2(filas.reduce((a, l) => a + Number(l.debe), 0))
        const totalHaber = r2(filas.reduce((a, l) => a + Number(l.haber), 0))
        return (
          <Card titulo={`${cuenta.codigo} · ${cuenta.nombre}`} flush>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Asiento</th><th>Descripción</th><th className="num">Debe</th><th className="num">Haber</th><th className="num">Saldo</th></tr></thead>
                <tbody>
                  {filas.length === 0 && <tr><td colSpan="6" className="vacio">Esta cuenta todavía no tiene movimientos.</td></tr>}
                  {filas.map((l) => (
                    <tr key={l.id}>
                      <td>{fechaAR(l.asientos.fecha)}</td>
                      <td>Nº {l.asientos.numero}</td>
                      <td>{l.asientos.descripcion}</td>
                      <td className="num">{Number(l.debe) > 0 ? money(l.debe) : ''}</td>
                      <td className="num">{Number(l.haber) > 0 ? money(l.haber) : ''}</td>
                      <td className="num"><b>{money(l.saldo)}</b></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">Totales · saldo {deudora ? 'deudor' : 'acreedor'}</td>
                    <td className="num">{money(totalDebe)}</td>
                    <td className="num">{money(totalHaber)}</td>
                    <td className="num">{money(deudora ? totalDebe - totalHaber : totalHaber - totalDebe)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )
      }}
    </Estado>
  )
}
