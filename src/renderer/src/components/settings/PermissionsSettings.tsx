import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Accessibility,
  Mic,
  MessageSquare,
  ExternalLink,
  Check,
  X,
  Info
} from 'lucide-react'
import type { TranscriptionProvider } from '../../../../shared/types'

type PermissionStatus = 'granted' | 'denied' | 'not_requested' | 'checking'

interface PermissionItem {
  id: string
  name: string
  description: string
  icon: React.ElementType
  status: PermissionStatus
  panelKey: string
  canRequest?: boolean
}

interface PermissionsSettingsProps {
  transcriptionProvider: TranscriptionProvider
  onPermissionStatusChange?: (hasIssue: boolean) => void
}

export const PermissionsSettings: React.FC<PermissionsSettingsProps> = ({
  transcriptionProvider,
  onPermissionStatusChange
}) => {
  const [accessibilityStatus, setAccessibilityStatus] = useState<PermissionStatus>('checking')
  const [microphoneStatus, setMicrophoneStatus] = useState<PermissionStatus>('checking')
  const [speechRecognitionStatus, setSpeechRecognitionStatus] =
    useState<PermissionStatus>('checking')

  const isAppleStt = transcriptionProvider === 'apple-stt'

  const checkAllPermissions = useCallback(async () => {
    // Accessibility
    if (window.api?.checkAccessibilityPermission) {
      try {
        const result = await window.api.checkAccessibilityPermission()
        setAccessibilityStatus(result.granted ? 'granted' : 'denied')
      } catch {
        setAccessibilityStatus('denied')
      }
    }

    // Microphone
    if (window.api?.checkMicrophonePermission) {
      try {
        const result = await window.api.checkMicrophonePermission()
        if (result === 'granted') {
          setMicrophoneStatus('granted')
        } else if (result === 'not-determined') {
          setMicrophoneStatus('not_requested')
        } else {
          setMicrophoneStatus('denied')
        }
      } catch {
        setMicrophoneStatus('denied')
      }
    }

    // Speech Recognition
    if (window.api?.checkAppleStt) {
      try {
        const result = await window.api.checkAppleStt()
        if (result.permissionGranted) {
          setSpeechRecognitionStatus('granted')
        } else if (result.authStatus === 'denied' || result.authStatus === 'restricted') {
          setSpeechRecognitionStatus('denied')
        } else {
          setSpeechRecognitionStatus('not_requested')
        }
      } catch {
        setSpeechRecognitionStatus('not_requested')
      }
    }
  }, [])

  useEffect(() => {
    checkAllPermissions()
    const interval = setInterval(checkAllPermissions, 5000)
    return () => clearInterval(interval)
  }, [checkAllPermissions])

  useEffect(() => {
    if (accessibilityStatus === 'checking' || microphoneStatus === 'checking') {
      return
    }
    let hasIssue = accessibilityStatus === 'denied' || microphoneStatus === 'denied'
    // 'not_requested' for microphone is not an issue - macOS will prompt on first use
    // Only count speech recognition as an issue when Apple STT is active
    if (
      isAppleStt &&
      speechRecognitionStatus !== 'checking' &&
      speechRecognitionStatus !== 'granted'
    ) {
      hasIssue = true
    }
    onPermissionStatusChange?.(hasIssue)
  }, [
    accessibilityStatus,
    microphoneStatus,
    speechRecognitionStatus,
    isAppleStt,
    onPermissionStatusChange
  ])

  const handleOpenSystemPreferences = (panel: string): void => {
    if (window.api?.openSystemPreferences) {
      window.api.openSystemPreferences(panel)
    }
  }

  const handleRequestMicrophone = async (): Promise<void> => {
    if (window.api?.requestMicrophonePermission) {
      try {
        const granted = await window.api.requestMicrophonePermission()
        setMicrophoneStatus(granted ? 'granted' : 'denied')
      } catch {
        setMicrophoneStatus('denied')
      }
    }
  }

  const [requestingSpeechPermission, setRequestingSpeechPermission] = useState(false)

  const handleRequestSpeechRecognition = async (): Promise<void> => {
    if (window.api?.requestSpeechRecognitionPermission) {
      setRequestingSpeechPermission(true)
      try {
        const result = await window.api.requestSpeechRecognitionPermission()
        if (result.granted) {
          setSpeechRecognitionStatus('granted')
        } else if (result.alreadyDenied) {
          setSpeechRecognitionStatus('denied')
        }
      } catch {
        // ignore
      } finally {
        setRequestingSpeechPermission(false)
        // Re-check all permissions to update states
        checkAllPermissions()
      }
    }
  }

  const permissions: PermissionItem[] = [
    {
      id: 'accessibility',
      name: 'Accessibility',
      description: 'Required for global shortcuts and auto-paste functionality.',
      icon: Accessibility,
      status: accessibilityStatus,
      panelKey: 'accessibility'
    },
    {
      id: 'microphone',
      name: 'Microphone',
      description: 'Required for voice recording and transcription.',
      icon: Mic,
      status: microphoneStatus,
      panelKey: 'microphone',
      canRequest: microphoneStatus === 'not_requested' || microphoneStatus === 'denied'
    },
    {
      id: 'speechRecognition',
      name: 'Speech Recognition',
      description:
        speechRecognitionStatus === 'granted'
          ? 'Granted for Apple Speech transcription mode.'
          : isAppleStt
            ? 'macOS will prompt for permission on your first recording.'
            : 'Only needed when using Apple Speech mode.',
      icon: MessageSquare,
      status: speechRecognitionStatus,
      panelKey: 'speechRecognition'
    }
  ]

  const getBadge = (perm: PermissionItem): React.ReactNode => {
    if (perm.status === 'checking') return null

    if (perm.status === 'granted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/20 text-green-400">
          <Check size={10} /> Granted
        </span>
      )
    }

    // Speech Recognition: show "Not Requested" when not using Apple STT
    if (perm.id === 'speechRecognition' && !isAppleStt) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-500/20 text-zinc-400">
          <Info size={10} /> Not Required
        </span>
      )
    }

    if (perm.status === 'not_requested') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
          <Info size={10} /> Not Requested
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400">
        <X size={10} /> Not Granted
      </span>
    )
  }

  const showActions = (perm: PermissionItem): boolean => {
    if (perm.status === 'granted' || perm.status === 'checking') return false
    // Don't show actions for speech recognition when not using Apple STT
    if (perm.id === 'speechRecognition' && !isAppleStt) return false
    return true
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">Permissions</h2>
        <p className="text-sm text-zinc-500">
          Manage system permissions required for Toolify to function properly
        </p>
      </div>
      <div className="space-y-4">
        {permissions.map((perm) => {
          const Icon = perm.icon

          return (
            <div key={perm.id} className="bg-white/5 rounded-lg p-4 border border-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-white/5 text-zinc-400 flex-shrink-0 mt-0.5">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{perm.name}</span>
                      {getBadge(perm)}
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">{perm.description}</p>
                  </div>
                </div>
              </div>

              {showActions(perm) && (
                <div className="flex gap-2 mt-3 ml-11">
                  {/* Microphone: Grant Permission */}
                  {perm.canRequest && (
                    <button
                      onClick={handleRequestMicrophone}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-colors"
                    >
                      <Shield size={12} />
                      <span>Grant Permission</span>
                    </button>
                  )}
                  {/* Speech Recognition: Request Permission (triggers macOS prompt) */}
                  {perm.id === 'speechRecognition' && perm.status === 'not_requested' && (
                    <button
                      onClick={handleRequestSpeechRecognition}
                      disabled={requestingSpeechPermission}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Shield size={12} />
                      <span>
                        {requestingSpeechPermission ? 'Requesting...' : 'Request Permission'}
                      </span>
                    </button>
                  )}
                  {/* Open System Settings (only for denied permissions or non-speech-recognition) */}
                  {!(perm.id === 'speechRecognition' && perm.status === 'not_requested') && (
                    <button
                      onClick={() => handleOpenSystemPreferences(perm.panelKey)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-lg transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span>Open System Settings</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
