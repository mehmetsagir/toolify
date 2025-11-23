import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { showNotification } from './utils/system'

let updateDownloaded = false
let latestVersion: string | null = null

export function setupAutoUpdater(mainWindow: BrowserWindow | null): void {
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

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate
      })
    }

    showNotification(
      'Update Available',
      `Version ${info.version} is available. Open Settings to update.`,
      true
    )
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info.version)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available')
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', err.message)
    }
  })

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(
      `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`
    )
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version)
    updateDownloaded = true
    latestVersion = info.version

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version
      })
    }

    showNotification(
      'Update Ready',
      `Version ${info.version} has been downloaded. Restart to install.`,
      true
    )
  })
}

export function checkForUpdates(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping update check in development mode')
    return
  }
  autoUpdater.checkForUpdates()
}

export function downloadUpdate(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping update download in development mode')
    return
  }
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

