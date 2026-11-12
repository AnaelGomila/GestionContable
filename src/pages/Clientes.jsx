import TercerosCrud from '../components/terceros/TercerosCrud.jsx'
import { clientes } from '../services/terceros.js'

export default function Clientes() {
  return (
    <TercerosCrud
      titulo="Clientes"
      subtitulo="La condición frente al IVA decide si la venta lleva Factura A (Responsable Inscripto) o Factura B."
      singular="cliente"
      servicio={clientes}
      esCliente
    />
  )
}
