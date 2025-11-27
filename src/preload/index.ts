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
    ipcRenderer.on('start-recording', () => callback())
    return () => {
      ipcRenderer.removeAllListeners('start-recording')
    }
  },
  onStopRecording: (callback: () => void) => {
    ipcRenderer.on('stop-recording', () => callback())
    return () => {
      ipcRenderer.removeAllListeners('stop-recording')
    }
  },
  onProcessingComplete: (callback: () => void) => {
    ipcRenderer.on('processing-complete', () => callback())
    return () => {
      ipcRenderer.removeAllListeners('processing-complete')
    }
  },
  onShowHistory: (callback: () => void) => {
    ipcRenderer.on('show-history', () => callback())
    return () => {
      ipcRenderer.removeAllListeners('show-history')
    }
  },
  processAudio: (buffer: ArrayBuffer) => ipcRenderer.send('process-audio', buffer),
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
  clearOldHistory: () => ipcRenderer.invoke('clear-old-history') as Promise<number>
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
