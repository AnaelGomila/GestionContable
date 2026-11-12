import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { CuentasProvider } from '../context/CuentasContext.jsx'
import Layout from '../components/layout/Layout.jsx'
import Loading from '../components/ui/Loading.jsx'

// Todas las páginas (menos el login) pasan por acá: sin sesión se redirige al login.
export default function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return <Loading full />
  if (!session) return <Navigate to="/login" replace />
  return (
    <CuentasProvider>
      <Layout />
    </CuentasProvider>
  )
}
