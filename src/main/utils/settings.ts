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
  processNotifications: false,
  soundAlert: false,
  soundType: 'Glass',
  autoStart: true,
  showRecordingOverlay: true
}

export function getSettings(): Settings {
  return store.get('settings', defaultSettings) as Settings
}

export function saveSettings(settings: Settings): void {
  store.set('settings', settings)
}
