import { useState, useEffect, useCallback } from 'react'
import type { HistoryItem, HistorySettings } from '../../../shared/types'

export function useHistory(): {
  items: HistoryItem[]
  settings: HistorySettings | null
  loading: boolean
  deleteItem: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  saveSettings: (s: HistorySettings) => Promise<void>
  reload: () => Promise<void>
} {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [settings, setSettings] = useState<HistorySettings | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [history, histSettings] = await Promise.all([
      window.api.getAllHistory(),
      window.api.getHistorySettings()
    ])
    setItems(history)
    setSettings(histSettings)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const deleteItem = useCallback(
    async (id: string) => {
      await window.api.deleteHistoryItem(id)
      await load()
    },
    [load]
  )

  const clearAll = useCallback(async () => {
    await window.api.clearHistory()
    await load()
  }, [load])

  const saveSettings = useCallback(async (s: HistorySettings) => {
    await window.api.saveHistorySettings(s)
    setSettings(s)
  }, [])

  return { items, settings, loading, deleteItem, clearAll, saveSettings, reload: load }
}
