import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { showNotification } from './utils/system'

let updateDownloaded = false
let latestVersion: string | null = null
let allWindows: BrowserWindow[] = []

export function setupAutoUpdater(mainWindow: BrowserWindow | null): void {
  if (mainWindow) {
    allWindows = [mainWindow]
  }
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'mehmetsagir',
    repo: 'toolify'
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version)
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

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info.version)
    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-not-available')
      }
    })
  })

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-error', err.message)
      }
    })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(
      `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`
    )
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
    console.log('Update downloaded:', info.version)
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
      `Version ${info.version} has been downloaded. Restart to install.`,
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
    autoUpdater.quitAndInstall(false, true)
  }
}

export function getUpdateStatus(): {
  updateAvailable: boolean
  updateDownloaded: boolean
  latestVersion: string | null
} {
  return {
    updateAvailable: latestVersion !== null,
    updateDownloaded,
    latestVersion
  }
}

