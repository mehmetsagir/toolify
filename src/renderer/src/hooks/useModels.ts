import { useState, useEffect, useCallback } from 'react'
import type { LocalModelInfo, LocalModelType } from '../../../shared/types'

interface DownloadingEntry {
  percent: number
  downloaded: number
  total: number
}

export function useModels(): {
  models: LocalModelInfo[]
  downloading: Record<string, DownloadingEntry>
  loading: boolean
  download: (modelType: LocalModelType) => Promise<void>
  deleteModel: (modelType: LocalModelType) => Promise<void>
  openFolder: () => Promise<string>
  reload: () => Promise<void>
} {
  const [models, setModels] = useState<LocalModelInfo[]>([])
  const [downloading, setDownloading] = useState<Record<string, DownloadingEntry>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const info = await window.api.getLocalModelsInfo()
    setModels(info)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    const unsub = window.api.onModelDownloadProgress((progress) => {
      const { modelType, percent, downloaded, total } = progress

      setDownloading((prev) => ({
        ...prev,
        [modelType]: { percent, downloaded, total }
      }))

      if (percent >= 100) {
        setTimeout(() => {
          setDownloading((prev) => {
            const next = { ...prev }
            delete next[modelType]
            return next
          })
          load()
        }, 500)
      }
    })

    return unsub
  }, [load])

  const download = useCallback(async (modelType: LocalModelType) => {
    setDownloading((prev) => ({
      ...prev,
      [modelType]: { percent: 0, downloaded: 0, total: 0 }
    }))
    await window.api.downloadLocalModel(modelType)
  }, [])

  const deleteModel = useCallback(
    async (modelType: LocalModelType) => {
      await window.api.deleteLocalModel(modelType)
      await load()
    },
    [load]
  )

  const openFolder = useCallback(() => {
    return window.api.openModelsFolder()
  }, [])

  return { models, downloading, loading, download, deleteModel, openFolder, reload: load }
}
