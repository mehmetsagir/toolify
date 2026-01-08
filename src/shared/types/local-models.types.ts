export type LocalModelType = 'base' | 'small' | 'medium' | 'large-v3'

export interface LocalModelInfo {
  type: LocalModelType
  displayName: string
  expectedSizeMB: number
  exists: boolean
  path: string
  fileSizeMB?: number
  updatedAt?: number
}
