import { contextBridge, ipcRenderer } from 'electron'
import type {
  Settings,
  UpdateInfo,
  UpdateDownloadProgress,
  HistoryItem,
  HistorySettings,
  LocalModelInfo,
  LocalModelType
} from '../shared/types'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  onStartRecording: (callback: () => void): (() => void) => {
    const handler: () => void = () => callback()
    ipcRenderer.on('start-recording', handler)
    return (): void => {
      ipcRenderer.removeListener('start-recording', handler)
    }
  },
  onStopRecording: (callback: () => void): (() => void) => {
    const handler: () => void = () => callback()
    ipcRenderer.on('stop-recording', handler)
    return (): void => {
      ipcRenderer.removeListener('stop-recording', handler)
    }
  },
  onCancelRecording: (callback: () => void): (() => void) => {
    const handler: () => void = () => callback()
    ipcRenderer.on('cancel-recording', handler)
    return (): void => {
      ipcRenderer.removeListener('cancel-recording', handler)
    }
  },
  onProcessingComplete: (callback: () => void): (() => void) => {
    const handler: () => void = () => callback()
    ipcRenderer.on('processing-complete', handler)
    return (): void => {
      ipcRenderer.removeListener('processing-complete', handler)
    }
  },
  onShowHistory: (callback: () => void): (() => void) => {
    const handler: () => void = () => callback()
    ipcRenderer.on('show-history', handler)
    return (): void => {
      ipcRenderer.removeListener('show-history', handler)
    }
  },
  processAudio: (buffer: ArrayBuffer, duration: number): void =>
    ipcRenderer.send('process-audio', buffer, duration),
  saveSettings: (settings: Settings): void => ipcRenderer.send('save-settings', settings),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('get-settings'),
  openSettings: (): void => ipcRenderer.send('open-settings'),
  openHistory: (): void => ipcRenderer.send('open-history'),
  closeSettings: (): void => ipcRenderer.send('close-settings'),
  setRecordingState: (state: boolean): void => ipcRenderer.send('set-recording-state', state),
  setProcessingState: (state: boolean): void => ipcRenderer.send('set-processing-state', state),
  previewSound: (soundType: string): void => ipcRenderer.send('preview-sound', soundType),
  checkAccessibilityPermission: (): Promise<boolean> =>
    ipcRenderer.invoke('check-accessibility-permission'),
  openAccessibilitySettings: (): void => ipcRenderer.send('open-accessibility-settings'),
  resizeSettingsWindow: (height: number): void =>
    ipcRenderer.send('resize-settings-window', height),
  updateRecordingAudioLevel: (payload: {
    level: number
    spectrum?: number[]
    durationMs?: number
  }): void => ipcRenderer.send('update-recording-audio-level', payload),
  checkForUpdates: (): Promise<UpdateInfo | null> => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (): Promise<boolean> => ipcRenderer.invoke('download-update'),
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('quit-and-install'),
  getUpdateStatus: (): Promise<{ available: boolean; downloaded: boolean; version?: string }> =>
    ipcRenderer.invoke('get-update-status'),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void): (() => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info))
    return () => {
      ipcRenderer.removeAllListeners('update-available')
    }
  },
  onUpdateDownloaded: (callback: (info: Pick<UpdateInfo, 'version'>) => void): (() => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info))
    return () => {
      ipcRenderer.removeAllListeners('update-downloaded')
    }
  },
  onUpdateDownloadProgress: (
    callback: (progress: UpdateDownloadProgress) => void
  ): (() => void) => {
    ipcRenderer.on('update-download-progress', (_, progress) => callback(progress))
    return () => {
      ipcRenderer.removeAllListeners('update-download-progress')
    }
  },
  // History API
  getAllHistory: (): Promise<HistoryItem[]> => ipcRenderer.invoke('get-all-history'),
  getHistoryItem: (id: string): Promise<HistoryItem | null> =>
    ipcRenderer.invoke('get-history-item', id),
  deleteHistoryItem: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('delete-history-item', id),
  clearHistory: (): Promise<boolean> => ipcRenderer.invoke('clear-history'),
  getHistorySettings: (): Promise<HistorySettings> => ipcRenderer.invoke('get-history-settings'),
  saveHistorySettings: (settings: HistorySettings): Promise<boolean> =>
    ipcRenderer.invoke('save-history-settings', settings),
  clearOldHistory: (): Promise<number> => ipcRenderer.invoke('clear-old-history'),
  // Local Model
  checkLocalModel: (modelType: LocalModelType): Promise<boolean> =>
    ipcRenderer.invoke('check-local-model', modelType),
  downloadLocalModel: (modelType: LocalModelType): Promise<void> =>
    ipcRenderer.invoke('download-local-model', modelType),
  deleteLocalModel: (modelType: LocalModelType): Promise<void> =>
    ipcRenderer.invoke('delete-local-model', modelType),
  getLocalModelsInfo: (): Promise<LocalModelInfo[]> => ipcRenderer.invoke('get-local-models-info'),
  openModelsFolder: (): Promise<string> => ipcRenderer.invoke('open-models-folder'),
  onModelDownloadProgress: (
    callback: (progress: {
      modelType: LocalModelType
      percent: number
      downloaded: number
      total: number
    }) => void
  ): (() => void) => {
    const handler = (
      _: unknown,
      progress: { modelType: LocalModelType; percent: number; downloaded: number; total: number }
    ): void => callback(progress)
    ipcRenderer.on('model-download-progress', handler)
    return (): void => {
      ipcRenderer.removeListener('model-download-progress', handler)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
