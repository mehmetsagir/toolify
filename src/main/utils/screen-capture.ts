import { desktopCapturer, screen } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { DisplayProjection } from './display'

export interface ScreenCaptureOptions {
  quality: 'low' | 'medium' | 'high' | 'ultra'
  format: 'png' | 'jpeg'
  fps?: number
  audio?: boolean
}

export interface CaptureResult {
  success: boolean
  dataUrl?: string
  filePath?: string
  error?: string
}

export interface StreamWindow {
  id: string
  sourceDisplayId: number
  targetDisplayId: number
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isMaximized: boolean
}

export const captureScreen = async (
  displayId: number,
  options: ScreenCaptureOptions = { quality: 'high', format: 'png' }
): Promise<CaptureResult> => {
  try {
    const qualitySettings = {
      low: { width: 640, height: 480 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 },
      ultra: { width: 2560, height: 1440 }
    }

    const { width, height } = qualitySettings[options.quality]

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    })

    const targetSource = sources.find(source => {
      const sourceDisplayId = source.display_id || source.id
      return sourceDisplayId === displayId.toString()
    })

    if (!targetSource) {
      return {
        success: false,
        error: `Display ${displayId} not found`
      }
    }

    const dataUrl = targetSource.thumbnail.toDataURL()

    if (options.fps && options.fps > 0) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `capture-${timestamp}.${options.format}`
      const filePath = join(require('os').tmpdir(), filename)

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      writeFileSync(filePath, buffer)

      return {
        success: true,
        dataUrl,
        filePath
      }
    }

    return {
      success: true,
      dataUrl
    }

  } catch (error) {
    console.error('Screen capture error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export const createStreamWindow = async (
  sourceDisplayId: number,
  targetDisplayId: number
): Promise<StreamWindow | null> => {
  try {
    const sourceDisplay = screen.getAllDisplays().find(display =>
      display.id === sourceDisplayId
    )

    if (!sourceDisplay) {
      throw new Error(`Source display ${sourceDisplayId} not found`)
    }

    const targetDisplay = screen.getAllDisplays().find(display =>
      display.id === targetDisplayId
    )

    if (!targetDisplay) {
      throw new Error(`Target display ${targetDisplayId} not found`)
    }

    const streamBounds = {
      x: targetDisplay.workArea.x,
      y: targetDisplay.workArea.y,
      width: Math.min(sourceDisplay.workArea.width, targetDisplay.workArea.width),
      height: Math.min(sourceDisplay.workArea.height, targetDisplay.workArea.height)
    }

    const streamWindow: StreamWindow = {
      id: `stream-${Date.now()}`,
      sourceDisplayId,
      targetDisplayId,
      bounds: streamBounds,
      isMaximized: true
    }

    return streamWindow

  } catch (error) {
    console.error('Stream window creation error:', error)
    return null
  }
}

export const startLiveProjection = async (
  sourceDisplayId: number,
  _targetDisplayId: number,
  _quality: ScreenCaptureOptions['quality'] = 'high',
  _fps: number = 30
): Promise<{ success: boolean, streamId?: string, error?: string }> => {
  try {
    const hasPermission = await checkScreenCapturePermission()
    if (!hasPermission) {
      return {
        success: false,
        error: 'Ekran yakalama izni gerekli. Lütfen System Settings > Privacy > Screen Capture bölümünden izin verin.'
      }
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    })

    const source = sources.find(s => s.display_id === sourceDisplayId.toString())
    if (!source) {
      return {
        success: false,
        error: `Source display ${sourceDisplayId} not found`
      }
    }

    const streamId = `stream-${Date.now()}`

    return {
      success: true,
      streamId
    }

  } catch (error) {
    console.error('Live projection start error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start projection'
    }
  }
}

export const checkScreenCapturePermission = async (): Promise<boolean> => {
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    try {
      const { stdout } = await execAsync(
        'tccutil get ScreenCapture com.toolify.app'
      )
      return stdout.includes('Yes') || stdout.includes('Allowed')
    } catch {
      return false
    }

  } catch (error) {
    console.warn('Permission check failed:', error)
    return false
  }
}

export const requestScreenCapturePermission = async (): Promise<boolean> => {
  try {
    const { shell } = require('electron')

    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
    )

    return new Promise((resolve) => {
      const checkPermission = async () => {
        const hasPermission = await checkScreenCapturePermission()
        if (hasPermission) {
          resolve(true)
        } else {
          setTimeout(checkPermission, 2000)
        }
      }
      setTimeout(checkPermission, 1000)
    })

  } catch (error) {
    console.error('Permission dialog error:', error)
    return false
  }
}

export const getActiveStreams = (): DisplayProjection[] => {
  return []
}

export const optimizeCaptureForDisplay = (
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): { width: number; height: number; scale: number } => {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight

  let width, height, scale

  if (sourceRatio > targetRatio) {
    width = targetWidth
    height = Math.round(targetWidth / sourceRatio)
    scale = width / sourceWidth
  } else {
    height = targetHeight
    width = Math.round(height * sourceRatio)
    scale = height / sourceHeight
  }

  return { width, height, scale }
}

export const getOptimalSettings = (
  sourceResolution: { width: number; height: number },
  targetResolution: { width: number; height: number },
  maxFPS?: number
): { quality: ScreenCaptureOptions['quality']; fps: number; bitrate: number } => {
  const sourcePixels = sourceResolution.width * sourceResolution.height
  const targetPixels = targetResolution.width * targetResolution.height

  let quality: ScreenCaptureOptions['quality']
  let fps = 30

  if (sourcePixels >= 3840 * 2160) {
    quality = targetPixels >= 2560 * 1440 ? 'medium' : 'high'
    fps = maxFPS ? Math.min(maxFPS, 30) : 24
  } else if (sourcePixels >= 2560 * 1440) {
    quality = targetPixels >= 1920 * 1080 ? 'high' : 'ultra'
    fps = maxFPS ? Math.min(maxFPS, 60) : 30
  } else {
    quality = 'ultra'
    fps = maxFPS ? Math.min(maxFPS, 60) : 60
  }

  let bitrate: number
  if (quality === 'ultra') {
    bitrate = 8000000
  } else if (quality === 'high') {
    bitrate = 5000000
  } else if (quality === 'medium') {
    bitrate = 3000000
  } else {
    bitrate = 1500000
  }

  return { quality, fps, bitrate }
}