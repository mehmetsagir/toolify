import { BrowserWindow, ipcMain, shell } from 'electron'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import {
  checkLocalModelExists,
  downloadLocalModel,
  deleteLocalModel,
  getLocalModelsInfo,
  getModelsDir
} from '../services/transcription/local-whisper'
import type { LocalModelType } from '../../shared/types'

export interface ModelsIpcOptions {
  getSettingsWindow: () => BrowserWindow | null
  getMainWindow: () => BrowserWindow | null
}

export function registerModelsHandlers(opts: ModelsIpcOptions): void {
  const { getSettingsWindow, getMainWindow } = opts

  ipcMain.handle('check-local-model', async (_, modelType: LocalModelType) => {
    return checkLocalModelExists(modelType)
  })

  ipcMain.handle('download-local-model', async (_, modelType: LocalModelType) => {
    const windowToNotify = getSettingsWindow() || getMainWindow()

    return downloadLocalModel(modelType, (progress) => {
      if (windowToNotify && !windowToNotify.isDestroyed()) {
        windowToNotify.webContents.send('model-download-progress', {
          modelType,
          percent: progress.percent,
          downloaded: progress.downloaded,
          total: progress.total
        })
      }
    })
  })

  ipcMain.handle('delete-local-model', async (_, modelType: LocalModelType) => {
    return deleteLocalModel(modelType)
  })

  ipcMain.handle('get-local-models-info', async () => {
    return getLocalModelsInfo()
  })

  ipcMain.handle('open-models-folder', async () => {
    const dir = getModelsDir()
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
    await shell.openPath(dir)
    return dir
  })
}
