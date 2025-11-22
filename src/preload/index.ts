import { contextBridge, ipcRenderer, Settings } from 'electron'
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
  processAudio: (buffer: ArrayBuffer) => ipcRenderer.send('process-audio', buffer),
  saveSettings: (settings: Settings) => ipcRenderer.send('save-settings', settings),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  hideWindow: () => ipcRenderer.send('hide-window'),
  openSettings: () => ipcRenderer.send('open-settings'),
  closeSettings: () => ipcRenderer.send('close-settings'),
  setRecordingState: (state: boolean) => ipcRenderer.send('set-recording-state', state),
  setProcessingState: (state: boolean) => ipcRenderer.send('set-processing-state', state),
  previewSound: (soundType: string) => ipcRenderer.send('preview-sound', soundType),
  checkAccessibilityPermission: () => ipcRenderer.invoke('check-accessibility-permission'),
  openAccessibilitySettings: () => ipcRenderer.send('open-accessibility-settings'),
  resizeSettingsWindow: (height: number) => ipcRenderer.send('resize-settings-window', height),
  updateRecordingAudioLevel: (level: number) =>
    ipcRenderer.send('update-recording-audio-level', level)
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
