import { useState } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import { useCuentas } from '../context/CuentasContext.jsx'
import * as cuentasService from '../services/cuentas.js'
import { errMsg, money } from '../lib/format.js'
import PageHeader from '../components/ui/PageHeader.jsx'
import Card from '../components/ui/Card.jsx'
import Estado from '../components/ui/Estado.jsx'
import Modal from '../components/ui/Modal.jsx'
import Field from '../components/ui/Field.jsx'
import Alert from '../components/ui/Alert.jsx'
import Badge from '../components/ui/Badge.jsx'

const TIPOS = [
  { v: 'activo', t: 'Activo', prefijo: '1' },
  { v: 'pasivo', t: 'Pasivo', prefijo: '2' },
  { v: 'patrimonio', t: 'Patrimonio neto', prefijo: '3' },
  { v: 'ingreso', t: 'Ingreso', prefijo: '4' },
  { v: 'egreso', t: 'Egreso', prefijo: '5' },
]

export default function PlanCuentas() {
  const q = useAsync(() => cuentasService.saldos(), [])
  const { reload: recargarPlan } = useCuentas()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    setError('')
    const tipo = TIPOS.find((t) => t.v === form.tipo)
    if (!/^\d(\.\d+)*$/.test(form.codigo.trim())) return setError('El código debe tener el formato 1.1.07 (números separados por puntos).')
    if (!form.codigo.trim().startsWith(tipo.prefijo + '.')) return setError(`Las cuentas de tipo ${tipo.t} deben empezar con ${tipo.prefijo}. (por ejemplo ${tipo.prefijo}.1.99).`)
    if (!form.nombre.trim()) return setError('Ingresá el nombre de la cuenta.')
    setGuardando(true)
    try {
      await cuentasService.crear({ codigo: form.codigo.trim(), nombre: form.nombre.trim(), tipo: form.tipo })
      setForm(null)
      q.reload()
      recargarPlan()
    } catch (e) {
      setError(errMsg(e).includes('duplicate') ? 'Ya existe una cuenta con ese código.' : errMsg(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <PageHeader titulo="Plan de cuentas" subtitulo="Las cuentas marcadas como control solo se mueven con operaciones registradas (compras, ventas, cheques y pagos).">
        <button className="btn primary" onClick={() => { setError(''); setForm({ codigo: '', nombre: '', tipo: 'activo' }) }}>+ Nueva cuenta</button>
      </PageHeader>

      <Card flush>
        <Estado q={q}>
          {(cuentas) => (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th className="num">Saldo</th></tr></thead>
                <tbody>
                  {cuentas.map((c) => (
                    <tr key={c.cuenta_id}>
                      <td className="mono">{c.codigo}</td>
                      <td>{c.nombre} {c.es_control && <Badge tipo="warn">control</Badge>}</td>
                      <td><Badge tipo="olive">{TIPOS.find((t) => t.v === c.tipo)?.t}</Badge></td>
                      <td className="num">{money(c.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Estado>
      </Card>

      <Modal
        abierto={!!form}
        titulo="Nueva cuenta"
        onClose={() => setForm(null)}
        pie={<><button className="btn" onClick={() => setForm(null)}>Cancelar</button><button className="btn primary" onClick={guardar} disabled={guardando}>Guardar</button></>}
      >
        {form && (
          <div className="stack">
            <div className="form-grid">
              <Field label="Tipo" col="col-12">
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.t}</option>)}
                </select>
              </Field>
              <Field label="Código" col="col-4"><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="5.2.09" /></Field>
              <Field label="Nombre" col="col-8"><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
            </div>
            <Alert tipo="error">{error}</Alert>
          </div>
        )}
      </Modal>
    </>
  )
}
