import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 320,
    height: 450,
    show: false,
    frame: false,
    resizable: false,
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
  const window = new BrowserWindow({
    minWidth: 750,
    maxWidth: 760,
    minHeight: 1200,
    maxHeight: 2000,
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

