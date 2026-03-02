import { exec } from 'child_process'
import { Notification } from 'electron'
import { getSettings } from '../store/settings'

let previousVolume: number | null = null

function getSystemVolume(callback: (volume: number) => void): void {
  exec('osascript -e "output volume of (get volume settings)"', (err, stdout) => {
    if (err) {
      callback(50)
      return
    }
    const volume = parseInt(stdout.trim(), 10)
    callback(isNaN(volume) ? 50 : volume)
  })
}

function setSystemVolume(volume: number): void {
  const safeVolume = Math.max(0, Math.min(100, volume))
  exec(`osascript -e "set volume output volume ${safeVolume}"`, () => {})
}

export function muteSystem(): void {
  getSystemVolume((volume) => {
    previousVolume = volume
    setSystemVolume(0)
  })
}

export function unmuteSystem(): void {
  if (previousVolume !== null) {
    setSystemVolume(previousVolume)
    previousVolume = null
  }
}

/**
 * Show a macOS notification.
 * Respects the processNotifications setting unless force is true.
 */
export function showNotification(title: string, body: string, force: boolean = false): void {
  if (!force) {
    const settings = getSettings()
    if (!settings.processNotifications) {
      return
    }
  }
  new Notification({ title, body }).show()
}

/**
 * Play a system sound from /System/Library/Sounds/.
 * Tries with .aiff extension first, then without (bare name).
 */
export function playSound(soundType: string): void {
  const soundPath = `/System/Library/Sounds/${soundType}.aiff`
  exec(`afplay "${soundPath}"`, (err) => {
    if (err) {
      exec(`afplay "/System/Library/Sounds/${soundType}"`, () => {})
    }
  })
}
