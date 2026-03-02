import {
  app,
  shell,
  BrowserWindow,
  Tray,
  Menu,
  globalShortcut,
  clipboard,
  Notification,
  screen
} from 'electron'
import { join } from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { electronApp } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { transcribe } from './services/transcription'
import { checkLocalModelExists } from './services/transcription/local-whisper'
import {
  startAppleSttStream,
  stopAppleSttStream,
  killAppleSttStream,
  getStreamResult
} from './services/transcription/apple-stt-stream'
import { showNotification, playSound, unmuteSystem } from './services/media-control'
import {
  setupAutoUpdater,
  checkForUpdates,
  registerWindow,
  unregisterWindow,
  getIsQuittingForUpdate
} from './services/auto-updater'
import {
  registerShortcut as registerShortcutHandler,
  unregisterAll as unregisterAllShortcuts
} from './services/shortcut'
import { createMainWindow, createSettingsWindow } from './utils/windows'
import { getCompactOverlayHTML, getLargeOverlayHTML } from './utils/overlay'
import { getSettings, saveSettings as saveSettingsUtil, updateStatistics } from './store/settings'
import { addHistoryItem } from './store/history'
import { getFfmpegPath } from './utils/ffmpeg'
import {
  createTrayIcon,
  createRecordingTrayIcon,
  createProcessingTrayIcon,
  createIdleTransitionFrame,
  resetTrayAnimation,
  prewarmTrayIconCache,
  getLastProcessingLevels,
  COPIED_COLOR,
  ERROR_COLOR
} from './utils/tray'
import { registerAllIpcHandlers } from './ipc'
import type { OverlayAudioPayload } from './ipc'

// Set app name immediately — must be before any Electron events
if (process.platform === 'darwin') {
  app.setName('Toolify')
  process.title = 'Toolify'
  app.on('will-finish-launching', () => {
    app.setName('Toolify')
    process.title = 'Toolify'
  })
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let recordingOverlay: BrowserWindow | null = null

let overlayCloseTimeout: NodeJS.Timeout | null = null
let overlayCloseDelayTimer: NodeJS.Timeout | null = null
let overlaySuccessTimestamp: number | null = null
let idleTransitionTimeout: NodeJS.Timeout | null = null

let isRecording = false
let appleSttStreamActive = false

const RECORDING_COOLDOWN_MS = 1000
const RAPID_PRESS_PENALTY_MS = 1500
const OVERLAY_SUCCESS_HOLD_MS = 1200

let isInCooldown = false
let lastTrayAnimUpdate = 0
let processingAnimInterval: NodeJS.Timeout | null = null
let idleTransitionAnim: NodeJS.Timeout | null = null
let isProcessingToggle = false
let isInPenaltyLockout = false
let penaltyTimeout: NodeJS.Timeout | null = null
let lastKeyPressTime = 0

// ---------------------------------------------------------------------------
// Tray icon
// ---------------------------------------------------------------------------

function updateTrayIcon(
  state: 'idle' | 'recording' | 'processing' | 'copied' | 'error',
  trayAnimations?: boolean
): void {
  if (!tray) return

  const settings = getSettings()
  const useAnimations =
    trayAnimations !== undefined ? trayAnimations : settings.trayAnimations !== false

  const stateIcon = createTrayIcon(state)

  if (!useAnimations) {
    tray.setImage(createTrayIcon('idle'))
    if (process.platform === 'darwin') {
      // @ts-ignore — macOS specific API
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

  if (processingAnimInterval) {
    clearInterval(processingAnimInterval)
    processingAnimInterval = null
  }
  if (idleTransitionAnim) {
    clearInterval(idleTransitionAnim)
    idleTransitionAnim = null
  }

  switch (state) {
    case 'recording': {
      tray.setImage(stateIcon)
      tray.setToolTip('Toolify - Recording...')
      if (process.platform === 'darwin') {
        // @ts-ignore — tray.setTitle is macOS-only API not in Electron types
        tray.setTitle('')
      }

      const overlaySettings = getSettings()

      if (overlayCloseTimeout) {
        clearTimeout(overlayCloseTimeout)
        overlayCloseTimeout = null
      }
      if (overlayCloseDelayTimer) {
        clearTimeout(overlayCloseDelayTimer)
        overlayCloseDelayTimer = null
      }
      overlaySuccessTimestamp = null
      if (idleTransitionTimeout) {
        clearTimeout(idleTransitionTimeout)
        idleTransitionTimeout = null
      }

      if (overlaySettings.showRecordingOverlay !== false) {
        if (recordingOverlay && !recordingOverlay.isDestroyed()) {
          try {
            recordingOverlay.destroy()
          } catch (error) {
            console.error('Failed to destroy existing overlay before recreating:', error)
          }
          recordingOverlay = null
        }

        createRecordingOverlay()

        if (
          overlaySettings.transcriptionProvider === 'apple-stt' &&
          overlaySettings.overlayStyle === 'large'
        ) {
          startAppleSttStream({ language: overlaySettings.sourceLanguage }, (text, isFinal) => {
            if (recordingOverlay && !recordingOverlay.isDestroyed()) {
              try {
                recordingOverlay.webContents.send('transcription-update', { text, isFinal })
              } catch {
                // Overlay may not be ready yet
              }
            }
          })
          appleSttStreamActive = true
        }
      } else {
        if (process.platform === 'darwin' && app.dock) {
          app.hide()
        }
      }
      break
    }

    case 'processing': {
      resetTrayAnimation()
      tray.setImage(createProcessingTrayIcon(Date.now()))
      tray.setToolTip('Toolify - Processing...')
      updateRecordingOverlayProcessingState(true)
      if (process.platform === 'darwin') {
        // @ts-ignore — tray.setTitle is macOS-only API not in Electron types
        tray.setTitle('')
      }
      processingAnimInterval = setInterval(() => {
        if (tray) tray.setImage(createProcessingTrayIcon(Date.now()))
      }, 80)
      break
    }

    case 'copied': {
      const copiedFromLevels = getLastProcessingLevels()
      tray.setImage(createIdleTransitionFrame(0, COPIED_COLOR, copiedFromLevels))
      tray.setToolTip('Toolify - Text copied!')
      closeRecordingOverlay(OVERLAY_SUCCESS_HOLD_MS)
      isInCooldown = true
      setTimeout(() => {
        isInCooldown = false
      }, RECORDING_COOLDOWN_MS)
      if (process.platform === 'darwin') {
        // @ts-ignore — tray.setTitle is macOS-only API not in Electron types
        tray.setTitle('')
      }
      if (idleTransitionTimeout) clearTimeout(idleTransitionTimeout)
      idleTransitionTimeout = setTimeout(() => {
        idleTransitionTimeout = null
        const startTime = Date.now()
        const duration = 800
        idleTransitionAnim = setInterval(() => {
          const progress = Math.min(1, (Date.now() - startTime) / duration)
          if (tray)
            tray.setImage(createIdleTransitionFrame(progress, COPIED_COLOR, copiedFromLevels))
          if (progress >= 1) {
            clearInterval(idleTransitionAnim!)
            idleTransitionAnim = null
            if (tray) tray.setImage(createTrayIcon('idle'))
          }
        }, 33)
      }, 800)
      break
    }

    case 'error': {
      resetTrayAnimation()
      const errorFromLevels = getLastProcessingLevels()
      tray.setImage(createIdleTransitionFrame(0, ERROR_COLOR, errorFromLevels))
      tray.setToolTip('Toolify - Error')
      closeRecordingOverlay()
      if (process.platform === 'darwin') {
        // @ts-ignore — tray.setTitle is macOS-only API not in Electron types
        tray.setTitle('')
      }
      if (idleTransitionTimeout) clearTimeout(idleTransitionTimeout)
      idleTransitionTimeout = setTimeout(() => {
        idleTransitionTimeout = null
        const startTime = Date.now()
        const duration = 800
        idleTransitionAnim = setInterval(() => {
          const progress = Math.min(1, (Date.now() - startTime) / duration)
          if (tray) tray.setImage(createIdleTransitionFrame(progress, ERROR_COLOR, errorFromLevels))
          if (progress >= 1) {
            clearInterval(idleTransitionAnim!)
            idleTransitionAnim = null
            if (tray) tray.setImage(createTrayIcon('idle'))
          }
        }, 33)
      }, 800)
      break
    }

    case 'idle':
    default:
      tray.setToolTip('Toolify')
      closeRecordingOverlay()
      if (process.platform === 'darwin') {
        // @ts-ignore — tray.setTitle is macOS-only API not in Electron types
        tray.setTitle('')
      }
      tray.setImage(stateIcon)
      break
  }
}

// ---------------------------------------------------------------------------
// Window management
// ---------------------------------------------------------------------------

function createWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) return
  mainWindow = createMainWindow()
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createSettingsWindowInstance(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) settingsWindow.restore()
    settingsWindow.focus()
    settingsWindow.moveTop?.()
    return
  }

  const cursorPoint = screen.getCursorScreenPoint()
  const targetDisplay = screen.getDisplayNearestPoint(cursorPoint)
  settingsWindow = createSettingsWindow(targetDisplay)
  registerWindow(settingsWindow)
  settingsWindow.on('closed', () => {
    if (settingsWindow) unregisterWindow(settingsWindow)
    settingsWindow = null
  })
  settingsWindow.on('enter-full-screen', () => settingsWindow?.setFullScreen(false))
  settingsWindow.on('enter-html-full-screen', () => settingsWindow?.setFullScreen(false))
}

// ---------------------------------------------------------------------------
// Recording overlay
// ---------------------------------------------------------------------------

function createRecordingOverlay(): void {
  if (overlayCloseTimeout) {
    clearTimeout(overlayCloseTimeout)
    overlayCloseTimeout = null
  }

  if (recordingOverlay && !recordingOverlay.isDestroyed()) return
  recordingOverlay = null

  const settings = getSettings()
  const overlayStyle = settings.overlayStyle || 'compact'
  const isLarge = overlayStyle === 'large'
  const overlayWidth = isLarge ? 400 : 100
  const overlayHeight = isLarge ? 96 : 40

  let activeDisplay = screen.getPrimaryDisplay()
  const focusedWindow = BrowserWindow.getFocusedWindow()

  if (focusedWindow) {
    const bounds = focusedWindow.getBounds()
    activeDisplay = screen.getDisplayNearestPoint({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    })
  } else {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.isVisible()) {
        const bounds = win.getBounds()
        activeDisplay = screen.getDisplayNearestPoint({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2
        })
        break
      }
    }
  }

  const { width: screenWidth } = activeDisplay.workAreaSize
  const { x: displayX, y: displayY } = activeDisplay.workArea

  let x = displayX + screenWidth - overlayWidth - 5
  let y = displayY + 30

  if (isLarge) {
    x = displayX + (screenWidth - overlayWidth) / 2
  }

  if (settings.overlayPosition) {
    const savedX = settings.overlayPosition.x
    const savedY = settings.overlayPosition.y
    const { width: displayWidth, height: displayHeight } = activeDisplay.workAreaSize

    if (
      savedX >= displayX - overlayWidth + 50 &&
      savedX <= displayX + displayWidth - 50 &&
      savedY >= displayY &&
      savedY <= displayY + displayHeight - overlayHeight
    ) {
      x = savedX
      y = savedY
    }
  }

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
    movable: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })

  const htmlContent = isLarge ? getLargeOverlayHTML() : getCompactOverlayHTML()
  recordingOverlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

  let moveTimeout: NodeJS.Timeout | null = null
  recordingOverlay.on('moved', () => {
    if (moveTimeout) clearTimeout(moveTimeout)
    moveTimeout = setTimeout(() => {
      if (recordingOverlay && !recordingOverlay.isDestroyed()) {
        const bounds = recordingOverlay.getBounds()
        const display = screen.getDisplayNearestPoint({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2
        })
        const { width: dw, height: dh } = display.workAreaSize
        const { x: dx, y: dy } = display.workArea

        if (
          bounds.x >= dx - 50 &&
          bounds.x <= dx + dw - 50 &&
          bounds.y >= dy &&
          bounds.y <= dy + dh - 50
        ) {
          const currentSettings = getSettings()
          currentSettings.overlayPosition = { x: bounds.x, y: bounds.y }
          saveSettingsUtil(currentSettings)
        }
      }
      moveTimeout = null
    }, 500)
  })

  recordingOverlay.on('closed', () => {
    if (moveTimeout) {
      clearTimeout(moveTimeout)
      moveTimeout = null
    }
    recordingOverlay = null
  })

  if (process.platform === 'darwin') {
    recordingOverlay.setWindowButtonVisibility(false)
    // @ts-ignore — macOS specific API
    recordingOverlay.setAlwaysOnTop(true, 'floating', 1)
  }

  recordingOverlay.showInactive()
  recordingOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.platform === 'darwin' && app.dock) {
    app.hide()
  }
}

function updateRecordingOverlayAudioLevel(data: OverlayAudioPayload | number): void {
  const payload: OverlayAudioPayload =
    typeof data === 'number'
      ? { level: data }
      : {
          level: typeof data.level === 'number' ? data.level : 0,
          spectrum: Array.isArray(data.spectrum) ? data.spectrum : undefined,
          durationMs: typeof data.durationMs === 'number' ? Math.max(0, data.durationMs) : undefined
        }

  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      recordingOverlay.webContents.send('audio-level-update', payload)
    } catch {
      // Overlay may not be ready yet
    }
  }

  if (tray && isRecording) {
    const now = Date.now()
    if (now - lastTrayAnimUpdate >= 80) {
      lastTrayAnimUpdate = now
      const spectrum = payload.spectrum ?? new Array(5).fill(payload.level / 100)
      tray.setImage(createRecordingTrayIcon(spectrum))
    }
  }
}

function updateRecordingOverlayProcessingState(processing: boolean): void {
  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      recordingOverlay.webContents.send('processing-state', { processing })
    } catch {
      // Overlay may not be ready yet
    }
  }
}

function showRecordingOverlaySuccess(): void {
  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      if (overlayCloseDelayTimer) {
        clearTimeout(overlayCloseDelayTimer)
        overlayCloseDelayTimer = null
      }
      if (overlayCloseTimeout) {
        clearTimeout(overlayCloseTimeout)
        overlayCloseTimeout = null
      }
      recordingOverlay.webContents.send('success-state')
      overlaySuccessTimestamp = Date.now()
    } catch {
      // Overlay may not be ready yet
    }
  }
}

function closeRecordingOverlay(delayMs = 0): void {
  if (delayMs > 0) {
    if (overlayCloseDelayTimer) clearTimeout(overlayCloseDelayTimer)
    overlayCloseDelayTimer = setTimeout(() => {
      overlayCloseDelayTimer = null
      closeRecordingOverlay()
    }, delayMs)
    return
  }

  if (overlaySuccessTimestamp) {
    const elapsed = Date.now() - overlaySuccessTimestamp
    if (elapsed < OVERLAY_SUCCESS_HOLD_MS) {
      closeRecordingOverlay(OVERLAY_SUCCESS_HOLD_MS - elapsed)
      return
    }
    overlaySuccessTimestamp = null
  }

  if (overlayCloseDelayTimer) {
    clearTimeout(overlayCloseDelayTimer)
    overlayCloseDelayTimer = null
  }
  if (overlayCloseTimeout) {
    clearTimeout(overlayCloseTimeout)
    overlayCloseTimeout = null
  }

  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      recordingOverlay.webContents.send('fade-out')
      const overlayToClose = recordingOverlay
      overlayCloseTimeout = setTimeout(() => {
        if (overlayToClose && !overlayToClose.isDestroyed()) overlayToClose.close()
        if (recordingOverlay === overlayToClose) recordingOverlay = null
        overlayCloseTimeout = null
      }, 800)
    } catch (error) {
      console.error('Error closing overlay:', error)
      if (recordingOverlay && !recordingOverlay.isDestroyed()) recordingOverlay.close()
      recordingOverlay = null
      overlayCloseTimeout = null
    }
  } else {
    recordingOverlay = null
    overlayCloseTimeout = null
  }
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

function configureAutoStart(enabled: boolean): void {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true })
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.toolify.app')

  if (process.platform === 'darwin') {
    app.setName('Toolify')

    if (app.dock) app.dock.setIcon(icon)

    let iconPathForAbout: string | undefined
    const isDev = process.env.NODE_ENV === 'development' && process.env.NODE_ENV !== undefined

    if (isDev || !app.isPackaged) {
      iconPathForAbout = icon
    } else {
      const icnsPath = join(process.resourcesPath, 'icon.icns')
      const pngPath = join(process.resourcesPath, 'icon.png')
      if (existsSync(icnsPath)) {
        iconPathForAbout = icnsPath
      } else if (existsSync(pngPath)) {
        iconPathForAbout = pngPath
      } else {
        iconPathForAbout = icon
      }
    }

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

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { systemPreferences } = require('electron')

  // Check accessibility without prompting (false param) — only show notification when missing
  const hasAccessibility = systemPreferences.isTrustedAccessibilityClient(false)

  if (!hasAccessibility) {
    // Trigger the native macOS dialog once
    systemPreferences.isTrustedAccessibilityClient(true)

    setTimeout(() => {
      const notification = new Notification({
        title: 'Toolify Needs Permission',
        body: 'Please grant Accessibility permission to enable keyboard shortcuts and auto-paste feature.\n\nClick here to open System Settings.',
        silent: false
      })
      notification.on('click', () => {
        shell
          .openExternal(
            'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
          )
          .catch(() => {
            shell.openExternal('x-apple.systempreferences:com.apple.settings.PrivacySecurity')
          })
      })
      notification.show()
    }, 2000)
  }

  // -------------------------------------------------------------------------
  // Recording toggle logic
  // -------------------------------------------------------------------------

  const handleCancelRecording = (): void => {
    if (isInPenaltyLockout || isProcessingToggle) return
    if (!isRecording) return

    isProcessingToggle = true
    globalShortcut.unregister('Escape')

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cancel-recording')
    }

    isRecording = false
    isInCooldown = true
    setTimeout(() => {
      isInCooldown = false
    }, RECORDING_COOLDOWN_MS)

    if (appleSttStreamActive) {
      killAppleSttStream()
      appleSttStreamActive = false
    }

    unmuteSystem()

    if (recordingOverlay && !recordingOverlay.isDestroyed()) {
      recordingOverlay.destroy()
      recordingOverlay = null
    }
    overlaySuccessTimestamp = null

    if (overlayCloseTimeout) {
      clearTimeout(overlayCloseTimeout)
      overlayCloseTimeout = null
    }

    // Silent cancel — no notification, no sound
    updateTrayIcon('idle', false)

    setTimeout(() => {
      isProcessingToggle = false
    }, 500)
  }

  const handleRecordingToggle = (): void => {
    const currentTime = Date.now()

    if (isInPenaltyLockout) return

    const timeSinceLastPress = currentTime - lastKeyPressTime
    if (timeSinceLastPress < 300 && lastKeyPressTime > 0) {
      isProcessingToggle = true
      isInPenaltyLockout = true

      if (penaltyTimeout) clearTimeout(penaltyTimeout)
      penaltyTimeout = setTimeout(() => {
        isInPenaltyLockout = false
        isProcessingToggle = false
        penaltyTimeout = null
      }, RAPID_PRESS_PENALTY_MS)

      lastKeyPressTime = 0
      return
    }

    if (isProcessingToggle) return
    if (isInCooldown) {
      lastKeyPressTime = currentTime
      return
    }

    lastKeyPressTime = currentTime
    isProcessingToggle = true
    setTimeout(() => {
      isProcessingToggle = false
    }, 500)

    if (isRecording) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('stop-recording')
      }
    } else {
      if (process.platform === 'darwin' && app.dock) {
        app.dock.hide()
      }

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

  // -------------------------------------------------------------------------
  // process-audio handler (full transcription lifecycle)
  // -------------------------------------------------------------------------

  const handleProcessAudio = async (buffer: ArrayBuffer, duration: number): Promise<void> => {
    const currentSettings = getSettings()
    const provider = currentSettings.transcriptionProvider || 'openai'

    if (provider === 'openai' && !currentSettings.apiKey) {
      showNotification('Toolify Error', 'API Key required for online transcription.')
      updateTrayIcon('idle', currentSettings.trayAnimations)
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('processing-complete')
      return
    }
    if (provider === 'google-cloud' && !currentSettings.googleApiKey) {
      showNotification('Toolify Error', 'Google Cloud API Key required for transcription.')
      updateTrayIcon('idle', currentSettings.trayAnimations)
      if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('processing-complete')
      return
    }

    updateTrayIcon('processing', currentSettings.trayAnimations)
    if (currentSettings.processNotifications) {
      showNotification('Toolify', 'Processing audio...')
    }

    try {
      let text = ''
      let usedStreamResult = false

      if (appleSttStreamActive && provider === 'apple-stt') {
        try {
          await stopAppleSttStream()
          const streamResult = getStreamResult()
          if (streamResult && streamResult.length > 0) {
            text = streamResult
            usedStreamResult = true
          }
        } catch (err) {
          console.error('Failed to stop Apple STT stream:', err)
        }
        appleSttStreamActive = false
      }

      if (provider === 'local-whisper') {
        const modelType = currentSettings.localModelType || 'medium'
        const modelExists = await checkLocalModelExists(modelType)
        if (!modelExists) {
          const errorMsg = `Local model (${modelType}) not found. Please download the model in Settings.`
          showNotification('Toolify Error', errorMsg, true)
          updateTrayIcon('idle', currentSettings.trayAnimations)
          if (mainWindow && !mainWindow.isDestroyed())
            mainWindow.webContents.send('processing-complete')
          return
        }
      }

      if (!usedStreamResult) {
        // Route through the unified transcription provider
        text = await transcribe(Buffer.from(buffer), currentSettings)
      } else if (currentSettings.translate && text && currentSettings.apiKey) {
        // Stream provided raw text — translate via GPT if needed (apple-stt stream path)
        const { getLanguageName, cleanTranslationText } = await import('./utils/helpers')
        const OpenAI = (await import('openai')).default
        try {
          const openai = new OpenAI({ apiKey: currentSettings.apiKey })
          const targetLangName = getLanguageName(currentSettings.targetLanguage ?? 'en')
          const translationResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a professional translator. Translate the following text to ${targetLangName}. The source language will be automatically detected from the text.\n\nImportant guidelines:\n- Understand the full meaning and context of what is being said\n- Provide a natural, fluent translation that sounds like it was originally written in ${targetLangName}\n- Do NOT translate word-for-word - translate meaning-for-meaning\n- Preserve the tone, style, and intent of the original\n- Do not add, remove, or change the meaning\n- Do not add any commentary, explanations, or metadata\n- Only return the translation itself, nothing else`
              },
              { role: 'user', content: text }
            ],
            temperature: 0.3
          })
          const translatedText = translationResponse.choices[0]?.message?.content || text
          text = cleanTranslationText(translatedText) || text
        } catch (error) {
          console.error('Translation failed, returning original text:', error)
        }
      }

      // Save audio file (webm → mp3 via ffmpeg)
      let audioPath: string | undefined
      try {
        const recordingsDir = join(app.getPath('userData'), 'recordings')
        await mkdir(recordingsDir, { recursive: true })

        const webmFileName = `recording-${Date.now()}.webm`
        const webmPath = join(recordingsDir, webmFileName)
        await writeFile(webmPath, Buffer.from(buffer))

        const mp3Path = webmPath.replace('.webm', '.mp3')

        // exec is safe here: paths are constructed from app.getPath('userData') (not user input)
        await new Promise<void>((resolve, reject) => {
          exec(
            `"${getFfmpegPath()}" -i "${webmPath}" -vn -ar 44100 -ac 2 -b:a 192k "${mp3Path}"`,
            (error, _stdout, stderr) => {
              if (error) {
                console.error('FFmpeg conversion failed:', stderr || error)
                audioPath = webmPath
                showNotification('Toolify Error', 'Audio conversion failed, using original format')
                reject(error)
              } else {
                audioPath = mp3Path
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

        if (currentSettings.processNotifications) {
          showNotification('Toolify', 'Text copied to clipboard!')
        }

        if (currentSettings.soundAlert && currentSettings.soundType) {
          playSound(currentSettings.soundType)
        }

        try {
          addHistoryItem({
            text,
            isFavorite: false,
            translated: currentSettings.translate ?? false,
            sourceLanguage: currentSettings.sourceLanguage,
            targetLanguage: currentSettings.targetLanguage,
            provider:
              provider === 'local-whisper'
                ? `Whisper ${currentSettings.localModelType === 'large-v3' ? 'Large V3' : 'Medium'} (GGML)`
                : provider === 'apple-stt'
                  ? 'Apple Speech to Text'
                  : provider === 'google-cloud'
                    ? 'Google Cloud STT'
                    : 'OpenAI Whisper-1',
            audioPath,
            duration,
            success: true
          })
        } catch (error) {
          console.error('Failed to save history:', error)
        }

        try {
          updateStatistics(true, provider, duration || 0, text.length)
        } catch (error) {
          console.error('Failed to update statistics:', error)
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('processing-complete')
        }

        showRecordingOverlaySuccess()
        setTimeout(() => {
          updateTrayIcon('copied', currentSettings.trayAnimations)
        }, 1400)

        // exec is safe here: hardcoded AppleScript, no user input interpolated
        exec(
          'osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"',
          (error, _stdout, stderr) => {
            if (error) {
              console.error('Failed to paste text:', stderr || error)
              showNotification('Toolify Warning', 'Text copied but could not auto-paste')
            }
          }
        )
      } else {
        updateTrayIcon('idle', currentSettings.trayAnimations)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('processing-complete')
        }
      }
    } catch (error) {
      console.error('Transcription failed', error)
      updateTrayIcon('error', currentSettings.trayAnimations)

      let errorMessage = 'Transcription failed.'
      if (provider === 'local-whisper') {
        const errorStr =
          error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
        if (errorStr.includes('not found') || errorStr.includes('model')) {
          errorMessage = 'Local model not found. Please download the model in Settings.'
        } else if (errorStr.includes('executable') || errorStr.includes('whisper')) {
          errorMessage = 'Whisper executable not found. Please reinstall the application.'
        } else {
          errorMessage = `Local transcription failed: ${error instanceof Error ? error.message : String(error)}`
        }
      } else if (provider === 'apple-stt') {
        errorMessage = `Apple STT failed: ${error instanceof Error ? error.message : String(error)}`
      } else if (provider === 'google-cloud') {
        errorMessage = currentSettings.googleApiKey
          ? `Google Cloud STT failed: ${error instanceof Error ? error.message : String(error)}`
          : 'Google Cloud API Key missing for transcription.'
      } else {
        errorMessage = currentSettings.apiKey
          ? 'Transcription failed. Check your API Key or internet connection.'
          : 'API Key missing for online transcription.'
      }

      showNotification('Toolify Error', errorMessage, true)

      try {
        updateStatistics(false, provider, duration || 0, 0)
      } catch (statsError) {
        console.error('Failed to update statistics:', statsError)
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('processing-complete')
      }
    }
  }

  // -------------------------------------------------------------------------
  // openHistory helper (shared between tray menu and IPC)
  // -------------------------------------------------------------------------

  const openHistory = (): void => {
    if (!settingsWindow || settingsWindow.isDestroyed()) {
      createSettingsWindowInstance()
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.once('did-finish-load', () => {
          if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.webContents.send('show-history')
          }
        })
      }
    } else {
      settingsWindow.show()
      settingsWindow.focus()
      setTimeout(() => {
        if (settingsWindow && !settingsWindow.isDestroyed()) {
          settingsWindow.webContents.send('show-history')
        }
      }, 100)
    }
  }

  // -------------------------------------------------------------------------
  // Initial setup
  // -------------------------------------------------------------------------

  const initialSettings = getSettings()
  registerShortcutHandler(initialSettings.shortcut || 'Command+Space', handleRecordingToggle)

  createWindow()

  // Setup auto-updater AFTER createWindow so mainWindow is available for IPC
  setupAutoUpdater(mainWindow)
  setTimeout(() => {
    checkForUpdates()
  }, 5000)

  // -------------------------------------------------------------------------
  // Context menu
  // -------------------------------------------------------------------------

  const updateContextMenu = (): void => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'History',
        type: 'normal',
        click: openHistory
      },
      {
        label: 'Preferences...',
        type: 'normal',
        click: createSettingsWindowInstance
      },
      { type: 'separator' },
      {
        label: `Version ${app.getVersion()}`,
        type: 'normal',
        enabled: false
      },
      {
        label: 'Check for Updates',
        type: 'normal',
        click: () => {
          checkForUpdates()
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

  // -------------------------------------------------------------------------
  // Register all IPC handlers
  // -------------------------------------------------------------------------

  registerAllIpcHandlers({
    getMainWindow: () => mainWindow,
    getSettingsWindow: () => settingsWindow,
    getRecordingOverlay: () => recordingOverlay,
    openSettings: createSettingsWindowInstance,
    openHistory,
    onShortcutChange: (shortcut: string) => {
      registerShortcutHandler(shortcut, handleRecordingToggle)
      showNotification('Toolify', `Shortcut updated to ${shortcut}`)
    },
    updateContextMenu,
    setRecording: (state: boolean) => {
      isRecording = state
    },
    setProcessing: () => {
      // state managed via updateTrayIcon from set-processing-state handler
    },
    updateOverlayAudioLevel: updateRecordingOverlayAudioLevel,
    handleProcessAudio,
    handleCancelRecording,
    updateTrayIcon
  })

  // -------------------------------------------------------------------------
  // Tray
  // -------------------------------------------------------------------------

  prewarmTrayIconCache()
  tray = new Tray(createTrayIcon('idle'))
  tray.setToolTip('Toolify')
  updateContextMenu()

  tray.on('click', () => {
    tray?.popUpContextMenu()
  })

  app.on('activate', () => {
    if (settingsWindow && settingsWindow.isDestroyed()) {
      settingsWindow = null
    }
  })
})

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

app.on('before-quit', () => {
  if (appleSttStreamActive) {
    killAppleSttStream()
    appleSttStreamActive = false
  }
  closeRecordingOverlay()

  if (!getIsQuittingForUpdate() && tray) {
    tray.destroy()
    tray = null
  }

  unregisterAllShortcuts()
})

app.on('window-all-closed', () => {
  if (getIsQuittingForUpdate()) return
  if (process.platform !== 'darwin') app.quit()
})
