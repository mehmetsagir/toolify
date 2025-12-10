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
  language: string
  setLanguage: (lang: string) => void
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
  localModelType: string
  setLocalModelType: (val: string) => void
  onSave?: (settings: {
    apiKey: string
    language: string
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
    localModelType: string
  }) => void
}

export const Settings: React.FC<SettingsProps> = ({
  apiKey: initialKey,
  setApiKey,
  language: initialLanguage,
  setLanguage,
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
  const [localLanguage, setLocalLanguage] = useState(initialLanguage)
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
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [historyAutoDeleteDays, setHistoryAutoDeleteDays] = useState(30)
  const [historyMaxItems, setHistoryMaxItems] = useState(0)
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings')
  const [activeSection, setActiveSection] = useState<string>('general')

  const [modelDownloadStatus, setModelDownloadStatus] = useState<'idle' | 'checking' | 'downloading' | 'ready' | 'missing'>('idle')

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
    try {
      await window.api.downloadLocalModel(localLocalModelType)
      setModelDownloadStatus('ready')
    } catch (error) {
      console.error('Failed to download model:', error)
      setModelDownloadStatus('missing')
      // You might want to show an error toast here
    }
  }

  // Check model status when toggle is on or model type changes
  useEffect(() => {
    if (localUseLocalModel) {
      checkModelStatus(localLocalModelType)
    }
  }, [localUseLocalModel, localLocalModelType])

  useEffect(() => {
    setLocalKey(initialKey)
    setLocalLanguage(initialLanguage)
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
    initialLanguage,
    initialSourceLanguage,
    initialTargetLanguage,
    initialShortcut,
    initialTranslate,
    initialTrayAnimations,
    initialProcessNotifications,
    initialSoundAlert,
    initialSoundType,
    initialAutoStart,
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
        setDownloadProgress(Math.round(progress.percent))
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
        language: localLanguage,
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
      setLanguage(localLanguage)
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
      setDownloadProgress(0)
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
    { id: 'general', label: 'Settings', icon: SettingsIcon },
    { id: 'dictation', label: 'Dictation', icon: Mic },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'history', label: 'History', icon: HistoryIcon }
  ]

  return (
    <div className="h-full w-full bg-zinc-950 flex">
      {/* Sidebar */}
      <div className="w-64 bg-zinc-900/50 border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-zinc-800/50 border border-white/10 overflow-hidden">
              <img src={appIcon} alt="Toolify" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Toolify</h1>
              <p className="text-xs text-zinc-500">Dictation Tool</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {/* Dictation Section Header */}
          <div className="px-3 py-2 mb-2">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              <Mic size={12} />
              <span>Dictation</span>
            </div>
          </div>

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
                className={`no-drag w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-1 ml-2 border ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-transparent'
                }`}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            <div className="p-8 space-y-8">
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
                                <span>{downloadProgress}%</span>
                              </div>
                              <div className="w-full bg-blue-500/20 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full transition-all duration-300"
                                  style={{ width: `${downloadProgress}%` }}
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
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">General Settings</h2>
                    <p className="text-sm text-zinc-400">Configure basic application settings</p>
                  </div>
                  <div className="space-y-4">
                    {/* Auto Start */}
                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg transition-colors ${localAutoStart ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}
                          >
                            <Power size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-200 text-sm font-medium">
                              Launch at Startup
                            </span>
                            <span className="text-zinc-500 text-xs">
                              {localAutoStart
                                ? 'Toolify will start automatically when you log in'
                                : 'You need to start Toolify manually'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalAutoStart(!localAutoStart)}
                          className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-blue-500/50 ${
                            localAutoStart ? 'bg-blue-600' : 'bg-zinc-800'
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                              localAutoStart ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          >
                            {localAutoStart && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check size={10} className="text-blue-600" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dictation Settings Section */}
              {activeSection === 'dictation' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">Dictation Settings</h2>
                    <p className="text-sm text-zinc-400">
                      Configure voice recording and transcription options
                    </p>
                  </div>
                  <div className="space-y-4">


                    {/* Local Model Toggle */}
                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg transition-colors ${localUseLocalModel ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}
                          >
                            <Zap size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-200 text-sm font-medium">Use Local Model</span>
                            <span className="text-zinc-500 text-xs">
                              {localUseLocalModel
                                ? 'Processing on your device (Offline)'
                                : 'Using OpenAI Cloud (Requires API Key)'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalUseLocalModel(!localUseLocalModel)}
                          className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-green-500/50 ${
                            localUseLocalModel ? 'bg-green-600' : 'bg-zinc-800'
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                              localUseLocalModel ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          >
                            {localUseLocalModel && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check size={10} className="text-green-600" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>

                      {localUseLocalModel && (
                        <div className="pt-2 border-t border-white/5 space-y-3">
                          <div className="space-y-2">
                             <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs">
                               <p className="text-blue-300 font-medium mb-1">First Time Setup</p>
                               <p className="text-blue-200/80">Using a local model requires downloading the model file (~140MB - 3GB depending on model). Please download it before collecting audio.</p>
                             </div>
                             <label className="text-zinc-400 text-xs font-medium block">Model Size</label>
                             <select
                               value={localLocalModelType}
                               onChange={(e) => {
                                 const newValue = e.target.value
                                 setLocalLocalModelType(newValue)
                                 
                                 // Auto-save using all current local state values
                                 window.api.saveSettings({
                                    apiKey: localKey,
                                    language: localLanguage,
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
                                    localModelType: newValue as any
                                 })
                                 
                                 checkModelStatus(newValue)
                               }}
                               className="w-full bg-zinc-900/50 text-white rounded-lg p-2.5 text-sm border border-white/10 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all cursor-pointer"
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
                                     <span className="text-green-400 flex items-center gap-1"><Check size={12}/> Model Ready ({localLocalModelType})</span>
                                     <button
                                       title="Delete Local Model"
                                       onClick={async () => {
                                         if (confirm(`Are you sure you want to delete the ${localLocalModelType} model? You will need to download it again to use it.`)) {
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
                                 {modelDownloadStatus === 'missing' && <span className="text-zinc-500">Model not found</span>}
                                 {modelDownloadStatus === 'downloading' && <span className="text-blue-400">Downloading...</span>}
                               </div>

                               {(modelDownloadStatus === 'missing' || modelDownloadStatus === 'idle') && (
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
                          className="w-full bg-zinc-900/50 text-white rounded-xl p-3 pl-4 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
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
                          className="w-full bg-zinc-900/50 text-white rounded-xl p-3 pl-4 text-sm border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10"
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
                    {!localUseLocalModel && (
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                         <Languages size={12} />
                         <span>Spoken Language</span>
                       </div>
                       <div className="relative group">
                         <select
                           value={localSourceLanguage}
                           onChange={(e) => setLocalSourceLanguage(e.target.value)}
                           className="w-full bg-zinc-900/50 text-white rounded-xl p-3 pl-4 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
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
                           <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                             <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                         </div>
                       </div>
                       <p className="text-[10px] text-zinc-600 px-1">
                         Language of the audio being recorded
                       </p>
                    </div>
                    )}

                    {/* Translation */}
                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg transition-colors ${localTranslate ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}
                          >
                            <Globe size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-200 text-sm font-medium">
                              Translation Mode
                            </span>
                            <span className="text-zinc-500 text-xs">
                              {localTranslate
                                ? 'Translate speech between languages'
                                : 'Transcribe in original language'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalTranslate(!localTranslate)}
                          className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-blue-500/50 ${
                            localTranslate ? 'bg-blue-600' : 'bg-zinc-800'
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                              localTranslate ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          >
                            {localTranslate && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check size={10} className="text-blue-600" strokeWidth={3} />
                              </div>
                            )}
                          </div>
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
                              className="w-full bg-zinc-900/50 text-white rounded-lg p-2.5 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer"
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
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recording Overlay */}
                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg transition-colors ${localShowRecordingOverlay ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}
                          >
                            <Radio size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-200 text-sm font-medium">
                              Recording Overlay
                            </span>
                            <span className="text-zinc-500 text-xs">
                              {localShowRecordingOverlay
                                ? 'Show waveform visualization'
                                : 'No visual indicator'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalShowRecordingOverlay(!localShowRecordingOverlay)}
                          className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-red-500/50 ${
                            localShowRecordingOverlay ? 'bg-red-600' : 'bg-zinc-800'
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                              localShowRecordingOverlay ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          >
                            {localShowRecordingOverlay && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check size={10} className="text-red-600" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Settings Section */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">Notifications</h2>
                    <p className="text-sm text-zinc-400">
                      Configure alerts and notification preferences
                    </p>
                  </div>
                  <div className="space-y-3">
                    {/* Process Notifications */}
                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg transition-colors ${localProcessNotifications ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}
                          >
                            <Bell size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-200 text-sm font-medium">
                              Process Notifications
                            </span>
                            <span className="text-zinc-500 text-xs">
                              {localProcessNotifications
                                ? 'Show start/stop notifications'
                                : 'Only show errors'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalProcessNotifications(!localProcessNotifications)}
                          className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-green-500/50 ${
                            localProcessNotifications ? 'bg-green-600' : 'bg-zinc-800'
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                              localProcessNotifications ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          >
                            {localProcessNotifications && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check size={10} className="text-green-600" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Sound Alert */}
                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg transition-colors ${localSoundAlert ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-500'}`}
                          >
                            <Volume2 size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-200 text-sm font-medium">Sound Alert</span>
                            <span className="text-zinc-500 text-xs">
                              {localSoundAlert ? 'Play sound on completion' : 'Silent mode'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setLocalSoundAlert(!localSoundAlert)}
                          className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-orange-500/50 ${
                            localSoundAlert ? 'bg-orange-600' : 'bg-zinc-800'
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                              localSoundAlert ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          >
                            {localSoundAlert && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check size={10} className="text-orange-600" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </button>
                      </div>

                      {localSoundAlert && (
                        <div className="space-y-2 mt-4">
                          <select
                            value={localSoundType}
                            onChange={(e) => {
                              const newSoundType = e.target.value
                              setLocalSoundType(newSoundType)
                              if (window.api.previewSound) {
                                window.api.previewSound(newSoundType)
                              }
                            }}
                            className="w-full bg-zinc-900/50 text-white rounded-xl p-3 pl-4 text-sm border border-white/10 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10"
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
                <div className="space-y-6 pt-6 border-t border-white/5">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">History Settings</h2>
                    <p className="text-sm text-zinc-400">
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
                          className="w-full bg-zinc-900/50 text-white rounded-xl p-3 pl-4 text-sm border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
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
                          className="w-full bg-zinc-900/50 text-white rounded-xl p-3 pl-4 text-sm border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
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
          <div className="px-8 py-4 bg-zinc-950 border-t border-white/5">
            <button
              onClick={handleSave}
              disabled={saved}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                saved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                  : 'bg-white text-black hover:bg-zinc-200'
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

            {/* Footer */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <p className="text-zinc-600 text-[10px] font-medium tracking-widest uppercase pt-2">
                Toolify v0.0.5
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
