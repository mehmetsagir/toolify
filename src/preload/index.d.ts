import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  Settings,
  Statistics,
  UpdateInfo,
  UpdateDownloadProgress,
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
      getStatistics: () => Promise<Statistics | undefined>
      openSettings: () => void
      openHistory: () => void
      closeSettings: () => void
      resizeSettingsWindow: (height: number) => void
      setRecordingState: (state: boolean) => void
      setProcessingState: (state: boolean) => void
      updateRecordingAudioLevel: (payload: {
        level: number
        spectrum?: number[]
        durationMs?: number
      }) => void
      previewSound: (soundType: string) => void
      checkAccessibilityPermission: () => Promise<boolean>
      openAccessibilitySettings: () => void
      checkMicrophonePermission: () => Promise<string>
      requestMicrophonePermission: () => Promise<boolean>
      openSystemPreferences: (panel: string) => void
      checkAppleStt: (language?: string) => Promise<{
        available: boolean
        permissionGranted: boolean
        supportsOnDevice?: boolean
        authStatus?: string
      }>
      requestSpeechRecognitionPermission: () => Promise<{
        granted: boolean
        alreadyDenied?: boolean
      }>
      resetPermissions: () => Promise<void>
      restartApp: () => void
      checkForUpdates: () => Promise<UpdateInfo | null>
      downloadUpdate: () => Promise<boolean>
      quitAndInstall: () => Promise<void>
      getUpdateStatus: () => Promise<{
        updateAvailable: boolean
        updateDownloaded: boolean
        latestVersion: string | null
      }>
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
      onUpdateDownloaded: (callback: (info: Pick<UpdateInfo, 'version'>) => void) => () => void
      onUpdateDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => () => void
      onUpdateNotAvailable: (callback: () => void) => () => void
      onUpdateError: (callback: (message: string) => void) => () => void
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
      onModelDownloadProgress: (
        callback: (progress: {
          modelType: LocalModelType
          percent: number
          downloaded: number
          total: number
        }) => void
      ) => () => void
      getVersion: () => Promise<string>
      openExternal: (url: string) => void
    }
  }
}
