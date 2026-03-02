import { useState, useEffect, useCallback, useRef } from 'react'
import type { Settings } from '../../../shared/types'

export function useSettings(): {
  settings: Settings | null
  loading: boolean
  saveSettings: (updates: Partial<Settings>) => void
} {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    window.api.getSettings().then((s) => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  const saveSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => {
      if (!prev) return prev
      const merged = { ...prev, ...updates }
      window.api.saveSettings(merged)
      return merged
    })
  }, [])

  return { settings, loading, saveSettings }
}
