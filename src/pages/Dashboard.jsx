import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as empresaService from '../services/empresa.js'
import * as cuentasService from '../services/cuentas.js'
import * as asientosService from '../services/asientos.js'
import * as productosService from '../services/productos.js'
import * as reportesService from '../services/reportes.js'
import { resumenPatrimonial, saldoDe } from '../lib/contabilidad.js'
import { fechaAR, money, ORIGENES } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import ControlPatrimonial from '../components/dashboard/ControlPatrimonial.jsx'

export default function Dashboard() {
  const q = useAsync(async () => {
    const [empresa, saldos, controles, ultimos, productos] = await Promise.all([
      empresaService.obtener(),
      cuentasService.saldos(),
      reportesService.controles(),
      asientosService.ultimos(6),
      productosService.listar(),
    ])
    return { empresa, saldos, controles, ultimos, productos }
  }, [])

  return (
    <>
      <PageHeader titulo="Inicio" subtitulo="Resumen de la empresa. Todos los números salen de los asientos registrados." />
      <Estado q={q}>
        {({ empresa, saldos, controles, ultimos, productos }) => {
          if (!empresa) return <Alert tipo="warn">No hay datos de la empresa. Ejecutá <b>supabase/02_seed.sql</b> en Supabase.</Alert>
          const r = resumenPatrimonial(saldos)
          const stockValor = productos.reduce((a, p) => a + p.valor, 0)
          return (
            <div className="stack">
              {!empresa.apertura_registrada && (
                <Alert tipo="warn">
                  La empresa <b>{empresa.razon_social}</b> todavía no registró su apertura. Hacelo en <Link to="/empresa">Empresa y capital</Link> para empezar a operar.
                </Alert>
              )}

              <div className="grid cols-4">
                <StatCard label="Capital social" valor={money(saldoDe(saldos, '3.1.01'))} nota={empresa.razon_social} />
                <StatCard label="Caja" valor={money(saldoDe(saldos, '1.1.01'))} />
                <StatCard label="Banco" valor={money(saldoDe(saldos, '1.1.02'))} />
                <StatCard label="Stock valorizado" valor={money(stockValor)} nota="Cantidad × costo" />
                <StatCard label="Ventas (neto)" valor={money(saldoDe(saldos, '4.1.01'))} />
                <StatCard label="Costo de lo vendido" valor={money(saldoDe(saldos, '5.1.01'))} />
                <StatCard label="Resultado" valor={money(r.resultado)} nota="Ingresos − egresos" tono={r.resultado >= 0 ? 'ok' : 'bad'} />
                <StatCard label="Patrimonio neto" valor={money(r.patrimonio + r.resultado)} nota="Capital + resultado" />
              </div>

              <ControlPatrimonial saldos={saldos} controles={controles} />

              <Card titulo="Últimos asientos" acciones={<Link to="/libro-diario" className="btn sm">Ver libro diario</Link>} flush>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Nº</th><th>Fecha</th><th>Origen</th><th>Descripción</th></tr></thead>
                    <tbody>
                      {ultimos.length === 0 && <tr><td colSpan="4" className="vacio">Todavía no hay asientos.</td></tr>}
                      {ultimos.map((a) => (
                        <tr key={a.id}>
                          <td>{a.numero}</td>
                          <td>{fechaAR(a.fecha)}</td>
                          <td><Badge tipo="olive">{ORIGENES[a.origen] ?? a.origen}</Badge></td>
                          <td>{a.descripcion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )
        }}
      </Estado>
    </>
  )
}
