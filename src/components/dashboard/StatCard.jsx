export default function StatCard({ label, valor, nota }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="valor">{valor}</div>
      {nota && <div className="nota">{nota}</div>}
    </div>
  )
}
