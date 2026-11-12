import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import * as empresaService from '../services/empresa.js'
import * as productosService from '../services/productos.js'
import { errMsg, hoy, money, r2 } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'
import AsientoPreview from '../components/asientos/AsientoPreview.jsx'

// Cuentas de activo entre las que se reparte el capital (Mercaderías sale del stock inicial)
const DISTRIBUCION = [
  { codigo: '1.1.01', nombre: 'Caja', inicial: 1000000 },
  { codigo: '1.1.02', nombre: 'Banco cuenta corriente', inicial: 6000000 },
  { codigo: '1.2.01', nombre: 'Muebles y útiles', inicial: 1500000 },
  { codigo: '1.2.02', nombre: 'Equipos de computación', inicial: 1500000 },
]

export default function EmpresaCapital() {
  const q = useAsync(async () => {
    const [empresa, productos] = await Promise.all([empresaService.obtener(), productosService.listar()])
    return { empresa, productos }
  }, [])

  return (
    <>
      <PageHeader titulo="Empresa y capital" subtitulo="Datos de la empresa y reparto del capital inicial (asiento de apertura)." />
      <Estado q={q}>
        {({ empresa, productos }) =>
          !empresa ? (
            <Alert tipo="warn">No hay datos de la empresa. Ejecutá <b>supabase/02_seed.sql</b> en Supabase.</Alert>
          ) : (
            <div className="stack">
              <DatosEmpresa empresa={empresa} onGuardado={q.reload} />
              <Apertura empresa={empresa} productos={productos} onRegistrada={q.reload} />
            </div>
          )
        }
      </Estado>
    </>
  )
}

function DatosEmpresa({ empresa, onGuardado }) {
  const [f, setF] = useState(empresa)
  const [msg, setMsg] = useState({ tipo: '', texto: '' })
  const [guardando, setGuardando] = useState(false)
  const set = (c) => (e) => setF({ ...f, [c]: e.target.value })

  const guardar = async () => {
    setGuardando(true)
    setMsg({ tipo: '', texto: '' })
    try {
      const { id, apertura_registrada, fecha_apertura, capital_inicial, ...datos } = f
      datos.punto_venta = Number(datos.punto_venta) || 1
      datos.inicio_actividades = datos.inicio_actividades || null
      await empresaService.actualizar(datos)
      setMsg({ tipo: 'ok', texto: 'Datos guardados.' })
      onGuardado()
    } catch (e) {
      setMsg({ tipo: 'error', texto: errMsg(e) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card titulo="Datos de la empresa" acciones={<button className="btn primary" onClick={guardar} disabled={guardando}>Guardar datos</button>}>
      <div className="form-grid">
        <Field label="Razón social" col="col-6"><input value={f.razon_social ?? ''} onChange={set('razon_social')} /></Field>
        <Field label="CUIT" col="col-3"><input value={f.cuit ?? ''} onChange={set('cuit')} /></Field>
        <Field label="Ingresos Brutos" col="col-3"><input value={f.ingresos_brutos ?? ''} onChange={set('ingresos_brutos')} /></Field>
        <Field label="Domicilio" col="col-6"><input value={f.domicilio ?? ''} onChange={set('domicilio')} /></Field>
        <Field label="Localidad" col="col-3"><input value={f.localidad ?? ''} onChange={set('localidad')} /></Field>
        <Field label="Provincia" col="col-3"><input value={f.provincia ?? ''} onChange={set('provincia')} /></Field>
        <Field label="Teléfono" col="col-3"><input value={f.telefono ?? ''} onChange={set('telefono')} /></Field>
        <Field label="Inicio de actividades" col="col-3"><input type="date" value={f.inicio_actividades ?? ''} onChange={set('inicio_actividades')} /></Field>
        <Field label="Condición frente al IVA" col="col-3"><input value={f.condicion_iva ?? ''} disabled /></Field>
        <Field label="Punto de venta" col="col-3"><input className="num" type="number" min="1" value={f.punto_venta ?? 1} onChange={set('punto_venta')} /></Field>
      </div>
      <div style={{ marginTop: 14 }}><Alert tipo={msg.tipo || undefined}>{msg.texto}</Alert></div>
    </Card>
  )
}

function Apertura({ empresa, productos, onRegistrada }) {
  const registrada = empresa.apertura_registrada
  const capital = Number(empresa.capital_inicial)
  const mercaderias = r2(productos.reduce((a, p) => a + p.stock_inicial * p.costo, 0))
  const [fecha, setFecha] = useState(hoy())
  const [montos, setMontos] = useState(Object.fromEntries(DISTRIBUCION.map((d) => [d.codigo, d.inicial])))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => setError(''), [montos, fecha])

  const repartido = r2(Object.values(montos).reduce((a, v) => a + (Number(v) || 0), 0) + mercaderias)
  const diferencia = r2(capital - repartido)
  const lineas = [
    ...DISTRIBUCION.map((d) => ({ codigo: d.codigo, debe: Number(montos[d.codigo]) || 0, haber: 0 })),
    { codigo: '1.1.05', debe: mercaderias, haber: 0 },
    { codigo: '3.1.01', debe: 0, haber: repartido },
  ].filter((l) => l.debe > 0 || l.haber > 0)

  const registrar = async () => {
    setEnviando(true)
    setError('')
    try {
      const enviar = Object.fromEntries(Object.entries(montos).map(([k, v]) => [k, Number(v) || 0]))
      await empresaService.registrarApertura(fecha, enviar)
      onRegistrada()
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setEnviando(false)
    }
  }

  if (registrada) {
    return (
      <Card titulo="Capital inicial" acciones={<Badge tipo="ok">Apertura registrada</Badge>}>
        <dl className="kv">
          <dt>Capital social</dt><dd><b>{money(capital)}</b></dd>
          <dt>Fecha de apertura</dt><dd>{empresa.fecha_apertura?.split('-').reverse().join('/')}</dd>
        </dl>
        <p className="muted" style={{ marginTop: 12 }}>
          El asiento de apertura ya está en el <Link to="/libro-diario">libro diario</Link>. El capital no se puede modificar: de acá en adelante todo cambia con operaciones registradas.
          Para reorganizar los fondos usá <Link to="/fondos">Fondos</Link>.
        </p>
      </Card>
    )
  }

  return (
    <Card titulo="Reparto del capital inicial (asiento de apertura)" acciones={<Badge tipo="warn">Pendiente</Badge>}>
      <div className="stack">
        <Alert tipo="info">
          El capital de la empresa es <b>{money(capital)}</b>. Repartilo entre las cuentas de activo: <b>Mercaderías</b> se calcula sola con el stock inicial de los
          productos (<Link to="/productos">ver productos</Link>). Se registra una única vez.
        </Alert>
        <div className="form-grid">
          <Field label="Fecha de apertura" col="col-3"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cuenta</th><th className="num" style={{ width: 220 }}>Monto inicial</th></tr></thead>
            <tbody>
              {DISTRIBUCION.map((d) => (
                <tr key={d.codigo}>
                  <td><span className="muted mono">{d.codigo}</span> {d.nombre}</td>
                  <td><input className="num" type="number" min="0" step="0.01" value={montos[d.codigo]} onChange={(e) => setMontos({ ...montos, [d.codigo]: e.target.value })} /></td>
                </tr>
              ))}
              <tr>
                <td><span className="muted mono">1.1.05</span> Mercaderías <Badge tipo="info">automático · stock inicial</Badge></td>
                <td className="num"><b>{money(mercaderias)}</b></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  Total repartido{' '}
                  <span className={diferencia === 0 ? 'balance-ok' : 'balance-mal'}>
                    {diferencia === 0 ? '✓ coincide con el capital' : diferencia > 0 ? `faltan ${money(diferencia)}` : `sobran ${money(-diferencia)}`}
                  </span>
                </td>
                <td className="num">{money(repartido)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <AsientoPreview lineas={lineas} titulo="Asiento de apertura" />
        <Alert tipo="error">{error}</Alert>
        <div className="row">
          <div className="spacer" />
          <button className="btn primary" onClick={registrar} disabled={enviando || diferencia !== 0}>
            {enviando ? 'Registrando…' : 'Registrar apertura'}
          </button>
        </div>
      </div>
    </Card>
  )
}
