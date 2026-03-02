import { useState, useEffect, useCallback } from 'react'
import type { UpdateInfo, UpdateDownloadProgress } from '../../../shared/types'

export type UpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'up-to-date'

export function useUpdate(): {
  state: UpdateState
  version: string | null
  progress: number
  error: string | null
  check: () => void
  download: () => void
  install: () => void
} {
  const [state, setState] = useState<UpdateState>('idle')
  const [version, setVersion] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Hydrate from persisted update status on mount
    window.api.getUpdateStatus().then((status) => {
      if (status.updateDownloaded) {
        setState('downloaded')
        setVersion(status.latestVersion)
      } else if (status.updateAvailable) {
        setState('available')
        setVersion(status.latestVersion)
      }
    })

    const unsub1 = window.api.onUpdateAvailable((info: UpdateInfo) => {
      setState('available')
      setVersion(info.version)
      setError(null)
    })

    const unsub2 = window.api.onUpdateDownloaded((info: Pick<UpdateInfo, 'version'>) => {
      setState('downloaded')
      setVersion(info.version)
      setProgress(100)
    })

    const unsub3 = window.api.onUpdateDownloadProgress((p: UpdateDownloadProgress) => {
      setState('downloading')
      setProgress(p.percent)
    })

    const unsub4 = window.api.onUpdateNotAvailable(() => {
      setState('up-to-date')
    })

    const unsub5 = window.api.onUpdateError((msg: string) => {
      setState('error')
      setError(msg)
    })

    return () => {
      unsub1()
      unsub2()
      unsub3()
      unsub4()
      unsub5()
    }
  }, [])

  const check = useCallback(() => {
    setState('checking')
    setError(null)
    window.api.checkForUpdates()
  }, [])

  const download = useCallback(() => {
    setState('downloading')
    setProgress(0)
    setError(null)
    window.api.downloadUpdate()
  }, [])

  const install = useCallback(() => {
    window.api.quitAndInstall()
  }, [])

  return { state, version, progress, error, check, download, install }
}
