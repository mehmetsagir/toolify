import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  clipboard,
  Notification,
  screen
} from 'electron'
import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { exec } from 'child_process'
import { electronApp } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { transcribe } from './openai'
import { Settings } from './types'
import { showNotification, playSound, muteSystem, unmuteSystem } from './utils/system'
import { createMainWindow, createSettingsWindow } from './utils/windows'
import { getOverlayHTML } from './utils/overlay-template'
import { getSettings, saveSettings as saveSettingsUtil } from './utils/settings'
import {
  getAllHistory,
  addHistoryItem,
  deleteHistoryItem,
  toggleFavorite,
  searchHistory,
  getFavorites,
  clearHistory,
  clearOldHistory,
  deleteHistoryItems,
  getHistorySettings,
  saveHistorySettings
} from './utils/history'
import {
  setupAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getUpdateStatus,
  registerWindow,
  unregisterWindow
} from './auto-updater'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let recordingOverlay: BrowserWindow | null = null
let isRecording = false

function updateTrayIcon(
  state: 'idle' | 'recording' | 'processing' | 'copied',
  trayAnimations?: boolean
): void {
  if (!tray) return

  const settings = getSettings()
  const useAnimations =
    trayAnimations !== undefined ? trayAnimations : settings.trayAnimations !== false

  const baseIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })

  if (!useAnimations) {
    tray.setImage(baseIcon)
    if (process.platform === 'darwin') {
      // @ts-ignore - macOS specific API
      tray.setTitle('')
    }
    tray.setToolTip('Toolify')
    if (settings.processNotifications) {
      switch (state) {
        case 'recording':
          showNotification('Toolify', 'Recording started')
          break
        case 'processing':
          showNotification('Toolify', 'Processing audio...')
          break
        case 'copied':
          showNotification('Toolify', 'Text copied to clipboard!')
          break
      }
    }
    return
  }

  switch (state) {
    case 'recording': {
      tray.setToolTip('Toolify - Recording...')
      if (process.platform === 'darwin') {
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      tray.setImage(baseIcon)
      const overlaySettings = getSettings()
      if (overlaySettings.showRecordingOverlay !== false) {
        createRecordingOverlay()
      }
      break
    }

    case 'processing':
      tray.setToolTip('Toolify - Processing...')
      closeRecordingOverlay()
      if (process.platform === 'darwin') {
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      tray.setImage(baseIcon)
      break

    case 'copied':
      tray.setToolTip('Toolify - Text copied!')
      closeRecordingOverlay()
      if (process.platform === 'darwin') {
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      tray.setImage(baseIcon)
      setTimeout(() => {
        updateTrayIcon('idle', true)
      }, 2000)
      break

    case 'idle':
    default:
      tray.setToolTip('Toolify')
      closeRecordingOverlay()
      if (process.platform === 'darwin') {
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      tray.setImage(baseIcon)
      break
  }
}

function createWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return
  }
  mainWindow = createMainWindow()
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createSettingsWindowInstance(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }
  settingsWindow = createSettingsWindow()
  registerWindow(settingsWindow)
  settingsWindow.on('closed', () => {
    if (settingsWindow) {
      unregisterWindow(settingsWindow)
    }
    settingsWindow = null
  })
  settingsWindow.on('enter-full-screen', () => {
    settingsWindow?.setFullScreen(false)
  })
  settingsWindow.on('enter-html-full-screen', () => {
    settingsWindow?.setFullScreen(false)
  })
}

function createRecordingOverlay(): void {
  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    recordingOverlay.close()
  }

  // Get the display where the focused window is, or primary display
  let activeDisplay = screen.getPrimaryDisplay()
  const focusedWindow = BrowserWindow.getFocusedWindow()
  
  if (focusedWindow) {
    const bounds = focusedWindow.getBounds()
    const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    activeDisplay = screen.getDisplayNearestPoint(point)
  } else {
    // If no focused window, try to find any visible window
    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      if (!win.isDestroyed() && win.isVisible()) {
        const bounds = win.getBounds()
        const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
        activeDisplay = screen.getDisplayNearestPoint(point)
        break
      }
    }
  }

  const { width: screenWidth } = activeDisplay.workAreaSize
  const { x: displayX, y: displayY } = activeDisplay.workArea

  const overlayWidth = 160
  const overlayHeight = 60
  const rightPadding = 5
  const topPadding = 30

  const x = displayX + screenWidth - overlayWidth - rightPadding
  const y = displayY + topPadding

  recordingOverlay = new BrowserWindow({
    width: overlayWidth,
    height: overlayHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  const htmlContent = getOverlayHTML()
  recordingOverlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

  recordingOverlay.on('closed', () => {
    recordingOverlay = null
  })

  recordingOverlay.show()
  recordingOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
}

function updateRecordingOverlayAudioLevel(level: number): void {
  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      recordingOverlay.webContents.send('audio-level-update', { level })
    } catch {
      // Overlay might not be ready yet, ignore
    }
  }
}

function closeRecordingOverlay(): void {
  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      recordingOverlay.webContents.send('fade-out')
      setTimeout(() => {
        if (recordingOverlay && !recordingOverlay.isDestroyed()) {
          recordingOverlay.close()
        }
        recordingOverlay = null
      }, 800)
    } catch {
      recordingOverlay.close()
      recordingOverlay = null
    }
  } else {
    recordingOverlay = null
  }
}

function configureAutoStart(enabled: boolean): void {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true
    })
  }
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }

  electronApp.setAppUserModelId('com.toolify.app')

  if (process.platform === 'darwin') {
    app.setName('Toolify')
  }

  const settings = getSettings()
  configureAutoStart(settings.autoStart !== false)

  setupAutoUpdater(mainWindow)

  setTimeout(() => {
    checkForUpdates()
  }, 5000)

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { systemPreferences } = require('electron')

  const hasAccessibility = systemPreferences.isTrustedAccessibilityClient(true)

  if (!hasAccessibility) {
    setTimeout(() => {
      const notification = new Notification({
        title: 'Toolify Needs Permission',
        body: 'Please grant Accessibility permission to enable keyboard shortcuts and auto-paste feature.\n\nClick here to open System Settings.',
        silent: false
      })

      notification.on('click', () => {
        shell.openExternal(
          'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
        )
      })

      notification.show()
    }, 2000)
  }

  const handleRecordingToggle = (): void => {
    if (isRecording) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('stop-recording')
      }
    } else {
      if (!mainWindow || mainWindow.isDestroyed()) {
        createWindow()
        if (mainWindow) {
          mainWindow.webContents.once('did-finish-load', () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('start-recording')
            }
          })
        }
      } else {
        mainWindow.webContents.send('start-recording')
      }
    }
  }

  const registerShortcut = (shortcut: string): void => {
    globalShortcut.unregisterAll()

    const unsafeShortcuts = [
      'LeftCommand',
      'RightCommand',
      'LeftControl',
      'RightControl',
      'LeftOption',
      'RightOption',
      'Shift+Command',
      'Shift+Control',
      'Shift+Option'
    ]

    if (unsafeShortcuts.includes(shortcut)) {
      showNotification('Toolify', 'Single modifier keys are not supported. Using Command+Space.')
      shortcut = 'Command+Space'
    }

    try {
      const success = globalShortcut.register(shortcut, () => {
        handleRecordingToggle()
      })

      if (!success) {
        showNotification('Toolify Error', 'Failed to register shortcut. Using Command+Space.')
        globalShortcut.register('Command+Space', handleRecordingToggle)
      }
    } catch (error) {
      console.error('Failed to register shortcut:', error)
      showNotification('Toolify Error', 'Invalid shortcut. Using Command+Space.')
      globalShortcut.register('Command+Space', handleRecordingToggle)
    }
  }

  const initialSettings = getSettings()
  const shortcut = initialSettings.shortcut || 'Command+Space'
  registerShortcut(shortcut)

  createWindow()

  ipcMain.handle('get-settings', () => {
    return getSettings()
  })

  ipcMain.handle('check-accessibility-permission', () => {
    if (process.platform !== 'darwin') {
      return { granted: true, required: false }
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { systemPreferences } = require('electron')
    // Use false to check without prompting (we already prompted on startup)
    const hasAccessibility = systemPreferences.isTrustedAccessibilityClient(false)
    return { granted: hasAccessibility, required: true }
  })

  ipcMain.on('open-accessibility-settings', () => {
    shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
    )
  })

  ipcMain.on('save-settings', (_, settings: Settings) => {
    const previousSettings = getSettings()
    saveSettingsUtil(settings)

    configureAutoStart(settings.autoStart !== false)

    if (settings.shortcut) {
      const shortcutChanged = previousSettings.shortcut !== settings.shortcut
      if (shortcutChanged) {
        registerShortcut(settings.shortcut)
        showNotification('Toolify', `Shortcut updated to ${settings.shortcut}`)
      }
    }
  })

  ipcMain.on('open-settings', () => {
    createSettingsWindowInstance()
  })

  ipcMain.on('close-settings', () => {
    settingsWindow?.close()
  })

  ipcMain.on('open-history', () => {
    // Open settings window and show history tab
    if (!settingsWindow || settingsWindow.isDestroyed()) {
      createSettingsWindowInstance()
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.show()
      settingsWindow.focus()
      settingsWindow.webContents.send('show-history')
    }
  })

  ipcMain.on('resize-settings-window', (_, height: number) => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      const currentSize = settingsWindow.getSize()
      settingsWindow.setSize(currentSize[0], height, true)
    }
  })

  ipcMain.on('set-recording-state', (_, state) => {
    isRecording = state
    const settings = getSettings()
    if (state) {
      muteSystem()
      updateTrayIcon('recording', settings.trayAnimations)
      if (settings.processNotifications) {
        showNotification('Toolify', 'Recording started')
      }
    } else {
      unmuteSystem()
      updateTrayIcon('idle', settings.trayAnimations)
      if (settings.processNotifications) {
        showNotification('Toolify', 'Recording stopped')
      }
    }
  })

  ipcMain.on('set-processing-state', (_, state: boolean) => {
    const settings = getSettings()
    if (state) {
      updateTrayIcon('processing', settings.trayAnimations)
    }
  })

  ipcMain.on('update-recording-audio-level', (_, level: number) => {
    updateRecordingOverlayAudioLevel(level)
  })

  ipcMain.on('preview-sound', (_, soundType: string) => {
    playSound(soundType)
  })

  ipcMain.handle('check-for-updates', async () => {
    checkForUpdates()
    return getUpdateStatus()
  })

  ipcMain.handle('download-update', async () => {
    downloadUpdate()
  })

  ipcMain.handle('quit-and-install', async () => {
    quitAndInstall()
  })

  ipcMain.handle('get-update-status', async () => {
    return getUpdateStatus()
  })

  // History IPC handlers
  ipcMain.handle('get-all-history', async () => {
    return getAllHistory()
  })

  ipcMain.handle('get-history-item', async (_, id: string) => {
    const history = getAllHistory()
    return history.find((item) => item.id === id) || null
  })

  ipcMain.handle('delete-history-item', async (_, id: string) => {
    return deleteHistoryItem(id)
  })

  ipcMain.handle('toggle-favorite', async (_, id: string) => {
    return toggleFavorite(id)
  })

  ipcMain.handle('search-history', async (_, query: string) => {
    return searchHistory(query)
  })

  ipcMain.handle('get-favorites', async () => {
    return getFavorites()
  })

  ipcMain.handle('clear-history', async () => {
    clearHistory()
    return true
  })

  ipcMain.handle('delete-history-items', async (_, ids: string[]) => {
    return deleteHistoryItems(ids)
  })

  ipcMain.handle('get-history-settings', async () => {
    return getHistorySettings()
  })

  ipcMain.handle('save-history-settings', async (_, settings) => {
    saveHistorySettings(settings)
    return true
  })

  ipcMain.handle('clear-old-history', async () => {
    return clearOldHistory()
  })



  ipcMain.on('process-audio', async (_, buffer, duration: number) => {
    const settings = getSettings()

    if (!settings.apiKey) {
      return
    }

    updateTrayIcon('processing', settings.trayAnimations)
    if (settings.processNotifications) {
      showNotification('Toolify', 'Processing audio...')
    }

    try {
      const languageToUse = settings.translate
        ? settings.sourceLanguage || 'en'
        : settings.language || ''

      const text = await transcribe(
        settings.apiKey ?? '',
        Buffer.from(buffer),
        settings.translate ?? false,
        languageToUse,
        settings.sourceLanguage ?? 'en',
        settings.targetLanguage ?? 'tr'
      )

      // Save audio file
      let audioPath: string | undefined
      try {
        const recordingsDir = join(app.getPath('userData'), 'recordings')
        await mkdir(recordingsDir, { recursive: true })
        
        // First save as WebM (original format from MediaRecorder)
        const webmFileName = `recording-${Date.now()}.webm`
        const webmPath = join(recordingsDir, webmFileName)
        await writeFile(webmPath, Buffer.from(buffer))
        
        // Convert to MP3 using ffmpeg (better browser support than MP4)
        const mp3FileName = webmFileName.replace('.webm', '.mp3')
        const mp3Path = join(recordingsDir, mp3FileName)
        
        await new Promise<void>((resolve, reject) => {
          exec(
            `ffmpeg -i "${webmPath}" -vn -ar 44100 -ac 2 -b:a 192k "${mp3Path}"`,
            (error) => {
              if (error) {
                console.error('FFmpeg conversion failed:', error)
                // If conversion fails, use the WebM file
                audioPath = webmPath
                reject(error)
              } else {
                // Conversion successful, delete WebM and use MP3
                audioPath = mp3Path
                // Delete the WebM file
                exec(`rm "${webmPath}"`, () => {})
                resolve()
              }
            }
          )
        })
      } catch (error) {
        console.error('Failed to save audio file:', error)
      }

      if (text) {
        clipboard.writeText(text)
        updateTrayIcon('copied', settings.trayAnimations)
        if (settings.processNotifications) {
          showNotification('Toolify', 'Text copied to clipboard!')
        }

        if (settings.soundAlert && settings.soundType) {
          playSound(settings.soundType)
        }

        // Save to history
        try {
          addHistoryItem({
            text,
            isFavorite: false,
            translated: settings.translate ?? false,
            sourceLanguage: settings.sourceLanguage,
            targetLanguage: settings.targetLanguage,
            provider: 'OpenAI Whisper',
            audioPath,
            duration
          })
        } catch (error) {
          console.error('Failed to save history:', error)
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('processing-complete')
        }

        exec(
          'osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"',
          () => {}
        )
      } else {
        updateTrayIcon('idle', settings.trayAnimations)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('processing-complete')
        }
      }
    } catch (error) {
      console.error('Transcription failed', error)
      updateTrayIcon('idle', settings.trayAnimations)
      showNotification(
        'Toolify Error',
        'Transcription failed. Check your API Key or internet connection.',
        true
      )
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('processing-complete')
      }
    }
  })

  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Toolify')

  const updateContextMenu = (): void => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Settings',
        type: 'normal',
        click: () => createSettingsWindowInstance()
      },
      { type: 'separator' },
      {
        label: 'Quit Toolify',
        type: 'normal',
        click: () => app.quit()
      }
    ])
    tray?.setContextMenu(contextMenu)
  }

  updateContextMenu()

  tray.on('click', () => {
    tray?.popUpContextMenu()
  })

  app.on('activate', function () {
    if (settingsWindow && settingsWindow.isDestroyed()) {
      settingsWindow = null
    }
  })
})

app.on('before-quit', () => {
  closeRecordingOverlay()

  if (tray) {
    tray.destroy()
    tray = null
  }

  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
