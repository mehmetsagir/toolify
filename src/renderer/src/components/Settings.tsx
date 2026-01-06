import React, { useState, useEffect } from 'react'
import { Save, Mic, Settings as SettingsIcon, History as HistoryIcon, Bell } from 'lucide-react'
import { History } from './History'
import { UpdateBanner } from './settings/UpdateBanner'
import { GeneralSettings } from './settings/GeneralSettings'
import { DictationSettings } from './settings/DictationSettings'
import { AudioSettings } from './settings/AudioSettings'
import appIcon from '../assets/app-icon.png'

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
  trayAnimations: boolean
  setTrayAnimations: (val: boolean) => void
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
  useLocalModel: boolean
  setUseLocalModel: (val: boolean) => void
  localModelType: 'base' | 'small' | 'medium' | 'large-v3'
  setLocalModelType: (val: 'base' | 'small' | 'medium' | 'large-v3') => void
  onSave?: (settings: {
    apiKey: string
    sourceLanguage: string
    targetLanguage: string
    shortcut: string
    translate: boolean
    trayAnimations: boolean
    processNotifications: boolean
    soundAlert: boolean
    soundType: string
    autoStart: boolean
    showRecordingOverlay: boolean
    overlayStyle: 'compact' | 'large'
    useLocalModel: boolean
    localModelType: 'base' | 'small' | 'medium' | 'large-v3'
  }) => void
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
  trayAnimations: initialTrayAnimations,
  setTrayAnimations,
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
  useLocalModel: initialUseLocalModel,
  setUseLocalModel,
  localModelType: initialLocalModelType,
  setLocalModelType,
  onSave
}) => {
  const [localKey, setLocalKey] = useState(initialKey)
  const [localSourceLanguage, setLocalSourceLanguage] = useState(initialSourceLanguage || 'en')
  const [localTargetLanguage, setLocalTargetLanguage] = useState(initialTargetLanguage || 'tr')
  const [localShortcut, setLocalShortcut] = useState(initialShortcut || 'Command+Space')
  const [localTranslate, setLocalTranslate] = useState(initialTranslate)
  const [localTrayAnimations, setLocalTrayAnimations] = useState(initialTrayAnimations)
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
  const [localUseLocalModel, setLocalUseLocalModel] = useState(initialUseLocalModel || false)
  const [localLocalModelType, setLocalLocalModelType] = useState(initialLocalModelType || 'base')
  const [saved, setSaved] = useState(false)

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

  const [modelDownloadStatus, setModelDownloadStatus] = useState<
    'idle' | 'checking' | 'downloading' | 'ready' | 'missing'
  >('idle')
  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number
    downloaded: number
    total: number
  } | null>(null)

  const checkModelStatus = async (modelType: string): Promise<void> => {
    if (!window.api?.checkLocalModel) return
    setModelDownloadStatus('checking')
    try {
      const exists = await window.api.checkLocalModel(modelType)
      setModelDownloadStatus(exists ? 'ready' : 'missing')
    } catch (error) {
      console.error('Failed to check model status:', error)
      setModelDownloadStatus('missing')
    }
  }

  const handleDownloadModel = async (): Promise<void> => {
    if (!window.api?.downloadLocalModel) return
    setModelDownloadStatus('downloading')
    setDownloadProgress({ percent: 0, downloaded: 0, total: 0 })
    try {
      await window.api.downloadLocalModel(localLocalModelType)

      // Verify model exists after download before updating UI
      const modelExists = await window.api.checkLocalModel(localLocalModelType)
      if (!modelExists) {
        throw new Error(`Model ${localLocalModelType} was downloaded but cannot be found`)
      }

      setModelDownloadStatus('ready')
      setDownloadProgress(null)

      // Ensure settings are saved with the current model type after successful download
      await window.api.saveSettings({
        apiKey: localKey,
        language: '',
        sourceLanguage: localSourceLanguage,
        targetLanguage: localTargetLanguage,
        shortcut: localShortcut,
        translate: localTranslate,
        trayAnimations: localTrayAnimations,
        processNotifications: localProcessNotifications,
        soundAlert: localSoundAlert,
        soundType: localSoundType,
        autoStart: localAutoStart,
        showRecordingOverlay: localShowRecordingOverlay,
        useLocalModel: localUseLocalModel,
        localModelType: localLocalModelType
      })

      console.log(
        `Settings saved with localModelType: ${localLocalModelType}, useLocalModel: ${localUseLocalModel}`
      )
    } catch (error) {
      console.error('Failed to download model:', error)
      setModelDownloadStatus('missing')
      setDownloadProgress(null)
      // You might want to show an error toast here
    }
  }

  const handleModelTypeChange = async (
    newType: 'base' | 'small' | 'medium' | 'large-v3'
  ): Promise<void> => {
    // Auto-save using all current local state values
    await window.api.saveSettings({
      apiKey: localKey,
      language: '',
      sourceLanguage: localSourceLanguage,
      targetLanguage: localTargetLanguage,
      shortcut: localShortcut,
      translate: localTranslate,
      trayAnimations: localTrayAnimations,
      processNotifications: localProcessNotifications,
      soundAlert: localSoundAlert,
      soundType: localSoundType,
      autoStart: localAutoStart,
      showRecordingOverlay: localShowRecordingOverlay,
      useLocalModel: localUseLocalModel,
      localModelType: newType
    })

    checkModelStatus(newType)
  }

  // Listen for download progress updates
  useEffect(() => {
    if (!window.api?.onModelDownloadProgress) return

    const removeListener = window.api.onModelDownloadProgress((progress) => {
      console.log('Received progress update:', progress)
      // Always update progress regardless of modelType (in case user switches during download)
      setDownloadProgress({
        percent: progress.percent,
        downloaded: progress.downloaded,
        total: progress.total
      })
    })

    return removeListener
  }, []) // Empty dependency array - listener should be set once and stay active

  // Check model status when toggle is on or model type changes
  useEffect(() => {
    if (localUseLocalModel) {
      checkModelStatus(localLocalModelType)
    }
  }, [localUseLocalModel, localLocalModelType])

  useEffect(() => {
    setLocalKey(initialKey)
    setLocalSourceLanguage(initialSourceLanguage || 'en')
    setLocalTargetLanguage(initialTargetLanguage || 'tr')
    setLocalShortcut(initialShortcut || 'Command+Space')
    setLocalTranslate(initialTranslate)
    setLocalTrayAnimations(initialTrayAnimations)
    setLocalProcessNotifications(initialProcessNotifications)
    setLocalSoundAlert(initialSoundAlert)
    setLocalSoundType(initialSoundType || 'Glass')
    setLocalAutoStart(initialAutoStart !== false)
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
    initialTrayAnimations,
    initialProcessNotifications,
    initialSoundAlert,
    initialSoundType,
    initialAutoStart,
    initialShowRecordingOverlay,
    initialOverlayStyle,
    initialUseLocalModel,
    initialLocalModelType
  ])

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

  const handleSave = async (): Promise<void> => {
    if (onSave) {
      onSave({
        apiKey: localKey,
        sourceLanguage: localSourceLanguage,
        targetLanguage: localTargetLanguage,
        shortcut: localShortcut,
        translate: localTranslate,
        trayAnimations: localTrayAnimations,
        processNotifications: localProcessNotifications,
        soundAlert: localSoundAlert,
        soundType: localSoundType,
        autoStart: localAutoStart,
        showRecordingOverlay: localShowRecordingOverlay,
        overlayStyle: localOverlayStyle,
        useLocalModel: localUseLocalModel,
        localModelType: localLocalModelType
      })
    } else {
      setApiKey(localKey)
      setSourceLanguage(localSourceLanguage)
      setTargetLanguage(localTargetLanguage)
      setShortcut(localShortcut)
      setTranslate(localTranslate)
      setTrayAnimations(localTrayAnimations)
      setProcessNotifications(localProcessNotifications)
      setSoundAlert(localSoundAlert)
      setSoundType(localSoundType)
      setAutoStart(localAutoStart)
      setShowRecordingOverlay(localShowRecordingOverlay)
      setOverlayStyle(localOverlayStyle)
      setUseLocalModel(localUseLocalModel)
      setLocalModelType(localLocalModelType)
    }

    // Save history settings
    if (window.api?.saveHistorySettings) {
      try {
        await window.api.saveHistorySettings({
          autoDeleteDays: historyAutoDeleteDays,
          maxHistoryItems: historyMaxItems
        })
      } catch (error) {
        console.error('Failed to save history settings:', error)
      }
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
                  setAutoStart={setLocalAutoStart}
                  historyAutoDeleteDays={historyAutoDeleteDays}
                  setHistoryAutoDeleteDays={setHistoryAutoDeleteDays}
                  historyMaxItems={historyMaxItems}
                  setHistoryMaxItems={setHistoryMaxItems}
                />
              )}

              {/* Dictation Settings Section */}
              {activeSection === 'dictation' && (
                <DictationSettings
                  modelDownloadStatus={modelDownloadStatus}
                  downloadProgress={downloadProgress}
                  onModelTypeChange={handleModelTypeChange}
                  onDownloadModel={handleDownloadModel}
                  onCheckModelStatus={checkModelStatus}
                  localKey={localKey}
                  setLocalKey={setLocalKey}
                  localSourceLanguage={localSourceLanguage}
                  setLocalSourceLanguage={setLocalSourceLanguage}
                  localTargetLanguage={localTargetLanguage}
                  setLocalTargetLanguage={setLocalTargetLanguage}
                  localShortcut={localShortcut}
                  setLocalShortcut={setLocalShortcut}
                  localTranslate={localTranslate}
                  setLocalTranslate={setLocalTranslate}
                  localShowRecordingOverlay={localShowRecordingOverlay}
                  setLocalShowRecordingOverlay={setLocalShowRecordingOverlay}
                  localOverlayStyle={localOverlayStyle}
                  setLocalOverlayStyle={setLocalOverlayStyle}
                  localUseLocalModel={localUseLocalModel}
                  setLocalUseLocalModel={setLocalUseLocalModel}
                  localLocalModelType={localLocalModelType}
                  setLocalLocalModelType={setLocalLocalModelType}
                />
              )}

              {/* Audio & Notifications Settings Section */}
              {activeSection === 'audio' && (
                <AudioSettings
                  processNotifications={localProcessNotifications}
                  setProcessNotifications={setLocalProcessNotifications}
                  soundAlert={localSoundAlert}
                  setSoundAlert={setLocalSoundAlert}
                  soundType={localSoundType}
                  setSoundType={setLocalSoundType}
                />
              )}
            </div>
          </div>
        )}

        {/* Save Button - Only show on Settings tab */}
        {activeTab === 'settings' && (
          <div className="px-8 py-5 bg-[#1a1a1a] border-t border-white/5">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="text-xs text-zinc-500">Toolify v0.0.12</div>
              <button
                onClick={handleSave}
                disabled={saved}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  saved
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
                }`}
              >
                {saved ? (
                  <>
                    <Save size={16} />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
