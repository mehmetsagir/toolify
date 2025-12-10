import Store from 'electron-store'
import type { Settings } from '../../shared/types'

const store = new Store()

const defaultSettings: Settings = {
  apiKey: '',
  translate: false,
  language: '',
  sourceLanguage: 'en',
  targetLanguage: 'tr',
  shortcut: 'Command+Space',
  trayAnimations: true,
  processNotifications: true,
  soundAlert: true,
  soundType: 'Glass',
  autoStart: true,
  showRecordingOverlay: true,
  historyAutoDeleteDays: 30,
  historyMaxItems: 0,
  useLocalModel: false,
  localModelType: 'medium'
}

export function getSettings(): Settings {
  const settings = store.get('settings', defaultSettings) as Settings
  
  // Migration: force legacy models to medium (REMOVED - now supported again)
  // if (['tiny', 'base', 'small'].includes(settings.localModelType || '')) {
  //     settings.localModelType = 'medium'
  //     store.set('settings', settings)
  // }
  
  return settings
}

export function saveSettings(settings: Settings): void {
  store.set('settings', settings)
}
