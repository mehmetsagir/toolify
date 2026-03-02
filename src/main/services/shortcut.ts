import { globalShortcut } from 'electron'
import { showNotification } from './media-control'
import { logger } from '../utils/logger'

// Lazy-loaded uiohook instance — FIX: prevent SIGABRT without Accessibility permission
// uiohook-napi crashes on load if Accessibility is not granted, so we only require()
// it at the moment it is actually needed (RightCommand shortcut selected + permission granted).
let uIOhookInstance: typeof import('uiohook-napi').uIOhook | null = null

// Module-level state
let keyboardHookEnabled = false
let currentRecordingShortcut: string | null = null

/**
 * Returns the uiohook singleton, requiring the module on first call.
 * Must only be called after Accessibility permission has been verified.
 */
export function getUIOhook(): typeof import('uiohook-napi').uIOhook {
  if (!uIOhookInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { uIOhook } = require('uiohook-napi')
    uIOhookInstance = uIOhook
  }
  return uIOhookInstance!
}

function stopKeyboardHook(): void {
  if (keyboardHookEnabled && uIOhookInstance) {
    try {
      uIOhookInstance.stop()
    } catch {
      // ignore stop errors
    }
    keyboardHookEnabled = false
  }
}

export { stopKeyboardHook }

/**
 * Register a global recording shortcut.
 *
 * FIX: Unregisters the previously registered shortcut before registering the
 * new one to avoid accumulating listeners across hot settings changes.
 *
 * @param shortcut  Electron accelerator string or 'RightCommand'
 * @param onToggle  Called when the shortcut fires (toggle recording)
 * @param onCancel  Not used here; kept for API symmetry if needed
 * @returns         The accelerator string that was actually registered
 */
export function registerShortcut(shortcut: string, onToggle: () => void): string {
  // Unregister current shortcut first (FIX: remove old listeners before registering new)
  if (currentRecordingShortcut) {
    try {
      globalShortcut.unregister(currentRecordingShortcut)
    } catch {
      // Shortcut may not be registered
    }
    currentRecordingShortcut = null
  }

  // Stop keyboard hook if running
  stopKeyboardHook()

  // Special handling for RightCommand using uiohook-napi (keycode 3676)
  if (shortcut === 'RightCommand') {
    if (process.platform !== 'darwin') {
      showNotification(
        'Toolify',
        'Right Command key is only supported on macOS. Using Command+Space.'
      )
      shortcut = 'Command+Space'
      // Fall through to normal registration
    } else {
      // Check accessibility before loading uiohook (it crashes without it)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { systemPreferences } = require('electron')
      if (!systemPreferences.isTrustedAccessibilityClient(false)) {
        showNotification(
          'Toolify',
          'Accessibility permission required for Right Command. Please grant it in System Settings.'
        )
        shortcut = 'Command+Space'
        // Fall through to normal registration
      } else {
        // Use uiohook for RightCommand on macOS
        try {
          const hook = getUIOhook()
          // FIX: Remove previous listeners to prevent accumulation on re-register
          hook.removeAllListeners('keydown')
          hook.on('keydown', (event) => {
            // Right Command key code is 3676 in uiohook on macOS
            if (event.keycode === 3676) {
              onToggle()
            }
          })
          hook.start()
          keyboardHookEnabled = true
          currentRecordingShortcut = 'RightCommand'
          logger.log('Registered RightCommand shortcut via uiohook')
          return 'RightCommand'
        } catch (error) {
          console.error('Failed to register Right Command via uiohook:', error)
          showNotification(
            'Toolify Error',
            'Failed to register Right Command. Using Command+Space.'
          )
          shortcut = 'Command+Space'
          // Fall through to normal registration
        }
      }
    }
  }

  // Validate against unsafe shortcuts (single modifiers)
  const unsafeShortcuts = [
    'LeftCommand',
    'LeftControl',
    'RightControl',
    'LeftOption',
    'RightOption',
    'Shift+Command',
    'Shift+Control',
    'Shift+Option'
  ]

  if (unsafeShortcuts.includes(shortcut)) {
    showNotification('Toolify', 'Single modifier keys are not supported. Using Command+Space.')
    shortcut = 'Command+Space'
  }

  // Register via Electron globalShortcut, fall back to Command+Space on failure
  try {
    const success = globalShortcut.register(shortcut, onToggle)

    if (!success) {
      showNotification('Toolify Error', 'Failed to register shortcut. Using Command+Space.')
      globalShortcut.register('Command+Space', onToggle)
      currentRecordingShortcut = 'Command+Space'
    } else {
      currentRecordingShortcut = shortcut
    }
  } catch (error) {
    console.error('Failed to register shortcut:', error)
    showNotification('Toolify Error', 'Invalid shortcut. Using Command+Space.')
    globalShortcut.register('Command+Space', onToggle)
    currentRecordingShortcut = 'Command+Space'
  }

  logger.log('Registered shortcut:', currentRecordingShortcut)
  return currentRecordingShortcut
}

/**
 * Unregister all global shortcuts and stop keyboard hook.
 */
export function unregisterAll(): void {
  stopKeyboardHook()
  globalShortcut.unregisterAll()
  currentRecordingShortcut = null
}
