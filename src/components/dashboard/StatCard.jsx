// tono: '' | 'ok' | 'bad' (resalta el importe en verde o en rojo)
export default function StatCard({ label, valor, nota, tono = '' }) {
  return (
    <div className={`card stat ${tono}`}>
      <div className="label">{label}</div>
      <div className="valor">{valor}</div>
      {nota && <div className="nota">{nota}</div>}
    </div>
  )
}
