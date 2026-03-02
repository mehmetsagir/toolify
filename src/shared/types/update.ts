export interface UpdateInfo {
  version: string
  releaseNotes?: string
  releaseDate?: string
}

export interface UpdateDownloadProgress {
  percent: number
  transferred: number
  total: number
}

export interface UpdateStatus {
  updateAvailable: boolean
  updateDownloaded: boolean
  latestVersion: string | null
}
