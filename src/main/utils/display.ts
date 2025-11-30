import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface DisplayInfo {
  id: number
  name: string
  width: number
  height: number
  isPrimary: boolean
  isVirtual: boolean
}

export interface VirtualDisplayConfig {
  width: number
  height: number
  resolution: '1080p' | '2K' | '4K'
  refreshRate?: number
}

export interface DisplayProjection {
  sourceDisplayId: number
  targetDisplayId: number
  isActive: boolean
  quality: 'low' | 'medium' | 'high' | 'ultra'
}

export const getAvailableDisplays = async (): Promise<DisplayInfo[]> => {
  try {
    const { stdout } = await execAsync('displayplacer list')
    const displays: DisplayInfo[] = []

    const lines = stdout.split('\n')
    let currentId = 0

    for (const line of lines) {
      if (line.includes('Resolution:')) {
        const resolutionMatch = line.match(/Resolution: (\d+)x(\d+)/)
        if (resolutionMatch) {
          displays.push({
            id: currentId++,
            name: `Display ${currentId}`,
            width: parseInt(resolutionMatch[1]),
            height: parseInt(resolutionMatch[2]),
            isPrimary: line.includes('(main)'),
            isVirtual: line.includes('virtual') || line.includes('dummy')
          })
        }
      }
    }

    return displays.length > 0 ? displays : await getFallbackDisplays()
  } catch (error) {
    console.warn('displayplacer not available, using fallback method:', error)
    return await getFallbackDisplays()
  }
}

const getFallbackDisplays = async (): Promise<DisplayInfo[]> => {
  try {
    const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json')
    const data = JSON.parse(stdout)

    interface SystemProfilerDisplay {
      _name?: string
      spdisplays_ndpi?: number
      spdisplays_vresolution?: number
      spdisplays_main?: string
    }

    return (data.SPDisplaysDataType as SystemProfilerDisplay[]).map((display, index: number) => ({
      id: index,
      name: display._name || `Display ${index + 1}`,
      width: display.spdisplays_ndpi || 1920,
      height: display.spdisplays_vresolution || 1080,
      isPrimary: display.spdisplays_main === 'yes',
      isVirtual: display._name?.toLowerCase().includes('virtual') || false
    }))
  } catch (error) {
    console.error('Failed to get display list:', error)
    return [{
      id: 0,
      name: 'Primary Display',
      width: 1920,
      height: 1080,
      isPrimary: true,
      isVirtual: false
    }]
  }
}

export const createVirtualDisplay = async (config: VirtualDisplayConfig): Promise<boolean> => {
  try {
    const resolutions = {
      '1080p': { width: 1920, height: 1080 },
      '2K': { width: 2560, height: 1440 },
      '4K': { width: 3840, height: 2160 }
    }

    const { width, height } = resolutions[config.resolution]
    const refreshRate = config.refreshRate || 60

    try {
      await execAsync('which displayplacer')
    } catch {
      console.error('displayplacer is not installed. Install with Homebrew: brew install displayplacer')
      return false
    }

    const command = `displayplacer add "${width}x${height}@${refreshRate}Hz" --mirror off`
    const { stdout, stderr } = await execAsync(command)

    if (stderr && !stderr.includes('success')) {
      console.error('Failed to create virtual display:', stderr)
      return false
    }

    console.log('Virtual display created:', stdout)
    return true
  } catch (error) {
    console.error('Virtual display creation error:', error)
    return false
  }
}

export const removeVirtualDisplay = async (displayName: string): Promise<boolean> => {
  try {
    const command = `displayplacer remove "${displayName}"`
    const { stdout, stderr } = await execAsync(command)

    if (stderr && !stderr.includes('success')) {
      console.error('Failed to remove virtual display:', stderr)
      return false
    }

    console.log('Virtual display removed:', stdout)
    return true
  } catch (error) {
    console.error('Virtual display removal error:', error)
    return false
  }
}

export const startScreenProjection = async (
  sourceDisplayId: number,
  targetDisplayId: number,
  quality: DisplayProjection['quality'] = 'high'
): Promise<boolean> => {
  try {
    const qualitySettings = {
      low: '640x480',
      medium: '1280x720',
      high: '1920x1080',
      ultra: '2560x1440'
    }

    const resolution = qualitySettings[quality]

    const command = `displayplacer mirror ${sourceDisplayId}+${targetDisplayId} --resolution ${resolution}`
    const { stdout, stderr } = await execAsync(command)

    if (stderr && !stderr.includes('success')) {
      console.error('Failed to start screen projection:', stderr)
      return false
    }

    console.log('Screen projection started:', stdout)
    return true
  } catch (error) {
    console.error('Screen projection error:', error)
    return false
  }
}

export const stopScreenProjection = async (): Promise<boolean> => {
  try {
    const command = 'displayplacer mirror off'
    const { stdout, stderr } = await execAsync(command)

    if (stderr && !stderr.includes('success')) {
      console.error('Failed to stop screen projection:', stderr)
      return false
    }

    console.log('Screen projection stopped:', stdout)
    return true
  } catch (error) {
    console.error('Screen projection stop error:', error)
    return false
  }
}

export const getActiveProjections = async (): Promise<DisplayProjection[]> => {
  try {
    const { stdout } = await execAsync('displayplacer list')
    const projections: DisplayProjection[] = []

    const lines = stdout.split('\n')
    for (const line of lines) {
      if (line.includes('Mirror:') && !line.includes('off')) {
        const match = line.match(/Mirror: (\d+)\+(\d+)/)
        if (match) {
          projections.push({
            sourceDisplayId: parseInt(match[1]),
            targetDisplayId: parseInt(match[2]),
            isActive: true,
            quality: 'high'
          })
        }
      }
    }

    return projections
  } catch (error) {
    console.error('Failed to get active projections:', error)
    return []
  }
}

export const checkDisplaySetup = async (): Promise<{
  displayplacerAvailable: boolean
  screenCaptureAvailable: boolean
  accessibilityAvailable: boolean
}> => {
  const checks = {
    displayplacerAvailable: false,
    screenCaptureAvailable: false,
    accessibilityAvailable: false
  }

  try {
    await execAsync('which displayplacer')
    checks.displayplacerAvailable = true
  } catch {
    // displayplacer bulunamadı
  }

  try {
    checks.screenCaptureAvailable = true
  } catch {
    // Screen capture permission not available
  }

  try {
    const { stdout } = await execAsync('osascript -e "tell application \\"System Events\\" to get name of first process"')
    checks.accessibilityAvailable = stdout.length > 0
  } catch {
    checks.accessibilityAvailable = false
  }

  return checks
}