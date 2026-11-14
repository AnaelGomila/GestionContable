import { useCuentas } from '../../context/CuentasContext.jsx'
import { efectoLinea, LEYENDA } from '../../lib/efecto.js'

// Sigla del efecto de una línea (A+, A−, P+, P−, PN+, PN−, RP+, RP−, RN+, RN−)
export function Efecto({ codigo, debe, haber }) {
  const { porCodigo } = useCuentas()
  const e = efectoLinea(porCodigo[codigo]?.tipo, debe, haber)
  if (!e) return null
  return <span className="efecto" title={e.texto}>{e.sigla}</span>
}

// Leyenda de las siglas
export function LeyendaEfecto() {
  return (
    <div className="leyenda-efecto muted">
      <b>Efecto sobre la cuenta:</b>{' '}
      {LEYENDA.map((r) => `${r.sigla} = ${r.nombre}`).join(' · ')} · <b>+</b> aumenta · <b>−</b> disminuye
    </div>
  )
}
