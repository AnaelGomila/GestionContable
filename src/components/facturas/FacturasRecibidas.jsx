import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync.js'
import * as comprasService from '../../services/compras.js'
import * as facturasSubidas from '../../services/facturasSubidas.js'
import { errMsg, fechaAR, money } from '../../lib/format.js'
import Card from '../ui/Card.jsx'
import Estado from '../ui/Estado.jsx'
import Badge from '../ui/Badge.jsx'
import Alert from '../ui/Alert.jsx'
import SubirFacturaModal from './SubirFacturaModal.jsx'

export default function FacturasRecibidas({ subiendo, setSubiendo }) {
  const q = useAsync(async () => {
    const [compras, subidas] = await Promise.all([comprasService.listar(), facturasSubidas.listar()])
    const filas = [
      ...compras.map((c) => ({ clave: `c${c.id}`, subida: false, id: c.id, tipo: c.tipo_comprobante, numero: c.comprobante.replace(/^[A-C] /, ''), fecha: c.fecha, proveedor: c.proveedor, origen: c.origen_comprobante === 'externa' ? 'Externa' : 'Generada', cae: c.cae, total: c.total })),
      ...subidas.map((s) => ({ clave: `s${s.id}`, subida: true, raw: s, id: s.id, tipo: s.tipo, numero: s.comprobante.replace(/^[A-C] /, ''), fecha: s.fecha, proveedor: s.emisor, origen: 'Subida', cae: s.cae ?? '', total: s.total })),
    ]
    filas.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
    return { filas }
  }, [])
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const abrir = async (f) => {
    setError('')
    try { await facturasSubidas.abrir(f.raw) } catch (e) { setError(errMsg(e)) }
  }
  const quitar = async (f) => {
    if (!window.confirm(`¿Quitar la factura ${f.tipo} ${f.numero} de ${f.proveedor}? Se borra el archivo subido.`)) return
    setError('')
    try { await facturasSubidas.borrar(f.raw); q.reload() } catch (e) { setError(errMsg(e)) }
  }

  return (
    <div className="stack">
      <Alert tipo="error">{error}</Alert>
      <Card flush>
        <Estado q={q}>
          {({ filas }) => (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Tipo</th><th>Número</th><th>Fecha</th><th>Proveedor / Emisor</th><th>Origen</th><th>CAE</th><th className="num">Total</th><th></th></tr>
                </thead>
                <tbody>
                  {filas.length === 0 && <tr><td colSpan="8" className="vacio">Todavía no hay facturas recibidas.</td></tr>}
                  {filas.map((f) => (
                    <tr key={f.clave} className="clic" onClick={() => (f.subida ? abrir(f) : navigate(`/facturas/recibida/${f.id}`))}>
                      <td><Badge tipo={f.tipo === 'A' ? 'olive' : 'wood'}>Factura {f.tipo}</Badge></td>
                      <td className="mono">{f.numero}</td>
                      <td>{fechaAR(f.fecha)}</td>
                      <td>{f.proveedor}</td>
                      <td>{f.origen === 'Generada' ? <Badge>Generada</Badge> : <Badge tipo="info">{f.origen}</Badge>}</td>
                      <td className="mono muted">{f.cae}</td>
                      <td className="num"><b>{money(f.total)}</b></td>
                      <td className="right nowrap">
                        {f.subida ? (
                          <>
                            <button className="btn sm">Abrir archivo</button>{' '}
                            <button className="btn sm" onClick={(e) => { e.stopPropagation(); quitar(f) }}>Quitar</button>
                          </>
                        ) : (
                          <button className="btn sm">Ver / Descargar PDF</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Estado>
      </Card>
      <SubirFacturaModal
        abierto={subiendo}
        onClose={() => setSubiendo(false)}
        onHecho={() => { setSubiendo(false); q.reload() }}
      />
    </div>
  )
}
