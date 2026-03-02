import { useState, useEffect, useCallback, useRef } from 'react'

type MicrophoneStatus = 'granted' | 'denied' | 'not_requested' | 'restricted' | 'unknown'

interface AppleSttStatus {
  available: boolean
  permissionGranted: boolean
  supportsOnDevice?: boolean
  authStatus?: string
}

interface Permissions {
  accessibility: boolean
  microphone: MicrophoneStatus
  appleStt: AppleSttStatus
}

const POLL_INTERVAL_MS = 5000

const INITIAL_PERMISSIONS: Permissions = {
  accessibility: false,
  microphone: 'unknown',
  appleStt: { available: false, permissionGranted: false }
}

function normaliseMicStatus(raw: string): MicrophoneStatus {
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

export function usePermissions(): {
  permissions: Permissions
  checkPermissions: () => Promise<void>
} {
  const [permissions, setPermissions] = useState<Permissions>(INITIAL_PERMISSIONS)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkPermissions = useCallback(async () => {
    const [acc, mic, stt] = await Promise.all([
      window.api.checkAccessibilityPermission(),
      window.api.checkMicrophonePermission(),
      window.api.checkAppleStt()
    ])

    setPermissions({
      accessibility: acc,
      microphone: normaliseMicStatus(mic),
      appleStt: {
        available: stt.available,
        permissionGranted: stt.permissionGranted,
        supportsOnDevice: stt.supportsOnDevice,
        authStatus: stt.authStatus
      }
    })
  }, [])

  useEffect(() => {
    checkPermissions()

    pollRef.current = setInterval(checkPermissions, POLL_INTERVAL_MS)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [checkPermissions])

  return { permissions, checkPermissions }
}
