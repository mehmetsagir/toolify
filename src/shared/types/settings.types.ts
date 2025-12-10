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
  historyAutoDeleteDays?: number // 0 = never delete
  historyMaxItems?: number // 0 = unlimited
  useLocalModel?: boolean
  localModelType?: 'base' | 'small' | 'medium' | 'large-v3'
}

export interface AccessibilityPermission {
  granted: boolean
  required: boolean
}
