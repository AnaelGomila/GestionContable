import { useNavigate, Link } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync.js'
import * as comprasService from '../../services/compras.js'
import { fechaAR, money } from '../../lib/format.js'
import Card from '../ui/Card.jsx'
import Estado from '../ui/Estado.jsx'
import Badge from '../ui/Badge.jsx'

export default function FacturasRecibidas() {
  const q = useAsync(() => comprasService.listar(), [])
  const navigate = useNavigate()
  return (
    <Card flush>
      <Estado q={q}>
        {(compras) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tipo</th><th>Número</th><th>Fecha</th><th>Proveedor</th><th>Origen</th><th>CAE</th><th className="num">Total</th><th></th></tr>
              </thead>
              <tbody>
                {compras.length === 0 && <tr><td colSpan="8" className="vacio">Todavía no hay facturas recibidas. Se cargan desde <Link to="/compras/nueva">Nueva compra</Link>.</td></tr>}
                {compras.map((c) => (
                  <tr key={c.id} className="clic" onClick={() => navigate(`/facturas/recibida/${c.id}`)}>
                    <td><Badge tipo="olive">Factura {c.tipo_comprobante}</Badge></td>
                    <td className="mono">{c.comprobante.replace(/^A /, '')}</td>
                    <td>{fechaAR(c.fecha)}</td>
                    <td>{c.proveedor}</td>
                    <td>{c.origen_comprobante === 'externa' ? <Badge tipo="info">Externa</Badge> : <Badge>Generada</Badge>}</td>
                    <td className="mono muted">{c.cae}</td>
                    <td className="num"><b>{money(c.total)}</b></td>
                    <td className="right"><button className="btn sm">Ver / Descargar PDF</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Estado>
    </Card>
  )
}
