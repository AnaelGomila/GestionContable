import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const MENUS = [
  {
    titulo: 'Empresa',
    items: [
      { to: '/empresa', texto: 'Empresa y capital' },
      { to: '/fondos', texto: 'Fondos (reorganizar capital)' },
    ],
  },
  {
    titulo: 'Terceros y productos',
    items: [
      { to: '/clientes', texto: 'Clientes' },
      { to: '/proveedores', texto: 'Proveedores' },
      { to: '/productos', texto: 'Productos' },
    ],
  },
  {
    titulo: 'Operaciones',
    items: [
      { to: '/compras', texto: 'Compras' },
      { to: '/ventas', texto: 'Ventas' },
      { to: '/facturas', texto: 'Facturas' },
      { to: '/cheques', texto: 'Cheques diferidos' },
    ],
  },
  {
    titulo: 'Contabilidad',
    items: [
      { to: '/libro-diario', texto: 'Libro diario' },
      { to: '/libro-mayor', texto: 'Libro mayor' },
      { to: '/balance', texto: 'Balance de sumas y saldos' },
      { to: '/situacion-patrimonial', texto: 'Situación patrimonial' },
      { to: '/plan-de-cuentas', texto: 'Plan de cuentas' },
      { to: '/asiento-manual', texto: 'Asiento manual' },
    ],
  },
]

function Menu({ titulo, items, abierto, onToggle, onClose }) {
  const { pathname } = useLocation()
  const activo = items.some((i) => pathname.startsWith(i.to))
  return (
    <div className="nav-item">
      <button className={`nav-btn ${activo || abierto ? 'activo' : ''}`} onClick={onToggle}>
        {titulo} <span className="caret">▼</span>
      </button>
      {abierto && (
        <div className="dropdown">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} className={({ isActive }) => (isActive ? 'activo' : '')} onClick={onClose}>
              {i.texto}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const [abierto, setAbierto] = useState(null)
  const ref = useRef(null)
  const { pathname } = useLocation()

  // Cerrar los menús al hacer clic afuera o al cambiar de página
  useEffect(() => {
    const fuera = (e) => ref.current && !ref.current.contains(e.target) && setAbierto(null)
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])
  useEffect(() => setAbierto(null), [pathname])

  return (
    <nav className="navbar" ref={ref}>
     <Link to="/" className="brand">
  <img src="/logo.png" alt="Ergo Oficinas" className="brand-logo" />
  Ergo Oficinas
</Link>
      <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'activo' : ''}`}>
        Inicio
      </NavLink>
      {MENUS.map((m) => (
        <Menu
          key={m.titulo}
          {...m}
          abierto={abierto === m.titulo}
          onToggle={() => setAbierto(abierto === m.titulo ? null : m.titulo)}
          onClose={() => setAbierto(null)}
        />
      ))}
      <div className="nav-item nav-user">
        <button className="nav-btn" onClick={() => setAbierto(abierto === 'user' ? null : 'user')}>
          Admin <span className="caret">▼</span>
        </button>
        {abierto === 'user' && (
          <div className="dropdown">
            <div className="email">{user?.email}</div>
            <a href="#salir" onClick={(e) => { e.preventDefault(); logout() }}>Cerrar sesión</a>
          </div>
        )}
      </div>
    </nav>
  )
}
