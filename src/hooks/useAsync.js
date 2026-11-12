import { useCallback, useEffect, useRef, useState } from 'react'

// Carga datos asincrónicos: const q = useAsync(() => servicio.listar(), [deps])
// q = { data, loading, error, reload }
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let vivo = true
    setState((s) => ({ ...s, loading: true, error: null }))
    fnRef
      .current()
      .then((data) => vivo && setState({ data, loading: false, error: null }))
      .catch((error) => vivo && setState({ data: null, loading: false, error }))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
