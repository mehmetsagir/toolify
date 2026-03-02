export type TranscriptionProvider = 'openai' | 'local-whisper' | 'apple-stt' | 'google-cloud'

export type LocalModelType = 'base' | 'small' | 'medium' | 'large-v3'

export interface Statistics {
  totalRecordings: number
  totalCharacters: number
  totalDuration: number
  successfulTranscriptions: number
  failedTranscriptions: number
  providerUsage: Record<TranscriptionProvider, number>
}

export interface Settings {
  apiKey?: string
  googleApiKey?: string
  language?: string
  sourceLanguage?: string
  targetLanguage?: string
  shortcut?: string
  translate?: boolean
  trayAnimations?: boolean
  processNotifications?: boolean
  soundAlert?: boolean
  soundType?: string
  autoStart?: boolean
  showRecordingOverlay?: boolean
  overlayStyle?: 'compact' | 'large'
  historyAutoDeleteDays?: number
  historyMaxItems?: number
  transcriptionProvider?: TranscriptionProvider
  useLocalModel?: boolean // deprecated, kept for migration
  localModelType?: LocalModelType
  overlayPosition?: { x: number; y: number }
  settingsWindowLayout?: {
    width: number
    height: number
    offsetX: number
    offsetY: number
    displayId?: number
  }
  statistics?: Statistics
}

export interface AccessibilityPermission {
  granted: boolean
  required: boolean
}
