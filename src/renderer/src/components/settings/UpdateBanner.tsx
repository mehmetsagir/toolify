import React from 'react'
import {
  Sparkles,
  Zap,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface UpdateBannerProps {
  updateAvailable: boolean
  updateDownloaded: boolean
  latestVersion: string | null
  downloading: boolean
  updateDownloadProgress: number
  checkingForUpdates: boolean
  updateError: string | null
  appVersion: string
  onCheckForUpdates: () => void
  onDownloadUpdate: () => void
  onQuitAndInstall: () => void
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  updateAvailable,
  updateDownloaded,
  latestVersion,
  downloading,
  updateDownloadProgress,
  checkingForUpdates,
  updateError,
  appVersion,
  onCheckForUpdates,
  onDownloadUpdate,
  onQuitAndInstall
}) => {
  // Update Downloaded - ready to install
  if (updateDownloaded) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
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
              className="w-full mt-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Quit and Install</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Update Available - download it
  if (updateAvailable) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
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
              A new version of Toolify is available. Download and install to get the latest features
              and improvements.
            </p>
            {downloading ? (
              <div className="space-y-2 mt-2">
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
            ) : (
              <button
                onClick={onDownloadUpdate}
                className="w-full mt-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={14} />
                <span>Download Update</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (updateError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/20 text-red-400 flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-red-400 font-medium text-sm">Update Check Failed</h3>
            <p className="text-red-300/80 text-xs leading-relaxed">{updateError}</p>
            <button
              onClick={onCheckForUpdates}
              className="w-full mt-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default state - check for updates / up to date
  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 text-zinc-400 flex-shrink-0">
            {checkingForUpdates ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
          </div>
          <div>
            <h3 className="text-zinc-300 font-medium text-sm">
              {checkingForUpdates ? 'Checking for updates...' : "You're up to date"}
            </h3>
            <p className="text-zinc-500 text-xs mt-0.5">Toolify v{appVersion}</p>
          </div>
        </div>
        {!checkingForUpdates && (
          <button
            onClick={onCheckForUpdates}
            className="bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Check</span>
          </button>
        )}
      </div>
    </div>
  )
}
