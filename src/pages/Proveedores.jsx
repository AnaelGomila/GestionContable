import TercerosCrud from '../components/terceros/TercerosCrud.jsx'
import { proveedores } from '../services/terceros.js'

export default function Proveedores() {
  return (
    <TercerosCrud
      titulo="Proveedores"
      subtitulo="A quién le compramos la mercadería. Cada compra queda en la cuenta Proveedores hasta que se paga."
      singular="proveedor"
      servicio={proveedores}
    />
  )
}
