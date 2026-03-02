import React, { useState, useEffect, useCallback } from 'react'
import { Mic, Settings as SettingsIcon, History as HistoryIcon, Shield } from 'lucide-react'
import { History } from './History'
import { UpdateBanner } from './settings/UpdateBanner'
import { GeneralSettings } from './settings/GeneralSettings'
import { DictationSettings } from './settings/DictationSettings'
import { PermissionsSettings } from './settings/PermissionsSettings'
import appIcon from '../assets/app-icon.png'
import type { LocalModelInfo, LocalModelType, TranscriptionProvider } from '../../../shared/types'

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
  googleApiKey: string
  setGoogleApiKey: (key: string) => void
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
  showRecordingOverlay: boolean
  setShowRecordingOverlay: (val: boolean) => void
  overlayStyle: 'compact' | 'large'
  setOverlayStyle: (val: 'compact' | 'large') => void
  transcriptionProvider: TranscriptionProvider
  setTranscriptionProvider: (val: TranscriptionProvider) => void
  localModelType: LocalModelType
  setLocalModelType: (val: LocalModelType) => void
}

export const Settings: React.FC<SettingsProps> = ({
  apiKey: initialKey,
  setApiKey,
  googleApiKey: initialGoogleApiKey,
  setGoogleApiKey,
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
  showRecordingOverlay: initialShowRecordingOverlay,
  setShowRecordingOverlay,
  overlayStyle: initialOverlayStyle,
  setOverlayStyle,
  transcriptionProvider: initialTranscriptionProvider,
  setTranscriptionProvider,
  localModelType: initialLocalModelType,
  setLocalModelType
}) => {
  const [localKey, setLocalKey] = useState(initialKey)
  const [localGoogleApiKey, setLocalGoogleApiKey] = useState(initialGoogleApiKey || '')
  const [localSourceLanguage, setLocalSourceLanguage] = useState(initialSourceLanguage || 'en')
  const [localTargetLanguage, setLocalTargetLanguage] = useState(initialTargetLanguage || 'tr')
  const [localShortcut, setLocalShortcut] = useState(initialShortcut || 'Command+Space')
  const [localTranslate, setLocalTranslate] = useState(initialTranslate)
  const [localProcessNotifications, setLocalProcessNotifications] = useState(
    initialProcessNotifications
  )
  const [localAutoStart, setLocalAutoStart] = useState(initialAutoStart !== false)
  const [localSoundAlert, setLocalSoundAlert] = useState(initialSoundAlert)
  const [localSoundType, setLocalSoundType] = useState(initialSoundType || 'Glass')
  const [localShowRecordingOverlay, setLocalShowRecordingOverlay] = useState(
    initialShowRecordingOverlay !== false
  )
  const [localOverlayStyle, setLocalOverlayStyle] = useState<'compact' | 'large'>(
    initialOverlayStyle || 'compact'
  )
  const [localTranscriptionProvider, setLocalTranscriptionProvider] =
    useState<TranscriptionProvider>(initialTranscriptionProvider || 'openai')
  const [localLocalModelType, setLocalLocalModelType] = useState<LocalModelType>(
    initialLocalModelType || 'base'
  )

  const [hasPermissionIssue, setHasPermissionIssue] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string>('0.0.0')
  const [downloading, setDownloading] = useState(false)
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(0)
  const [checkingForUpdates, setCheckingForUpdates] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
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

  const handleSetGoogleApiKey = useCallback(
    (value: string) => {
      setLocalGoogleApiKey(value)
      setGoogleApiKey(value)
    },
    [setGoogleApiKey]
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

  const handleSetTranscriptionProvider = useCallback(
    (value: TranscriptionProvider) => {
      setLocalTranscriptionProvider(value)
      setTranscriptionProvider(value)
      // When switching to local model, refresh model info to update status
      if (value === 'local-whisper') {
        refreshLocalModelsInfo()
      }
      // Apple Speech doesn't support translation — disable it
      if (value === 'apple-stt' && localTranslate) {
        setLocalTranslate(false)
        setTranslate(false)
      }
    },
    [setTranscriptionProvider, refreshLocalModelsInfo, localTranslate, setTranslate]
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

  // Check model status when local-whisper is selected or model type changes
  useEffect(() => {
    if (localTranscriptionProvider === 'local-whisper') {
      checkModelStatus(localLocalModelType)
      refreshLocalModelsInfo()
    }
  }, [checkModelStatus, localLocalModelType, localTranscriptionProvider, refreshLocalModelsInfo])

  useEffect(() => {
    setLocalKey(initialKey)
    setLocalGoogleApiKey(initialGoogleApiKey || '')
    setLocalSourceLanguage(initialSourceLanguage || 'en')
    setLocalTargetLanguage(initialTargetLanguage || 'tr')
    setLocalShortcut(initialShortcut || 'Command+Space')
    setLocalTranslate(initialTranslate)
    setLocalProcessNotifications(initialProcessNotifications)
    setLocalSoundAlert(initialSoundAlert)
    setLocalSoundType(initialSoundType || 'Glass')
    setLocalAutoStart(initialAutoStart !== false)
    setLocalShowRecordingOverlay(initialShowRecordingOverlay !== false)
    setLocalOverlayStyle(initialOverlayStyle || 'compact')
    setLocalTranscriptionProvider(initialTranscriptionProvider || 'openai')
    setLocalLocalModelType(initialLocalModelType || 'base')
  }, [
    initialKey,
    initialGoogleApiKey,
    initialSourceLanguage,
    initialTargetLanguage,
    initialShortcut,
    initialTranslate,
    initialProcessNotifications,
    initialSoundAlert,
    initialSoundType,
    initialAutoStart,
    initialShowRecordingOverlay,
    initialOverlayStyle,
    initialTranscriptionProvider,
    initialLocalModelType
  ])

  useEffect(() => {
    refreshLocalModelsInfo()
  }, [refreshLocalModelsInfo])

  useEffect(() => {
    // Load cached update status first
    const loadCachedStatus = async (): Promise<void> => {
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
    loadCachedStatus()

    // Trigger a real update check when settings opens
    if (window.api?.checkForUpdates) {
      setCheckingForUpdates(true)
      setUpdateError(null)
      window.api.checkForUpdates().finally(() => {
        // checkingForUpdates will be cleared by event listeners
        setTimeout(() => setCheckingForUpdates(false), 10000) // fallback timeout
      })
    }

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

    const cleanups: (() => void)[] = []

    if (window.api?.onUpdateAvailable) {
      cleanups.push(
        window.api.onUpdateAvailable((info) => {
          setUpdateAvailable(true)
          setLatestVersion(info.version)
          setUpdateDownloaded(false)
          setDownloading(false)
          setCheckingForUpdates(false)
          setUpdateError(null)
        })
      )
    }

    if (window.api?.onUpdateDownloaded) {
      cleanups.push(
        window.api.onUpdateDownloaded((info) => {
          setUpdateDownloaded(true)
          setDownloading(false)
          setLatestVersion(info.version)
          setCheckingForUpdates(false)
        })
      )
    }

    if (window.api?.onUpdateDownloadProgress) {
      cleanups.push(
        window.api.onUpdateDownloadProgress((progress) => {
          setDownloading(true)
          setUpdateDownloadProgress(Math.round(progress.percent))
        })
      )
    }

    // Listen for update-not-available
    if (window.api?.onUpdateNotAvailable) {
      cleanups.push(
        window.api.onUpdateNotAvailable(() => {
          setCheckingForUpdates(false)
          setUpdateAvailable(false)
          setUpdateError(null)
        })
      )
    }

    // Listen for update errors
    if (window.api?.onUpdateError) {
      cleanups.push(
        window.api.onUpdateError((message) => {
          setCheckingForUpdates(false)
          setUpdateError(message)
        })
      )
    }

    return () => {
      cleanups.forEach((fn) => fn())
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

  // Load app version on mount
  useEffect(() => {
    const loadVersion = async (): Promise<void> => {
      if (window.api?.getVersion) {
        try {
          const version = await window.api.getVersion()
          setAppVersion(version)
        } catch (error) {
          console.error('Failed to load app version:', error)
        }
      }
    }
    loadVersion()
  }, [])

  // Permission status is tracked by PermissionsSettings via onPermissionStatusChange callback
  // Initial check on mount to show sidebar red dot before user visits permissions tab
  useEffect(() => {
    const checkPermissions = async (): Promise<void> => {
      let hasIssue = false
      try {
        if (window.api?.checkAccessibilityPermission) {
          const acc = await window.api.checkAccessibilityPermission()
          if (!acc.granted) hasIssue = true
        }
        if (window.api?.checkMicrophonePermission) {
          const mic = await window.api.checkMicrophonePermission()
          if (mic !== 'granted' && mic !== 'not-determined') hasIssue = true
        }
        if (localTranscriptionProvider === 'apple-stt' && window.api?.checkAppleStt) {
          const stt = await window.api.checkAppleStt()
          if (!stt.permissionGranted) hasIssue = true
        }
      } catch {
        // ignore
      }
      setHasPermissionIssue(hasIssue)
    }
    checkPermissions()
  }, [localTranscriptionProvider])

  const handleCheckForUpdates = async (): Promise<void> => {
    if (window.api?.checkForUpdates) {
      setCheckingForUpdates(true)
      setUpdateError(null)
      try {
        await window.api.checkForUpdates()
      } catch (error) {
        console.error('Failed to check for updates:', error)
        setCheckingForUpdates(false)
        setUpdateError('Failed to check for updates')
      }
    }
  }

  const handleDownloadUpdate = async (): Promise<void> => {
    if (window.api?.downloadUpdate) {
      setDownloading(true)
      setUpdateDownloadProgress(0)
      setUpdateError(null)
      try {
        await window.api.downloadUpdate()
      } catch (error) {
        console.error('Failed to download update:', error)
        setDownloading(false)
        setUpdateError('Failed to download update')
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
      id: 'transcription',
      label: 'Transcription',
      icon: Mic,
      category: 'main'
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: Shield,
      category: 'main'
    },
    {
      id: 'history',
      label: 'History',
      icon: HistoryIcon,
      category: 'main'
    }
  ]

  // Get the current section label based on active tab/section
  const getCurrentSectionLabel = (): string => {
    if (activeTab === 'history') {
      return 'History'
    }
    const section = sidebarSections.find((s) => s.id === activeSection)
    return section?.label || 'Preferences'
  }

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
              <p className="text-[10px] text-zinc-500 mt-0.5">{getCurrentSectionLabel()}</p>
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
                <span className="flex-1 text-left">{section.label}</span>
                {section.id === 'permissions' && hasPermissionIssue && (
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/5 space-y-2">
          {/* GitHub Link */}
          <button
            onClick={() => {
              if (window?.api?.openExternal) {
                window.api.openExternal('https://github.com/mehmetsagir/toolify')
              }
            }}
            className="no-drag w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer group"
            aria-label="View on GitHub"
          >
            <svg
              className="w-4 h-4 group-hover:scale-110 transition-transform duration-200"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span className="text-xs font-medium">View on GitHub</span>
          </button>

          {/* Version */}
          <div className="text-center px-2 py-1.5">
            <div className="text-[10px] text-zinc-500 font-medium tracking-wide">
              Version {appVersion}
            </div>
          </div>
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
                checkingForUpdates={checkingForUpdates}
                updateError={updateError}
                appVersion={appVersion}
                onCheckForUpdates={handleCheckForUpdates}
                onDownloadUpdate={handleDownloadUpdate}
                onQuitAndInstall={handleQuitAndInstall}
              />

              {/* General Settings Section */}
              {activeSection === 'general' && (
                <GeneralSettings
                  autoStart={localAutoStart}
                  setAutoStart={handleSetAutoStart}
                  shortcut={localShortcut}
                  setShortcut={handleSetShortcut}
                  showRecordingOverlay={localShowRecordingOverlay}
                  setShowRecordingOverlay={handleSetShowRecordingOverlay}
                  overlayStyle={localOverlayStyle}
                  setOverlayStyle={handleSetOverlayStyle}
                  soundAlert={localSoundAlert}
                  setSoundAlert={handleSetSoundAlert}
                  soundType={localSoundType}
                  setSoundType={handleSetSoundType}
                  processNotifications={localProcessNotifications}
                  setProcessNotifications={handleSetProcessNotifications}
                  historyAutoDeleteDays={historyAutoDeleteDays}
                  setHistoryAutoDeleteDays={handleSetHistoryAutoDeleteDays}
                  historyMaxItems={historyMaxItems}
                  setHistoryMaxItems={handleSetHistoryMaxItems}
                />
              )}

              {/* Transcription Settings Section */}
              {activeSection === 'transcription' && (
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
                  localGoogleApiKey={localGoogleApiKey}
                  setLocalGoogleApiKey={handleSetGoogleApiKey}
                  localSourceLanguage={localSourceLanguage}
                  setLocalSourceLanguage={handleSetSourceLanguage}
                  localTargetLanguage={localTargetLanguage}
                  setLocalTargetLanguage={handleSetTargetLanguage}
                  localTranslate={localTranslate}
                  setLocalTranslate={handleSetTranslate}
                  localTranscriptionProvider={localTranscriptionProvider}
                  setLocalTranscriptionProvider={handleSetTranscriptionProvider}
                  localLocalModelType={localLocalModelType}
                />
              )}

              {/* Permissions Settings Section */}
              {activeSection === 'permissions' && (
                <PermissionsSettings
                  transcriptionProvider={localTranscriptionProvider}
                  onPermissionStatusChange={setHasPermissionIssue}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
