import { contextBridge, ipcRenderer } from 'electron'
import type {
  Settings,
  UpdateInfo,
  UpdateDownloadProgress,
  HistoryItem,
  HistorySettings
} from '../shared/types'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  onStartRecording: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('start-recording', handler)
    return () => {
      ipcRenderer.removeListener('start-recording', handler)
    }
  },
  onStopRecording: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('stop-recording', handler)
    return () => {
      ipcRenderer.removeListener('stop-recording', handler)
    }
  },
  onCancelRecording: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('cancel-recording', handler)
    return () => {
      ipcRenderer.removeListener('cancel-recording', handler)
    }
  },
  onProcessingComplete: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('processing-complete', handler)
    return () => {
      ipcRenderer.removeListener('processing-complete', handler)
    }
  },
  onShowHistory: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('show-history', handler)
    return () => {
      ipcRenderer.removeListener('show-history', handler)
    }
  },
  processAudio: (buffer: ArrayBuffer, duration: number) => ipcRenderer.send('process-audio', buffer, duration),
  saveSettings: (settings: Settings) => ipcRenderer.send('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  openSettings: () => ipcRenderer.send('open-settings'),
  openHistory: () => ipcRenderer.send('open-history'),
  closeSettings: () => ipcRenderer.send('close-settings'),
  setRecordingState: (state: boolean) => ipcRenderer.send('set-recording-state', state),
  setProcessingState: (state: boolean) => ipcRenderer.send('set-processing-state', state),
  previewSound: (soundType: string) => ipcRenderer.send('preview-sound', soundType),
  checkAccessibilityPermission: () => ipcRenderer.invoke('check-accessibility-permission'),
  openAccessibilitySettings: () => ipcRenderer.send('open-accessibility-settings'),
  resizeSettingsWindow: (height: number) => ipcRenderer.send('resize-settings-window', height),
  updateRecordingAudioLevel: (level: number) =>
    ipcRenderer.send('update-recording-audio-level', level),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info))
    return () => {
      ipcRenderer.removeAllListeners('update-available')
    }
  },
  onUpdateDownloaded: (callback: (info: Pick<UpdateInfo, 'version'>) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info))
    return () => {
      ipcRenderer.removeAllListeners('update-downloaded')
    }
  },
  onUpdateDownloadProgress: (callback: (progress: UpdateDownloadProgress) => void) => {
    ipcRenderer.on('update-download-progress', (_, progress) => callback(progress))
    return () => {
      ipcRenderer.removeAllListeners('update-download-progress')
    }
  },
  // History API
  getAllHistory: () => ipcRenderer.invoke('get-all-history') as Promise<HistoryItem[]>,
  getHistoryItem: (id: string) => ipcRenderer.invoke('get-history-item', id) as Promise<HistoryItem | null>,
  deleteHistoryItem: (id: string) => ipcRenderer.invoke('delete-history-item', id) as Promise<boolean>,
  toggleFavorite: (id: string) => ipcRenderer.invoke('toggle-favorite', id) as Promise<boolean>,
  searchHistory: (query: string) => ipcRenderer.invoke('search-history', query) as Promise<HistoryItem[]>,
  getFavorites: () => ipcRenderer.invoke('get-favorites') as Promise<HistoryItem[]>,
  clearHistory: () => ipcRenderer.invoke('clear-history') as Promise<boolean>,
  deleteHistoryItems: (ids: string[]) => ipcRenderer.invoke('delete-history-items', ids) as Promise<number>,
  getHistorySettings: () => ipcRenderer.invoke('get-history-settings') as Promise<HistorySettings>,
  saveHistorySettings: (settings: HistorySettings) => ipcRenderer.invoke('save-history-settings', settings) as Promise<boolean>,
  clearOldHistory: () => ipcRenderer.invoke('clear-old-history') as Promise<number>,
      // Local Model
      checkLocalModel: (modelType: string) => ipcRenderer.invoke('check-local-model', modelType) as Promise<boolean>,
      downloadLocalModel: (modelType: string) => ipcRenderer.invoke('download-local-model', modelType) as Promise<void>,
      deleteLocalModel: (modelType: string) => ipcRenderer.invoke('delete-local-model', modelType) as Promise<void>,
      onModelDownloadProgress: (callback: (progress: { modelType: string; percent: number; downloaded: number; total: number }) => void) => {
        const handler = (_: unknown, progress: { modelType: string; percent: number; downloaded: number; total: number }) => callback(progress)
        ipcRenderer.on('model-download-progress', handler)
        return () => {
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
