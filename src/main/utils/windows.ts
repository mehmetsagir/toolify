import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'
import { getSettings, saveSettings } from './settings'

/**
 * Gets the display where the focused window is located, or primary display if no focused window
 */
function getActiveDisplay(): Electron.Display {
  const focusedWindow = BrowserWindow.getFocusedWindow()

  if (focusedWindow) {
    const bounds = focusedWindow.getBounds()
    const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
    return screen.getDisplayNearestPoint(point)
  }

  // If no focused window, try to find any visible window
  const allWindows = BrowserWindow.getAllWindows()
  for (const win of allWindows) {
    if (!win.isDestroyed() && win.isVisible()) {
      const bounds = win.getBounds()
      const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
      return screen.getDisplayNearestPoint(point)
    }
  }

  // Fallback to primary display
  return screen.getPrimaryDisplay()
}

export function createMainWindow(): BrowserWindow {
  // Create minimal hidden window for background recording
  const window = new BrowserWindow({
    width: 1,
    height: 1,
    x: -1000,
    y: -1000,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  })

  window.on('closed', () => {
    // Window reference should be managed by caller
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

export function createSettingsWindow(preferredDisplay?: Electron.Display): BrowserWindow {
  const settings = getSettings()
  const savedLayout = settings.settingsWindowLayout

  const baseDisplay =
    preferredDisplay || (savedLayout?.displayId
      ? screen.getAllDisplays().find((display) => display.id === savedLayout.displayId)
      : null) || getActiveDisplay()

  const { width: displayWidth, height: screenHeight } = baseDisplay.workAreaSize
  const { x: displayX, y: displayY } = baseDisplay.workArea

  const defaultWidth = 1200
  const defaultHeight = Math.min(700, Math.floor(screenHeight * 0.85))
  const minWidth = 1000
  const minHeight = 500

  const windowWidth = Math.min(
    displayWidth,
    Math.max(minWidth, savedLayout?.width ?? defaultWidth)
  )
  const windowHeight = Math.min(
    screenHeight,
    Math.max(minHeight, savedLayout?.height ?? defaultHeight)
  )

  const maxOffsetX = Math.max(0, displayWidth - windowWidth)
  const maxOffsetY = Math.max(0, screenHeight - windowHeight)
  const defaultOffsetX = Math.round((displayWidth - windowWidth) / 2)
  const defaultOffsetY = Math.round((screenHeight - windowHeight) / 2)

  const offsetX = Math.min(
    maxOffsetX,
    Math.max(0, savedLayout?.offsetX ?? defaultOffsetX)
  )
  const offsetY = Math.min(
    maxOffsetY,
    Math.max(0, savedLayout?.offsetY ?? defaultOffsetY)
  )

  const x = displayX + offsetX
  const y = displayY + offsetY

  const window = new BrowserWindow({
    width: Math.round(windowWidth),
    height: Math.round(windowHeight),
    x: Math.round(x),
    y: Math.round(y),
    minWidth,
    minHeight,
    show: false,
    frame: true,
    resizable: true,
    fullscreenable: false,
    title: 'Toolify - Settings',
    backgroundColor: '#18181b',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false
    }
  })

  const persistLayout = (): void => {
    if (window.isDestroyed()) return
    const bounds = window.getBounds()
    const display = screen.getDisplayMatching(bounds)
    const offsetX = bounds.x - display.workArea.x
    const offsetY = bounds.y - display.workArea.y

    const settingsToSave = getSettings()
    settingsToSave.settingsWindowLayout = {
      width: bounds.width,
      height: bounds.height,
      offsetX,
      offsetY,
      displayId: display.id
    }
    saveSettings(settingsToSave)
  }

  let layoutSaveTimeout: NodeJS.Timeout | null = null
  const schedulePersist = (): void => {
    if (layoutSaveTimeout) {
      clearTimeout(layoutSaveTimeout)
    }
    layoutSaveTimeout = setTimeout(() => {
      layoutSaveTimeout = null
      persistLayout()
    }, 300)
  }

  window.on('move', schedulePersist)
  window.on('resize', schedulePersist)
  window.on('close', persistLayout)

  window.on('ready-to-show', () => {
    window.show()
    window.focus()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#settings`)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'settings' })
  }

  return window
}
