import Store from 'electron-store'
import type { HistoryItem, HistorySettings } from '../../shared/types'

const store = new Store()

const HISTORY_KEY = 'history'
const HISTORY_SETTINGS_KEY = 'historySettings'

const defaultHistorySettings: HistorySettings = {
  autoDeleteDays: 30, // Delete items older than 30 days by default
  maxHistoryItems: 0 // Unlimited by default
}

export function getHistorySettings(): HistorySettings {
  return store.get(HISTORY_SETTINGS_KEY, defaultHistorySettings) as HistorySettings
}

export function saveHistorySettings(settings: HistorySettings): void {
  store.set(HISTORY_SETTINGS_KEY, settings)
}

export function getAllHistory(): HistoryItem[] {
  const history = store.get(HISTORY_KEY, []) as HistoryItem[]
  return history.sort((a, b) => b.timestamp - a.timestamp) // Most recent first
}

export function getHistoryById(id: string): HistoryItem | null {
  const history = getAllHistory()
  return history.find((item) => item.id === id) || null
}

export function addHistoryItem(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
  const history = getAllHistory()
  const newItem: HistoryItem = {
    ...item,
    id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  }

  history.unshift(newItem) // Add to beginning

  // Apply max items limit
  const settings = getHistorySettings()
  if (settings.maxHistoryItems > 0 && history.length > settings.maxHistoryItems) {
    history.splice(settings.maxHistoryItems)
  }

  store.set(HISTORY_KEY, history)
  return newItem
}

export function deleteHistoryItem(id: string): boolean {
  const history = getAllHistory()
  const filtered = history.filter((item) => item.id !== id)
  store.set(HISTORY_KEY, filtered)
  return filtered.length !== history.length
}

export function toggleFavorite(id: string): boolean {
  const history = getAllHistory()
  const item = history.find((item) => item.id === id)
  if (item) {
    item.isFavorite = !item.isFavorite
    store.set(HISTORY_KEY, history)
    return item.isFavorite
  }
  return false
}

export function searchHistory(query: string): HistoryItem[] {
  const history = getAllHistory()
  const lowerQuery = query.toLowerCase()
  return history.filter(
    (item) =>
      item.text.toLowerCase().includes(lowerQuery) ||
      (item.sourceLanguage && item.sourceLanguage.toLowerCase().includes(lowerQuery)) ||
      (item.targetLanguage && item.targetLanguage.toLowerCase().includes(lowerQuery))
  )
}

export function getFavorites(): HistoryItem[] {
  const history = getAllHistory()
  return history.filter((item) => item.isFavorite)
}

export function clearHistory(): void {
  store.set(HISTORY_KEY, [])
}

export function clearOldHistory(): number {
  const settings = getHistorySettings()
  if (settings.autoDeleteDays === 0) {
    return 0 // Never delete
  }

  const history = getAllHistory()
  const cutoffTime = Date.now() - settings.autoDeleteDays * 24 * 60 * 60 * 1000
  const filtered = history.filter((item) => item.timestamp > cutoffTime)
  const deletedCount = history.length - filtered.length

  if (deletedCount > 0) {
    store.set(HISTORY_KEY, filtered)
  }

  return deletedCount
}

export function deleteHistoryItems(ids: string[]): number {
  const history = getAllHistory()
  const filtered = history.filter((item) => !ids.includes(item.id))
  const deletedCount = history.length - filtered.length
  store.set(HISTORY_KEY, filtered)
  return deletedCount
}




