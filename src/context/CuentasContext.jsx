import { createContext, useContext, useMemo } from 'react'
import { useAsync } from '../hooks/useAsync.js'
import * as cuentasService from '../services/cuentas.js'

const CuentasContext = createContext({ cuentas: [], porCodigo: {}, reload: () => {} })

// Carga el plan de cuentas una sola vez para toda la app.
export function CuentasProvider({ children }) {
  const q = useAsync(() => cuentasService.listar(), [])
  const value = useMemo(() => {
    const cuentas = q.data ?? []
    return {
      cuentas,
      porCodigo: Object.fromEntries(cuentas.map((c) => [c.codigo, c])),
      reload: q.reload,
    }
  }, [q.data, q.reload])
  return <CuentasContext.Provider value={value}>{children}</CuentasContext.Provider>
}

export const useCuentas = () => useContext(CuentasContext)
