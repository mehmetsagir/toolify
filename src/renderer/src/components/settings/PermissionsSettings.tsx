import { useState, useEffect, useCallback } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { ShieldCheck, Mic, MessageSquare, AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'

type PermissionStatus = 'granted' | 'not_requested' | 'denied' | 'restricted' | 'unknown'

interface PermissionState {
  accessibility: boolean | null
  microphone: PermissionStatus
  speechRecognition: {
    available: boolean
    permissionGranted: boolean
    authStatus?: string
  } | null
}

function normaliseMicrophoneStatus(raw: string): PermissionStatus {
  switch (raw) {
    case 'granted':
      return 'granted'
    case 'denied':
      return 'denied'
    case 'restricted':
      return 'restricted'
    case 'not-determined':
      return 'not_requested'
    default:
      return 'unknown'
  }
}

function normaliseSpeechStatus(
  speechRecognition: PermissionState['speechRecognition']
): PermissionStatus | null {
  if (speechRecognition === null) return null
  if (speechRecognition.permissionGranted) return 'granted'

  switch (speechRecognition.authStatus) {
    case 'denied':
      return 'denied'
    case 'restricted':
      return 'restricted'
    case 'notDetermined':
      return 'not_requested'
    default:
      return speechRecognition.available ? 'not_requested' : 'unknown'
  }
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
  if (status === 'restricted') {
    return (
      <Badge className="text-xs border-transparent bg-zinc-700 text-zinc-100 hover:bg-zinc-700">
        Restricted
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

function DiagnosticsRow({
  label,
  value,
  note
}: {
  label: string
  value: string
  note: string
}): ReactElement {
  return (
    <div className="rounded-2xl bg-black/15 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          {label}
        </span>
        <span className="text-sm font-medium text-zinc-200">{value}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{note}</p>
    </div>
  )
}

export default function PermissionsSettings(): ReactElement {
  const [permissions, setPermissions] = useState<PermissionState>({
    accessibility: null,
    microphone: 'unknown',
    speechRecognition: null
  })
  const [refreshing, setRefreshing] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshing(true)
    try {
      const [accessibility, microphone, stt] = await Promise.all([
        window.api.checkAccessibilityPermission(),
        window.api.checkMicrophonePermission(),
        window.api.checkAppleStt()
      ])
      setPermissions({
        accessibility,
        microphone: normaliseMicrophoneStatus(microphone),
        speechRecognition: stt
      })
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()

    const handleFocus = (): void => {
      void refresh()
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

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
    const granted = await window.api.requestMicrophonePermission()
    await refresh()
    if (!granted) {
      window.api.openSystemPreferences('microphone')
    }
  }

  const handleRequestSpeech = async (): Promise<void> => {
    const result = await window.api.requestSpeechRecognitionPermission()
    await refresh()
    if (!result.granted) {
      window.api.openSystemPreferences('speechRecognition')
    }
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

  const micStatus = permissions.microphone

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
          micStatus === 'denied' || micStatus === 'restricted'
            ? () => window.api.openSystemPreferences('microphone')
            : () => void handleRequestMicrophone()
        }
      >
        {micStatus === 'denied' || micStatus === 'restricted' ? 'Open Settings' : 'Request'}
      </Button>
    ) : undefined

  const speechGranted = permissions.speechRecognition?.permissionGranted ?? true
  const speechStatus = normaliseSpeechStatus(permissions.speechRecognition)
  const isDevEnvironment = window.location.protocol === 'http:'
  const speechAction =
    permissions.speechRecognition !== null && !speechGranted ? (
      <Button size="sm" variant="outline" onClick={() => void handleRequestSpeech()}>
        {speechStatus === 'denied' || speechStatus === 'restricted' ? 'Open Settings' : 'Request'}
      </Button>
    ) : undefined

  const environmentLabel = isDevEnvironment ? 'Development' : 'Packaged app'
  const microphoneLabel =
    micStatus === 'granted'
      ? 'Granted'
      : micStatus === 'denied'
        ? 'Denied'
        : micStatus === 'restricted'
          ? 'Restricted'
          : micStatus === 'not_requested'
            ? 'Not requested'
            : 'Unknown'
  const accessibilityLabel =
    permissions.accessibility === true
      ? 'Granted'
      : permissions.accessibility === false
        ? 'Needs manual enable'
        : 'Checking'
  const speechLabel =
    speechStatus === 'granted'
      ? 'Granted'
      : speechStatus === 'denied'
        ? 'Denied'
        : speechStatus === 'restricted'
          ? 'Restricted'
          : speechStatus === 'not_requested'
            ? 'Not requested'
            : speechStatus === null
              ? 'Checking'
              : 'Unknown'

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
          description="Required for the Apple Speech provider. macOS may list it as Toolify Speech."
          status={speechStatus}
          action={speechAction}
        />
      </div>

      <div className="rounded-[20px] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-zinc-200">What this means</div>
            <p className="text-xs leading-5 text-zinc-500">
              Bu alan macOS izinlerini yorumlar. Bazen izin verilmiş olsa bile System Settings
              değişikliği uygulamaya geç yansıyabilir; bu yüzden ayarlardan dönünce `Refresh`
              kullanabilir veya uygulamayı yeniden açabilirsin.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <DiagnosticsRow
            label="Environment"
            value={environmentLabel}
            note={
              isDevEnvironment
                ? 'Dev modda macOS izinleri bazen Toolify yerine Terminal veya iTerm altında görünür.'
                : 'Packaged app testinde izinler gerçek Toolify bundle kimliği üzerinden takip edilir.'
            }
          />
          <DiagnosticsRow
            label="Microphone"
            value={microphoneLabel}
            note="Microphone izni System Settings > Privacy & Security > Microphone altında Toolify olarak görünmelidir."
          />
          <DiagnosticsRow
            label="Accessibility"
            value={accessibilityLabel}
            note="Accessibility izni bazen prompt yerine doğrudan ayarlardan manuel açma ister; bu macOS davranışıdır."
          />
          <DiagnosticsRow
            label="Speech"
            value={speechLabel}
            note="Apple Speech provider izni macOS içinde Toolify yerine Toolify Speech adıyla görünebilir."
          />
        </div>
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
