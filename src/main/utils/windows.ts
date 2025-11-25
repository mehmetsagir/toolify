import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

function getScreenDimensions(): { width: number; height: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  return primaryDisplay.workAreaSize
}

export function createMainWindow(): BrowserWindow {
  const { height: screenHeight } = getScreenDimensions()

  const defaultWidth = 500
  const defaultHeight = Math.floor(screenHeight * 0.7)

  const window = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
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
  const { height: screenHeight } = getScreenDimensions()

  const window = new BrowserWindow({
    width: 800,
    height: Math.min(950, Math.floor(screenHeight * 0.9)),
    minWidth: 800,
    maxWidth: 800,
    minHeight: Math.floor(screenHeight * 0.4),
    maxHeight: screenHeight,
    show: false,
    frame: true,
    resizable: true,
    fullscreenable: false,
    title: 'Toolify - Dictation Settings',
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
