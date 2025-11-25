import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Settings,
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateStatus,
  AccessibilityPermission
} from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onStartRecording: (callback: () => void) => () => void
      onStopRecording: (callback: () => void) => () => void
      onProcessingComplete: (callback: () => void) => () => void
      processAudio: (buffer: ArrayBuffer) => void
      saveSettings: (settings: Settings) => void
      getSettings: () => Promise<Settings>
      hideWindow: () => void
      openSettings: () => void
      closeSettings: () => void
      setRecordingState: (state: boolean) => void
      setProcessingState: (state: boolean) => void
      previewSound: (soundType: string) => void
      checkAccessibilityPermission: () => Promise<AccessibilityPermission>
      openAccessibilitySettings: () => void
      resizeSettingsWindow: (height: number) => void
      updateRecordingAudioLevel: (level: number) => void
      checkForUpdates: () => Promise<UpdateStatus>
      downloadUpdate: () => Promise<void>
      quitAndInstall: () => Promise<void>
      getUpdateStatus: () => Promise<UpdateStatus>
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
      onUpdateDownloaded: (callback: (info: Pick<UpdateInfo, 'version'>) => void) => () => void
      onUpdateDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => () => void
    }
  }
}
