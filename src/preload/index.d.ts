import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Settings,
  UpdateInfo,
  UpdateDownloadProgress,
  UpdateStatus,
  AccessibilityPermission,
  HistoryItem,
  HistorySettings,
  LocalModelInfo,
  LocalModelType
} from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onStartRecording: (callback: () => void) => () => void
      onStopRecording: (callback: () => void) => () => void
      onCancelRecording: (callback: () => void) => () => void
      onProcessingComplete: (callback: () => void) => () => void
      onShowHistory: (callback: () => void) => () => void
      processAudio: (buffer: ArrayBuffer, duration: number) => void
      saveSettings: (settings: Settings) => void
      getSettings: () => Promise<Settings>
      hideWindow: () => void
      openSettings: () => void
      openHistory: () => void
      closeSettings: () => void
      setRecordingState: (state: boolean) => void
      setProcessingState: (state: boolean) => void
      previewSound: (soundType: string) => void
      checkAccessibilityPermission: () => Promise<AccessibilityPermission>
      openAccessibilitySettings: () => void
      resizeSettingsWindow: (height: number) => void
      updateRecordingAudioLevel: (payload: {
        level: number
        spectrum?: number[]
        durationMs?: number
      }) => void
      checkForUpdates: () => Promise<UpdateStatus>
      downloadUpdate: () => Promise<void>
      quitAndInstall: () => Promise<void>
      getUpdateStatus: () => Promise<UpdateStatus>
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
      onUpdateDownloaded: (callback: (info: Pick<UpdateInfo, 'version'>) => void) => () => void
      onUpdateDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => () => void
      // History API
      getAllHistory: () => Promise<HistoryItem[]>
      getHistoryItem: (id: string) => Promise<HistoryItem | null>
      deleteHistoryItem: (id: string) => Promise<boolean>
      clearHistory: () => Promise<boolean>
      getHistorySettings: () => Promise<HistorySettings>
      saveHistorySettings: (settings: HistorySettings) => Promise<boolean>
      clearOldHistory: () => Promise<number>
      checkLocalModel: (modelType: LocalModelType) => Promise<boolean>
      downloadLocalModel: (modelType: LocalModelType) => Promise<void>
      deleteLocalModel: (modelType: LocalModelType) => Promise<void>
      getLocalModelsInfo: () => Promise<LocalModelInfo[]>
      openModelsFolder: () => Promise<string>
      getVersion: () => Promise<string>
      openExternal: (url: string) => void
      onModelDownloadProgress: (
        callback: (progress: {
          modelType: LocalModelType
          percent: number
          downloaded: number
          total: number
        }) => void
      ) => () => void
    }
  }
}
