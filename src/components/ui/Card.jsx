export default function Card({ titulo, acciones, flush = false, className = '', children }) {
  return (
    <section className={`card ${flush ? 'flush' : ''} ${className}`}>
      {(titulo || acciones) && (
        <div className="card-title" style={flush ? { padding: '16px 20px 0' } : undefined}>
          {titulo && <h2>{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  )
}
