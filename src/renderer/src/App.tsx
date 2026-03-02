import { startTransition, useEffect, useState } from 'react'
import Recording from '@renderer/components/Recording'
import History from '@renderer/components/History'
import Settings from '@renderer/components/settings/Settings'
import { useRecording } from '@renderer/hooks/useRecording'

type View = 'recording' | 'settings' | 'history'

function getInitialView(): View {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'settings') return 'settings'
  if (hash === 'history') return 'history'
  return 'recording'
}

export default function App(): React.ReactElement {
  const [view, setView] = useState<View>(getInitialView)
  const recording = useRecording()

  useEffect(() => {
    const syncViewFromHash = (): void => {
      startTransition(() => {
        setView(getInitialView())
      })
    }

    window.addEventListener('hashchange', syncViewFromHash)
    return () => window.removeEventListener('hashchange', syncViewFromHash)
  }, [])

  if (view === 'settings') {
    return <Settings />
  }

  if (view === 'history') {
    return (
      <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.08),transparent_28%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.08),transparent_30%),linear-gradient(180deg,#09090b_0%,#111318_100%)] p-4 text-zinc-100">
        <History />
      </div>
    )
  }

  return (
    <Recording
      isRecording={recording.isRecording}
      isProcessing={recording.isProcessing}
      duration={recording.duration}
      audioLevel={recording.audioLevel}
      spectrum={recording.spectrum}
    />
  )
}
