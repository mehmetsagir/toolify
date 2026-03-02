import { ipcMain } from 'electron'
import {
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getUpdateStatus
} from '../services/auto-updater'

export function registerUpdateHandlers(): void {
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
}
