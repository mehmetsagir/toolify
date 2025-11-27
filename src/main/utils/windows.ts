import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

function getScreenDimensions(): { width: number; height: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  return primaryDisplay.workAreaSize
}

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
  const activeDisplay = getActiveDisplay()
  const { height: screenHeight } = activeDisplay.workAreaSize
  const { x: displayX, y: displayY } = activeDisplay.workArea

  const defaultWidth = 500
  const defaultHeight = Math.floor(screenHeight * 0.7)
  
  // Center the window on the active display
  const x = displayX + (activeDisplay.workAreaSize.width - defaultWidth) / 2
  const y = displayY + (activeDisplay.workAreaSize.height - defaultHeight) / 2

  const window = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    x: Math.round(x),
    y: Math.round(y),
    minWidth: 320,
    minHeight: 400,
    maxHeight: screenHeight,
    show: false,
    frame: false,
    resizable: true,
    fullscreenable: false,
    transparent: true,
    skipTaskbar: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
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

export function createSettingsWindow(): BrowserWindow {
  const activeDisplay = getActiveDisplay()
  const { height: screenHeight, width: screenWidth } = activeDisplay.workAreaSize
  const { x: displayX, y: displayY } = activeDisplay.workArea

  const windowWidth = 1000
  const windowHeight = Math.min(700, Math.floor(screenHeight * 0.85))
  
  // Center the window on the active display
  const x = displayX + (activeDisplay.workAreaSize.width - windowWidth) / 2
  const y = displayY + (activeDisplay.workAreaSize.height - windowHeight) / 2

  const window = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.round(x),
    y: Math.round(y),
    minWidth: 800,
    minHeight: 500,
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
      backgroundThrottling: false
    }
  })

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
