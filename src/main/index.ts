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
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import { exec } from 'child_process'
import { electronApp } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { transcribe } from './openai'
import {
  transcribeLocal,
  checkLocalModelExists,
  downloadLocalModel,
  deleteLocalModel
} from './local-whisper'
import { Settings } from './types'
import { showNotification, playSound, muteSystem, unmuteSystem } from './utils/system'
import { createMainWindow, createSettingsWindow } from './utils/windows'
import { getOverlayHTML } from './utils/overlay-template'
import { getSettings, saveSettings as saveSettingsUtil } from './utils/settings'
import {
  getAllHistory,
  addHistoryItem,
  deleteHistoryItem,
  clearHistory,
  clearOldHistory,
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
  unregisterWindow,
  getIsQuittingForUpdate
} from './auto-updater'
import { uIOhook, UiohookKey } from 'uiohook-napi'

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let recordingOverlay: BrowserWindow | null = null
let overlayCloseTimeout: NodeJS.Timeout | null = null
let isRecording = false
let keyboardHookEnabled = false

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
      updateRecordingOverlayProcessingState(true)
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
  // Cancel any pending close timeout to prevent conflicts
  if (overlayCloseTimeout) {
    clearTimeout(overlayCloseTimeout)
    overlayCloseTimeout = null
  }

  // If overlay already exists and is not destroyed, just return (don't recreate)
  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    return
  }

  recordingOverlay = null

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

  const overlayWidth = 100
  const overlayHeight = 40
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
    console.log('Recording overlay closed event')
    recordingOverlay = null
  })

  // Set highest window level for macOS to ensure overlay stays on top
  if (process.platform === 'darwin') {
    recordingOverlay.setWindowButtonVisibility(false)
    // Use screen-saver level to stay above everything
    // @ts-ignore - macOS specific API
    recordingOverlay.setAlwaysOnTop(true, 'screen-saver')
  }

  recordingOverlay.show()
  recordingOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  console.log('Recording overlay created and shown at position:', { x, y })
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

function updateRecordingOverlayProcessingState(processing: boolean): void {
  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      recordingOverlay.webContents.send('processing-state', { processing })
    } catch {
      // Overlay might not be ready yet, ignore
    }
  }
}

function showRecordingOverlaySuccess(): void {
  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      recordingOverlay.webContents.send('success-state')
    } catch {
      // Overlay might not be ready yet, ignore
    }
  }
}

function closeRecordingOverlay(): void {
  console.log('closeRecordingOverlay called')

  // Cancel any existing close timeout
  if (overlayCloseTimeout) {
    clearTimeout(overlayCloseTimeout)
    overlayCloseTimeout = null
  }

  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      console.log('Sending fade-out to overlay')
      recordingOverlay.webContents.send('fade-out')

      // Track the close timeout so it can be cancelled if needed
      overlayCloseTimeout = setTimeout(() => {
        if (recordingOverlay && !recordingOverlay.isDestroyed()) {
          console.log('Closing overlay window')
          recordingOverlay.close()
        }
        recordingOverlay = null
        overlayCloseTimeout = null
      }, 800)
    } catch (error) {
      console.error('Error closing overlay:', error)
      if (recordingOverlay && !recordingOverlay.isDestroyed()) {
        recordingOverlay.close()
      }
      recordingOverlay = null
      overlayCloseTimeout = null
    }
  } else {
    console.log('Overlay already destroyed or null')
    recordingOverlay = null
    overlayCloseTimeout = null
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

    // Set the app icon explicitly to ensure Toolify icon is used everywhere
    let appIcon: Electron.NativeImage
    let iconPathForAbout: string | undefined

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      // In development, use the icon from resources
      appIcon = nativeImage.createFromPath(icon)
      iconPathForAbout = icon
    } else {
      // In production, try .icns first, then fallback to .png
      const icnsPath = join(process.resourcesPath, 'icon.icns')
      const pngPath = join(process.resourcesPath, 'icon.png')

      if (existsSync(icnsPath)) {
        appIcon = nativeImage.createFromPath(icnsPath)
        iconPathForAbout = icnsPath
      } else if (existsSync(pngPath)) {
        appIcon = nativeImage.createFromPath(pngPath)
        iconPathForAbout = pngPath
      } else {
        // Fallback to development icon
        appIcon = nativeImage.createFromPath(icon)
        iconPathForAbout = icon
      }
    }

    if (!appIcon.isEmpty()) {
      app.dock?.setIcon(appIcon)
    }

    // Set About Panel options for macOS
    // macOS About panel uses iconPath as a file path string
    app.setAboutPanelOptions({
      applicationName: 'Toolify',
      applicationVersion: app.getVersion(),
      version: app.getVersion(),
      credits: 'AI-powered voice transcription and translation tool for macOS',
      website: 'https://github.com/mehmetsagir/toolify',
      iconPath: iconPathForAbout
    })
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

  const handleCancelRecording = (): void => {
    console.log('Cancel recording requested')
    if (isRecording) {
      console.log('Cancelling active recording')

      // Unregister ESC shortcut when cancelling
      globalShortcut.unregister('Escape')
      console.log('ESC shortcut unregistered')

      // IMPORTANT: Send cancel-recording (NOT stop-recording) to abort without processing
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cancel-recording')
      }

      isRecording = false

      // Unmute system
      unmuteSystem()

      // Close overlay immediately
      if (recordingOverlay && !recordingOverlay.isDestroyed()) {
        recordingOverlay.destroy()
        recordingOverlay = null
      }

      // Clear any pending close timeout
      if (overlayCloseTimeout) {
        clearTimeout(overlayCloseTimeout)
        overlayCloseTimeout = null
      }

      // Reset tray icon without animations/notifications (silent cancel)
      updateTrayIcon('idle', false)

      // NO notification or sound on cancel - user already knows they cancelled

      console.log('Recording cancelled successfully')
    }
  }

  const registerShortcut = (shortcut: string): void => {
    globalShortcut.unregisterAll()

    // Stop keyboard hook if running
    if (keyboardHookEnabled) {
      uIOhook.stop()
      keyboardHookEnabled = false
    }

    // DO NOT register ESC globally - it will be handled in renderer only during recording

    // Special handling for RightCommand using uiohook
    if (shortcut === 'RightCommand') {
      if (process.platform !== 'darwin') {
        showNotification('Toolify', 'Right Command key is only supported on macOS. Using Command+Space.')
        shortcut = 'Command+Space'
        // Fall through to normal registration
      } else {
        // Use uiohook for RightCommand on macOS
        try {
          uIOhook.on('keydown', (event) => {
            // Right Command key code is 3676 in uiohook on macOS
            if (event.keycode === 3676) {
              handleRecordingToggle()
            }
          })
          uIOhook.start()
          keyboardHookEnabled = true
          return
        } catch (error) {
          console.error('Failed to register Right Command via uiohook:', error)
          showNotification('Toolify Error', 'Failed to register Right Command. Using Command+Space.')
          shortcut = 'Command+Space'
          // Fall through to normal registration
        }
      }
    }

    const unsafeShortcuts = [
      'LeftCommand',
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
      // Wait for window to be ready before sending show-history event
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.once('did-finish-load', () => {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('show-history')
          }
        })
      }
    } else {
      // Window already exists, send event immediately
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.show()
        settingsWindow.focus()
        // Use setTimeout to ensure event is sent after window is focused
        setTimeout(() => {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('show-history')
          }
        }, 100)
      }
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
      // Register ESC shortcut when recording starts
      try {
        globalShortcut.register('Escape', handleCancelRecording)
        console.log('ESC shortcut registered for recording session')
      } catch (error) {
        console.error('Failed to register ESC shortcut:', error)
      }

      muteSystem()
      updateTrayIcon('recording', settings.trayAnimations)
      if (settings.processNotifications) {
        showNotification('Toolify', 'Recording started')
      }
    } else {
      // Unregister ESC shortcut when recording stops
      globalShortcut.unregister('Escape')
      console.log('ESC shortcut unregistered - recording stopped')

      unmuteSystem()
      // Don't set to idle immediately - processing will start right after
      // The processAudio handler will set the correct state (processing)
      if (settings.processNotifications) {
        showNotification('Toolify', 'Processing...')
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

  ipcMain.handle('clear-history', async () => {
    clearHistory()
    return true
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

  ipcMain.handle('check-local-model', async (_, modelType: string) => {
    return await checkLocalModelExists(modelType)
  })

  ipcMain.handle('download-local-model', async (_, modelType: string) => {
    // Get settings window to send progress updates (settings window is where download happens)
    const windowToNotify = settingsWindow || mainWindow

    return await downloadLocalModel(modelType, (progress) => {
      // Send progress update to renderer
      if (windowToNotify && !windowToNotify.isDestroyed()) {
        windowToNotify.webContents.send('model-download-progress', {
          modelType,
          percent: progress.percent,
          downloaded: progress.downloaded,
          total: progress.total
        })
        console.log('Progress update sent:', { modelType, ...progress })
      }
    })
  })

  ipcMain.handle('delete-local-model', async (_, modelType: string) => {
    return deleteLocalModel(modelType)
  })

  ipcMain.on('process-audio', async (_, buffer, duration: number) => {
    const settings = getSettings()

    console.log('Processing audio with settings:', {
      useLocalModel: settings.useLocalModel,
      translate: settings.translate,
      targetLanguage: settings.targetLanguage,
      sourceLanguage: settings.sourceLanguage,
      hasApiKey: !!settings.apiKey
    })

    // Only require API key if using online model OR if translation is enabled (which needs API key)
    if (!settings.useLocalModel && !settings.apiKey) {
      showNotification('Toolify Error', 'API Key required for online transcription.')
      updateTrayIcon('idle', settings.trayAnimations)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('processing-complete')
      }
      return
    }

    // If using local model, API key is only required if translation is enabled
    // Local model transcription works without API key
    // We'll handle translation check inside transcribeLocal call

    updateTrayIcon('processing', settings.trayAnimations)
    if (settings.processNotifications) {
      showNotification('Toolify', 'Processing audio...')
    }

    try {
      // Use sourceLanguage if specified, otherwise fall back to auto.
      // We do NOT use settings.language (app language) as it causes hallucinations if different from spoken language.
      const languageToUse =
        settings.sourceLanguage === 'auto' ? undefined : settings.sourceLanguage || undefined

      let text = ''

      if (settings.useLocalModel) {
        // For local model: translation requires API key
        // If translation is enabled but no API key, disable translation and continue with transcription only
        const shouldTranslate = settings.translate && !!settings.apiKey

        // Verify model exists before attempting transcription
        const modelType = settings.localModelType || 'medium'
        console.log(`Checking for local model before transcription: ${modelType}`)
        console.log(
          `Current settings - useLocalModel: ${settings.useLocalModel}, localModelType: ${settings.localModelType}`
        )

        const modelExists = await checkLocalModelExists(modelType)

        if (!modelExists) {
          const modelsDir = path.join(app.getPath('userData'), 'models')
          console.error(
            `Model not found. Expected path: ${path.join(modelsDir, `ggml-${modelType}.bin`)}`
          )
          console.error(`Models directory exists: ${existsSync(modelsDir)}`)
          if (existsSync(modelsDir)) {
            const files = readdirSync(modelsDir)
            console.error(`Files in models directory: ${files.join(', ')}`)
          }

          const errorMsg = `Local model (${modelType}) not found. Please download the model in Settings.`
          console.error(errorMsg)
          showNotification('Toolify Error', errorMsg, true)
          updateTrayIcon('idle', settings.trayAnimations)
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('processing-complete')
          }
          return
        }

        console.log(`✓ Model ${modelType} found, proceeding with transcription`)

        text = await transcribeLocal(Buffer.from(buffer), modelType, {
          translate: shouldTranslate,
          language: 'auto', // Force auto-detection for mixed language support
          sourceLanguage: 'auto', // Always auto-detect source language when translating
          targetLanguage: settings.targetLanguage ?? 'en',
          apiKey: settings.apiKey // Only used if translation is enabled
        })
      } else {
        if (!settings.apiKey) {
          showNotification('Toolify Error', 'API Key missing for online transcription.')
          updateTrayIcon('idle', settings.trayAnimations)
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('processing-complete')
          }
          return
        }

        text = await transcribe(
          settings.apiKey,
          Buffer.from(buffer),
          settings.translate ?? false,
          languageToUse,
          settings.translate ? 'auto' : (settings.sourceLanguage ?? 'auto'), // Auto-detect when translating
          settings.targetLanguage ?? 'tr'
        )
      }

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
          exec(`ffmpeg -i "${webmPath}" -vn -ar 44100 -ac 2 -b:a 192k "${mp3Path}"`, (error) => {
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
          })
        })
      } catch (error) {
        console.error('Failed to save audio file:', error)
      }

      if (text) {
        clipboard.writeText(text)
        // Keep processing state (loader visible) until text is pasted
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
            provider: settings.useLocalModel
              ? `Whisper ${settings.localModelType === 'large-v3' ? 'Large V3' : 'Medium'} (GGML)`
              : 'OpenAI Whisper-1',
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
          () => {
            // Show success checkmark animation
            showRecordingOverlaySuccess()

            // Wait for checkmark animation to complete, then close overlay
            setTimeout(() => {
              updateTrayIcon('copied', settings.trayAnimations)
            }, 800)
          }
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

      // Provide more specific error messages based on the error type and settings
      let errorMessage = 'Transcription failed.'

      if (settings.useLocalModel) {
        // Local model specific errors
        const errorStr =
          error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

        if (errorStr.includes('not found') || errorStr.includes('model')) {
          errorMessage = 'Local model not found. Please download the model in Settings.'
        } else if (errorStr.includes('executable') || errorStr.includes('whisper')) {
          errorMessage = 'Whisper executable not found. Please reinstall the application.'
        } else {
          errorMessage = `Local transcription failed: ${error instanceof Error ? error.message : String(error)}`
        }
      } else {
        // Online model specific errors
        if (!settings.apiKey) {
          errorMessage = 'API Key missing for online transcription.'
        } else {
          errorMessage = 'Transcription failed. Check your API Key or internet connection.'
        }
      }

      showNotification('Toolify Error', errorMessage, true)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('processing-complete')
      }
    }
  })

  const trayIcon = nativeImage.createFromPath(icon).resize({ width: 16, height: 16 })
  tray = new Tray(trayIcon)
  tray.setToolTip('Toolify')

  const updateContextMenu = (): void => {
    const settings = getSettings()
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Start Recording',
        type: 'normal',
        accelerator: settings.shortcut || 'Command+Space',
        click: () => handleRecordingToggle()
      },
      { type: 'separator' },
      {
        label: 'History',
        type: 'normal',
        click: () => {
          if (!settingsWindow || settingsWindow.isDestroyed()) {
            createSettingsWindowInstance()
            // Wait for window to be ready before sending show-history event
            if (settingsWindow && !settingsWindow.isDestroyed()) {
              settingsWindow.webContents.once('did-finish-load', () => {
                if (settingsWindow && !settingsWindow.isDestroyed()) {
                  settingsWindow.webContents.send('show-history')
                }
              })
            }
          } else {
            // Window already exists, send event immediately
            if (settingsWindow && !settingsWindow.isDestroyed()) {
              settingsWindow.show()
              settingsWindow.focus()
              // Use setTimeout to ensure event is sent after window is focused
              setTimeout(() => {
                if (settingsWindow && !settingsWindow.isDestroyed()) {
                  settingsWindow.webContents.send('show-history')
                }
              }, 100)
            }
          }
        }
      },
      {
        label: 'Preferences...',
        type: 'normal',
        click: () => createSettingsWindowInstance()
      },
      { type: 'separator' },
      {
        label: 'About Toolify',
        type: 'normal',
        click: () => {
          // Show about dialog
          if (process.platform === 'darwin') {
            app.showAboutPanel()
          }
        }
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
  // If quitting for update, don't prevent default behavior
  if (getIsQuittingForUpdate()) {
    console.log('Quitting for update, allowing default quit behavior')
    // Still clean up resources but don't prevent quit
    closeRecordingOverlay()
    globalShortcut.unregisterAll()
    // Stop keyboard hook if running
    if (keyboardHookEnabled) {
      uIOhook.stop()
      keyboardHookEnabled = false
    }
    // Don't destroy tray here - let it be destroyed naturally
    // Don't prevent default - allow quit to proceed
    return
  }

  // Normal quit - clean up everything
  closeRecordingOverlay()

  if (tray) {
    tray.destroy()
    tray = null
  }

  globalShortcut.unregisterAll()

  // Stop keyboard hook if running
  if (keyboardHookEnabled) {
    uIOhook.stop()
    keyboardHookEnabled = false
  }
})

app.on('window-all-closed', () => {
  // Don't quit on macOS if we're updating - let the updater handle it
  if (getIsQuittingForUpdate()) {
    return
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
