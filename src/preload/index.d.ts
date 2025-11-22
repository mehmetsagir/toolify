import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onStartRecording: (callback: () => void) => () => void
      onStopRecording: (callback: () => void) => () => void
      processAudio: (buffer: ArrayBuffer) => void
      saveSettings: (settings: Settings) => void
      getSettings: () => Promise<Settings>
      hideWindow: () => void
      setRecordingState: (state: boolean) => void
      checkAccessibilityPermission: () => Promise<{ granted: boolean; required: boolean }>
      openAccessibilitySettings: () => void
      resizeSettingsWindow: (height: number) => void
      updateRecordingAudioLevel: (level: number) => void
    }
  }
}
