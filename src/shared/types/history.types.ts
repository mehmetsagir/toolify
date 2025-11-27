export interface HistoryItem {
  id: string
  text: string
  timestamp: number
  isFavorite: boolean
  sourceLanguage?: string
  targetLanguage?: string
  translated: boolean
  duration?: number // Recording duration in seconds
}

export interface HistorySettings {
  autoDeleteDays: number // 0 = never delete
  maxHistoryItems: number // 0 = unlimited
}



