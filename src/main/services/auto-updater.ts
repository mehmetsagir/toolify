import { autoUpdater } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { showNotification } from './media-control'
import { logger } from '../utils/logger'
import type { UpdateStatus } from '../../shared/types'

let updateDownloaded = false
let latestVersion: string | null = null
let allWindows: BrowserWindow[] = []
let isQuittingForUpdate = false

export function setupAutoUpdater(mainWindow: BrowserWindow | null): void {
  if (mainWindow) {
    allWindows = [mainWindow]
  }

  autoUpdater.autoDownload = false
  // Enable auto install on quit - this helps with macOS unsigned apps
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false

  // For macOS unsigned apps, ensure proper update handling
  if (process.platform === 'darwin') {
    try {
      // @ts-ignore - updateConfigPath might not be in types but exists in electron-updater
      autoUpdater.updateConfigPath = join(app.getPath('userData'), 'update-config.json')
    } catch (error) {
      console.warn('Could not set updateConfigPath:', error)
    }
  }

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'mehmetsagir',
    repo: 'toolify'
  })

  autoUpdater.on('checking-for-update', () => {
    showNotification('Toolify', 'Checking for updates...')
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

    showNotification('Toolify', "You're on the latest version")
  })

  autoUpdater.on('error', (err) => {
    allWindows.forEach((window) => {
      if (window && !window.isDestroyed()) {
        window.webContents.send('update-error', err.message)
      }
    })

    showNotification('Update Error', `Failed to check for updates: ${err.message}`)
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

    logger.log('Update downloaded:', info.version)
    logger.log('Update file path:', info.path || 'N/A')

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
  if (!updateDownloaded) {
    console.warn('quitAndInstall called but no update is downloaded')
    return
  }

  logger.log('Preparing to quit and install update...')
  isQuittingForUpdate = true

  // Close all windows gracefully and prevent them from blocking quit
  allWindows.forEach((window) => {
    if (window && !window.isDestroyed()) {
      // Remove close event listeners that might prevent quit
      window.removeAllListeners('close')
      window.setClosable(true)
      window.close()
    }
  })

  // In development mode or when app is not packaged, autoUpdater.quitAndInstall won't work
  if (!app.isPackaged) {
    logger.log('Development mode: Quitting app normally (no real update to install)...')
    setTimeout(() => {
      app.quit()
    }, 500)
    return
  }

  // For macOS unsigned apps, we need special handling
  if (process.platform === 'darwin') {
    setTimeout(() => {
      // For unsigned macOS apps, quitAndInstall often doesn't work.
      // Use a combination approach:
      // 1. Try quitAndInstall first
      // 2. Use app.relaunch() as immediate fallback to ensure restart
      logger.log('Calling quitAndInstall for macOS...')

      // Set relaunch before calling quitAndInstall so app restarts even if quitAndInstall fails
      app.relaunch({ args: process.argv.slice(1).concat(['--updated']) })

      try {
        // For macOS unsigned apps:
        // - isSilent: false (show installer UI if needed)
        // - isForceRunAfter: true (restart app after install)
        autoUpdater.quitAndInstall(false, true)

        setTimeout(() => {
          logger.log('quitAndInstall completed or timed out, quitting...')
          app.exit(0)
        }, 1000)
      } catch (error) {
        console.error('Error calling quitAndInstall:', error)
        logger.log('quitAndInstall failed, using relaunch fallback...')
        app.exit(0)
      }
    }, 1000) // Increased timeout for macOS
  } else {
    // For other platforms (Windows, Linux)
    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(true, true)
      } catch (error) {
        console.error('Error calling quitAndInstall:', error)
        app.quit()
      }
    }, 500)
  }
}

export function getIsQuittingForUpdate(): boolean {
  return isQuittingForUpdate
}

export function getUpdateStatus(): UpdateStatus {
  return {
    updateAvailable: latestVersion !== null,
    updateDownloaded,
    latestVersion
  }
}
