export default function Loading({ full = false, texto = 'Cargando…' }) {
  return (
    <div className={`loading ${full ? 'full' : ''}`}>
      <span className="spin" />
      {texto}
    </div>
  )
}
