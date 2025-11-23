import { ElectronAPI } from '@electron-toolkit/preload'

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
      checkAccessibilityPermission: () => Promise<{ granted: boolean; required: boolean }>
      openAccessibilitySettings: () => void
      resizeSettingsWindow: (height: number) => void
      updateRecordingAudioLevel: (level: number) => void
      checkForUpdates: () => Promise<{
        updateAvailable: boolean
        updateDownloaded: boolean
        latestVersion: string | null
      }>
      downloadUpdate: () => Promise<void>
      quitAndInstall: () => Promise<void>
      getUpdateStatus: () => Promise<{
        updateAvailable: boolean
        updateDownloaded: boolean
        latestVersion: string | null
      }>
      onUpdateAvailable: (callback: (info: any) => void) => () => void
      onUpdateDownloaded: (callback: (info: any) => void) => () => void
      onUpdateDownloadProgress: (callback: (progress: any) => void) => () => void
    }
  }
}
