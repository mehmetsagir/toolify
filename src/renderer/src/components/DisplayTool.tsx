import React, { useState, useEffect } from 'react'
import { Monitor, Trash2, RefreshCw, AlertCircle, CheckCircle2, X, Copy } from 'lucide-react'

interface DisplayInfo {
  id: string
  name?: string
  bounds: {
    width: number
    height: number
  }
  primary: boolean
  isVirtual: boolean
  scaleFactor: number
}

export const DisplayTool: React.FC = () => {
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sourceDisplay, setSourceDisplay] = useState<string | null>(null)
  const [targetDisplay, setTargetDisplay] = useState<string | null>(null)

  useEffect(() => {
    loadDisplays()
  }, [])

  const loadDisplays = async (): Promise<void> => {
    try {
      if (window.api && 'getAllDisplays' in window.api) {
        const allDisplays = await (
          window.api as { getAllDisplays: () => Promise<DisplayInfo[]> }
        ).getAllDisplays()
        setDisplays(allDisplays)
      }
    } catch (error) {
      console.error('Failed to load displays:', error)
      setError('Failed to load displays')
    }
  }

  const handleMirrorDisplay = async (): Promise<void> => {
    if (!sourceDisplay || !targetDisplay) {
      setError('Please select both source and target displays')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (window.api && 'mirrorDisplay' in window.api) {
        const result = await (
          window.api as {
            mirrorDisplay: (
              source: string,
              target: string
            ) => Promise<{ success: boolean; message: string }>
          }
        ).mirrorDisplay(sourceDisplay, targetDisplay)
        if (result.success) {
          setSuccess(result.message)
          setTimeout(() => {
            setSuccess(null)
          }, 3000)
        } else {
          setError(result.message)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to mirror display: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDisplay = async (displayId: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      if (window.api && 'removeVirtualDisplay' in window.api) {
        const result = await (
          window.api as {
            removeVirtualDisplay: (id: string) => Promise<{ success: boolean; message: string }>
          }
        ).removeVirtualDisplay(displayId)
        if (result.success) {
          setSuccess(result.message)
          setTimeout(() => {
            loadDisplays()
            setSuccess(null)
          }, 2000)
        } else {
          setError(result.message)
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to remove display: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const formatResolution = (display: DisplayInfo): string => {
    return `${display.bounds.width}x${display.bounds.height}`
  }

  const isVirtualDisplay = (display: DisplayInfo): boolean => {
    // Use the isVirtual flag from the backend
    return display.isVirtual === true
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Display Management Tool</h2>
        <p className="text-sm text-zinc-400">
          View and manage available displays. You can mirror displays to each other.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <h3 className="text-blue-400 font-medium text-sm">Display Management</h3>
            <p className="text-blue-300/80 text-xs leading-relaxed">
              This tool helps you view and manage your available displays. You can mirror displays
              to each other and view resolution information.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-2 mt-2">
              <p className="text-blue-400/90 text-[10px] font-medium">Not:</p>
              <p className="text-blue-300/70 text-[10px] leading-relaxed">
                There is no public API for programmatically creating virtual displays on macOS. This
                feature is not available.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={loadDisplays}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 rounded-lg text-sm font-medium transition-all"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Displays List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">Available Displays</h3>
        {displays.length === 0 ? (
          <div className="bg-zinc-900/30 rounded-xl p-8 text-center border border-white/5">
            <Monitor size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No displays found</p>
          </div>
        ) : (
          displays.map((display) => (
            <div key={display.id} className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      display.primary
                        ? 'bg-blue-500/20 text-blue-400'
                        : isVirtualDisplay(display)
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Monitor size={18} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200 text-sm font-medium">
                        {display.name || `Display ${display.id}`}
                      </span>
                      {display.primary && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                      {isVirtualDisplay(display) && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                          Virtual
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-500 text-xs">
                      {formatResolution(display)} • Scale: {display.scaleFactor}x
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isVirtualDisplay(display) && (
                    <button
                      onClick={() => handleRemoveDisplay(display.id)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                      title="Remove virtual display"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mirror Display Section */}
      <div className="space-y-3 pt-4 border-t border-white/5">
        <h3 className="text-sm font-semibold text-zinc-300">Screen Mirroring</h3>
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-medium">Source Display</label>
              <select
                value={sourceDisplay || ''}
                onChange={(e) => setSourceDisplay(e.target.value)}
                className="w-full bg-zinc-900/50 text-white rounded-lg p-2.5 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">Select source display</option>
                {displays
                  .filter((d) => !isVirtualDisplay(d))
                  .map((display) => (
                    <option key={display.id} value={display.id}>
                      {display.name || `Display ${display.id}`} ({formatResolution(display)})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-medium">Target Display</label>
              <select
                value={targetDisplay || ''}
                onChange={(e) => setTargetDisplay(e.target.value)}
                className="w-full bg-zinc-900/50 text-white rounded-lg p-2.5 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
              >
                <option value="">Select target display</option>
                {displays
                  .filter((d) => isVirtualDisplay(d))
                  .map((display) => (
                    <option key={display.id} value={display.id}>
                      {display.name || `Display ${display.id}`} ({formatResolution(display)})
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleMirrorDisplay}
            disabled={loading || !sourceDisplay || !targetDisplay}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium transition-all"
          >
            <Copy size={16} />
            <span>Mirror Display</span>
          </button>
        </div>
      </div>
    </div>
  )
}
