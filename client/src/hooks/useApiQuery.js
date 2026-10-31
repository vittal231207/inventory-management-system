import { useCallback, useEffect, useState } from 'react'

export default function useApiQuery(loader, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [requestId, setRequestId] = useState(0)
  const reload = useCallback(() => {
    setRequestId((id) => id + 1)
  }, [])

  useEffect(() => {
    let active = true
    Promise.resolve().then(loader).then((data) => {
      if (active) setState({ data, loading: false, error: null })
    }).catch((error) => {
      if (active) setState({ data: null, loading: false, error })
    })
    return () => { active = false }
    // Callers provide stable loaders or memoized dependencies for the resource being loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, ...dependencies])

  return { ...state, reload }
}
