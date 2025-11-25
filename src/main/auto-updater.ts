import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { showNotification } from './utils/system'
import type { UpdateStatus } from '../shared/types'

let updateDownloaded = false
let latestVersion: string | null = null
let allWindows: BrowserWindow[] = []

export function setupAutoUpdater(mainWindow: BrowserWindow | null): void {
  if (mainWindow) {
    allWindows = [mainWindow]
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'mehmetsagir',
    repo: 'toolify'
  })

  autoUpdater.on('checking-for-update', () => {
    // Checking for updates
  })

  autoUpdater.on('update-available', (info) => {
    latestVersion = info.version
    updateDownloaded = false

    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-available', {
          version: info.version,
          releaseNotes: info.releaseNotes,
          releaseDate: info.releaseDate
        })
      }
    })

    showNotification(
      'Update Available',
      `Version ${info.version} is available. Open Settings to update.`,
      true
    )
  })

  autoUpdater.on('update-not-available', () => {
    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-not-available')
      }
    })
  })

  autoUpdater.on('error', (err) => {
    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-error', err.message)
      }
    })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-download-progress', {
          percent: progressObj.percent,
          transferred: progressObj.transferred,
          total: progressObj.total
        })
      }
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true
    latestVersion = info.version

    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-downloaded', {
          version: info.version
        })
      }
    })

    showNotification(
      'Update Ready',
      `Version ${info.version} has been downloaded. Click "Quit and Install" in Settings.`,
      true
    )
  })
}

export function registerWindow(window: BrowserWindow): void {
  if (!allWindows.includes(window)) {
    allWindows.push(window)
  }
}

export function unregisterWindow(window: BrowserWindow): void {
  allWindows = allWindows.filter((w) => w !== window)
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates()
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate()
}

export function quitAndInstall(): void {
  if (updateDownloaded) {
    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.close()
      }
    })

    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true)
    }, 100)
  }
}

export function getUpdateStatus(): UpdateStatus {
  return {
    updateAvailable: latestVersion !== null,
    updateDownloaded,
    latestVersion
  }
}
