import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { Settings, Statistics, TranscriptionProvider } from '../../shared/types'

const store = new Store()

const ENCRYPTED_API_KEY_KEY = 'encryptedApiKey'
const ENCRYPTED_GOOGLE_API_KEY_KEY = 'encryptedGoogleApiKey'

const defaultStatistics: Statistics = {
  totalRecordings: 0,
  totalCharacters: 0,
  totalDuration: 0,
  successfulTranscriptions: 0,
  failedTranscriptions: 0,
  providerUsage: {
    openai: 0,
    'local-whisper': 0,
    'apple-stt': 0,
    'google-cloud': 0
  }
}

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
  transcriptionProvider: 'openai',
  localModelType: 'medium',
  statistics: defaultStatistics,
  wakeWordEnabled: false,
  wakeWord: 'Hey Toolify'
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
      // Decryption failed - clear corrupted key and return empty string
      // User will need to re-enter their API key
      console.warn('Failed to decrypt API key, clearing corrupted key:', error)
      store.delete(ENCRYPTED_API_KEY_KEY)
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

/**
 * Encrypt and store Google API key using Electron's safeStorage
 */
function setGoogleApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim() === '') {
    store.delete(ENCRYPTED_GOOGLE_API_KEY_KEY)
    return
  }

  try {
    const encryptedBuffer = safeStorage.encryptString(apiKey)
    store.set(ENCRYPTED_GOOGLE_API_KEY_KEY, encryptedBuffer.toString('base64'))
  } catch (error) {
    console.warn('Failed to encrypt Google API key, falling back to plain text:', error)
    store.set('googleApiKey', apiKey)
  }
}

/**
 * Retrieve and decrypt Google API key from storage
 */
function getGoogleApiKey(): string {
  const encryptedKey = store.get(ENCRYPTED_GOOGLE_API_KEY_KEY) as string | undefined
  if (encryptedKey) {
    try {
      const buffer = Buffer.from(encryptedKey, 'base64')
      return safeStorage.decryptString(buffer)
    } catch (error) {
      console.warn('Failed to decrypt Google API key, clearing corrupted key:', error)
      store.delete(ENCRYPTED_GOOGLE_API_KEY_KEY)
    }
  }

  const plainKey = store.get('googleApiKey') as string | undefined
  if (plainKey) {
    setGoogleApiKey(plainKey)
    store.delete('googleApiKey')
    return plainKey
  }

  return ''
}

export function getSettings(): Settings {
  const settings = store.get('settings', defaultSettings) as Settings

  // Migrate useLocalModel → transcriptionProvider
  if (!settings.transcriptionProvider && settings.useLocalModel !== undefined) {
    settings.transcriptionProvider = settings.useLocalModel ? 'local-whisper' : 'openai'
    delete settings.useLocalModel
  }
  if (!settings.transcriptionProvider) {
    settings.transcriptionProvider = 'openai'
  }

  // Override apiKey and googleApiKey with decrypted values
  return {
    ...settings,
    apiKey: getApiKey(),
    googleApiKey: getGoogleApiKey()
  }
}

export function saveSettings(settings: Settings): void {
  const { apiKey, googleApiKey, ...settingsWithoutKeys } = settings

  // Store API keys separately with encryption
  setApiKey(apiKey ?? '')
  setGoogleApiKey(googleApiKey ?? '')

  // Store rest of settings normally
  store.set('settings', settingsWithoutKeys)
}

/**
 * Check if API key is set (without decrypting)
 */
export function hasApiKey(): boolean {
  return !!(store.get(ENCRYPTED_API_KEY_KEY) || store.get('apiKey'))
}

/**
 * Update statistics after a transcription
 */
export function updateStatistics(
  success: boolean,
  provider: TranscriptionProvider,
  duration: number,
  characterCount: number
): void {
  const settings = getSettings()
  const stats = settings.statistics || defaultStatistics

  const updatedStats: Statistics = {
    totalRecordings: stats.totalRecordings + 1,
    totalCharacters: stats.totalCharacters + characterCount,
    totalDuration: stats.totalDuration + duration,
    successfulTranscriptions: success
      ? stats.successfulTranscriptions + 1
      : stats.successfulTranscriptions,
    failedTranscriptions: success ? stats.failedTranscriptions : stats.failedTranscriptions + 1,
    providerUsage: {
      ...stats.providerUsage,
      [provider]: (stats.providerUsage[provider] || 0) + 1
    }
  }

  saveSettings({
    ...settings,
    statistics: updatedStats
  })
}

/**
 * Reset statistics
 */
export function resetStatistics(): void {
  const settings = getSettings()
  saveSettings({
    ...settings,
    statistics: defaultStatistics
  })
}
