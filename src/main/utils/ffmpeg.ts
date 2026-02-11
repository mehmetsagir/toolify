import { execSync } from 'child_process'

let cachedPath: string | null = null

/**
 * Resolves the full path to the ffmpeg binary.
 * In packaged Electron apps, the PATH doesn't include Homebrew directories,
 * so we check common installation locations.
 */
export function getFfmpegPath(): string {
  if (cachedPath) return cachedPath

  const candidates = [
    'ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg'
  ]

  for (const candidate of candidates) {
    try {
      execSync(`"${candidate}" -version`, { stdio: 'ignore', timeout: 5000 })
      cachedPath = candidate
      return candidate
    } catch {
      // not found, try next
    }
  }

  // Fallback: return 'ffmpeg' and let it fail with a clear error
  cachedPath = 'ffmpeg'
  return 'ffmpeg'
}
