import { useAsync } from '../hooks/useAsync.js'
import * as cuentasService from '../services/cuentas.js'
import { resumenPatrimonial } from '../lib/contabilidad.js'
import { money, r2 } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'

// Muestra solo las cuentas que tienen saldo
const Seccion = ({ titulo, cuentas, total }) => (
  <>
    <tr className="sub"><td colSpan="2"><b>{titulo}</b></td></tr>
    {cuentas.length === 0 && <tr><td colSpan="2" className="muted" style={{ paddingLeft: 28 }}>Sin saldo</td></tr>}
    {cuentas.map((c) => (
      <tr key={c.codigo}>
        <td style={{ paddingLeft: 28 }}><span className="muted mono">{c.codigo}</span> {c.nombre}</td>
        <td className="num">{money(c.saldo)}</td>
      </tr>
    ))}
    <tr><td style={{ paddingLeft: 28 }}><b>Total {titulo.toLowerCase()}</b></td><td className="num"><b>{money(total)}</b></td></tr>
  </>
)

export default function SituacionPatrimonial() {
  const q = useAsync(() => cuentasService.saldos(), [])

  return (
    <>
      <PageHeader titulo="Situación patrimonial" subtitulo="Estado de situación patrimonial y estado de resultados, calculados con los saldos de las cuentas." />
      <Estado q={q}>
        {(todas) => {
          const saldos = todas.map((s) => ({ ...s, saldo: Number(s.saldo) }))
          const con = (pref) => saldos.filter((s) => s.codigo.startsWith(pref) && s.saldo !== 0)
          const suma = (lista) => r2(lista.reduce((a, c) => a + c.saldo, 0))
          const r = resumenPatrimonial(saldos)

          const ac = con('1.1'), anc = con('1.2'), pas = con('2.'), pn = con('3.')
          const ing = con('4.'), egr = con('5.')

          return (
            <div className="stack">
              <div className="grid cols-2">
                <Card titulo="Activo" flush>
                  <table><tbody>
                    <Seccion titulo="Activo corriente" cuentas={ac} total={suma(ac)} />
                    <Seccion titulo="Activo no corriente" cuentas={anc} total={suma(anc)} />
                  </tbody>
                  <tfoot><tr><td>TOTAL ACTIVO</td><td className="num">{money(r.activo)}</td></tr></tfoot></table>
                </Card>

                <Card titulo="Pasivo y patrimonio neto" flush>
                  <table><tbody>
                    <Seccion titulo="Pasivo" cuentas={pas} total={r.pasivo} />
                    <Seccion titulo="Patrimonio neto" cuentas={pn} total={r.patrimonio} />
                    <tr>
                      <td style={{ paddingLeft: 28 }}>Resultado del ejercicio</td>
                      <td className="num">{money(r.resultado)}</td>
                    </tr>
                  </tbody>
                  <tfoot><tr><td>TOTAL PASIVO + PATRIMONIO NETO</td><td className="num">{money(r.pasivoMasPn)}</td></tr></tfoot></table>
                </Card>
              </div>

              <div className={`alert ${r.cierra ? 'ok' : 'error'}`}>
                {r.cierra
                  ? `✓ Activo (${money(r.activo)}) = Pasivo + Patrimonio neto + Resultado (${money(r.pasivoMasPn)})`
                  : `✗ La ecuación no cierra: Activo ${money(r.activo)} ≠ ${money(r.pasivoMasPn)}`}
              </div>

              <Card titulo="Estado de resultados" flush>
                <table><tbody>
                  <Seccion titulo="Ingresos" cuentas={ing} total={r.ingresos} />
                  <Seccion titulo="Egresos" cuentas={egr} total={r.egresos} />
                </tbody>
                <tfoot><tr><td>RESULTADO DEL EJERCICIO ({r.resultado >= 0 ? 'ganancia' : 'pérdida'})</td><td className="num">{money(r.resultado)}</td></tr></tfoot></table>
              </Card>
            </div>
          )
        }}
      </Estado>
    </>
  )
}
