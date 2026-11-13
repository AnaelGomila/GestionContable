import { resumenPatrimonial } from '../../lib/contabilidad.js'
import { money, r2 } from '../../lib/format.js'
import Card from '../ui/Card.jsx'

// Muestra que Activo − Pasivo = Patrimonio neto + Ganancias, y que el libro coincide con stock, cheques y compras.
export default function ControlPatrimonial({ saldos, controles }) {
  const r = resumenPatrimonial(saldos)
  const controlesOk = controles.every((c) => r2(c.libro - c.auxiliar) === 0)

  return (
    <Card titulo="Control de la ecuación patrimonial" acciones={
      <span className={`semaforo ${r.cierra && controlesOk ? 'ok' : 'mal'}`}>
        <span className="punto" /> {r.cierra && controlesOk ? 'Todo cierra' : 'Hay diferencias'}
      </span>
    }>
      <div className="ecuacion">
        <div className="bloque"><div className="n">{money(r.activo)}</div><div className="t">Activo</div></div>
        <span className="op">−</span>
        <div className="bloque"><div className="n">{money(r.pasivo)}</div><div className="t">Pasivo</div></div>
        <span className="op">=</span>
        <div className="bloque"><div className="n">{money(r.patrimonio)}</div><div className="t">Patrimonio neto</div></div>
        <span className="op">+</span>
        <div className="bloque"><div className="n">{money(r.resultado)}</div><div className="t">{r.resultado < 0 ? 'Pérdidas' : 'Ganancias'}</div></div>
      </div>
      <p className="muted center" style={{ marginBottom: 14 }}>
        Activo − Pasivo = {money(r.activo - r.pasivo)} &nbsp;·&nbsp; Patrimonio neto + {r.resultado < 0 ? 'pérdidas' : 'ganancias'} = {money(r.pasivoMasPn - r.pasivo)}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Control contra registros auxiliares</th><th className="num">Libro</th><th className="num">Auxiliar</th><th className="num">Diferencia</th></tr>
          </thead>
          <tbody>
            {controles.map((c) => {
              const dif = r2(c.libro - c.auxiliar)
              return (
                <tr key={c.control}>
                  <td>{c.control}</td>
                  <td className="num">{money(c.libro)}</td>
                  <td className="num">{money(c.auxiliar)}</td>
                  <td className="num"><span className={dif === 0 ? 'balance-ok' : 'balance-mal'}>{dif === 0 ? '✓ 0,00' : money(dif)}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
