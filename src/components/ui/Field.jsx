// Etiqueta + control. col: clase de ancho (col-6, col-4, ...)
export default function Field({ label, hint, col = '', children }) {
  return (
    <div className={`field ${col}`}>
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}
