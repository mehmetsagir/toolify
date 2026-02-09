import { spawn, ChildProcess } from 'child_process'
import { createInterface } from 'readline'
import { getAppleSttPath, getLocaleForLanguage } from './apple-stt'
import { logger } from './utils/logger'

let streamProcess: ChildProcess | null = null
let lastFinalText = ''
let streamAccumulated = ''
let currentSegmentText = ''
let currentSegmentMaxLen = 0

export function startAppleSttStream(
  options: { language?: string },
  onPartial: (text: string, isFinal: boolean) => void
): ChildProcess | null {
  const executablePath = getAppleSttPath()
  const locale = getLocaleForLanguage(options.language)

  const args = ['--stream']
  if (locale) {
    args.push('--language', locale)
  }

  logger.log('Starting Apple STT stream:', executablePath, args.join(' '))

  lastFinalText = ''
  streamAccumulated = ''
  currentSegmentText = ''
  currentSegmentMaxLen = 0

  const child = spawn(executablePath, args, {
    stdio: ['pipe', 'pipe', 'pipe']
  })

  streamProcess = child

  const rl = createInterface({ input: child.stdout! })

  rl.on('line', (line) => {
    try {
      const data = JSON.parse(line)
      if (typeof data.partial !== 'string') return

      const partial: string = data.partial
      const isFinal: boolean = !!data.isFinal
      const segmentEnd: boolean = !!data.segmentEnd

      logger.log(
        `[STT] partial="${partial.slice(0, 60)}" segEnd=${segmentEnd} isFinal=${isFinal} accumulated="${streamAccumulated.slice(0, 40)}" curSeg="${currentSegmentText.slice(0, 40)}" maxLen=${currentSegmentMaxLen}`
      )

      if (segmentEnd) {
        // Explicit segment end from Swift — commit this segment
        commitSegment(partial || currentSegmentText)
        onPartial(buildDisplay(), isFinal)
        return
      }

      // Reset detection: if the new partial is much shorter than the current
      // segment's peak, the recognizer started a new task (text reset).
      // Commit the old segment text automatically.
      // Use 0.8 threshold — within a single task, text only grows (or changes
      // slightly due to corrections). A significant drop means a new task.
      if (
        currentSegmentMaxLen > 3 &&
        partial.length > 0 &&
        partial.length < currentSegmentMaxLen * 0.8
      ) {
        logger.log(
          `[STT] Reset detected: new len=${partial.length} vs max=${currentSegmentMaxLen}. Committing segment.`
        )
        commitSegment(currentSegmentText)
      }

      // Update current segment tracking
      currentSegmentText = partial
      currentSegmentMaxLen = Math.max(currentSegmentMaxLen, partial.length)

      const display = buildDisplay()
      if (display) {
        lastFinalText = display
        onPartial(display, isFinal)
      }
    } catch {
      // Non-JSON line, ignore
    }
  })

  child.stderr?.on('data', (data) => {
    const msg = data.toString().trim()
    logger.log('Apple STT stream stderr:', msg)
    // When Swift logs a task error, the recognition task ended.
    // Commit current segment text so it's preserved when the new task starts.
    if (msg.includes('Stream task error:') && currentSegmentText) {
      logger.log('[STT] Task error detected via stderr — committing segment')
      commitSegment(currentSegmentText)
    }
  })

  child.on('error', (err) => {
    logger.log('Apple STT stream process error:', err.message)
    streamProcess = null
  })

  child.on('exit', (code) => {
    logger.log('Apple STT stream process exited with code:', code)
    streamProcess = null
  })

  return child
}

function commitSegment(text: string): void {
  if (text) {
    streamAccumulated = streamAccumulated ? streamAccumulated + ' ' + text : text
  }
  currentSegmentText = ''
  currentSegmentMaxLen = 0
  lastFinalText = streamAccumulated
  logger.log(`[STT] Committed segment. Accumulated: "${streamAccumulated.slice(0, 80)}"`)
}

function buildDisplay(): string {
  if (currentSegmentText) {
    return streamAccumulated ? streamAccumulated + ' ' + currentSegmentText : currentSegmentText
  }
  return streamAccumulated
}

export function stopAppleSttStream(): Promise<void> {
  return new Promise((resolve) => {
    if (!streamProcess || streamProcess.killed) {
      streamProcess = null
      resolve()
      return
    }

    const child = streamProcess

    const timeout = setTimeout(() => {
      if (child && !child.killed) {
        child.kill('SIGTERM')
      }
      streamProcess = null
      resolve()
    }, 5000)

    child.on('exit', () => {
      clearTimeout(timeout)
      streamProcess = null
      resolve()
    })

    // Send newline to stdin as stop signal
    try {
      child.stdin?.write('\n')
      child.stdin?.end()
    } catch {
      // Process may have already exited
      clearTimeout(timeout)
      streamProcess = null
      resolve()
    }
  })
}

export function killAppleSttStream(): void {
  if (streamProcess && !streamProcess.killed) {
    streamProcess.kill('SIGKILL')
  }
  streamProcess = null
  lastFinalText = ''
  streamAccumulated = ''
  currentSegmentText = ''
  currentSegmentMaxLen = 0
}

export function getStreamResult(): string {
  return lastFinalText
}
