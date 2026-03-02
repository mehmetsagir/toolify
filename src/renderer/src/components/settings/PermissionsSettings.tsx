import { useState, useEffect } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { ShieldCheck, Mic, MessageSquare, AlertTriangle, RotateCcw } from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'

type PermissionStatus = 'granted' | 'not_requested' | 'denied' | 'unknown'

interface PermissionState {
  accessibility: boolean | null
  microphone: PermissionStatus
  speechRecognition: { available: boolean; permissionGranted: boolean } | null
}

function StatusBadge({ status }: { status: PermissionStatus | boolean | null }): ReactElement {
  if (status === null) {
    return (
      <Badge variant="secondary" className="text-xs">
        Checking...
      </Badge>
    )
  }
  if (status === true || status === 'granted') {
    return (
      <Badge variant="success" className="text-xs">
        Granted
      </Badge>
    )
  }
  if (status === 'not_requested') {
    return (
      <Badge className="text-xs border-transparent bg-yellow-700 text-yellow-100 hover:bg-yellow-700">
        Not Requested
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" className="text-xs">
      Denied
    </Badge>
  )
}

interface PermissionRowProps {
  icon: ReactNode
  label: string
  description: string
  status: PermissionStatus | boolean | null
  action?: ReactElement
}

function PermissionRow({
  icon,
  label,
  description,
  status,
  action
}: PermissionRowProps): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-xl bg-black/24 p-1.5 text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          {icon}
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{label}</span>
            <StatusBadge status={status} />
          </div>
          <span className="text-xs text-zinc-500">{description}</span>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export default function PermissionsSettings(): ReactElement {
  const [permissions, setPermissions] = useState<PermissionState>({
    accessibility: null,
    microphone: 'unknown',
    speechRecognition: null
  })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  const refresh = async (): Promise<void> => {
    const [accessibility, microphone, stt] = await Promise.all([
      window.api.checkAccessibilityPermission(),
      window.api.checkMicrophonePermission() as Promise<PermissionStatus>,
      window.api.checkAppleStt()
    ])
    setPermissions({ accessibility, microphone, speechRecognition: stt })
  }

  useEffect(() => {
    refresh()
  }, [])

  const handleGrantAccessibility = async (): Promise<void> => {
    const granted = await window.api.requestAccessibilityPermission()
    if (!granted) {
      window.api.openAccessibilitySettings()
    }
    setTimeout(() => {
      void refresh()
    }, 1500)
  }

  const handleRequestMicrophone = async (): Promise<void> => {
    await window.api.requestMicrophonePermission()
    await refresh()
  }

  const handleRequestSpeech = async (): Promise<void> => {
    await window.api.requestSpeechRecognitionPermission()
    await refresh()
  }

  const handleReset = async (): Promise<void> => {
    setResetting(true)
    try {
      await window.api.resetPermissions()
      window.api.restartApp()
    } finally {
      setResetting(false)
      setShowResetConfirm(false)
    }
  }

  const micStatus: PermissionStatus =
    permissions.microphone === 'unknown' ? 'not_requested' : permissions.microphone

  const accessibilityAction =
    permissions.accessibility !== true ? (
      <Button size="sm" variant="outline" onClick={() => void handleGrantAccessibility()}>
        Grant
      </Button>
    ) : undefined

  const microphoneAction =
    micStatus !== 'granted' ? (
      <Button
        size="sm"
        variant="outline"
        onClick={
          micStatus === 'denied'
            ? () => window.api.openSystemPreferences('microphone')
            : handleRequestMicrophone
        }
      >
        {micStatus === 'denied' ? 'Open Settings' : 'Request'}
      </Button>
    ) : undefined

  const speechGranted = permissions.speechRecognition?.permissionGranted ?? true
  const speechAction =
    permissions.speechRecognition !== null && !speechGranted ? (
      <Button size="sm" variant="outline" onClick={handleRequestSpeech}>
        Request
      </Button>
    ) : undefined

  const speechStatus: PermissionStatus | null =
    permissions.speechRecognition === null
      ? null
      : permissions.speechRecognition.permissionGranted
        ? 'granted'
        : 'not_requested'

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-[20px] bg-white/[0.03] divide-y divide-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <PermissionRow
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Accessibility"
          description="Required to pause media while recording"
          status={permissions.accessibility}
          action={accessibilityAction}
        />
        <PermissionRow
          icon={<Mic className="h-4 w-4" />}
          label="Microphone"
          description="Required to capture your voice"
          status={micStatus}
          action={microphoneAction}
        />
        <PermissionRow
          icon={<MessageSquare className="h-4 w-4" />}
          label="Speech Recognition"
          description="Required for Apple Speech to Text provider"
          status={speechStatus}
          action={speechAction}
        />
      </div>

      {/* Reset permissions */}
      <div className="rounded-[20px] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        {!showResetConfirm ? (
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-zinc-200">Reset Permissions</span>
              <span className="text-xs text-zinc-500">
                Clear stored permission states and restart
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="text-yellow-400 border-yellow-900 hover:bg-yellow-950 hover:text-yellow-300"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset & Restart
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-sm text-yellow-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This will restart the app. Continue?
            </span>
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleReset} disabled={resetting}>
                {resetting ? 'Restarting...' : 'Confirm'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
