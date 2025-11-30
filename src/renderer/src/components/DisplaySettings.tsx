import { useState, useEffect } from 'react'
import { Monitor, Plus, Trash2, Play, Square, Check, AlertCircle } from 'lucide-react'

interface DisplayInfo {
  id: number
  name: string
  width: number
  height: number
  isPrimary: boolean
  isVirtual: boolean
}

interface VirtualDisplayConfig {
  resolution: '1080p' | '2K' | '4K'
  refreshRate: number
  isCreating: boolean
}

interface ProjectionConfig {
  sourceDisplayId: number
  targetDisplayId: number
  quality: 'low' | 'medium' | 'high' | 'ultra'
  fps: number
  isActive: boolean
}

interface StreamInfo {
  id: string
  sourceDisplayId: number
  targetDisplayId: number
  quality: string
  fps: number
  startTime: Date
  status: 'active' | 'paused' | 'error'
}

const DisplaySettings = () => {
  // Display state
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [virtualDisplayConfig, setVirtualDisplayConfig] = useState<VirtualDisplayConfig>({
    resolution: '1080p',
    refreshRate: 60,
    isCreating: false
  })

  // Projection state
  const [projectionConfig, setProjectionConfig] = useState<ProjectionConfig>({
    sourceDisplayId: 0,
    targetDisplayId: 0,
    quality: 'high',
    fps: 30,
    isActive: false
  })

  // Streams state
  const [activeStreams, setActiveStreams] = useState<StreamInfo[]>([])
  const [permissionStatus, setPermissionStatus] = useState<{
    screenCapture: boolean
    displayControl: boolean
    accessibility: boolean
  }>({
    screenCapture: false,
    displayControl: false,
    accessibility: false
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const loadSettings = async () => {
    try {
      const settings = await window.api.getSettings?.()
      if (settings) {
        setVirtualDisplayConfig(prev => ({
          ...prev,
          refreshRate: 60
        }))
      }
    } catch (error) {
      console.error('Settings load error:', error)
    }
  }

  useEffect(() => {
    loadDisplays()
    loadSettings()
    checkPermissions()

    const permissionCheckInterval = setInterval(checkPermissions, 5000)
    return () => clearInterval(permissionCheckInterval)
  }, [])

  // Load available displays
  const loadDisplays = async () => {
    try {
      setLoading(true)
      const displaysData = (window.api && 'getAvailableDisplays' in window.api) 
        ? await (window.api as { getAvailableDisplays: () => Promise<DisplayInfo[]> }).getAvailableDisplays() 
        : []
      setDisplays(displaysData)
    } catch (error) {
      showMessage('error', 'Failed to load display list')
      console.error('Display load error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Check permissions
  const checkPermissions = async () => {
    try {
      const permissions = (window.api && 'checkDisplayPermissions' in window.api)
        ? await (window.api as { checkDisplayPermissions: () => Promise<{ screenCapture: boolean; displayControl: boolean; accessibility: boolean }> }).checkDisplayPermissions()
        : {
        screenCapture: false,
        displayControl: false,
        accessibility: false
      }
      setPermissionStatus(permissions)
    } catch (error) {
      console.warn('Permission check failed:', error)
    }
  }

  // Show message
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // Request screen capture permission
  const requestScreenCapturePermission = async () => {
    try {
      const granted = (window.api && 'requestScreenCapturePermission' in window.api)
        ? await (window.api as { requestScreenCapturePermission: () => Promise<boolean> }).requestScreenCapturePermission()
        : false
      if (granted) {
        showMessage('success', 'Screen capture permission granted')
        await checkPermissions()
      } else {
        showMessage('error', 'Permission denied. Please grant permission in System Settings.')
      }
    } catch (error) {
      showMessage('error', 'Permission request failed')
      console.error('Permission request error:', error)
    }
  }

  // Create virtual display
  const createVirtualDisplay = async () => {
    try {
      setVirtualDisplayConfig(prev => ({ ...prev, isCreating: true }))
      setLoading(true)

      const success = (window.api && 'createVirtualDisplay' in window.api)
        ? await (window.api as { createVirtualDisplay: (config: { width: number; height: number; refreshRate: number }) => Promise<boolean> }).createVirtualDisplay({
            width: virtualDisplayConfig.resolution === '1080p' ? 1920 :
                   virtualDisplayConfig.resolution === '2K' ? 2560 : 3840,
            height: virtualDisplayConfig.resolution === '1080p' ? 1080 :
                   virtualDisplayConfig.resolution === '2K' ? 1440 : 2160,
            refreshRate: virtualDisplayConfig.refreshRate
          })
        : false

      if (success) {
        showMessage('success', 'Virtual display created')
        await loadDisplays()
      } else {
        showMessage('error', 'Failed to create virtual display')
      }
    } catch (error) {
      showMessage('error', 'Virtual display creation error')
      console.error('Virtual display creation error:', error)
    } finally {
      setVirtualDisplayConfig(prev => ({ ...prev, isCreating: false }))
      setLoading(false)
    }
  }

  // Remove virtual display
  const removeVirtualDisplay = async (displayId: number) => {
    try {
      setLoading(true)
      const success = (window.api && 'removeVirtualDisplay' in window.api)
        ? await (window.api as { removeVirtualDisplay: (id: number) => Promise<boolean> }).removeVirtualDisplay(displayId)
        : false

      if (success) {
        showMessage('success', 'Virtual display removed')
        await loadDisplays()
      } else {
        showMessage('error', 'Failed to remove virtual display')
      }
    } catch (error) {
      showMessage('error', 'Virtual display removal error')
      console.error('Virtual display removal error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Start projection
  const startProjection = async () => {
    try {
      setLoading(true)

      const streamId = (window.api && 'startScreenProjection' in window.api)
        ? await (window.api as { startScreenProjection: (config: { sourceDisplayId: number; targetDisplayId: number; quality: string; fps: number }) => Promise<string | null> }).startScreenProjection({
            sourceDisplayId: projectionConfig.sourceDisplayId,
            targetDisplayId: projectionConfig.targetDisplayId,
            quality: projectionConfig.quality,
            fps: projectionConfig.fps
          })
        : null

      if (streamId) {
        const newStream: StreamInfo = {
          id: streamId,
          sourceDisplayId: projectionConfig.sourceDisplayId,
          targetDisplayId: projectionConfig.targetDisplayId,
          quality: projectionConfig.quality,
          fps: projectionConfig.fps,
          startTime: new Date(),
          status: 'active'
        }

        setActiveStreams(prev => [...prev, newStream])
        setProjectionConfig(prev => ({ ...prev, isActive: true }))
        showMessage('success', 'Screen projection started')
      } else {
        showMessage('error', 'Failed to start screen projection')
      }
    } catch (error) {
      showMessage('error', 'Screen projection start error')
      console.error('Projection start error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Stop projection
  const stopProjection = async (streamId: string) => {
    try {
      setLoading(true)
      const success = (window.api && 'stopScreenProjection' in window.api)
        ? await (window.api as { stopScreenProjection: (id: string) => Promise<boolean> }).stopScreenProjection(streamId)
        : false

      if (success) {
        setActiveStreams(prev => prev.filter(stream => stream.id !== streamId))
        setProjectionConfig(prev => ({ ...prev, isActive: false }))
        showMessage('success', 'Screen projection stopped')
      } else {
        showMessage('error', 'Failed to stop screen projection')
      }
    } catch (error) {
      showMessage('error', 'Screen projection stop error')
      console.error('Projection stop error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Format duration
  const formatDuration = (startTime: Date): string => {
    const now = new Date()
    const diff = now.getTime() - startTime.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Get display name
  const getDisplayName = (display: DisplayInfo): string => {
    if (display.isVirtual) return `${display.name} (Virtual)`
    if (display.isPrimary) return `${display.name} (Primary)`
    return display.name
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-zinc-100">Display Settings</h2>
      </div>

      {/* Permission Status */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Permission Status</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            {permissionStatus.screenCapture ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-zinc-300">Screen Capture</span>
          </div>

          <div className="flex items-center gap-2">
            {permissionStatus.displayControl ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-zinc-300">Display Control</span>
          </div>

          <div className="flex items-center gap-2">
            {permissionStatus.accessibility ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-zinc-300">Accessibility</span>
          </div>
        </div>

        {!permissionStatus.screenCapture && (
          <button
            onClick={requestScreenCapturePermission}
            className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Request Screen Capture Permission
          </button>
        )}
      </div>

      {/* Virtual Display Creation */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium text-zinc-200">Create Virtual Display</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Resolution
            </label>
            <select
              value={virtualDisplayConfig.resolution}
              onChange={(e) => setVirtualDisplayConfig(prev => ({
                ...prev,
                resolution: e.target.value as '1080p' | '2K' | '4K'
              }))}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md border border-zinc-600 focus:border-blue-500 focus:outline-none"
              disabled={virtualDisplayConfig.isCreating}
            >
              <option value="1080p">Full HD (1920x1080)</option>
              <option value="2K">2K (2560x1440)</option>
              <option value="4K">4K (3840x2160)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Refresh Rate
            </label>
            <select
              value={virtualDisplayConfig.refreshRate}
              onChange={(e) => setVirtualDisplayConfig(prev => ({
                ...prev,
                refreshRate: parseInt(e.target.value)
              }))}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md border border-zinc-600 focus:border-blue-500 focus:outline-none"
              disabled={virtualDisplayConfig.isCreating}
            >
              <option value={30}>30 Hz</option>
              <option value={60}>60 Hz</option>
              <option value={120}>120 Hz</option>
            </select>
          </div>
        </div>

        <button
          onClick={createVirtualDisplay}
          disabled={virtualDisplayConfig.isCreating || !permissionStatus.displayControl}
          className="bg-green-500 hover:bg-green-600 disabled:bg-zinc-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {virtualDisplayConfig.isCreating ? 'Creating...' : 'Create Virtual Display'}
        </button>
      </div>

      {/* Available Displays */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-zinc-200 mb-3">Available Displays</h3>

        <div className="space-y-2">
          {displays.map(display => (
            <div
              key={display.id}
              className="flex items-center justify-between bg-zinc-700 p-3 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-sm font-medium text-zinc-100">
                    {getDisplayName(display)}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {display.width}x{display.height}
                  </div>
                </div>
              </div>

              {display.isVirtual && (
                <button
                  onClick={() => removeVirtualDisplay(display.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Remove virtual display"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Screen Projection */}
      <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium text-zinc-200">Screen Projection</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Source Display
            </label>
            <select
              value={projectionConfig.sourceDisplayId}
              onChange={(e) => setProjectionConfig(prev => ({
                ...prev,
                sourceDisplayId: parseInt(e.target.value)
              }))}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md border border-zinc-600 focus:border-blue-500 focus:outline-none"
              disabled={projectionConfig.isActive}
            >
              {displays.map(display => (
                <option key={display.id} value={display.id}>
                  {getDisplayName(display)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Target Display
            </label>
            <select
              value={projectionConfig.targetDisplayId}
              onChange={(e) => setProjectionConfig(prev => ({
                ...prev,
                targetDisplayId: parseInt(e.target.value)
              }))}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md border border-zinc-600 focus:border-blue-500 focus:outline-none"
              disabled={projectionConfig.isActive}
            >
              {displays.map(display => (
                <option key={display.id} value={display.id}>
                  {getDisplayName(display)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Quality
            </label>
            <select
              value={projectionConfig.quality}
              onChange={(e) => setProjectionConfig(prev => ({
                ...prev,
                quality: e.target.value as 'low' | 'medium' | 'high' | 'ultra'
              }))}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md border border-zinc-600 focus:border-blue-500 focus:outline-none"
              disabled={projectionConfig.isActive}
            >
              <option value="low">Low (640x480)</option>
              <option value="medium">Medium (1280x720)</option>
              <option value="high">High (1920x1080)</option>
              <option value="ultra">Ultra (2560x1440)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              FPS
            </label>
            <select
              value={projectionConfig.fps}
              onChange={(e) => setProjectionConfig(prev => ({
                ...prev,
                fps: parseInt(e.target.value)
              }))}
              className="w-full bg-zinc-700 text-zinc-100 px-3 py-2 rounded-md border border-zinc-600 focus:border-blue-500 focus:outline-none"
              disabled={projectionConfig.isActive}
            >
              <option value={15}>15 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>
        </div>

        <button
          onClick={projectionConfig.isActive ?
            () => stopProjection(activeStreams[0]?.id || '') :
            startProjection
          }
          disabled={loading || !permissionStatus.screenCapture || !permissionStatus.displayControl}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        >
          {projectionConfig.isActive ? (
            <>
              <Square className="w-4 h-4" />
              Stop Projection
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Projection
            </>
          )}
        </button>
      </div>

      {/* Active Streams */}
      {activeStreams.length > 0 && (
        <div className="bg-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-200 mb-3">Active Streams</h3>

          <div className="space-y-2">
            {activeStreams.map(stream => (
              <div
                key={stream.id}
                className="flex items-center justify-between bg-zinc-700 p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    stream.status === 'active' ? 'bg-green-400' :
                    stream.status === 'paused' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />

                  <div>
                    <div className="text-sm font-medium text-zinc-100">
                      Ekran {stream.sourceDisplayId} → Ekran {stream.targetDisplayId}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {stream.quality} • {stream.fps} FPS • {formatDuration(stream.startTime)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {stream.status === 'active' && (
                    <button
                      onClick={() => {/* Pause functionality */}}
                      className="text-yellow-400 hover:text-yellow-300 p-1"
                      title="Pause"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => stopProjection(stream.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                      title="Stop"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-green-500 text-white' :
          message.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  )
}

export default DisplaySettings