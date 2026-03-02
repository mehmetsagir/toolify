import { BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { getSettings } from '../store/settings'
import { muteSystem, unmuteSystem } from '../services/media-control'

export type OverlayAudioPayload = {
  level: number
  spectrum?: number[]
  durationMs?: number
}

export interface RecordingIpcOptions {
  getMainWindow: () => BrowserWindow | null
  getSettingsWindow: () => BrowserWindow | null
  getRecordingOverlay: () => BrowserWindow | null
  setRecording: (state: boolean) => void
  setProcessing: (state: boolean) => void
  updateOverlayAudioLevel: (data: OverlayAudioPayload) => void
  handleProcessAudio: (buffer: ArrayBuffer, duration: number) => void
  handleCancelRecording: () => void
  updateTrayIcon: (
    state: 'idle' | 'recording' | 'processing' | 'copied' | 'error',
    trayAnimations?: boolean
  ) => void
}

export function registerRecordingHandlers(opts: RecordingIpcOptions): void {
  const {
    getMainWindow,
    getRecordingOverlay,
    setRecording,
    setProcessing,
    updateOverlayAudioLevel,
    handleProcessAudio,
    handleCancelRecording,
    updateTrayIcon
  } = opts

  ipcMain.on('set-recording-state', (_, state: boolean) => {
    setRecording(state)
    const currentSettings = getSettings()

    if (state) {
      try {
        globalShortcut.register('Escape', handleCancelRecording)
      } catch (error) {
        console.error('Failed to register ESC shortcut:', error)
      }
      muteSystem()
      updateTrayIcon('recording', currentSettings.trayAnimations)
    } else {
      globalShortcut.unregister('Escape')
      unmuteSystem()
      if (currentSettings.processNotifications) {
        // Notification dispatched via updateTrayIcon('processing') from renderer next step
      }
    }
  })

  ipcMain.on('set-processing-state', (_, state: boolean) => {
    setProcessing(state)
    if (state) {
      const settings = getSettings()
      updateTrayIcon('processing', settings.trayAnimations)
    }
  })

  ipcMain.on('update-recording-audio-level', (_, payload: OverlayAudioPayload) => {
    updateOverlayAudioLevel(payload)
  })

  ipcMain.on('process-audio', (_, buffer: ArrayBuffer, duration: number) => {
    handleProcessAudio(buffer, duration)
  })

  ipcMain.on('overlay-stop-recording', () => {
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stop-recording')
    }
  })

  ipcMain.on('overlay-cancel-recording', () => {
    handleCancelRecording()
  })

  ipcMain.on('overlay-resize-height', (_, height: number) => {
    const overlay = getRecordingOverlay()
    if (overlay && !overlay.isDestroyed()) {
      const bounds = overlay.getBounds()
      const newHeight = Math.min(Math.max(Math.ceil(height), 96), 220)
      if (bounds.height !== newHeight) {
        overlay.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: newHeight })
      }
    }
  })

  ipcMain.on('get-shortcut', () => {
    const settings = getSettings()
    const shortcut = settings.shortcut || 'Command+Space'
    const overlay = getRecordingOverlay()
    if (overlay && !overlay.isDestroyed()) {
      overlay.webContents.send('init-shortcut', shortcut)
    }
  })
}
