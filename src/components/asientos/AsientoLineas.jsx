import { money, r2 } from '../../lib/format.js'
import { Efecto, LeyendaEfecto } from './Efecto.jsx'

// Tabla de un asiento. lineas: [{ codigo, nombre, debe, haber }]
export default function AsientoLineas({ lineas, mostrarBalance = true }) {
  const debe = r2(lineas.reduce((a, l) => a + Number(l.debe || 0), 0))
  const haber = r2(lineas.reduce((a, l) => a + Number(l.haber || 0), 0))
  const balancea = debe === haber && debe > 0

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cuenta</th>
            <th style={{ width: 64 }}>Efecto</th>
            <th className="num">Debe</th>
            <th className="num">Haber</th>
          </tr>
        </thead>
        <tbody>
          {lineas.length === 0 && (
            <tr><td colSpan="4" className="vacio">Todavía no hay líneas.</td></tr>
          )}
          {lineas.map((l, i) => (
            <tr key={l.id ?? i}>
              <td className={Number(l.haber) > 0 ? 'haber-ind' : ''}>
                <span className="muted mono">{l.codigo}</span> {l.nombre}
              </td>
              <td><Efecto codigo={l.codigo} debe={l.debe} haber={l.haber} /></td>
              <td className="num">{Number(l.debe) > 0 ? money(l.debe) : ''}</td>
              <td className="num">{Number(l.haber) > 0 ? money(l.haber) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>
              Totales{' '}
              {mostrarBalance && lineas.length > 0 && (
                <span className={balancea ? 'balance-ok' : 'balance-mal'}>
                  {balancea ? '✓ balancea' : `✗ diferencia ${money(Math.abs(debe - haber))}`}
                </span>
              )}
            </td>
            <td></td>
            <td className="num">{money(debe)}</td>
            <td className="num">{money(haber)}</td>
          </tr>
        </tfoot>
      </table>
      <LeyendaEfecto />
    </div>
  )
}
