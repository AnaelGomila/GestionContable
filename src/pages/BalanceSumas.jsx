import { useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import * as cuentasService from '../services/cuentas.js'
import { money, r2 } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'

export default function BalanceSumas() {
  const q = useAsync(() => cuentasService.saldos(), [])
  const [todas, setTodas] = useState(false)

  return (
    <>
      <PageHeader titulo="Balance de sumas y saldos" subtitulo="Sumas del debe y del haber de cada cuenta y su saldo. Los totales de cada columna deben coincidir.">
        <label className="row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Mostrar cuentas sin movimiento
        </label>
      </PageHeader>
      <Card flush>
        <Estado q={q}>
          {(saldos) => {
            const filas = saldos
              .filter((s) => todas || Number(s.debe) > 0 || Number(s.haber) > 0)
              .map((s) => {
                const dif = r2(Number(s.debe) - Number(s.haber))
                return { ...s, debe: Number(s.debe), haber: Number(s.haber), deudor: dif > 0 ? dif : 0, acreedor: dif < 0 ? -dif : 0 }
              })
            const t = (campo) => r2(filas.reduce((a, f) => a + f[campo], 0))
            const sumasOk = t('debe') === t('haber')
            const saldosOk = t('deudor') === t('acreedor')
            return (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th><th>Cuenta</th>
                      <th className="num">Suma debe</th><th className="num">Suma haber</th>
                      <th className="num">Saldo deudor</th><th className="num">Saldo acreedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.length === 0 && <tr><td colSpan="6" className="vacio">Todavía no hay movimientos.</td></tr>}
                    {filas.map((f) => (
                      <tr key={f.cuenta_id}>
                        <td className="mono">{f.codigo}</td><td>{f.nombre}</td>
                        <td className="num">{f.debe ? money(f.debe) : ''}</td>
                        <td className="num">{f.haber ? money(f.haber) : ''}</td>
                        <td className="num">{f.deudor ? money(f.deudor) : ''}</td>
                        <td className="num">{f.acreedor ? money(f.acreedor) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2">Totales <span className={sumasOk && saldosOk ? 'balance-ok' : 'balance-mal'}>{sumasOk && saldosOk ? '✓ cuadra' : '✗ no cuadra'}</span></td>
                      <td className="num">{money(t('debe'))}</td><td className="num">{money(t('haber'))}</td>
                      <td className="num">{money(t('deudor'))}</td><td className="num">{money(t('acreedor'))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          }}
        </Estado>
      </Card>
    </>
  )
}
