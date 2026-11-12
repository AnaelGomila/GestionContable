import { normalizarLineas } from '../../services/asientos.js'
import { fechaAR, ORIGENES } from '../../lib/format.js'
import Badge from '../ui/Badge.jsx'
import AsientoLineas from './AsientoLineas.jsx'

// Un asiento ya guardado: encabezado + líneas. asiento viene de asientos.listar()
export default function AsientoDetalle({ asiento }) {
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row">
        <b>Asiento Nº {asiento.numero}</b>
        <span className="muted">{fechaAR(asiento.fecha)}</span>
        <Badge tipo="olive">{ORIGENES[asiento.origen] ?? asiento.origen}</Badge>
      </div>
      <div>{asiento.descripcion}</div>
      <div className="asiento-box">
        <AsientoLineas lineas={normalizarLineas(asiento)} />
      </div>
    </div>
  )
}
