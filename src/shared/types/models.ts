import type { LocalModelType } from './settings'

export type { LocalModelType }

export interface LocalModelInfo {
  type: LocalModelType
  displayName: string
  expectedSizeMB: number
  exists: boolean
  path: string
  fileSizeMB?: number
  updatedAt?: number
}
