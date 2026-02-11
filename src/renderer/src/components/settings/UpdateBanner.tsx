import React from 'react'
import { Sparkles, Zap, Download, RefreshCw } from 'lucide-react'

interface UpdateBannerProps {
  updateAvailable: boolean
  updateDownloaded: boolean
  latestVersion: string | null
  downloading: boolean
  updateDownloadProgress: number
  onDownloadUpdate: () => void
  onQuitAndInstall: () => void
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  updateAvailable,
  updateDownloaded,
  latestVersion,
  downloading,
  updateDownloadProgress,
  onDownloadUpdate,
  onQuitAndInstall
}) => {
  if (!updateAvailable && !updateDownloaded) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Update Available Banner */}
      {updateAvailable && !updateDownloaded && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-blue-400 font-medium text-sm">New Update Available</h3>
                <span className="text-blue-300 text-xs font-mono">{latestVersion}</span>
              </div>
              <p className="text-blue-300/80 text-xs leading-relaxed">
                A new version of Toolify is available. Download and install to get the latest
                features and improvements.
              </p>
              {downloading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-blue-300">
                    <span>Downloading...</span>
                    <span>{updateDownloadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${updateDownloadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {!downloading && (
                <button
                  onClick={onDownloadUpdate}
                  className="w-full mt-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  <span>Download Update</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Downloaded Banner */}
      {updateDownloaded && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-400 flex-shrink-0">
              <Zap size={18} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-green-400 font-medium text-sm">Update Ready to Install</h3>
                <span className="text-green-300 text-xs font-mono">{latestVersion}</span>
              </div>
              <p className="text-green-300/80 text-xs leading-relaxed">
                The update has been downloaded. Click below to quit and install the new version.
              </p>
              <button
                onClick={onQuitAndInstall}
                className="w-full mt-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Quit and Install</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
