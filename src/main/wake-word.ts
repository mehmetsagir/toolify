import { spawn, ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import { getAppleSttPath, getLocaleForLanguage } from './apple-stt'

let wakeWordProcess: ChildProcess | null = null
let isListening = false
let currentWakeWord = ''
let restartTimeout: NodeJS.Timeout | null = null
let onDetectedCallback: (() => void) | null = null
let currentOptions: { wakeWord: string; language?: string } | null = null

// Debounce to prevent multiple rapid detections
let lastDetectionTime = 0
const DETECTION_COOLDOWN_MS = 3000

export function startWakeWordListener(
  options: { wakeWord: string; language?: string },
  onDetected: () => void
): void {
  // Stop any existing listener first
  stopWakeWordListener()

  currentWakeWord = options.wakeWord.toLowerCase()
  onDetectedCallback = onDetected
  currentOptions = options
  isListening = true

  spawnListener(options.language)
}

function killProcess(proc: ChildProcess | null): void {
  if (!proc || proc.killed) return
  try {
    proc.kill('SIGKILL')
  } catch {
    // Already dead
  }
}

function spawnListener(language?: string): void {
  if (!isListening) return

  const executablePath = getAppleSttPath()
  const locale = getLocaleForLanguage(language)

  const args = ['--stream']
  if (locale) {
    args.push('--language', locale)
  }

  console.log('Starting wake word listener:', executablePath, args.join(' '))

  let child: ChildProcess
  try {
    child = spawn(executablePath, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } catch (error) {
    console.error('Failed to spawn wake word listener:', error)
    return
  }

  wakeWordProcess = child

  const rl = createInterface({ input: child.stdout! })

  rl.on('line', (line) => {
    try {
      const data = JSON.parse(line)
      if (typeof data.partial !== 'string') return

      const partial: string = data.partial.toLowerCase()

      // Check for wake word in recognized text
      if (partial.includes(currentWakeWord)) {
        const now = Date.now()
        if (now - lastDetectionTime > DETECTION_COOLDOWN_MS) {
          lastDetectionTime = now
          console.log('Wake word detected:', currentWakeWord)
          if (onDetectedCallback) {
            onDetectedCallback()
          }
        }
      }
    } catch {
      // Non-JSON line, ignore
    }
  })

  child.stderr?.on('data', (data) => {
    const msg = data.toString().trim()
    if (msg && !msg.includes('Stream task error:')) {
      console.log('Wake word listener stderr:', msg)
    }
  })

  child.on('error', (err) => {
    console.error('Wake word listener process error:', err.message)
    wakeWordProcess = null
    scheduleRestart()
  })

  child.on('exit', (code) => {
    console.log('Wake word listener exited with code:', code)
    // Only clear if this is still the active process
    if (wakeWordProcess === child) {
      wakeWordProcess = null
    }
    scheduleRestart()
  })

  // Apple STT stream has ~60 second timeout — auto-restart before it dies
  // Restart every 55 seconds to stay ahead of the timeout
  scheduleRestart(55000)
}

function scheduleRestart(delay = 2000): void {
  if (restartTimeout) {
    clearTimeout(restartTimeout)
    restartTimeout = null
  }

  if (!isListening) return

  restartTimeout = setTimeout(() => {
    restartTimeout = null
    if (!isListening) return

    // Kill current process immediately
    killProcess(wakeWordProcess)
    wakeWordProcess = null

    // Respawn
    spawnListener(currentOptions?.language)
  }, delay)
}

export function stopWakeWordListener(): void {
  isListening = false
  onDetectedCallback = null
  currentOptions = null

  if (restartTimeout) {
    clearTimeout(restartTimeout)
    restartTimeout = null
  }

  // SIGKILL immediately — no graceful shutdown needed for a listener
  killProcess(wakeWordProcess)
  wakeWordProcess = null
}

export function isWakeWordActive(): boolean {
  return isListening
}

export function pauseWakeWordListener(): void {
  if (!isListening) return

  // Temporarily stop without clearing isListening state
  if (restartTimeout) {
    clearTimeout(restartTimeout)
    restartTimeout = null
  }

  killProcess(wakeWordProcess)
  wakeWordProcess = null
}

export function resumeWakeWordListener(): void {
  if (!isListening || !currentOptions) return

  // Re-spawn the listener
  spawnListener(currentOptions.language)
}
