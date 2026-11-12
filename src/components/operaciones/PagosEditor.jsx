import { MEDIOS_PAGO, money, r2 } from '../../lib/format.js'

let contador = 0
export const nuevoPago = (medio = 'efectivo', monto = '') => ({
  key: ++contador, medio, monto, banco: '', numero_cheque: '', fecha_cobro: '',
})

// Cobro de una venta con uno o más medios de pago.
export default function PagosEditor({ pagos, onChange, total, fechaVenta }) {
  const actualizar = (key, cambios) => onChange(pagos.map((p) => (p.key === key ? { ...p, ...cambios } : p)))
  const quitar = (key) => onChange(pagos.length > 1 ? pagos.filter((p) => p.key !== key) : pagos)

  const asignado = r2(pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0))
  const resto = r2(total - asignado)

  const completarConResto = (key) => {
    const otros = pagos.filter((p) => p.key !== key).reduce((a, p) => a + (Number(p.monto) || 0), 0)
    actualizar(key, { monto: Math.max(0, r2(total - otros)) })
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      {pagos.map((p, i) => {
        const esCheque = p.medio === 'cheque_dia' || p.medio === 'cheque_diferido'
        return (
          <div key={p.key} className="card" style={{ padding: 14, background: 'var(--surface-2)', boxShadow: 'none' }}>
            <div className="form-grid">
              <div className="field col-4">
                <label>Medio de pago {pagos.length > 1 ? `#${i + 1}` : ''}</label>
                <select value={p.medio} onChange={(e) => actualizar(p.key, { medio: e.target.value })}>
                  {MEDIOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="field col-4">
                <label>Monto</label>
                <input className="num" type="number" min="0" step="0.01" value={p.monto} onChange={(e) => actualizar(p.key, { monto: e.target.value })} />
                <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => completarConResto(p.key)}>Completar con el resto</button>
              </div>
              <div className="col-4" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                <button className="btn sm danger" onClick={() => quitar(p.key)} disabled={pagos.length === 1}>Quitar</button>
              </div>
              {esCheque && (
                <>
                  <div className="field col-4"><label>Banco emisor</label><input value={p.banco} onChange={(e) => actualizar(p.key, { banco: e.target.value })} placeholder="Ej.: Banco Provincia" /></div>
                  <div className="field col-4"><label>Número de cheque</label><input value={p.numero_cheque} onChange={(e) => actualizar(p.key, { numero_cheque: e.target.value })} /></div>
                </>
              )}
              {p.medio === 'cheque_diferido' && (
                <div className="field col-4">
                  <label>Fecha de cobro</label>
                  <input type="date" min={fechaVenta} value={p.fecha_cobro} onChange={(e) => actualizar(p.key, { fecha_cobro: e.target.value })} />
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div className="row">
        <button className="btn sm" onClick={() => onChange([...pagos, nuevoPago('efectivo', resto > 0 ? resto : '')])}>+ Agregar medio de pago</button>
        <div className="spacer" />
        <span className="muted">Asignado {money(asignado)} de {money(total)}</span>
        <span className={resto === 0 && total > 0 ? 'balance-ok' : 'balance-mal'}>
          {resto === 0 && total > 0 ? '✓ completo' : resto > 0 ? `Falta asignar ${money(resto)}` : `Sobran ${money(-resto)}`}
        </span>
      </div>
    </div>
  )
}
