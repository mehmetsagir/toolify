import type { LocalModelType } from './local-models.types'

export type TranscriptionProvider = 'openai' | 'local-whisper' | 'apple-stt'

export interface Settings {
  apiKey?: string
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
  overlayStyle?: 'compact' | 'large' // Overlay display style
  historyAutoDeleteDays?: number // 0 = never delete
  historyMaxItems?: number // 0 = unlimited
  transcriptionProvider?: TranscriptionProvider
  useLocalModel?: boolean // deprecated, kept for migration
  localModelType?: LocalModelType
  overlayPosition?: { x: number; y: number } // Custom overlay position
  settingsWindowLayout?: {
    width: number
    height: number
    offsetX: number
    offsetY: number
    displayId?: number
  }
}

export interface AccessibilityPermission {
  granted: boolean
  required: boolean
}
