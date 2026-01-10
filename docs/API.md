# Toolify API Documentation

## Overview

Toolify uses a type-safe IPC (Inter-Process Communication) bridge to enable secure communication between the main process and renderer process. The API is exposed through `window.api` in the renderer process, providing a clean, TypeScript-typed interface for all application functionality.

### Architecture

```
┌─────────────────┐         IPC          ┌─────────────────┐
│  Renderer       │ ◄──────────────►    │  Main Process   │
│  (window.api)   │                      │  (Handlers)     │
└─────────────────┘                      └─────────────────┘
```

**Key Features:**

- Type-safe communication via TypeScript
- Context-bridged API for security
- Event-based notifications
- Promise-based request/response patterns
- Automatic cleanup for event listeners

---

## API Reference

### Recording API

#### Event Listeners

##### `onStartRecording(callback: () => void): () => void`

Listens for recording start events from the main process.

**Parameters:**

- `callback` - Function to execute when recording starts

**Returns:** Cleanup function to remove the listener

**Example:**

```typescript
const cleanup = window.api.onStartRecording(() => {
  console.log('Recording started')
  // Update UI to show recording state
})

// Later, clean up the listener
cleanup()
```

---

##### `onStopRecording(callback: () => void): () => void`

Listens for recording stop events.

**Parameters:**

- `callback` - Function to execute when recording stops

**Returns:** Cleanup function

**Example:**

```typescript
window.api.onStopRecording(() => {
  console.log('Recording stopped')
  // Update UI to show processing state
})
```

---

##### `onCancelRecording(callback: () => void): () => void`

Listens for recording cancellation events.

**Parameters:**

- `callback` - Function to execute when recording is cancelled

**Returns:** Cleanup function

**Example:**

```typescript
window.api.onCancelRecording(() => {
  console.log('Recording cancelled')
  // Reset UI to idle state
})
```

---

##### `onProcessingComplete(callback: () => void): () => void`

Listens for audio processing completion events.

**Parameters:**

- `callback` - Function to execute when processing completes

**Returns:** Cleanup function

**Example:**

```typescript
window.api.onProcessingComplete(() => {
  console.log('Processing complete')
  // Update UI to show ready state
})
```

---

##### `onShowHistory(callback: () => void): () => void`

Listens for requests to show the history view.

**Parameters:**

- `callback` - Function to execute when history should be displayed

**Returns:** Cleanup function

**Example:**

```typescript
window.api.onShowHistory(() => {
  console.log('Show history requested')
  // Navigate to history tab
})
```

---

#### Recording Actions

##### `processAudio(buffer: ArrayBuffer, duration: number): void`

Sends audio data to the main process for transcription.

**Parameters:**

- `buffer` - Raw audio data as ArrayBuffer
- `duration` - Recording duration in seconds

**Example:**

```typescript
async function stopRecording() {
  const audioBuffer = await mediaRecorder.stop()
  const duration = (Date.now() - startTime) / 1000

  window.api.processAudio(audioBuffer, duration)
}
```

---

##### `setRecordingState(state: boolean): void`

Updates the recording state in the main process.

**Parameters:**

- `state` - `true` if recording, `false` otherwise

**Example:**

```typescript
function startRecording() {
  window.api.setRecordingState(true)
}

function stopRecording() {
  window.api.setRecordingState(false)
}
```

---

##### `setProcessingState(state: boolean): void`

Updates the audio processing state in the main process.

**Parameters:**

- `state` - `true` if processing, `false` otherwise

**Example:**

```typescript
async function processAudio(buffer: ArrayBuffer) {
  window.api.setProcessingState(true)

  try {
    // Process audio...
  } finally {
    window.api.setProcessingState(false)
  }
}
```

---

##### `updateRecordingAudioLevel(payload: { level: number; spectrum?: number[]; durationMs?: number }): void`

Sends real-time audio level updates during recording.

**Parameters:**

- `payload.level` - Audio level (0-1)
- `payload.spectrum` (optional) - Frequency spectrum data
- `payload.durationMs` (optional) - Current recording duration in milliseconds

**Example:**

```typescript
function onAudioLevelUpdate(level: number, spectrum: number[]) {
  window.api.updateRecordingAudioLevel({
    level,
    spectrum,
    durationMs: Date.now() - startTime
  })
}
```

---

### Settings API

##### `getSettings(): Promise<Settings>`

Retrieves application settings from the main process.

**Returns:** Promise resolving to `Settings` object

**Settings Type:**

```typescript
interface Settings {
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
  showDockIcon?: boolean
  showRecordingOverlay?: boolean
  overlayStyle?: 'compact' | 'large'
  historyAutoDeleteDays?: number
  historyMaxItems?: number
  useLocalModel?: boolean
  localModelType?: 'base' | 'small' | 'medium' | 'large-v3'
  overlayPosition?: { x: number; y: number }
  settingsWindowLayout?: {
    width: number
    height: number
    offsetX: number
    offsetY: number
    displayId?: number
  }
}
```

**Example:**

```typescript
async function loadSettings() {
  const settings = await window.api.getSettings()
  console.log('API Key:', settings.apiKey)
  console.log('Shortcut:', settings.shortcut)
  return settings
}
```

---

##### `saveSettings(settings: Settings): void`

Saves application settings to persistent storage.

**Parameters:**

- `settings` - Settings object to save

**Example:**

```typescript
function saveApiKey(apiKey: string) {
  const currentSettings = await window.api.getSettings()
  window.api.saveSettings({
    ...currentSettings,
    apiKey
  })
}
```

---

### Window Management API

##### `openSettings(): void`

Opens the settings window.

**Example:**

```typescript
function showSettings() {
  window.api.openSettings()
}
```

---

##### `closeSettings(): void`

Closes the settings window.

**Example:**

```typescript
function hideSettings() {
  window.api.closeSettings()
}
```

---

##### `openHistory(): void`

Opens the settings window and navigates to the history tab.

**Example:**

```typescript
function showHistory() {
  window.api.openHistory()
}
```

---

##### `resizeSettingsWindow(height: number): void`

Resizes the settings window to accommodate dynamic content.

**Parameters:**

- `height` - New window height in pixels

**Example:**

```typescript
function expandSettings() {
  window.api.resizeSettingsWindow(700)
}
```

---

### Sound & Notifications API

##### `previewSound(soundType: string): void`

Plays a preview of the selected notification sound.

**Parameters:**

- `soundType` - Sound type identifier (e.g., `'glass'`, `'purr'`, `'sosumi'`)

**Example:**

```typescript
function onSoundSelect(soundType: string) {
  window.api.previewSound(soundType)
}
```

---

### Permissions API

##### `checkAccessibilityPermission(): Promise<{ granted: boolean; required: boolean }>`

Checks accessibility permission status (macOS only).

**Returns:** Promise resolving to permission status

**Example:**

```typescript
async function checkPermissions() {
  const { granted, required } = await window.api.checkAccessibilityPermission()

  if (required && !granted) {
    console.log('Accessibility permission required')
  }
}
```

---

##### `openAccessibilitySettings(): void`

Opens macOS System Settings to the Accessibility pane.

**Example:**

```typescript
function requestAccessibilityPermission() {
  window.api.openAccessibilitySettings()
}
```

---

### Update API

#### Update Methods

##### `checkForUpdates(): Promise<UpdateInfo | null>`

Checks for available application updates.

**Returns:** Promise resolving to update info or `null` if no update

**UpdateInfo Type:**

```typescript
interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
}
```

**Example:**

```typescript
async function checkUpdates() {
  const update = await window.api.checkForUpdates()

  if (update) {
    console.log(`Update available: ${update.version}`)
    console.log('Release notes:', update.releaseNotes)
  } else {
    console.log('No updates available')
  }
}
```

---

##### `downloadUpdate(): Promise<boolean>`

Downloads the available update.

**Returns:** Promise resolving to `true` if download started successfully

**Example:**

```typescript
async function downloadUpdates() {
  const success = await window.api.downloadUpdate()
  if (success) {
    console.log('Update downloading...')
  }
}
```

---

##### `quitAndInstall(): Promise<void>`

Quits the application and installs the downloaded update.

**Example:**

```typescript
async function installUpdate() {
  await window.api.quitAndInstall()
}
```

---

##### `getUpdateStatus(): Promise<{ available: boolean; downloaded: boolean; version?: string }>`

Gets the current update status.

**Returns:** Promise resolving to update status

**Example:**

```typescript
async function getUpdateStatus() {
  const status = await window.api.getUpdateStatus()

  console.log('Update available:', status.available)
  console.log('Update downloaded:', status.downloaded)
  console.log('Latest version:', status.version)
}
```

---

#### Update Event Listeners

##### `onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void`

Listens for update availability notifications.

**Parameters:**

- `callback` - Function receiving update info

**Returns:** Cleanup function

**Example:**

```typescript
window.api.onUpdateAvailable((info) => {
  console.log(`Update ${info.version} available!`)
  showUpdateNotification(info)
})
```

---

##### `onUpdateDownloaded(callback: (info: Pick<UpdateInfo, 'version'>) => void): () => void`

Listens for update download completion.

**Parameters:**

- `callback` - Function receiving version info

**Returns:** Cleanup function

**Example:**

```typescript
window.api.onUpdateDownloaded((info) => {
  console.log(`Update ${info.version} downloaded!`)
  showInstallButton()
})
```

---

##### `onUpdateDownloadProgress(callback: (progress: UpdateDownloadProgress) => void): () => void`

Listens for update download progress updates.

**Parameters:**

- `callback` - Function receiving progress info

**UpdateDownloadProgress Type:**

```typescript
interface UpdateDownloadProgress {
  percent: number
  transferred: number
  total: number
}
```

**Returns:** Cleanup function

**Example:**

```typescript
window.api.onUpdateDownloadProgress((progress) => {
  console.log(`Download: ${progress.percent}%`)
  updateProgressBar(progress.percent)
})
```

---

### History API

#### History Methods

##### `getAllHistory(): Promise<HistoryItem[]>`

Retrieves all history items.

**Returns:** Promise resolving to array of history items

**HistoryItem Type:**

```typescript
interface HistoryItem {
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
}
```

**Example:**

```typescript
async function loadHistory() {
  const history = await window.api.getAllHistory()
  displayHistoryItems(history)
}
```

---

##### `getHistoryItem(id: string): Promise<HistoryItem | null>`

Retrieves a specific history item by ID.

**Parameters:**

- `id` - History item ID

**Returns:** Promise resolving to history item or `null` if not found

**Example:**

```typescript
async function showHistoryDetail(id: string) {
  const item = await window.api.getHistoryItem(id)

  if (item) {
    console.log('Text:', item.text)
    console.log('Duration:', item.duration)
  } else {
    console.log('Item not found')
  }
}
```

---

##### `deleteHistoryItem(id: string): Promise<boolean>`

Deletes a specific history item.

**Parameters:**

- `id` - History item ID to delete

**Returns:** Promise resolving to `true` if deleted successfully

**Example:**

```typescript
async function deleteItem(id: string) {
  const success = await window.api.deleteHistoryItem(id)

  if (success) {
    console.log('Item deleted')
    refreshHistoryList()
  }
}
```

---

##### `clearHistory(): Promise<boolean>`

Deletes all history items.

**Returns:** Promise resolving to `true` if cleared successfully

**Example:**

```typescript
async function clearAllHistory() {
  if (confirm('Are you sure you want to delete all history?')) {
    const success = await window.api.clearHistory()
    if (success) {
      console.log('History cleared')
    }
  }
}
```

---

##### `clearOldHistory(): Promise<number>`

Deletes history items older than the configured auto-delete threshold.

**Returns:** Promise resolving to number of items deleted

**Example:**

```typescript
async function cleanupOldHistory() {
  const deletedCount = await window.api.clearOldHistory()
  console.log(`Deleted ${deletedCount} old items`)
}
```

---

#### History Settings

##### `getHistorySettings(): Promise<HistorySettings>`

Retrieves history management settings.

**Returns:** Promise resolving to history settings

**HistorySettings Type:**

```typescript
interface HistorySettings {
  autoDeleteDays: number // 0 = never delete
  maxHistoryItems: number // 0 = unlimited
}
```

**Example:**

```typescript
async function loadHistorySettings() {
  const settings = await window.api.getHistorySettings()
  console.log('Auto-delete after:', settings.autoDeleteDays, 'days')
  console.log('Max items:', settings.maxHistoryItems)
}
```

---

##### `saveHistorySettings(settings: HistorySettings): Promise<boolean>`

Saves history management settings.

**Parameters:**

- `settings` - History settings to save

**Returns:** Promise resolving to `true` if saved successfully

**Example:**

```typescript
async function updateAutoDeleteDays(days: number) {
  const success = await window.api.saveHistorySettings({
    autoDeleteDays: days,
    maxHistoryItems: 0 // unlimited
  })

  if (success) {
    console.log('Settings saved')
  }
}
```

---

### Local Model API

#### Model Management

##### `checkLocalModel(modelType: LocalModelType): Promise<boolean>`

Checks if a local Whisper model exists.

**Parameters:**

- `modelType` - Model type to check ('base' | 'small' | 'medium' | 'large-v3')

**Returns:** Promise resolving to `true` if model exists

**Example:**

```typescript
async function checkModelAvailable() {
  const exists = await window.api.checkLocalModel('medium')
  console.log('Medium model exists:', exists)
}
```

---

##### `downloadLocalModel(modelType: LocalModelType): Promise<void>`

Downloads a local Whisper model.

**Parameters:**

- `modelType` - Model type to download

**Example:**

```typescript
async function downloadMediumModel() {
  try {
    await window.api.downloadLocalModel('medium')
    console.log('Model download complete')
  } catch (error) {
    console.error('Download failed:', error)
  }
}
```

---

##### `deleteLocalModel(modelType: LocalModelType): Promise<void>`

Deletes a local Whisper model.

**Parameters:**

- `modelType` - Model type to delete

**Example:**

```typescript
async function removeModel() {
  await window.api.deleteLocalModel('base')
  console.log('Model deleted')
}
```

---

##### `getLocalModelsInfo(): Promise<LocalModelInfo[]>`

Retrieves information about all local models.

**Returns:** Promise resolving to array of model info

**LocalModelInfo Type:**

```typescript
interface LocalModelInfo {
  type: LocalModelType
  displayName: string
  expectedSizeMB: number
  exists: boolean
  path: string
  fileSizeMB?: number
  updatedAt?: number
}
```

**Example:**

```typescript
async function loadModelsInfo() {
  const models = await window.api.getLocalModelsInfo()

  models.forEach((model) => {
    console.log(`${model.displayName}: ${model.exists ? 'Installed' : 'Not installed'}`)
    if (model.fileSizeMB) {
      console.log(`Size: ${model.fileSizeMB} MB`)
    }
  })
}
```

---

##### `openModelsFolder(): Promise<string>`

Opens the folder containing local models in the system file manager.

**Returns:** Promise resolving to the folder path

**Example:**

```typescript
async function showModelsFolder() {
  const folderPath = await window.api.openModelsFolder()
  console.log('Opened folder:', folderPath)
}
```

---

#### Model Download Progress

##### `onModelDownloadProgress(callback: (progress: { modelType: LocalModelType; percent: number; downloaded: number; total: number }) => void): () => void`

Listens for model download progress updates.

**Parameters:**

- `callback` - Function receiving progress info

**Progress Type:**

```typescript
{
  modelType: LocalModelType
  percent: number
  downloaded: number
  total: number
}
```

**Returns:** Cleanup function

**Example:**

```typescript
window.api.onModelDownloadProgress((progress) => {
  console.log(`Downloading ${progress.modelType}: ${progress.percent}%`)
  console.log(
    `${(progress.downloaded / 1024 / 1024).toFixed(2)} MB / ${(progress.total / 1024 / 1024).toFixed(2)} MB`
  )

  updateProgressBar(progress.percent)
})
```

---

## Error Handling

### Promise-based Methods

All methods that return a Promise should handle errors appropriately:

```typescript
try {
  const settings = await window.api.getSettings()
  // Use settings
} catch (error) {
  console.error('Failed to load settings:', error)
  // Show error to user
}
```

### Event Listener Cleanup

Always clean up event listeners when they're no longer needed to prevent memory leaks:

```typescript
// Setup listener
const cleanup = window.api.onStartRecording(handleStart)

// Clean up when component unmounts
onUnmount(() => {
  cleanup()
})
```

---

## Complete Usage Example

Here's a comprehensive example showing how to use the API:

```typescript
class ToolifyApp {
  private listeners: Array<() => void> = []

  async initialize() {
    // Load settings
    const settings = await window.api.getSettings()
    this.applySettings(settings)

    // Setup event listeners
    this.setupRecordingListeners()
    this.setupUpdateListeners()
    this.setupModelDownloadListeners()

    // Check for updates
    this.checkForUpdates()
  }

  private setupRecordingListeners() {
    const startCleanup = window.api.onStartRecording(() => {
      this.showRecordingUI()
    })

    const stopCleanup = window.api.onStopRecording(() => {
      this.showProcessingUI()
    })

    const completeCleanup = window.api.onProcessingComplete(() => {
      this.hideProcessingUI()
    })

    this.listeners.push(startCleanup, stopCleanup, completeCleanup)
  }

  private setupUpdateListeners() {
    const updateCleanup = window.api.onUpdateAvailable((info) => {
      this.showUpdateNotification(info)
    })

    const progressCleanup = window.api.onUpdateDownloadProgress((progress) => {
      this.updateDownloadProgress(progress.percent)
    })

    const downloadedCleanup = window.api.onUpdateDownloaded((info) => {
      this.showInstallUpdateButton(info.version)
    })

    this.listeners.push(updateCleanup, progressCleanup, downloadedCleanup)
  }

  private setupModelDownloadListeners() {
    const progressCleanup = window.api.onModelDownloadProgress((progress) => {
      this.updateModelDownloadProgress(progress.modelType, progress.percent)
    })

    this.listeners.push(progressCleanup)
  }

  async saveSettings(settings: Settings) {
    window.api.saveSettings(settings)
    await this.refreshSettings()
  }

  async loadHistory() {
    const history = await window.api.getAllHistory()
    return history
  }

  async checkForUpdates() {
    const update = await window.api.checkForUpdates()
    if (update) {
      console.log(`Update ${update.version} available`)
    }
  }

  cleanup() {
    // Remove all event listeners
    this.listeners.forEach((cleanup) => cleanup())
    this.listeners = []
  }
}

// Usage
const app = new ToolifyApp()
await app.initialize()

// Later, cleanup
app.cleanup()
```

---

## TypeScript Type Definitions

The API is fully typed. To use these types in your renderer process, import them from the shared types:

```typescript
import type {
  Settings,
  UpdateInfo,
  UpdateDownloadProgress,
  HistoryItem,
  HistorySettings,
  LocalModelInfo,
  LocalModelType
} from '../shared/types'

// Now you can use these types in your code
function processSettings(settings: Settings): void {
  // ...
}
```

---

## Best Practices

1. **Always clean up event listeners** when components unmount
2. **Use try/catch** for all Promise-based methods
3. **Type your variables** using the exported types
4. **Handle null returns** appropriately (e.g., `getHistoryItem` returns `null` if not found)
5. **Debounce frequent calls** like `updateRecordingAudioLevel` to improve performance
6. **Check permissions** before using features that require them
7. **Handle model download errors** gracefully, as downloads can be large and fail

---

## Platform-Specific Behavior

### macOS

- Accessibility permissions are required for keyboard shortcuts
- Dock icon visibility can be toggled
- System notifications are native

### Windows/Linux

- Some macOS-specific features may not be available
- Tray icon behavior may differ
- Accessibility permissions are not applicable

---

## Security Considerations

- The API uses `contextBridge` to expose a secure interface
- Only the methods explicitly defined in the preload script are available
- The main process has full access to system resources
- The renderer process is sandboxed and cannot access Node.js APIs directly

Always validate and sanitize any data received from the main process, though the type system provides compile-time safety.

---

## Additional Resources

- [Electron IPC Documentation](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Project Repository](https://github.com/mehmetsagir/toolify)
