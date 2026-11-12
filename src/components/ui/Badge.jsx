// tipo: ok | warn | bad | info | olive | wood | (vacío = neutro)
export default function Badge({ tipo = '', children }) {
  return <span className={`badge ${tipo}`}>{children}</span>
}
