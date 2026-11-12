import { useNavigate } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as facturasService from '../services/facturas.js'
import { fechaAR, money, nroComprobante } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Badge from '../components/ui/Badge.jsx'

export default function Facturas() {
  const q = useAsync(() => facturasService.listar(), [])
  const navigate = useNavigate()

  return (
    <>
      <PageHeader titulo="Facturas" subtitulo="Se emiten automáticamente al confirmar una venta. La numeración es correlativa por tipo (A y B)." />
      <Card flush>
        <Estado q={q}>
          {(facturas) => (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Tipo</th><th>Número</th><th>Fecha</th><th>Receptor</th><th>CAE</th><th className="num">Total</th><th></th></tr>
                </thead>
                <tbody>
                  {facturas.length === 0 && <tr><td colSpan="7" className="vacio">Todavía no hay facturas emitidas.</td></tr>}
                  {facturas.map((f) => (
                    <tr key={f.id} className="clic" onClick={() => navigate(`/facturas/${f.id}`)}>
                      <td><Badge tipo={f.tipo === 'A' ? 'olive' : 'wood'}>Factura {f.tipo}</Badge></td>
                      <td className="mono">{nroComprobante(f.punto_venta, f.numero)}</td>
                      <td>{fechaAR(f.fecha)}</td>
                      <td>{f.receptor?.razon_social}</td>
                      <td className="mono muted">{f.cae}</td>
                      <td className="num"><b>{money(f.total)}</b></td>
                      <td className="right"><button className="btn sm">Ver / Descargar PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Estado>
      </Card>
    </>
  )
}
