import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { Download, Trash2, FolderOpen, RefreshCw } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Badge } from '@renderer/components/ui/badge'
import type { LocalModelInfo, LocalModelType } from '../../../../shared/types'

function formatMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${mb} MB`
}

interface DownloadProgress {
  modelType: LocalModelType
  percent: number
  downloaded: number
  total: number
}

interface ModelCardProps {
  model: LocalModelInfo
  downloading: DownloadProgress | null
  onDownload: () => void
  onDelete: () => void
}

function ModelCard({ model, downloading, onDownload, onDelete }: ModelCardProps): ReactElement {
  const isDownloading = downloading !== null
  const percent = downloading?.percent ?? 0

  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{model.displayName}</span>
            {model.exists && (
              <Badge variant="success" className="text-xs">
                Downloaded
              </Badge>
            )}
          </div>
          <span className="text-xs text-zinc-500">
            {model.exists && model.fileSizeMB
              ? `${formatMB(model.fileSizeMB)} on disk`
              : `~${formatMB(model.expectedSizeMB)} expected`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {model.exists ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-red-400 border-red-900 hover:bg-red-950 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onDownload} disabled={isDownloading}>
              {isDownloading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          )}
        </div>
      </div>

      {isDownloading && downloading && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {formatMB(downloading.downloaded / (1024 * 1024))} /{' '}
              {formatMB(downloading.total / (1024 * 1024))}
            </span>
            <span>{Math.round(percent)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-zinc-300 transition-all duration-300"
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ModelsSettings(): ReactElement {
  const [models, setModels] = useState<LocalModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({})

  const loadModels = async (): Promise<void> => {
    setLoading(true)
    try {
      const info = await window.api.getLocalModelsInfo()
      setModels(info)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()

    const cleanup = window.api.onModelDownloadProgress((progress) => {
      setDownloadProgress((prev) => ({
        ...prev,
        [progress.modelType]: progress
      }))

      if (progress.percent >= 100) {
        setTimeout(() => {
          setDownloadProgress((prev) => {
            const next = { ...prev }
            delete next[progress.modelType]
            return next
          })
          loadModels()
        }, 800)
      }
    })

    return cleanup
  }, [])

  const handleDownload = async (modelType: LocalModelType): Promise<void> => {
    await window.api.downloadLocalModel(modelType)
  }

  const handleDelete = async (modelType: LocalModelType): Promise<void> => {
    await window.api.deleteLocalModel(modelType)
    await loadModels()
  }

  const handleOpenFolder = async (): Promise<void> => {
    await window.api.openModelsFolder()
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-200">Local Models</span>
          <span className="text-xs text-zinc-500">
            Downloaded models run fully offline on your device
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenFolder}>
          <FolderOpen className="h-4 w-4 mr-1.5" />
          Open Folder
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {models.map((model) => (
            <ModelCard
              key={model.type}
              model={model}
              downloading={downloadProgress[model.type] ?? null}
              onDownload={() => handleDownload(model.type)}
              onDelete={() => handleDelete(model.type)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
