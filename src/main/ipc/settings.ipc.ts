import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { getSettings, saveSettings } from '../store/settings'
import { playSound } from '../services/media-control'
import type { Settings } from '../../shared/types'

export interface SettingsIpcOptions {
  getSettingsWindow: () => BrowserWindow | null
  openSettings: () => void
  openHistory: () => void
  onShortcutChange: (shortcut: string) => void
  updateContextMenu: () => void
}

export function registerSettingsHandlers(opts: SettingsIpcOptions): void {
  const { getSettingsWindow, openSettings, openHistory, onShortcutChange, updateContextMenu } = opts

  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('get-statistics', () => {
    return getSettings().statistics
  })

  ipcMain.on('save-settings', (_, settings: Settings) => {
    const previousSettings = getSettings()
    saveSettings(settings)

    const autoStart = settings.autoStart !== false
    if (process.platform === 'darwin' || process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin: autoStart, openAsHidden: true })
    }

    if (settings.shortcut && previousSettings.shortcut !== settings.shortcut) {
      onShortcutChange(settings.shortcut)
    }

    updateContextMenu()
  })

  ipcMain.handle('get-version', () => {
    return app.getVersion()
  })

  ipcMain.on('resize-settings-window', (_, height: number) => {
    const win = getSettingsWindow()
    if (win && !win.isDestroyed()) {
      const currentSize = win.getSize()
      win.setSize(currentSize[0], height, true)
    }
  })

  ipcMain.on('preview-sound', (_, soundType: string) => {
    playSound(soundType)
  })

  ipcMain.on('open-settings', () => {
    openSettings()
  })

  ipcMain.on('close-settings', () => {
    const win = getSettingsWindow()
    win?.close()
  })

  ipcMain.on('open-history', () => {
    openHistory()
  })

  ipcMain.on('open-external', (_, url: string) => {
    shell.openExternal(url).catch((error) => {
      console.error('Failed to open external URL:', error)
    })
  })

  ipcMain.on('restart-app', () => {
    app.relaunch()
    app.exit(0)
  })
}
