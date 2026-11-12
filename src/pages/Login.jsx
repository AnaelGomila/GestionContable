import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Alert from '../components/ui/Alert.jsx'
import Field from '../components/ui/Field.jsx'

// El usuario admin se crea desde Supabase (Authentication > Users): acá no hay registro.
export default function Login() {
  const { session, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (session) return <Navigate to="/" replace />

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    const { error } = await login(email.trim(), password)
    setEnviando(false)
    if (error) setError('Email o contraseña incorrectos.')
  }

  return (
    <div className="login-wrap">
      <form className="card login-card stack" onSubmit={enviar}>
        <div>
          <span className="brand-mark" style={{ color: '#fff7ea', background: 'var(--accent)', display: 'inline-grid', placeItems: 'center' }}>EO</span>
          <h1>Ergo Oficinas</h1>
          <p className="muted">Gestor contable · ingresá con tu usuario</p>
        </div>
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus />
        </Field>
        <Field label="Contraseña">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Alert tipo="error">{error}</Alert>
        <button className="btn primary" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  )
}
