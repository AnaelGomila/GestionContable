import Alert from './Alert.jsx'
import Loading from './Loading.jsx'
import { errMsg } from '../../lib/format.js'

// Muestra "cargando" o el error de un useAsync y, si todo está bien, renderiza children(data).
export default function Estado({ q, children }) {
  if (q.error) return <Alert tipo="error">No se pudieron cargar los datos: {errMsg(q.error)}</Alert>
  if (q.data == null) return <Loading />
  return children(q.data)
}
