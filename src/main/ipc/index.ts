import { BrowserWindow } from 'electron'
import { registerSettingsHandlers } from './settings.ipc'
import { registerRecordingHandlers } from './recording.ipc'
import { registerPermissionsHandlers } from './permissions.ipc'
import { registerHistoryHandlers } from './history.ipc'
import { registerModelsHandlers } from './models.ipc'
import { registerUpdateHandlers } from './update.ipc'
import type { OverlayAudioPayload } from './recording.ipc'

export type { OverlayAudioPayload }

export interface AllIpcOptions {
  getMainWindow: () => BrowserWindow | null
  getSettingsWindow: () => BrowserWindow | null
  getRecordingOverlay: () => BrowserWindow | null
  openSettings: () => void
  openHistory: () => void
  onShortcutChange: (shortcut: string) => void
  updateContextMenu: () => void
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

export function registerAllIpcHandlers(opts: AllIpcOptions): void {
  registerSettingsHandlers({
    getSettingsWindow: opts.getSettingsWindow,
    openSettings: opts.openSettings,
    openHistory: opts.openHistory,
    onShortcutChange: opts.onShortcutChange,
    updateContextMenu: opts.updateContextMenu
  })

  registerRecordingHandlers({
    getMainWindow: opts.getMainWindow,
    getSettingsWindow: opts.getSettingsWindow,
    getRecordingOverlay: opts.getRecordingOverlay,
    setRecording: opts.setRecording,
    setProcessing: opts.setProcessing,
    updateOverlayAudioLevel: opts.updateOverlayAudioLevel,
    handleProcessAudio: opts.handleProcessAudio,
    handleCancelRecording: opts.handleCancelRecording,
    updateTrayIcon: opts.updateTrayIcon
  })

  registerPermissionsHandlers()

  registerHistoryHandlers()

  registerModelsHandlers({
    getSettingsWindow: opts.getSettingsWindow,
    getMainWindow: opts.getMainWindow
  })

  registerUpdateHandlers()
}
