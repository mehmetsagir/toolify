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
  Zap
} from 'lucide-react'

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
  const [saved, setSaved] = useState(false)
  const [accessibilityGranted, setAccessibilityGranted] = useState<boolean | null>(null)
  const [accessibilityRequired, setAccessibilityRequired] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDownloaded, setUpdateDownloaded] = useState(false)
  const [latestVersion, setLatestVersion] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

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
    initialShowRecordingOverlay
  ])

  useEffect(() => {
    const checkPermission = async () => {
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

    const checkUpdates = async () => {
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

    if (window.api?.onUpdateAvailable) {
      const unsubscribe1 = window.api.onUpdateAvailable((info) => {
        setUpdateAvailable(true)
        setLatestVersion(info.version)
      })

      const unsubscribe2 = window.api.onUpdateDownloaded((info) => {
        setUpdateDownloaded(true)
        setDownloading(false)
        setLatestVersion(info.version)
      })

      const unsubscribe3 = window.api.onUpdateDownloadProgress((progress) => {
        setDownloadProgress(Math.round(progress.percent))
      })

      return () => {
        unsubscribe1()
        unsubscribe2()
        unsubscribe3()
      }
    }

    const interval = setInterval(checkPermission, 5000)
    return () => clearInterval(interval)
  }, [localShortcut])

  useEffect(() => {
    if (window.api?.resizeSettingsWindow) {
      const height = localTranslate ? 1100 : 950
      window.api.resizeSettingsWindow(height)
    }
  }, [localTranslate])

  const handleSave = () => {
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
        showRecordingOverlay: localShowRecordingOverlay
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
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDownloadUpdate = async () => {
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

  const handleQuitAndInstall = async () => {
    if (window.api?.quitAndInstall) {
      try {
        await window.api.quitAndInstall()
      } catch (error) {
        console.error('Failed to quit and install:', error)
      }
    }
  }

  return (
    <div className="h-full w-full bg-zinc-950 flex flex-col">
      <div className="space-y-6 no-drag overflow-y-auto pr-2 flex-1 custom-scrollbar p-8 pb-4">
        {/* Update Available Banner */}
        {updateAvailable && !updateDownloaded && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 flex-shrink-0">
                <Sparkles size={18} />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-blue-400 font-medium text-sm">New Update Available</h3>
                  <span className="text-blue-300 text-xs font-mono">{latestVersion}</span>
                </div>
                <p className="text-blue-300/80 text-xs leading-relaxed">
                  A new version of Toolify is available. Download and install to get the latest
                  features and improvements.
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
                  <h3 className="text-green-400 font-medium text-sm">Update Ready to Install</h3>
                  <span className="text-green-300 text-xs font-mono">{latestVersion}</span>
                </div>
                <p className="text-green-300/80 text-xs leading-relaxed">
                  The update has been downloaded. Click below to quit and install the new version.
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

        {/* Accessibility Permission Warning - Only show if permission is NOT granted */}
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
                  Accessibility permission is required for global shortcuts and auto-paste feature.
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
        {/* API Key Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
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
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
          </div>
        </div>

        {/* Shortcut Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Keyboard size={12} />
            <span>Global Shortcut</span>
          </div>
          <div className="relative group">
            <select
              value={localShortcut}
              onChange={(e) => setLocalShortcut(e.target.value)}
              className="w-full bg-zinc-900/50 text-white rounded-xl p-3 pl-4 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none pr-10"
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
            {localShortcut === 'LeftCommand' ||
            localShortcut === 'RightCommand' ||
            localShortcut === 'LeftOption' ||
            localShortcut === 'RightOption'
              ? 'Hold the key for 300ms to trigger (prevents conflicts with system shortcuts)'
              : localShortcut.startsWith('F')
                ? 'Press the function key to toggle recording'
                : 'Press all keys together to toggle recording'}
            {(localShortcut === 'LeftCommand' || localShortcut === 'RightCommand') && <br />}
            {(localShortcut === 'LeftCommand' || localShortcut === 'RightCommand') && (
              <span className="text-yellow-500/80 font-medium">
                ⚠️ Warning: Single Command key may interfere with system shortcuts. Use combinations
                (⌘+Space) for better reliability.
              </span>
            )}
          </p>
        </div>

        {/* Translation Section */}
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${localTranslate ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}
              >
                <Globe size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-200 text-sm font-medium">Translation</span>
                <span className="text-zinc-500 text-xs">
                  {localTranslate
                    ? 'Translate audio from source language to target language'
                    : 'Transcribe audio directly without translation'}
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

          {/* Language Selection - Only visible when translation is enabled */}
          {localTranslate && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              {/* Source Language */}
              <div className="space-y-2">
                <label className="text-zinc-400 text-xs font-medium flex items-center gap-2">
                  <Languages size={14} />
                  Source Language
                </label>
                <select
                  value={localSourceLanguage}
                  onChange={(e) => setLocalSourceLanguage(e.target.value)}
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

              {/* Target Language */}
              <div className="space-y-2">
                <label className="text-zinc-400 text-xs font-medium flex items-center gap-2">
                  <Languages size={14} />
                  Target Language
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

        {/* Tray Animations Section */}
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${localTrayAnimations ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}
              >
                <Sparkles size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-200 text-sm font-medium">Tray Animations</span>
                <span className="text-zinc-500 text-xs">
                  {localTrayAnimations
                    ? 'Show animated popup notifications in the menu bar'
                    : 'Use system notifications instead of popups'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setLocalTrayAnimations(!localTrayAnimations)}
              className={`w-12 h-7 rounded-full relative transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-purple-500/50 ${
                localTrayAnimations ? 'bg-purple-600' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                  localTrayAnimations ? 'translate-x-5' : 'translate-x-0'
                }`}
              >
                {localTrayAnimations && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check size={10} className="text-purple-600" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Process Notifications Section */}
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${localProcessNotifications ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}
              >
                <Bell size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-200 text-sm font-medium">Process Notifications</span>
                <span className="text-zinc-500 text-xs">
                  {localProcessNotifications
                    ? 'Show notifications for recording start, stop, and processing'
                    : 'Disable process notifications (only error notifications will be shown)'}
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

        {/* Recording Overlay Section */}
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${localShowRecordingOverlay ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}
              >
                <Radio size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-200 text-sm font-medium">Recording Overlay</span>
                <span className="text-zinc-500 text-xs">
                  {localShowRecordingOverlay
                    ? 'Show waveform visualization overlay while recording'
                    : 'Hide overlay during recording (no visual indicator)'}
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

        {/* Auto Start Section */}
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg transition-colors ${localAutoStart ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}
              >
                <Power size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-zinc-200 text-sm font-medium">Auto Start</span>
                <span className="text-zinc-500 text-xs">
                  {localAutoStart
                    ? 'Start Toolify automatically when your computer boots'
                    : 'Manual start required (app will not start on boot)'}
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

        {/* Sound Alert Section */}
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
                  {localSoundAlert
                    ? 'Play selected sound when transcription/translation completes'
                    : 'Disable sound alerts'}
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

          {/* Sound Type Selection */}
          {localSoundAlert && (
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium uppercase tracking-wider">
                <Volume2 size={12} />
                <span>Sound Type</span>
              </div>
              <div className="relative group">
                <select
                  value={localSoundType}
                  onChange={(e) => {
                    const newSoundType = e.target.value
                    setLocalSoundType(newSoundType)
                    // Preview the sound when user selects it (always play, even if sound alert is off)
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
                Selected sound will automatically play when transcription/translation completes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button - Fixed at bottom */}
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
            Toolify v0.0.3
          </p>
        </div>
      </div>
    </div>
  )
}
