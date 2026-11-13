import { Navigate, Route, Routes } from 'react-router-dom'
import { configurado } from './lib/supabase.js'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EmpresaCapital from './pages/EmpresaCapital.jsx'
import Fondos from './pages/Fondos.jsx'
import Clientes from './pages/Clientes.jsx'
import Proveedores from './pages/Proveedores.jsx'
import Productos from './pages/Productos.jsx'
import Compras from './pages/Compras.jsx'
import CompraNueva from './pages/CompraNueva.jsx'
import Ventas from './pages/Ventas.jsx'
import VentaNueva from './pages/VentaNueva.jsx'
import Facturas from './pages/Facturas.jsx'
import FacturaRecibida from './pages/FacturaRecibida.jsx'
import FacturaVista from './pages/FacturaVista.jsx'
import Cheques from './pages/Cheques.jsx'
import LibroDiario from './pages/LibroDiario.jsx'
import LibroMayor from './pages/LibroMayor.jsx'
import BalanceSumas from './pages/BalanceSumas.jsx'
import SituacionPatrimonial from './pages/SituacionPatrimonial.jsx'
import PlanCuentas from './pages/PlanCuentas.jsx'
import AsientoManual from './pages/AsientoManual.jsx'
import Alert from './components/ui/Alert.jsx'

export default function App() {
  if (!configurado) {
    return (
      <div className="page">
        <h1>Falta configurar Supabase</h1>
        <br />
        <Alert tipo="warn">
          Copiá <b>.env.example</b> a <b>.env</b>, completá <b>VITE_SUPABASE_URL</b> y <b>VITE_SUPABASE_PUBLISHABLE_KEY</b> y reiniciá <code>npm run dev</code>.
        </Alert>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route index element={<Dashboard />} />
        <Route path="empresa" element={<EmpresaCapital />} />
        <Route path="fondos" element={<Fondos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="proveedores" element={<Proveedores />} />
        <Route path="productos" element={<Productos />} />
        <Route path="compras" element={<Compras />} />
        <Route path="compras/nueva" element={<CompraNueva />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="ventas/nueva" element={<VentaNueva />} />
        <Route path="facturas" element={<Facturas />} />
        <Route path="facturas/recibida/:id" element={<FacturaRecibida />} />
        <Route path="facturas/:id" element={<FacturaVista />} />
        <Route path="cheques" element={<Cheques />} />
        <Route path="libro-diario" element={<LibroDiario />} />
        <Route path="libro-mayor" element={<LibroMayor />} />
        <Route path="balance" element={<BalanceSumas />} />
        <Route path="situacion-patrimonial" element={<SituacionPatrimonial />} />
        <Route path="plan-de-cuentas" element={<PlanCuentas />} />
        <Route path="asiento-manual" element={<AsientoManual />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
