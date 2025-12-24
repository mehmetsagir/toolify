import React, { useState, useEffect } from 'react'
import {
  Check,
  Globe,
  Key,
  Save,
  Languages,
  Keyboard,
  Sparkles,
  Bell,
  Volume2,
  AlertTriangle,
  ExternalLink,
  Power,
  Radio,
  Download,
  RefreshCw,
  Zap,
  Mic,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Trash2,
  Loader2
} from 'lucide-react'
import { History } from './History'
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
      
      console.log(`Settings saved with localModelType: ${localLocalModelType}, useLocalModel: ${localUseLocalModel}`)
    } catch (error) {
      console.error('Failed to download model:', error)
      setModelDownloadStatus('missing')
      setDownloadProgress(null)
      // You might want to show an error toast here
    }
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
            <History
              onClose={() => {
                setActiveTab('settings')
                setActiveSection('general')
              }}
              onCopy={handleCopyFromHistory}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto p-8 space-y-10">
              {/* Update Banners - Show on all sections */}
              {(updateAvailable ||
                updateDownloaded ||
                (accessibilityRequired && accessibilityGranted === false)) && (
                <div className="space-y-4">
                  {/* Update Available Banner */}
                  {updateAvailable && !updateDownloaded && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 flex-shrink-0">
                          <Sparkles size={18} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-blue-400 font-medium text-sm">
                              New Update Available
                            </h3>
                            <span className="text-blue-300 text-xs font-mono">{latestVersion}</span>
                          </div>
                          <p className="text-blue-300/80 text-xs leading-relaxed">
                            A new version of Toolify is available. Download and install to get the
                            latest features and improvements.
                          </p>
                          {downloading && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-blue-300">
                                <span>Downloading...</span>
                                <span>{updateDownloadProgress}%</span>
                              </div>
                              <div className="w-full bg-blue-500/20 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full transition-all duration-300"
                                  style={{ width: `${updateDownloadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {!downloading && (
                            <button
                              onClick={handleDownloadUpdate}
                              className="w-full mt-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2"
                            >
                              <Download size={14} />
                              <span>Download Update</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Update Downloaded Banner */}
                  {updateDownloaded && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20 text-green-400 flex-shrink-0">
                          <Zap size={18} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-green-400 font-medium text-sm">
                              Update Ready to Install
                            </h3>
                            <span className="text-green-300 text-xs font-mono">
                              {latestVersion}
                            </span>
                          </div>
                          <p className="text-green-300/80 text-xs leading-relaxed">
                            The update has been downloaded. Click below to quit and install the new
                            version.
                          </p>
                          <button
                            onClick={handleQuitAndInstall}
                            className="w-full mt-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <RefreshCw size={14} />
                            <span>Quit and Install</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Accessibility Permission Warning */}
                  {accessibilityRequired && accessibilityGranted === false && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 flex-shrink-0">
                          <AlertTriangle size={18} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-yellow-400 font-medium text-sm">
                              Accessibility Permission Required
                            </h3>
                          </div>
                          <p className="text-yellow-300/80 text-xs leading-relaxed">
                            Accessibility permission is required for global shortcuts and auto-paste
                            feature.
                          </p>
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-2">
                            <p className="text-yellow-400/90 text-[10px] font-medium">
                              How to grant permission:
                            </p>
                            <ol className="text-yellow-300/70 text-[10px] space-y-1 list-decimal list-inside ml-2">
                              <li>Click &quot;Open System Settings&quot; button below</li>
                              <li>If Toolify is not in the list, restart the app and try again</li>
                              <li>Find &quot;Toolify&quot; or &quot;Electron&quot; in the list</li>
                              <li>Toggle the switch next to it to enable</li>
                              <li>Return here - the status will update automatically</li>
                            </ol>
                          </div>
                          <button
                            onClick={() => {
                              if (window.api?.openAccessibilitySettings) {
                                window.api.openAccessibilitySettings()
                              }
                            }}
                            className="w-full mt-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <ExternalLink size={14} />
                            <span>Open System Settings</span>
                          </button>
                          <p className="text-yellow-400/60 text-[10px] leading-relaxed">
                            <strong>Note:</strong> In development mode, the app may appear as&nbsp;
                            &quot;Electron&quot; instead of &quot;Toolify&quot; in System Settings.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* General Settings Section */}
              {activeSection === 'general' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">
                      General
                    </h2>
                    <p className="text-sm text-zinc-500">Basic application preferences</p>
                  </div>
                  <div className="space-y-4">
                    {/* Auto Start */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Power size={18} className="text-zinc-400" />
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">
                              Launch at Startup
                            </span>
                            <span className="text-zinc-500 text-xs mt-0.5">
                              {localAutoStart
                                ? 'Toolify will start automatically when you log in'
                                : 'You need to start Toolify manually'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalAutoStart(!localAutoStart)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                            localAutoStart ? 'bg-blue-600' : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              localAutoStart ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dictation Settings Section */}
              {activeSection === 'dictation' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">
                      Dictation
                    </h2>
                    <p className="text-sm text-zinc-500">
                      Voice recording and transcription configuration
                    </p>
                  </div>
                  <div className="space-y-4">
                    {/* Local Model Toggle */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Zap size={18} className="text-zinc-400" />
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">Use Local Model</span>
                            <span className="text-zinc-500 text-xs mt-0.5">
                              {localUseLocalModel
                                ? 'Processing on your device (Offline)'
                                : 'Using OpenAI Cloud (Requires API Key)'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalUseLocalModel(!localUseLocalModel)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                            localUseLocalModel ? 'bg-blue-600' : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              localUseLocalModel ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {localUseLocalModel && (
                        <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-blue-300 text-xs font-medium mb-1">
                              First Time Setup
                            </p>
                            <p className="text-blue-200/80 text-xs leading-relaxed">
                              Using a local model requires downloading the model file (~140MB - 3GB
                              depending on model). Please download it before collecting audio.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-zinc-400 font-medium block">
                              Model Size
                            </label>
                            <select
                              value={localLocalModelType}
                              onChange={(e) => {
                                const newValue = e.target.value as
                                  | 'base'
                                  | 'small'
                                  | 'medium'
                                  | 'large-v3'
                                setLocalLocalModelType(newValue)

                                // Auto-save using all current local state values
                                window.api.saveSettings({
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
                                  localModelType: newValue
                                })

                                checkModelStatus(newValue)
                              }}
                              className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
                            >
                              <option value="base">Whisper Base (Fastest) (~140MB)</option>
                              <option value="small">Whisper Small (Balanced) (~460MB)</option>
                              <option value="medium">Whisper Medium (GGML) (~1.5GB)</option>
                              <option value="large-v3">Whisper Large V3 (GGML) (~2.9GB)</option>
                            </select>

                            <div className="flex items-center justify-between pt-2">
                              <div className="text-xs">
                                {modelDownloadStatus === 'ready' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-400 flex items-center gap-1">
                                      <Check size={12} /> Model Ready ({localLocalModelType})
                                    </span>
                                    <button
                                      title="Delete Local Model"
                                      onClick={async () => {
                                        if (
                                          confirm(
                                            `Are you sure you want to delete the ${localLocalModelType} model? You will need to download it again to use it.`
                                          )
                                        ) {
                                          await window.api.deleteLocalModel(localLocalModelType)
                                          checkModelStatus(localLocalModelType)
                                        }
                                      }}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                )}
                                {modelDownloadStatus === 'missing' && (
                                  <span className="text-zinc-500">Model not found</span>
                                )}
                                {modelDownloadStatus === 'downloading' && (
                                  <div className="flex flex-col gap-1.5 w-full">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-blue-400">Downloading...</span>
                                      {downloadProgress && downloadProgress.total > 0 && (
                                        <span className="text-blue-300 font-medium">
                                          {downloadProgress.percent}%
                                        </span>
                                      )}
                                    </div>
                                    {downloadProgress && downloadProgress.total > 0 && (
                                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                          style={{ width: `${downloadProgress.percent}%` }}
                                        />
                                      </div>
                                    )}
                                    {downloadProgress && downloadProgress.total > 0 && (
                                      <span className="text-zinc-500 text-[10px]">
                                        {(downloadProgress.downloaded / 1024 / 1024).toFixed(1)} MB
                                        / {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {(modelDownloadStatus === 'missing' ||
                                modelDownloadStatus === 'idle') && (
                                <button
                                  onClick={handleDownloadModel}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg transition-colors border border-blue-500/20"
                                >
                                  <Download size={12} />
                                  Download Model
                                </button>
                              )}

                              {modelDownloadStatus === 'downloading' && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-lg border border-white/5">
                                  <Loader2 size={12} className="animate-spin" />
                                  Downloading...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* API Key (Only if not using local model) */}
                    {!localUseLocalModel && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                          <Key size={12} />
                          <span>OpenAI API Key</span>
                        </div>
                        <div className="relative group">
                          <input
                            type="password"
                            value={localKey}
                            onChange={(e) => setLocalKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M3 4.5L6 7.5L9 4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-600 px-1">
                          Required for speech transcription and translation
                        </p>
                      </div>
                    )}

                    {/* Shortcut */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                        <Keyboard size={12} />
                        <span>Keyboard Shortcut</span>
                      </div>
                      <div className="relative group">
                        <select
                          value={localShortcut}
                          onChange={(e) => setLocalShortcut(e.target.value)}
                          className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
                        >
                          <optgroup label="Command Combinations">
                            <option value="Command+Space">⌘ Space</option>
                            <option value="Command+K">⌘ K</option>
                            <option value="Command+R">⌘ R</option>
                            <option value="Command+T">⌘ T</option>
                            <option value="Command+M">⌘ M</option>
                          </optgroup>
                          <optgroup label="Shift+Command Combinations">
                            <option value="Shift+Command+Space">⇧⌘ Space</option>
                            <option value="Shift+Command+K">⇧⌘ K</option>
                            <option value="Shift+Command+R">⇧⌘ R</option>
                            <option value="Shift+Command+T">⇧⌘ T</option>
                            <option value="Shift+Command+M">⇧⌘ M</option>
                          </optgroup>
                          <optgroup label="Control Combinations">
                            <option value="Control+Space">⌃ Space</option>
                            <option value="Control+K">⌃ K</option>
                            <option value="Control+R">⌃ R</option>
                          </optgroup>
                          <optgroup label="Option Combinations">
                            <option value="Option+Space">⌥ Space</option>
                            <option value="Option+K">⌥ K</option>
                            <option value="Option+R">⌥ R</option>
                            <option value="Shift+Option+R">⇧⌥ R</option>
                          </optgroup>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M3 4.5L6 7.5L9 4.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-600 px-1">
                        Press to start/stop recording
                      </p>
                    </div>

                    {/* Spoken Language */}
                    {(!localUseLocalModel || localTranslate) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                          <Languages size={12} />
                          <span>{localTranslate ? 'Source Language' : 'Spoken Language'}</span>
                        </div>
                        <div className="relative group">
                          <select
                            value={localSourceLanguage}
                            onChange={(e) => setLocalSourceLanguage(e.target.value)}
                            className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
                          >
                            <option value="auto">Auto Detect</option>
                            <option value="en">English</option>
                            <option value="tr">Turkish</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="it">Italian</option>
                            <option value="pt">Portuguese</option>
                            <option value="ru">Russian</option>
                            <option value="ja">Japanese</option>
                            <option value="ko">Korean</option>
                            <option value="zh">Chinese</option>
                            <option value="ar">Arabic</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M3 4.5L6 7.5L9 4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-600 px-1">
                          Language of the audio being recorded
                        </p>
                      </div>
                    )}

                    {/* Translation */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Globe size={18} className="text-zinc-400" />
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">Translation Mode</span>
                            <span className="text-zinc-500 text-xs mt-0.5">
                              {localTranslate
                                ? 'Translate speech between languages'
                                : 'Transcribe in original language'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalTranslate(!localTranslate)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                            localTranslate ? 'bg-blue-600' : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              localTranslate ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {localTranslate && (
                        <div className="pt-2 border-t border-white/5 space-y-2">
                          <div className="space-y-2">
                            <label className="text-zinc-400 text-xs font-medium flex items-center gap-2">
                              <Languages size={14} />
                              Translate To
                            </label>
                            <select
                              value={localTargetLanguage}
                              onChange={(e) => setLocalTargetLanguage(e.target.value)}
                              className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
                            >
                              <option value="en">English</option>
                              <option value="tr">Turkish</option>
                              <option value="es">Spanish</option>
                              <option value="fr">French</option>
                              <option value="de">German</option>
                              <option value="it">Italian</option>
                              <option value="pt">Portuguese</option>
                              <option value="ru">Russian</option>
                              <option value="ja">Japanese</option>
                              <option value="ko">Korean</option>
                              <option value="zh">Chinese</option>
                              <option value="ar">Arabic</option>
                            </select>
                            <p className="text-zinc-500 text-xs mt-1">
                              Source language will be auto-detected from your speech
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recording Overlay */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Radio size={18} className="text-zinc-400" />
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">
                              Recording Overlay
                            </span>
                            <span className="text-zinc-500 text-xs mt-0.5">
                              {localShowRecordingOverlay
                                ? 'Show waveform visualization'
                                : 'No visual indicator'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalShowRecordingOverlay(!localShowRecordingOverlay)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                            localShowRecordingOverlay ? 'bg-blue-600' : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              localShowRecordingOverlay ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Audio & Notifications Settings Section */}
              {activeSection === 'audio' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">
                      Audio & Notifications
                    </h2>
                    <p className="text-sm text-zinc-500">
                      Sound alerts and notification preferences
                    </p>
                  </div>
                  <div className="space-y-4">
                    {/* Process Notifications */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bell size={18} className="text-zinc-400" />
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">
                              Process Notifications
                            </span>
                            <span className="text-zinc-500 text-xs mt-0.5">
                              {localProcessNotifications
                                ? 'Show start/stop notifications'
                                : 'Only show errors'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalProcessNotifications(!localProcessNotifications)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                            localProcessNotifications ? 'bg-blue-600' : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              localProcessNotifications ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Sound Alert */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Volume2 size={18} className="text-zinc-400" />
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">Sound Alert</span>
                            <span className="text-zinc-500 text-xs mt-0.5">
                              {localSoundAlert ? 'Play sound on completion' : 'Silent mode'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalSoundAlert(!localSoundAlert)}
                          className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                            localSoundAlert ? 'bg-blue-600' : 'bg-white/10'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                              localSoundAlert ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {localSoundAlert && (
                        <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                          <label className="text-xs text-zinc-400 font-medium block mb-2">
                            Sound Type
                          </label>
                          <select
                            value={localSoundType}
                            onChange={(e) => {
                              const newSoundType = e.target.value
                              setLocalSoundType(newSoundType)
                              if (window.api.previewSound) {
                                window.api.previewSound(newSoundType)
                              }
                            }}
                            className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
                          >
                            <option value="Glass">Glass</option>
                            <option value="Hero">Hero</option>
                            <option value="Ping">Ping</option>
                            <option value="Pop">Pop</option>
                            <option value="Submarine">Submarine</option>
                            <option value="Basso">Basso</option>
                            <option value="Blow">Blow</option>
                            <option value="Bottle">Bottle</option>
                            <option value="Frog">Frog</option>
                            <option value="Funk">Funk</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* History Settings Section - Show in General */}
              {activeSection === 'general' && (
                <div className="space-y-6 pt-8 border-t border-white/5">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1.5 tracking-tight">
                      History
                    </h3>
                    <p className="text-sm text-zinc-500">
                      Manage transcription history storage and cleanup
                    </p>
                  </div>
                  <div className="space-y-4">
                    {/* Auto Delete Days */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                        <Trash2 size={12} />
                        <span>Auto Delete After (Days)</span>
                      </div>
                      <div className="relative group">
                        <input
                          type="number"
                          value={historyAutoDeleteDays}
                          onChange={(e) => setHistoryAutoDeleteDays(parseInt(e.target.value) || 0)}
                          min="0"
                          placeholder="0 = Never delete"
                          className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                      <p className="text-[10px] text-zinc-600 px-1">
                        {historyAutoDeleteDays === 0
                          ? 'History items will never be automatically deleted'
                          : `Items older than ${historyAutoDeleteDays} days will be automatically deleted`}
                      </p>
                    </div>

                    {/* Max Items */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                        <HistoryIcon size={12} />
                        <span>Maximum History Items</span>
                      </div>
                      <div className="relative group">
                        <input
                          type="number"
                          value={historyMaxItems}
                          onChange={(e) => setHistoryMaxItems(parseInt(e.target.value) || 0)}
                          min="0"
                          placeholder="0 = Unlimited"
                          className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                      </div>
                      <p className="text-[10px] text-zinc-600 px-1">
                        {historyMaxItems === 0
                          ? 'Unlimited history items'
                          : `Keep only the ${historyMaxItems} most recent items`}
                      </p>
                    </div>

                    {/* Clear Old History Button */}
                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                      <button
                        onClick={async () => {
                          if (window.api?.clearOldHistory) {
                            try {
                              const deletedCount = await window.api.clearOldHistory()
                              if (deletedCount > 0) {
                                alert(`Cleared ${deletedCount} old history item(s)`)
                              } else {
                                alert('No old items to clear')
                              }
                            } catch (error) {
                              console.error('Failed to clear old history:', error)
                              alert('Failed to clear old history')
                            }
                          }
                        }}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg px-4 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} />
                        <span>Clear Old History Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button - Only show on Settings tab */}
        {activeTab === 'settings' && (
          <div className="px-8 py-5 bg-[#1a1a1a] border-t border-white/5">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="text-xs text-zinc-500">Toolify v0.0.9</div>
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
                    <Check size={16} />
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
