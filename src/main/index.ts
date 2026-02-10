import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  globalShortcut,
  clipboard,
  Notification,
  screen
} from 'electron'
import { join } from 'path'
import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { exec } from 'child_process'
import { electronApp } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { transcribe } from './openai'
import {
  transcribeLocal,
  checkLocalModelExists,
  downloadLocalModel,
  deleteLocalModel,
  getLocalModelsInfo,
  getModelsDir
} from './local-whisper'
import { transcribeAppleStt, checkAppleSttAvailability } from './apple-stt'
import {
  startAppleSttStream,
  stopAppleSttStream,
  killAppleSttStream,
  getStreamResult
} from './apple-stt-stream'
import { Settings } from './types'
import type { LocalModelType } from '../shared/types/local-models.types'
import { showNotification, playSound, muteSystem, unmuteSystem } from './utils/system'
import { createMainWindow, createSettingsWindow } from './utils/windows'
import { getCompactOverlayHTML, getLargeOverlayHTML } from './utils/overlay-template'
import { getSettings, saveSettings as saveSettingsUtil } from './utils/settings'
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
} from './utils/tray-icon'
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
import { uIOhook } from 'uiohook-napi'

// Set app name and process title immediately for macOS dock label
// CRITICAL: Must be set before any Electron events to override default "Electron" name
if (process.platform === 'darwin') {
  app.setName('Toolify')
  process.title = 'Toolify'

  // Force set name in will-finish-launching event (earliest possible moment)
  app.on('will-finish-launching', () => {
    app.setName('Toolify')
    process.title = 'Toolify'
  })
}

let tray: Tray | null = null
let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let recordingOverlay: BrowserWindow | null = null
let overlayCloseTimeout: NodeJS.Timeout | null = null
let overlayCloseDelayTimer: NodeJS.Timeout | null = null
let overlaySuccessTimestamp: number | null = null
let isRecording = false
let appleSttStreamActive = false
let keyboardHookEnabled = false
const RECORDING_COOLDOWN_MS = 1000 // 1 second cooldown between recordings
const RAPID_PRESS_PENALTY_MS = 1500 // 1.5 second penalty for rapid key presses
const OVERLAY_SUCCESS_HOLD_MS = 1200
let idleTransitionTimeout: NodeJS.Timeout | null = null // Timeout for transitioning to idle state
let isInCooldown = false // Flag to track if we're in cooldown period
let lastTrayAnimUpdate = 0 // Throttle tray icon animation
let processingAnimInterval: NodeJS.Timeout | null = null // Processing wave animation timer
let idleTransitionAnim: NodeJS.Timeout | null = null // Color fade to idle animation
let isProcessingToggle = false // Flag to prevent rapid toggle actions
let isInPenaltyLockout = false // Flag for penalty lockout after rapid presses
let penaltyTimeout: NodeJS.Timeout | null = null // Timeout for penalty period
let lastKeyPressTime = 0 // Track last key press time to detect rapid presses

type OverlayAudioPayload = {
  level: number
  spectrum?: number[]
  durationMs?: number
}

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

  // Stop any running tray animations when switching state
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
      // Set image FIRST to avoid lag
      tray.setImage(stateIcon)
      tray.setToolTip('Toolify - Recording...')
      if (process.platform === 'darwin') {
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      const overlaySettings = getSettings()

      // Cancel any pending timeouts when starting new recording
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

      // ALWAYS create a fresh overlay for each new recording
      // This prevents issues with reusing overlays that are in bad states
      if (overlaySettings.showRecordingOverlay !== false) {
        // Destroy existing overlay if present to get a clean state
        if (recordingOverlay && !recordingOverlay.isDestroyed()) {
          try {
            recordingOverlay.destroy()
          } catch (error) {
            console.error('Failed to destroy existing overlay before recreating:', error)
          }
          recordingOverlay = null
        }

        createRecordingOverlay()

        // Start live streaming if Apple STT + large overlay
        if (
          overlaySettings.transcriptionProvider === 'apple-stt' &&
          overlaySettings.overlayStyle === 'large'
        ) {
          startAppleSttStream({ language: overlaySettings.sourceLanguage }, (text, isFinal) => {
            if (recordingOverlay && !recordingOverlay.isDestroyed()) {
              try {
                recordingOverlay.webContents.send('transcription-update', { text, isFinal })
              } catch {
                // Overlay might not be ready
              }
            }
          })
          appleSttStreamActive = true
        }
      } else {
        // Even without overlay, hide app to prevent focus stealing on macOS
        if (process.platform === 'darwin' && app.dock) {
          app.hide()
        }
      }
      break
    }

    case 'processing':
      resetTrayAnimation()
      // Start wave animation for processing state (~12fps)
      tray.setImage(createProcessingTrayIcon(Date.now()))
      tray.setToolTip('Toolify - Processing...')
      updateRecordingOverlayProcessingState(true)
      if (process.platform === 'darwin') {
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      processingAnimInterval = setInterval(() => {
        if (tray) tray.setImage(createProcessingTrayIcon(Date.now()))
      }, 80)
      break

    case 'copied': {
      // Capture where the processing animation bars were
      const copiedFromLevels = getLastProcessingLevels()
      // Show green immediately at those exact bar positions
      tray.setImage(createIdleTransitionFrame(0, COPIED_COLOR, copiedFromLevels))
      tray.setToolTip('Toolify - Text copied!')
      closeRecordingOverlay(OVERLAY_SUCCESS_HOLD_MS)
      isInCooldown = true
      setTimeout(() => {
        isInCooldown = false
      }, RECORDING_COOLDOWN_MS)
      if (process.platform === 'darwin') {
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      // Hold green briefly, then bars settle to idle center-out
      if (idleTransitionTimeout) {
        clearTimeout(idleTransitionTimeout)
      }
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
      // Capture where the processing animation bars were
      const errorFromLevels = getLastProcessingLevels()
      // Show red immediately at those exact bar positions
      tray.setImage(createIdleTransitionFrame(0, ERROR_COLOR, errorFromLevels))
      tray.setToolTip('Toolify - Error')
      closeRecordingOverlay()
      if (process.platform === 'darwin') {
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      // Hold red briefly, then bars settle to idle center-out
      if (idleTransitionTimeout) {
        clearTimeout(idleTransitionTimeout)
      }
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
        // @ts-ignore - macOS specific API
        tray.setTitle('')
      }
      tray.setImage(stateIcon)
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
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore()
    }
    settingsWindow.focus()
    settingsWindow.moveTop?.()
    return
  }

  const cursorPoint = screen.getCursorScreenPoint()
  const targetDisplay = screen.getDisplayNearestPoint(cursorPoint)
  settingsWindow = createSettingsWindow(targetDisplay)
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

  // Get overlay style setting
  const settings = getSettings()
  const overlayStyle = settings.overlayStyle || 'compact'

  // Determine overlay dimensions based on style
  const isLarge = overlayStyle === 'large'
  const overlayWidth = isLarge ? 400 : 100
  const overlayHeight = isLarge ? 96 : 40

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

  const rightPadding = 5
  const topPadding = 30

  let x = displayX + screenWidth - overlayWidth - rightPadding
  let y = displayY + topPadding

  // For large/dynamic overlay, center it at top instead of right-aligned
  if (isLarge) {
    x = displayX + (screenWidth - overlayWidth) / 2
  }

  // Check if user has saved a custom overlay position
  if (settings.overlayPosition) {
    // Validate saved position is within current display bounds
    const savedX = settings.overlayPosition.x
    const savedY = settings.overlayPosition.y
    const { width: displayWidth, height: displayHeight } = activeDisplay.workAreaSize

    // Ensure position is within display bounds (with some margin)
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
    movable: true, // Enable dragging
    focusable: false,
    hasShadow: false,
    webPreferences: {
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })

  // Get the appropriate HTML based on style
  const htmlContent = isLarge ? getLargeOverlayHTML() : getCompactOverlayHTML()
  recordingOverlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)

  // Save overlay position when user moves it (debounced to avoid excessive saves)
  let moveTimeout: NodeJS.Timeout | null = null
  recordingOverlay.on('moved', () => {
    if (moveTimeout) {
      clearTimeout(moveTimeout)
    }

    // Wait 500ms after movement stops before saving
    moveTimeout = setTimeout(() => {
      if (recordingOverlay && !recordingOverlay.isDestroyed()) {
        const bounds = recordingOverlay.getBounds()
        const currentSettings = getSettings()

        // Validate position is within reasonable bounds before saving
        const activeDisplay = screen.getDisplayNearestPoint({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2
        })

        const { width: displayWidth, height: displayHeight } = activeDisplay.workAreaSize
        const { x: displayX, y: displayY } = activeDisplay.workArea

        // Only save if position is valid
        if (
          bounds.x >= displayX - 50 &&
          bounds.x <= displayX + displayWidth - 50 &&
          bounds.y >= displayY &&
          bounds.y <= displayY + displayHeight - 50
        ) {
          currentSettings.overlayPosition = { x: bounds.x, y: bounds.y }
          saveSettingsUtil(currentSettings)
        }
      }
      moveTimeout = null
    }, 500)
  })

  recordingOverlay.on('closed', () => {
    // Clean up move timeout
    if (moveTimeout) {
      clearTimeout(moveTimeout)
      moveTimeout = null
    }
    recordingOverlay = null
  })

  // Set window level for macOS - use floating instead of screen-saver to avoid stealing focus
  if (process.platform === 'darwin') {
    recordingOverlay.setWindowButtonVisibility(false)
    // Use floating level - stays on top but doesn't steal focus
    // @ts-ignore - macOS specific API
    recordingOverlay.setAlwaysOnTop(true, 'floating', 1)
  }

  // Show without activating to avoid stealing focus
  recordingOverlay.showInactive()
  // Make visible on all workspaces after showing to avoid focus issues
  recordingOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // CRITICAL: Hide the app to prevent focus stealing on macOS
  // The overlay remains visible because it has alwaysOnTop: true
  // This prevents the settings window or any other window from coming to foreground
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
      // Overlay might not be ready yet, ignore
    }
  }

  // Animate tray icon bars (~12 fps)
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
      // Overlay might not be ready yet, ignore
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
      // Overlay might not be ready yet, ignore
    }
  }
}

function closeRecordingOverlay(delayMs = 0): void {
  if (delayMs > 0) {
    if (overlayCloseDelayTimer) {
      clearTimeout(overlayCloseDelayTimer)
    }
    overlayCloseDelayTimer = setTimeout(() => {
      overlayCloseDelayTimer = null
      closeRecordingOverlay()
    }, delayMs)
    return
  }

  if (overlaySuccessTimestamp) {
    const elapsed = Date.now() - overlaySuccessTimestamp
    if (elapsed < OVERLAY_SUCCESS_HOLD_MS) {
      const remaining = OVERLAY_SUCCESS_HOLD_MS - elapsed
      closeRecordingOverlay(remaining)
      return
    }
    overlaySuccessTimestamp = null
  }

  if (overlayCloseDelayTimer) {
    clearTimeout(overlayCloseDelayTimer)
    overlayCloseDelayTimer = null
  }

  // Cancel any existing close timeout
  if (overlayCloseTimeout) {
    clearTimeout(overlayCloseTimeout)
    overlayCloseTimeout = null
  }

  if (recordingOverlay && !recordingOverlay.isDestroyed()) {
    try {
      recordingOverlay.webContents.send('fade-out')

      // Track the close timeout so it can be cancelled if needed
      overlayCloseTimeout = setTimeout(() => {
        if (recordingOverlay && !recordingOverlay.isDestroyed()) {
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
  electronApp.setAppUserModelId('com.toolify.app')

  if (process.platform === 'darwin') {
    // Set app name for macOS menu bar
    app.setName('Toolify')

    // Set dock icon (used for About panel even when dock is hidden)
    if (app.dock) {
      app.dock.setIcon(icon)
    }

    // Determine icon path for About panel
    let iconPathForAbout: string | undefined

    const isDevelopment =
      process.env.NODE_ENV === 'development' && process.env.NODE_ENV !== undefined

    if (isDevelopment || !app.isPackaged) {
      // In development, use the icon from resources
      iconPathForAbout = icon
    } else {
      // In production, try .icns first, then fallback to .png
      const icnsPath = join(process.resourcesPath, 'icon.icns')
      const pngPath = join(process.resourcesPath, 'icon.png')

      if (existsSync(icnsPath)) {
        iconPathForAbout = icnsPath
      } else if (existsSync(pngPath)) {
        iconPathForAbout = pngPath
      } else {
        // Fallback to development icon
        iconPathForAbout = icon
      }
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

  // Hide dock icon on startup - app runs in menu bar only
  if (process.platform === 'darwin') {
    const dock = app.dock
    if (dock) {
      dock.hide()
    }
  }

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
    const currentTime = Date.now()

    // FIRST: Check if we're in penalty lockout (user pressed too rapidly)
    if (isInPenaltyLockout) {
      return
    }

    // SECOND: Detect rapid key presses (within 300ms of last press)
    const timeSinceLastPress = currentTime - lastKeyPressTime
    if (timeSinceLastPress < 300 && lastKeyPressTime > 0) {
      // Cancel any ongoing action by setting processing flag
      isProcessingToggle = true

      // Activate penalty lockout
      isInPenaltyLockout = true

      // Clear any existing penalty timeout
      if (penaltyTimeout) {
        clearTimeout(penaltyTimeout)
      }

      // Set penalty timeout
      penaltyTimeout = setTimeout(() => {
        isInPenaltyLockout = false
        isProcessingToggle = false
        penaltyTimeout = null
      }, RAPID_PRESS_PENALTY_MS)

      // Reset last key press time to prevent chain penalties
      lastKeyPressTime = 0
      return
    }

    // THIRD: Check if we're already processing a toggle action
    if (isProcessingToggle) {
      return
    }

    // FOURTH: Check if we're in cooldown period
    if (isInCooldown) {
      lastKeyPressTime = currentTime
      return
    }

    // Update last key press time
    lastKeyPressTime = currentTime

    // Mark that we're processing a toggle action
    isProcessingToggle = true

    // Clear the processing flag after a short delay
    setTimeout(() => {
      isProcessingToggle = false
    }, 500)

    if (isRecording) {
      // Stop recording
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('stop-recording')
      }
    } else {
      // CRITICAL: Hide app immediately to prevent focus stealing on macOS
      // This must happen before any window operations
      if (process.platform === 'darwin' && app.dock) {
        app.hide()
      }

      // Start recording
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
    // Check if we're in penalty lockout
    if (isInPenaltyLockout) {
      return
    }

    // Check if we're already processing a toggle action
    if (isProcessingToggle) {
      return
    }

    if (isRecording) {
      // Mark that we're processing a toggle action
      isProcessingToggle = true

      // Unregister ESC shortcut when cancelling
      globalShortcut.unregister('Escape')

      // IMPORTANT: Send cancel-recording (NOT stop-recording) to abort without processing
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cancel-recording')
      }

      isRecording = false

      // Activate cooldown flag (cancel also counts as completion)
      isInCooldown = true
      // Clear cooldown flag after the cooldown period
      setTimeout(() => {
        isInCooldown = false
      }, RECORDING_COOLDOWN_MS)

      // Kill Apple STT stream if active
      if (appleSttStreamActive) {
        killAppleSttStream()
        appleSttStreamActive = false
      }

      // Unmute system
      unmuteSystem()

      // Close overlay immediately
      if (recordingOverlay && !recordingOverlay.isDestroyed()) {
        recordingOverlay.destroy()
        recordingOverlay = null
      }
      overlaySuccessTimestamp = null

      // Clear any pending close timeout
      if (overlayCloseTimeout) {
        clearTimeout(overlayCloseTimeout)
        overlayCloseTimeout = null
      }

      // Reset tray icon without animations/notifications (silent cancel)
      updateTrayIcon('idle', false)

      // Clear processing flag after cancel completes
      setTimeout(() => {
        isProcessingToggle = false
      }, 500)

      // NO notification or sound on cancel - user already knows they cancelled
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
        showNotification(
          'Toolify',
          'Right Command key is only supported on macOS. Using Command+Space.'
        )
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
          showNotification(
            'Toolify Error',
            'Failed to register Right Command. Using Command+Space.'
          )
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

  // IPC handlers for overlay button clicks
  ipcMain.on('overlay-stop-recording', () => {
    if (isRecording && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stop-recording')
    }
  })

  ipcMain.on('overlay-cancel-recording', () => {
    if (isRecording) {
      handleCancelRecording()
    }
  })

  // Dynamic overlay resize from transcription content
  ipcMain.on('overlay-resize-height', (_, height: number) => {
    if (recordingOverlay && !recordingOverlay.isDestroyed()) {
      const bounds = recordingOverlay.getBounds()
      const newHeight = Math.min(Math.max(Math.ceil(height), 96), 220)
      if (bounds.height !== newHeight) {
        recordingOverlay.setBounds({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: newHeight
        })
      }
    }
  })

  // Send shortcut to overlay
  ipcMain.on('get-shortcut', () => {
    const settings = getSettings()
    const shortcut = settings.shortcut || '⌘⇧.'
    if (recordingOverlay && !recordingOverlay.isDestroyed()) {
      recordingOverlay.webContents.send('init-shortcut', shortcut)
    }
  })

  ipcMain.on('set-recording-state', (_, state) => {
    isRecording = state
    if (state) {
      // Register ESC shortcut when recording starts
      try {
        globalShortcut.register('Escape', handleCancelRecording)
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

  ipcMain.on('update-recording-audio-level', (_, payload: OverlayAudioPayload) => {
    updateRecordingOverlayAudioLevel(payload)
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

  ipcMain.handle('check-local-model', async (_, modelType: LocalModelType) => {
    return await checkLocalModelExists(modelType)
  })

  ipcMain.handle('download-local-model', async (_, modelType: LocalModelType) => {
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
      }
    })
  })

  ipcMain.handle('delete-local-model', async (_, modelType: LocalModelType) => {
    return deleteLocalModel(modelType)
  })

  ipcMain.handle('get-local-models-info', async () => {
    return getLocalModelsInfo()
  })

  ipcMain.handle('open-models-folder', async () => {
    const dir = getModelsDir()
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
    await shell.openPath(dir)
    return dir
  })

  ipcMain.handle('check-apple-stt', async (_, language?: string) => {
    return checkAppleSttAvailability(language)
  })

  ipcMain.handle('get-version', () => {
    return app.getVersion()
  })

  ipcMain.on('open-external', (_, url: string) => {
    console.log('[Main] open-external called with URL:', url)
    shell.openExternal(url).catch((error) => {
      console.error('Failed to open external URL:', error)
    })
  })

  ipcMain.on('process-audio', async (_, buffer, duration: number) => {
    const settings = getSettings()

    // Only require API key if using OpenAI provider
    const provider = settings.transcriptionProvider || 'openai'
    if (provider === 'openai' && !settings.apiKey) {
      showNotification('Toolify Error', 'API Key required for online transcription.')
      updateTrayIcon('idle', settings.trayAnimations)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('processing-complete')
      }
      return
    }

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

      // If Apple STT stream was active, finalize it and use its result
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

      switch (provider) {
        case 'local-whisper': {
          // For local model: translation requires API key
          const shouldTranslate = settings.translate && !!settings.apiKey

          // Verify model exists before attempting transcription
          const modelType = settings.localModelType || 'medium'
          console.log(
            `Current settings - provider: ${provider}, localModelType: ${settings.localModelType}`
          )

          const modelExists = await checkLocalModelExists(modelType)

          if (!modelExists) {
            const modelsDir = path.join(app.getPath('userData'), 'models')
            console.error(
              `Model not found. Expected path: ${path.join(modelsDir, `ggml-${modelType}.bin`)}`
            )

            const errorMsg = `Local model (${modelType}) not found. Please download the model in Settings.`
            console.error(errorMsg)
            showNotification('Toolify Error', errorMsg, true)
            updateTrayIcon('idle', settings.trayAnimations)
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('processing-complete')
            }
            return
          }

          text = await transcribeLocal(Buffer.from(buffer), modelType, {
            translate: shouldTranslate,
            language: 'auto',
            sourceLanguage: 'auto',
            targetLanguage: settings.targetLanguage ?? 'en',
            apiKey: settings.apiKey
          })
          break
        }

        case 'apple-stt': {
          const shouldTranslate = settings.translate && !!settings.apiKey

          if (!usedStreamResult) {
            // Fall back to file-based transcription (stream not used or failed)
            text = await transcribeAppleStt(Buffer.from(buffer), {
              translate: shouldTranslate,
              language: settings.sourceLanguage,
              sourceLanguage: settings.sourceLanguage,
              targetLanguage: settings.targetLanguage ?? 'en',
              apiKey: settings.apiKey
            })
          } else if (shouldTranslate && text) {
            // Stream provided raw text — still need to translate via GPT
            const { getLanguageName, cleanTranslationText } =
              await import('./utils/transcription-helpers')
            const OpenAI = (await import('openai')).default
            try {
              const openai = new OpenAI({ apiKey: settings.apiKey })
              const targetLangName = getLanguageName(settings.targetLanguage ?? 'en')
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
          break
        }

        case 'openai':
        default: {
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
            settings.translate ? 'auto' : (settings.sourceLanguage ?? 'auto'),
            settings.targetLanguage ?? 'tr'
          )
          break
        }
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
          exec(
            `ffmpeg -i "${webmPath}" -vn -ar 44100 -ac 2 -b:a 192k "${mp3Path}"`,
            (error, _stdout, stderr) => {
              if (error) {
                console.error('FFmpeg conversion failed:', stderr || error)
                // If conversion fails, use the WebM file
                audioPath = webmPath
                showNotification('Toolify Error', 'Audio conversion failed, using original format')
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
            provider:
              provider === 'local-whisper'
                ? `Whisper ${settings.localModelType === 'large-v3' ? 'Large V3' : 'Medium'} (GGML)`
                : provider === 'apple-stt'
                  ? 'Apple Speech to Text'
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

        // Show success immediately; auto-paste happens in background
        showRecordingOverlaySuccess()
        setTimeout(() => {
          updateTrayIcon('copied', settings.trayAnimations)
        }, 1400)

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
        updateTrayIcon('idle', settings.trayAnimations)
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('processing-complete')
        }
      }
    } catch (error) {
      console.error('Transcription failed', error)
      updateTrayIcon('error', settings.trayAnimations)

      // Provide more specific error messages based on the error type and settings
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
      } else {
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

  prewarmTrayIconCache()
  tray = new Tray(createTrayIcon('idle'))
  tray.setToolTip('Toolify')

  const updateContextMenu = (): void => {
    const contextMenu = Menu.buildFromTemplate([
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
    // Still clean up resources but don't prevent quit
    if (appleSttStreamActive) {
      killAppleSttStream()
      appleSttStreamActive = false
    }
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
  if (appleSttStreamActive) {
    killAppleSttStream()
    appleSttStreamActive = false
  }
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
