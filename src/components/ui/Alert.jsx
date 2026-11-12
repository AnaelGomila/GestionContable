// tipo: info | ok | warn | error
export default function Alert({ tipo = 'info', children, className = '' }) {
  if (!children) return null
  return <div className={`alert ${tipo} ${className}`}>{children}</div>
}
