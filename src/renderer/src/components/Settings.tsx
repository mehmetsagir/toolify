import React, { useState, useEffect, useCallback } from 'react'
import { Mic, Settings as SettingsIcon, History as HistoryIcon, Bell } from 'lucide-react'
import { History } from './History'
import { UpdateBanner } from './settings/UpdateBanner'
import { GeneralSettings } from './settings/GeneralSettings'
import { DictationSettings } from './settings/DictationSettings'
import { AudioSettings } from './settings/AudioSettings'
import appIcon from '../assets/app-icon.png'
import type { LocalModelInfo, LocalModelType } from '../../../shared/types'

type ModelDownloadStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'missing'

type ModelDownloadProgress = {
  percent: number
  downloaded: number
  total: number
}

const MODEL_TYPES: LocalModelType[] = ['base', 'small', 'medium', 'large-v3']

const createStatusMap = (): Record<LocalModelType, ModelDownloadStatus> =>
  MODEL_TYPES.reduce(
    (acc, type) => {
      acc[type] = 'idle'
      return acc
    },
    {} as Record<LocalModelType, ModelDownloadStatus>
  )

const createProgressMap = (): Record<LocalModelType, ModelDownloadProgress | null> =>
  MODEL_TYPES.reduce(
    (acc, type) => {
      acc[type] = null
      return acc
    },
    {} as Record<LocalModelType, ModelDownloadProgress | null>
  )

interface SettingsProps {
  apiKey: string
  setApiKey: (key: string) => void
  sourceLanguage: string
  setSourceLanguage: (lang: string) => void
  targetLanguage: string
  setTargetLanguage: (lang: string) => void
  shortcut: string
  setShortcut: (shortcut: string) => void
  translate: boolean
  setTranslate: (val: boolean) => void
  processNotifications: boolean
  setProcessNotifications: (val: boolean) => void
  soundAlert: boolean
  setSoundAlert: (val: boolean) => void
  soundType: string
  setSoundType: (val: string) => void
  autoStart: boolean
  setAutoStart: (val: boolean) => void
  showDockIcon: boolean
  setShowDockIcon: (val: boolean) => void
  showRecordingOverlay: boolean
  setShowRecordingOverlay: (val: boolean) => void
  overlayStyle: 'compact' | 'large'
  setOverlayStyle: (val: 'compact' | 'large') => void
  useLocalModel: boolean
  setUseLocalModel: (val: boolean) => void
  localModelType: LocalModelType
  setLocalModelType: (val: LocalModelType) => void
}

export const Settings: React.FC<SettingsProps> = ({
  apiKey: initialKey,
  setApiKey,
  sourceLanguage: initialSourceLanguage,
  setSourceLanguage,
  targetLanguage: initialTargetLanguage,
  setTargetLanguage,
  shortcut: initialShortcut,
  setShortcut,
  translate: initialTranslate,
  setTranslate,
  processNotifications: initialProcessNotifications,
  setProcessNotifications,
  soundAlert: initialSoundAlert,
  setSoundAlert,
  soundType: initialSoundType,
  setSoundType,
  autoStart: initialAutoStart,
  setAutoStart,
  showDockIcon: initialShowDockIcon,
  setShowDockIcon,
  showRecordingOverlay: initialShowRecordingOverlay,
  setShowRecordingOverlay,
  overlayStyle: initialOverlayStyle,
  setOverlayStyle,
  useLocalModel: initialUseLocalModel,
  setUseLocalModel,
  localModelType: initialLocalModelType,
  setLocalModelType
}) => {
  const [localKey, setLocalKey] = useState(initialKey)
  const [localSourceLanguage, setLocalSourceLanguage] = useState(initialSourceLanguage || 'en')
  const [localTargetLanguage, setLocalTargetLanguage] = useState(initialTargetLanguage || 'tr')
  const [localShortcut, setLocalShortcut] = useState(initialShortcut || 'Command+Space')
  const [localTranslate, setLocalTranslate] = useState(initialTranslate)
  const [localProcessNotifications, setLocalProcessNotifications] = useState(
    initialProcessNotifications
  )
  const [localAutoStart, setLocalAutoStart] = useState(initialAutoStart !== false)
  const [localShowDockIcon, setLocalShowDockIcon] = useState(initialShowDockIcon === true)
  const [localSoundAlert, setLocalSoundAlert] = useState(initialSoundAlert)
  const [localSoundType, setLocalSoundType] = useState(initialSoundType || 'Glass')
  const [localShowRecordingOverlay, setLocalShowRecordingOverlay] = useState(
    initialShowRecordingOverlay !== false
  )
  const [localOverlayStyle, setLocalOverlayStyle] = useState<'compact' | 'large'>(
    initialOverlayStyle || 'compact'
  )
  const [localUseLocalModel, setLocalUseLocalModel] = useState(initialUseLocalModel || false)
  const [localLocalModelType, setLocalLocalModelType] = useState<LocalModelType>(
    initialLocalModelType || 'base'
  )

  const [accessibilityGranted, setAccessibilityGranted] = useState<boolean | null>(null)
  const [accessibilityRequired, setAccessibilityRequired] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(0)
  const [historyAutoDeleteDays, setHistoryAutoDeleteDays] = useState(30)
  const [historyMaxItems, setHistoryMaxItems] = useState(0)
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings')
  const [activeSection, setActiveSection] = useState<string>('general')

  const [modelDownloadStatusMap, setModelDownloadStatusMap] = useState<
    Record<LocalModelType, ModelDownloadStatus>
  >(() => createStatusMap())
  const [downloadProgressMap, setDownloadProgressMap] = useState<
    Record<LocalModelType, ModelDownloadProgress | null>
  >(() => createProgressMap())
  const [localModelsInfo, setLocalModelsInfo] = useState<LocalModelInfo[]>([])

  const setStatusForModel = useCallback(
    (modelType: LocalModelType, status: ModelDownloadStatus) => {
      setModelDownloadStatusMap((prev) => ({
        ...prev,
        [modelType]: status
      }))
    },
    []
  )

  const setProgressForModel = useCallback(
    (modelType: LocalModelType, progress: ModelDownloadProgress | null) => {
      setDownloadProgressMap((prev) => ({
        ...prev,
        [modelType]: progress
      }))
    },
    []
  )

  const handleSetApiKey = useCallback(
    (value: string) => {
      setLocalKey(value)
      setApiKey(value)
    },
    [setApiKey]
  )

  const handleSetSourceLanguage = useCallback(
    (value: string) => {
      setLocalSourceLanguage(value)
      setSourceLanguage(value)
    },
    [setSourceLanguage]
  )

  const handleSetTargetLanguage = useCallback(
    (value: string) => {
      setLocalTargetLanguage(value)
      setTargetLanguage(value)
    },
    [setTargetLanguage]
  )

  const handleSetShortcut = useCallback(
    (value: string) => {
      setLocalShortcut(value)
      setShortcut(value)
    },
    [setShortcut]
  )

  const handleSetTranslate = useCallback(
    (value: boolean) => {
      setLocalTranslate(value)
      setTranslate(value)
    },
    [setTranslate]
  )

  const handleSetProcessNotifications = useCallback(
    (value: boolean) => {
      setLocalProcessNotifications(value)
      setProcessNotifications(value)
    },
    [setProcessNotifications]
  )

  const handleSetSoundAlert = useCallback(
    (value: boolean) => {
      setLocalSoundAlert(value)
      setSoundAlert(value)
    },
    [setSoundAlert]
  )

  const handleSetSoundType = useCallback(
    (value: string) => {
      setLocalSoundType(value)
      setSoundType(value)
    },
    [setSoundType]
  )

  const handleSetAutoStart = useCallback(
    (value: boolean) => {
      setLocalAutoStart(value)
      setAutoStart(value)
    },
    [setAutoStart]
  )

  const handleSetShowDockIcon = useCallback(
    (value: boolean) => {
      setLocalShowDockIcon(value)
      setShowDockIcon(value)
    },
    [setShowDockIcon]
  )

  const handleSetShowRecordingOverlay = useCallback(
    (value: boolean) => {
      setLocalShowRecordingOverlay(value)
      setShowRecordingOverlay(value)
    },
    [setShowRecordingOverlay]
  )

  const handleSetOverlayStyle = useCallback(
    (value: 'compact' | 'large') => {
      setLocalOverlayStyle(value)
      setOverlayStyle(value)
    },
    [setOverlayStyle]
  )

  const refreshLocalModelsInfo = useCallback(async () => {
    if (!window.api?.getLocalModelsInfo) return
    try {
      const info = await window.api.getLocalModelsInfo()
      setLocalModelsInfo(info)
      setModelDownloadStatusMap((prev) => {
        const updated = { ...prev }
        info.forEach((model) => {
          if (prev[model.type] === 'downloading') return
          updated[model.type] = model.exists ? 'ready' : 'missing'
        })
        return updated
      })
    } catch (error) {
      console.error('Failed to load local model info:', error)
    }
  }, [])

  const handleSetUseLocalModel = useCallback(
    (value: boolean) => {
      setLocalUseLocalModel(value)
      setUseLocalModel(value)
      // When switching to local model, refresh model info to update status
      if (value) {
        refreshLocalModelsInfo()
      }
    },
    [setUseLocalModel, refreshLocalModelsInfo]
  )

  const handleSetLocalModelType = useCallback(
    (value: LocalModelType) => {
      setLocalLocalModelType(value)
      setLocalModelType(value)
    },
    [setLocalModelType]
  )

  const checkModelStatus = useCallback(
    async (modelType: LocalModelType): Promise<void> => {
      if (!window.api?.checkLocalModel) return
      setStatusForModel(modelType, 'checking')
      try {
        const exists = await window.api.checkLocalModel(modelType)
        setStatusForModel(modelType, exists ? 'ready' : 'missing')
      } catch (error) {
        console.error('Failed to check model status:', error)
        setStatusForModel(modelType, 'missing')
      }
      await refreshLocalModelsInfo()
    },
    [refreshLocalModelsInfo, setStatusForModel]
  )

  const handleDownloadModel = useCallback(
    async (modelType: LocalModelType): Promise<void> => {
      if (!window.api?.downloadLocalModel) return
      setStatusForModel(modelType, 'downloading')
      setProgressForModel(modelType, { percent: 0, downloaded: 0, total: 0 })
      try {
        await window.api.downloadLocalModel(modelType)

        const modelExists = await window.api.checkLocalModel(modelType)
        if (!modelExists) {
          throw new Error(`Model ${modelType} was downloaded but cannot be found`)
        }

        setStatusForModel(modelType, 'ready')
        setProgressForModel(modelType, null)
        await refreshLocalModelsInfo()
      } catch (error) {
        console.error('Failed to download model:', error)
        setStatusForModel(modelType, 'missing')
        setProgressForModel(modelType, null)
      }
    },
    [refreshLocalModelsInfo, setProgressForModel, setStatusForModel]
  )

  const handleModelTypeChange = (newType: LocalModelType): void => {
    handleSetLocalModelType(newType)
    void checkModelStatus(newType)
  }

  const handleDeleteModel = useCallback(
    async (modelType: LocalModelType): Promise<void> => {
      if (!window.api?.deleteLocalModel) return
      try {
        await window.api.deleteLocalModel(modelType)
        setStatusForModel(modelType, 'missing')
        setProgressForModel(modelType, null)
        await refreshLocalModelsInfo()
      } catch (error) {
        console.error('Failed to delete model:', error)
      }
    },
    [refreshLocalModelsInfo, setProgressForModel, setStatusForModel]
  )

  const handleOpenModelsFolder = useCallback(async () => {
    if (!window.api?.openModelsFolder) return
    try {
      await window.api.openModelsFolder()
    } catch (error) {
      console.error('Failed to open models folder:', error)
    }
  }, [])

  const persistHistorySettings = useCallback(
    async (autoDelete = historyAutoDeleteDays, maxItems = historyMaxItems) => {
      if (!window.api?.saveHistorySettings) return
      try {
        await window.api.saveHistorySettings({
          autoDeleteDays: autoDelete,
          maxHistoryItems: maxItems
        })
      } catch (error) {
        console.error('Failed to save history settings:', error)
      }
    },
    [historyAutoDeleteDays, historyMaxItems]
  )

  const handleSetHistoryAutoDeleteDays = useCallback(
    (value: number) => {
      setHistoryAutoDeleteDays(value)
      void persistHistorySettings(value, historyMaxItems)
    },
    [historyMaxItems, persistHistorySettings]
  )

  const handleSetHistoryMaxItems = useCallback(
    (value: number) => {
      setHistoryMaxItems(value)
      void persistHistorySettings(historyAutoDeleteDays, value)
    },
    [historyAutoDeleteDays, persistHistorySettings]
  )

  // Listen for download progress updates
  useEffect(() => {
    if (!window.api?.onModelDownloadProgress) return

    const removeListener = window.api.onModelDownloadProgress((progress) => {
      console.log('Received progress update:', progress)
      setStatusForModel(progress.modelType, 'downloading')
      setProgressForModel(progress.modelType, progress)

      if (progress.percent >= 100) {
        setProgressForModel(progress.modelType, null)
        setStatusForModel(progress.modelType, 'ready')
        refreshLocalModelsInfo()
      }
    })

    return removeListener
  }, [refreshLocalModelsInfo, setProgressForModel, setStatusForModel])

  // Check model status when toggle is on or model type changes
  useEffect(() => {
    if (localUseLocalModel) {
      // Check selected model
      checkModelStatus(localLocalModelType)
      // Also refresh all models info to update status map
      refreshLocalModelsInfo()
    }
  }, [checkModelStatus, localLocalModelType, localUseLocalModel, refreshLocalModelsInfo])

  useEffect(() => {
    setLocalKey(initialKey)
    setLocalSourceLanguage(initialSourceLanguage || 'en')
    setLocalTargetLanguage(initialTargetLanguage || 'tr')
    setLocalShortcut(initialShortcut || 'Command+Space')
    setLocalTranslate(initialTranslate)
    setLocalProcessNotifications(initialProcessNotifications)
    setLocalSoundAlert(initialSoundAlert)
    setLocalSoundType(initialSoundType || 'Glass')
    setLocalAutoStart(initialAutoStart !== false)
    setLocalShowDockIcon(initialShowDockIcon === true)
    setLocalShowRecordingOverlay(initialShowRecordingOverlay !== false)
    setLocalOverlayStyle(initialOverlayStyle || 'compact')
    setLocalUseLocalModel(initialUseLocalModel || false)
    setLocalLocalModelType(initialLocalModelType || 'base')
  }, [
    initialKey,
    initialSourceLanguage,
    initialTargetLanguage,
    initialShortcut,
    initialTranslate,
    initialProcessNotifications,
    initialSoundAlert,
    initialSoundType,
    initialAutoStart,
    initialShowDockIcon,
    initialShowRecordingOverlay,
    initialOverlayStyle,
    initialUseLocalModel,
    initialLocalModelType
  ])

  useEffect(() => {
    refreshLocalModelsInfo()
  }, [refreshLocalModelsInfo])

  useEffect(() => {
    const checkPermission = async (): Promise<void> => {
      if (window.api?.checkAccessibilityPermission) {
        try {
          const result = await window.api.checkAccessibilityPermission()
          setAccessibilityGranted(result.granted)
          setAccessibilityRequired(result.required)
        } catch (error) {
          console.error('Failed to check accessibility permission:', error)
        }
      }
    }
    checkPermission()

    const checkUpdates = async (): Promise<void> => {
      if (window.api?.getUpdateStatus) {
        try {
          const status = await window.api.getUpdateStatus()
          setUpdateAvailable(status.updateAvailable)
          setUpdateDownloaded(status.updateDownloaded)
          setLatestVersion(status.latestVersion)
        } catch (error) {
          console.error('Failed to check update status:', error)
        }
      }
    }
    checkUpdates()

    const loadHistorySettings = async (): Promise<void> => {
      if (window.api?.getHistorySettings) {
        try {
          const settings = await window.api.getHistorySettings()
          setHistoryAutoDeleteDays(settings.autoDeleteDays)
          setHistoryMaxItems(settings.maxHistoryItems)
        } catch (error) {
          console.error('Failed to load history settings:', error)
        }
      }
    }
    loadHistorySettings()

    const interval = setInterval(checkPermission, 5000)
    const updateCheckInterval = setInterval(checkUpdates, 3000)

    if (window.api?.onUpdateAvailable) {
      const unsubscribe1 = window.api.onUpdateAvailable((info) => {
        setUpdateAvailable(true)
        setLatestVersion(info.version)
        setUpdateDownloaded(false)
        setDownloading(false)
      })

      const unsubscribe2 = window.api.onUpdateDownloaded((info) => {
        setUpdateDownloaded(true)
        setDownloading(false)
        setLatestVersion(info.version)
      })

      const unsubscribe3 = window.api.onUpdateDownloadProgress((progress) => {
        setDownloading(true)
        setUpdateDownloadProgress(Math.round(progress.percent))
      })

      return () => {
        unsubscribe1()
        unsubscribe2()
        unsubscribe3()
        clearInterval(interval)
        clearInterval(updateCheckInterval)
      }
    }

    return () => {
      clearInterval(interval)
      clearInterval(updateCheckInterval)
    }
  }, [])

  useEffect(() => {
    // Listen for show-history event
    if (window.api?.onShowHistory) {
      const removeListener = window.api.onShowHistory(() => {
        setActiveTab('history')
      })
      return removeListener
    }
    return undefined
  }, [])

  const handleDownloadUpdate = async (): Promise<void> => {
    if (window.api?.downloadUpdate) {
      setDownloading(true)
      setUpdateDownloadProgress(0)
      try {
        await window.api.downloadUpdate()
      } catch (error) {
        console.error('Failed to download update:', error)
        setDownloading(false)
      }
    }
  }

  const handleQuitAndInstall = async (): Promise<void> => {
    if (window.api?.quitAndInstall) {
      try {
        await window.api.quitAndInstall()
      } catch (error) {
        console.error('Failed to install update:', error)
        alert('Failed to install update. Please restart the app manually.')
      }
    }
  }

  const handleCopyFromHistory = (text: string): void => {
    navigator.clipboard.writeText(text).catch(console.error)
  }

  const sidebarSections = [
    {
      id: 'general',
      label: 'General',
      icon: SettingsIcon,
      category: 'main'
    },
    {
      id: 'dictation',
      label: 'Dictation',
      icon: Mic,
      category: 'main'
    },
    {
      id: 'audio',
      label: 'Audio & Notifications',
      icon: Bell,
      category: 'main'
    },
    {
      id: 'history',
      label: 'History',
      icon: HistoryIcon,
      category: 'main'
    }
  ]

  return (
    <div className="h-full w-full bg-zinc-950 flex">
      {/* Sidebar */}
      <div className="w-56 bg-[#1e1e1e] border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-zinc-800/50 overflow-hidden">
              <img src={appIcon} alt="Toolify" className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white tracking-tight">Toolify</h1>
              <p className="text-[10px] text-zinc-500 mt-0.5">Preferences</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2">
          {sidebarSections.map((section) => {
            const Icon = section.icon
            const isActive =
              activeTab === 'history' ? section.id === 'history' : section.id === activeSection

            return (
              <button
                key={section.id}
                onClick={() => {
                  if (section.id === 'history') {
                    setActiveTab('history')
                  } else {
                    setActiveTab('settings')
                    setActiveSection(section.id)
                  }
                }}
                className={`no-drag w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-normal transition-colors duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-zinc-500'} />
                <span>{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a1a]">
        {activeTab === 'history' ? (
          <div className="flex-1 overflow-hidden">
            <History onCopy={handleCopyFromHistory} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-8 space-y-10">
              {/* Update Banners - Show on all sections */}
              <UpdateBanner
                updateAvailable={updateAvailable}
                updateDownloaded={updateDownloaded}
                latestVersion={latestVersion}
                downloading={downloading}
                updateDownloadProgress={updateDownloadProgress}
                accessibilityGranted={accessibilityGranted}
                accessibilityRequired={accessibilityRequired}
                onDownloadUpdate={handleDownloadUpdate}
                onQuitAndInstall={handleQuitAndInstall}
              />

              {/* General Settings Section */}
              {activeSection === 'general' && (
                <GeneralSettings
                  autoStart={localAutoStart}
                  setAutoStart={handleSetAutoStart}
                  showDockIcon={localShowDockIcon}
                  setShowDockIcon={handleSetShowDockIcon}
                  historyAutoDeleteDays={historyAutoDeleteDays}
                  setHistoryAutoDeleteDays={handleSetHistoryAutoDeleteDays}
                  historyMaxItems={historyMaxItems}
                  setHistoryMaxItems={handleSetHistoryMaxItems}
                />
              )}

              {/* Dictation Settings Section */}
              {activeSection === 'dictation' && (
                <DictationSettings
                  modelDownloadStatusMap={modelDownloadStatusMap}
                  downloadProgressMap={downloadProgressMap}
                  localModelsInfo={localModelsInfo}
                  onModelTypeChange={handleModelTypeChange}
                  onDownloadModel={handleDownloadModel}
                  onDeleteModel={handleDeleteModel}
                  onOpenModelsFolder={handleOpenModelsFolder}
                  localKey={localKey}
                  setLocalKey={handleSetApiKey}
                  localSourceLanguage={localSourceLanguage}
                  setLocalSourceLanguage={handleSetSourceLanguage}
                  localTargetLanguage={localTargetLanguage}
                  setLocalTargetLanguage={handleSetTargetLanguage}
                  localShortcut={localShortcut}
                  setLocalShortcut={handleSetShortcut}
                  localTranslate={localTranslate}
                  setLocalTranslate={handleSetTranslate}
                  localShowRecordingOverlay={localShowRecordingOverlay}
                  setLocalShowRecordingOverlay={handleSetShowRecordingOverlay}
                  localOverlayStyle={localOverlayStyle}
                  setLocalOverlayStyle={handleSetOverlayStyle}
                  localUseLocalModel={localUseLocalModel}
                  setLocalUseLocalModel={handleSetUseLocalModel}
                  localLocalModelType={localLocalModelType}
                />
              )}

              {/* Audio & Notifications Settings Section */}
              {activeSection === 'audio' && (
                <AudioSettings
                  processNotifications={localProcessNotifications}
                  setProcessNotifications={handleSetProcessNotifications}
                  soundAlert={localSoundAlert}
                  setSoundAlert={handleSetSoundAlert}
                  soundType={localSoundType}
                  setSoundType={handleSetSoundType}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
