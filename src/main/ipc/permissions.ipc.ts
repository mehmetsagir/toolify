import { ipcMain, shell } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import {
  checkAppleSttAvailability,
  requestAppleSttPermission
} from '../services/transcription/apple-stt'

const execFileAsync = promisify(execFile)

export function registerPermissionsHandlers(): void {
  ipcMain.handle('check-accessibility-permission', () => {
    if (process.platform !== 'darwin') {
      return { granted: true, required: false }
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { systemPreferences } = require('electron')
    const hasAccessibility = systemPreferences.isTrustedAccessibilityClient(false)
    return { granted: hasAccessibility, required: true }
  })

  ipcMain.handle('request-accessibility-permission', () => {
    if (process.platform !== 'darwin') {
      return { granted: true, required: false, prompted: false }
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { systemPreferences } = require('electron')
    const granted = systemPreferences.isTrustedAccessibilityClient(true)
    return { granted, required: true, prompted: true }
  })

  ipcMain.on('open-accessibility-settings', () => {
    shell
      .openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
      .catch(() => {
        shell.openExternal('x-apple.systempreferences:com.apple.settings.PrivacySecurity')
      })
  })

  ipcMain.handle('check-microphone-permission', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { systemPreferences: sp } = require('electron')
    return sp.getMediaAccessStatus('microphone')
  })

  ipcMain.handle('request-microphone-permission', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { systemPreferences: sp } = require('electron')
    return sp.askForMediaAccess('microphone')
  })

  ipcMain.on('open-system-preferences', (_, panel: string) => {
    const panels: Record<string, string> = {
      accessibility:
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
      microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
      speechRecognition:
        'x-apple.systempreferences:com.apple.preference.security?Privacy_SpeechRecognition'
    }
    const url = panels[panel]
    if (url) {
      shell.openExternal(url).catch(() => {
        shell.openExternal('x-apple.systempreferences:com.apple.settings.PrivacySecurity')
      })
    }
  })

  ipcMain.handle('check-apple-stt', async (_, language?: string) => {
    return checkAppleSttAvailability(language)
  })

  ipcMain.handle('request-speech-recognition-permission', async () => {
    return requestAppleSttPermission()
  })

  ipcMain.handle('reset-permissions', async () => {
    const bundleId = 'com.toolify.app'
    for (const service of ['Accessibility', 'Microphone', 'SpeechRecognition']) {
      try {
        await execFileAsync('tccutil', ['reset', service, bundleId])
      } catch {
        // ignore — some services may not have entries for this app
      }
    }
  })
}
