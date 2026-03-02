import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { X, Download, RefreshCw, CheckCircle, AlertCircle, ArrowDownCircle } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import type { UpdateInfo, UpdateDownloadProgress } from '../../../../shared/types'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'available'; info: UpdateInfo }
  | { phase: 'downloading'; progress: UpdateDownloadProgress; info: UpdateInfo }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string }
  | { phase: 'up-to-date' }

export default function UpdateBanner(): ReactElement | null {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    window.api.getUpdateStatus().then((status) => {
      if (status.updateDownloaded && status.latestVersion) {
        setState({ phase: 'downloaded', version: status.latestVersion })
      } else if (status.updateAvailable && status.latestVersion) {
        setState({ phase: 'available', info: { version: status.latestVersion } })
      }
    })

    const cleanups = [
      window.api.onUpdateAvailable((info) => {
        setState({ phase: 'available', info })
        setDismissed(false)
      }),
      window.api.onUpdateDownloadProgress((progress) => {
        setState((prev) => {
          const info: UpdateInfo =
            prev.phase === 'available' || prev.phase === 'downloading'
              ? (prev as { phase: 'available' | 'downloading'; info: UpdateInfo }).info
              : { version: '' }
          return { phase: 'downloading', progress, info }
        })
      }),
      window.api.onUpdateDownloaded((info) => {
        setState({ phase: 'downloaded', version: info.version })
        setDismissed(false)
      }),
      window.api.onUpdateNotAvailable(() => {
        setState({ phase: 'up-to-date' })
      }),
      window.api.onUpdateError((message) => {
        setState({ phase: 'error', message })
      })
    ]

    return () => cleanups.forEach((fn) => fn())
  }, [])

  if (dismissed || state.phase === 'idle' || state.phase === 'up-to-date') {
    return null
  }

  const handleDownload = async (): Promise<void> => {
    if (state.phase !== 'available') return
    const info = state.info
    setState({
      phase: 'downloading',
      progress: { percent: 0, transferred: 0, total: 0 },
      info
    })
    await window.api.downloadUpdate()
  }

  const handleInstall = async (): Promise<void> => {
    await window.api.quitAndInstall()
  }

  const bannerClasses = cn('relative flex items-center justify-between gap-3 px-4 py-2.5 text-sm', {
    'bg-blue-950 border-b border-blue-800 text-blue-100':
      state.phase === 'available' || state.phase === 'downloading',
    'bg-emerald-950 border-b border-emerald-800 text-emerald-100': state.phase === 'downloaded',
    'bg-red-950 border-b border-red-800 text-red-100': state.phase === 'error',
    'bg-zinc-900 border-b border-zinc-800 text-zinc-400': state.phase === 'checking'
  })

  return (
    <div className={bannerClasses}>
      <div className="flex items-center gap-2 min-w-0">
        {state.phase === 'checking' && (
          <>
            <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
            <span>Checking for updates...</span>
          </>
        )}

        {state.phase === 'available' && (
          <>
            <ArrowDownCircle className="h-4 w-4 shrink-0" />
            <span>
              Update <strong>{state.info.version}</strong> is available
            </span>
          </>
        )}

        {state.phase === 'downloading' && (
          <>
            <Download className="h-4 w-4 shrink-0 animate-bounce" />
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <span className="shrink-0">Downloading update...</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-800 min-w-0">
                <div
                  className="h-full rounded-full bg-blue-300 transition-all duration-300"
                  style={{ width: `${Math.min(100, state.progress.percent)}%` }}
                />
              </div>
              <span className="shrink-0 tabular-nums text-xs">
                {Math.round(state.progress.percent)}%
              </span>
            </div>
          </>
        )}

        {state.phase === 'downloaded' && (
          <>
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>
              Update <strong>{state.version}</strong> ready to install
            </span>
          </>
        )}

        {state.phase === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">Update error: {state.message}</span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {state.phase === 'available' && (
          <Button size="sm" onClick={handleDownload} className="h-7 px-3 text-xs">
            Download
          </Button>
        )}
        {state.phase === 'downloaded' && (
          <Button
            size="sm"
            onClick={handleInstall}
            className="h-7 px-3 text-xs bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Install & Restart
          </Button>
        )}
        {state.phase !== 'downloading' && (
          <button
            onClick={() => setDismissed(true)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
