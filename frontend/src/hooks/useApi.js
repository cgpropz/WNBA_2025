import { useState, useEffect } from 'react'

const BASE = import.meta.env.VITE_API_BASE || ''

export function useApi(endpoint) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!endpoint) return
    setLoading(true)
    setError(null)

    fetch(`${BASE}${endpoint}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(json => { setData(json); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [endpoint])

  return { data, loading, error }
}

export async function fetchApi(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
