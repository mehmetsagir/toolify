import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { Settings } from '../../shared/types'

const store = new Store()

const ENCRYPTED_API_KEY_KEY = 'encryptedApiKey'

const defaultSettings: Settings = {
  apiKey: '',
  translate: true,
  language: '',
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  shortcut: 'Command+Space',
  trayAnimations: true,
  processNotifications: false,
  soundAlert: true,
  soundType: 'Glass',
  autoStart: true,
  showRecordingOverlay: true,
  historyAutoDeleteDays: 30,
  historyMaxItems: 0,
  useLocalModel: false,
  localModelType: 'medium'
}

/**
 * Encrypt and store API key using Electron's safeStorage
 */
function setApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim() === '') {
    store.delete(ENCRYPTED_API_KEY_KEY)
    return
  }

  try {
    const encryptedBuffer = safeStorage.encryptString(apiKey)
    store.set(ENCRYPTED_API_KEY_KEY, encryptedBuffer.toString('base64'))
  } catch (error) {
    // Fallback to plain text if encryption fails (e.g., on unsupported platforms)
    console.warn('Failed to encrypt API key, falling back to plain text:', error)
    store.set('apiKey', apiKey)
  }
}

/**
 * Retrieve and decrypt API key from storage
 */
function getApiKey(): string {
  // Try encrypted storage first
  const encryptedKey = store.get(ENCRYPTED_API_KEY_KEY) as string | undefined
  if (encryptedKey) {
    try {
      const buffer = Buffer.from(encryptedKey, 'base64')
      return safeStorage.decryptString(buffer)
    } catch (error) {
      console.warn('Failed to decrypt API key:', error)
    }
  }

  // Fallback to plain text for migration
  const plainKey = store.get('apiKey') as string | undefined
  if (plainKey) {
    // Migrate to encrypted storage
    setApiKey(plainKey)
    store.delete('apiKey')
    return plainKey
  }

  return ''
}

export function getSettings(): Settings {
  const settings = store.get('settings', defaultSettings) as Settings

  // Override apiKey with decrypted value
  return {
    ...settings,
    apiKey: getApiKey()
  }
}

export function saveSettings(settings: Settings): void {
  const { apiKey, ...settingsWithoutApiKey } = settings

  // Store API key separately with encryption
  setApiKey(apiKey ?? '')

  // Store rest of settings normally
  store.set('settings', settingsWithoutApiKey)
}

/**
 * Check if API key is set (without decrypting)
 */
export function hasApiKey(): boolean {
  return !!(store.get(ENCRYPTED_API_KEY_KEY) || store.get('apiKey'))
}
