import { Link, useNavigate } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as ventasService from '../services/ventas.js'
import { etiquetaMedio, fechaAR, money, nroComprobante } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Badge from '../components/ui/Badge.jsx'

export default function Ventas() {
  const q = useAsync(() => ventasService.listar(), [])
  const navigate = useNavigate()

  return (
    <>
      <PageHeader titulo="Ventas" subtitulo="Cada venta emite su factura, descuenta stock y genera el asiento (ingreso, IVA débito y costo de lo vendido).">
        <Link to="/ventas/nueva" className="btn primary">+ Nueva venta</Link>
      </PageHeader>

      <Card flush>
        <Estado q={q}>
          {(ventas) => (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Cliente</th><th>Factura</th><th>Cobro</th>
                    <th className="num">Neto</th><th className="num">IVA</th><th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 && <tr><td colSpan="7" className="vacio">Todavía no hay ventas registradas.</td></tr>}
                  {ventas.map((v) => (
                    <tr key={v.id} className={v.factura ? 'clic' : ''} onClick={() => v.factura && navigate(`/facturas/${v.factura.id}`)}>
                      <td>{fechaAR(v.fecha)}</td>
                      <td>{v.cliente}</td>
                      <td>
                        {v.factura ? (
                          <span className="row" style={{ gap: 6 }}>
                            <Badge tipo={v.tipo_factura === 'A' ? 'olive' : 'wood'}>{v.tipo_factura}</Badge>
                            <span className="mono">{nroComprobante(v.factura.punto_venta, v.factura.numero)}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <span className="row" style={{ gap: 4 }}>
                          {[...new Set(v.venta_pagos.map((p) => p.medio))].map((m) => <Badge key={m}>{etiquetaMedio(m)}</Badge>)}
                        </span>
                      </td>
                      <td className="num">{money(v.neto)}</td>
                      <td className="num">{money(v.iva)}</td>
                      <td className="num"><b>{money(v.total)}</b></td>
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
