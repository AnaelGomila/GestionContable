import { useCuentas } from '../../context/CuentasContext.jsx'
import AsientoLineas from './AsientoLineas.jsx'

// Vista previa del asiento que va a generar una operación.
// lineas: [{ codigo, debe, haber }]  (los nombres se completan con el plan de cuentas)
export default function AsientoPreview({ lineas, titulo = 'Asiento que se va a generar' }) {
  const { porCodigo } = useCuentas()
  const completas = lineas.map((l) => ({ ...l, nombre: porCodigo[l.codigo]?.nombre ?? '' }))
  return (
    <div className="asiento-box">
      <div className="titulo">{titulo}</div>
      <AsientoLineas lineas={completas} />
    </div>
  )
}
