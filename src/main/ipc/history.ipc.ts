import { ipcMain } from 'electron'
import {
  getAllHistory,
  deleteHistoryItem,
  clearHistory,
  clearOldHistory,
  getHistorySettings,
  saveHistorySettings
} from '../store/history'
import type { HistorySettings } from '../../shared/types'

export function registerHistoryHandlers(): void {
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

  ipcMain.handle('save-history-settings', async (_, settings: HistorySettings) => {
    saveHistorySettings(settings)
    return true
  })

  ipcMain.handle('clear-old-history', async () => {
    return clearOldHistory()
  })
}
