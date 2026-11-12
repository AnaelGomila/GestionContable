import { calcularItem } from '../../lib/iva.js'
import { money } from '../../lib/format.js'

let contador = 0
export const nuevoItem = () => ({ key: ++contador, producto_id: '', cantidad: 1, unitario: '' })

// Editor de ítems compartido por Compras y Ventas.
// modo 'compra': el valor unitario es el costo.  modo 'venta': es el precio neto y se muestra el stock.
export default function ItemsEditor({ items, onChange, productos, modo }) {
  const esVenta = modo === 'venta'

  const actualizar = (key, cambios) => onChange(items.map((i) => (i.key === key ? { ...i, ...cambios } : i)))
  const quitar = (key) => onChange(items.length > 1 ? items.filter((i) => i.key !== key) : items)

  const elegir = (key, id) => {
    const p = productos.find((x) => String(x.id) === id)
    actualizar(key, { producto_id: id, unitario: p ? (esVenta ? p.precio_neto : p.costo) : '' })
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th className="num" style={{ width: 100 }}>Cantidad</th>
            <th className="num" style={{ width: 160 }}>{esVenta ? 'Precio neto unit.' : 'Costo unit.'}</th>
            <th className="num" style={{ width: 90 }}>IVA</th>
            <th className="num" style={{ width: 150 }}>Importe neto</th>
            <th style={{ width: 44 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const p = productos.find((x) => String(x.id) === String(it.producto_id))
            const { neto } = calcularItem(it.cantidad, it.unitario, p?.alicuota_iva ?? 0)
            const exceso = esVenta && p && Number(it.cantidad) > p.stock
            return (
              <tr key={it.key}>
                <td>
                  <select value={it.producto_id} onChange={(e) => elegir(it.key, e.target.value)}>
                    <option value="">Elegir producto…</option>
                    {productos.map((x) => (
                      <option key={x.id} value={x.id} disabled={esVenta && x.stock <= 0}>
                        {x.codigo} · {x.nombre} {esVenta ? `(stock ${x.stock})` : ''}
                      </option>
                    ))}
                  </select>
                  {exceso && <small style={{ color: 'var(--bad)' }}>Stock insuficiente (disponible {p.stock})</small>}
                </td>
                <td><input className="num" type="number" min="1" step="1" value={it.cantidad} onChange={(e) => actualizar(it.key, { cantidad: e.target.value })} /></td>
                <td><input className="num" type="number" min="0" step="0.01" value={it.unitario} onChange={(e) => actualizar(it.key, { unitario: e.target.value })} /></td>
                <td className="num">{p ? `${p.alicuota_iva}%` : '—'}</td>
                <td className="num">{money(neto)}</td>
                <td><button className="btn sm icon" onClick={() => quitar(it.key)} disabled={items.length === 1} aria-label="Quitar">✕</button></td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="6">
              <button className="btn sm" onClick={() => onChange([...items, nuevoItem()])}>+ Agregar producto</button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
