export interface HistoryItem {
  id: string
  text: string
  timestamp: number
  isFavorite: boolean
  sourceLanguage?: string
  targetLanguage?: string
  translated: boolean
  duration?: number
  provider?: string
  audioPath?: string
  success?: boolean
}

export interface HistorySettings {
  autoDeleteDays: number
  maxHistoryItems: number
}
