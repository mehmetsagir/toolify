import { Loader2, Mic } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

type RecordingMode = 'ready' | 'recording' | 'processing'

interface RecordingProps {
  isRecording: boolean
  isProcessing: boolean
  duration: number
  audioLevel: number
  spectrum: number[]
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function StatusMetric({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-zinc-100">{value}</div>
    </div>
  )
}

export default function Recording({
  isRecording,
  isProcessing,
  duration,
  audioLevel,
  spectrum
}: RecordingProps): React.ReactElement {
  const mode: RecordingMode = isProcessing ? 'processing' : isRecording ? 'recording' : 'ready'
  const levelValue = `${Math.round(audioLevel * 100)}%`
  const displaySpectrum =
    spectrum.length > 0
      ? spectrum.filter((_, index) => index % 8 === 0).slice(0, 12)
      : Array.from({ length: 12 }, () => 0.08)

  const content = {
    ready: {
      badge: 'Standby',
      title: 'Ready to capture',
      description:
        'Waiting for your shortcut. Audio capture starts instantly and stays out of the way.',
      accent: 'text-zinc-100',
      orbClass:
        'border-zinc-700/80 bg-[radial-gradient(circle_at_top,_rgba(113,113,122,0.2),_rgba(9,9,11,0.95)_70%)] text-zinc-100',
      ringClass: 'border-zinc-800/90',
      statusValue: 'Idle',
      activityValue: 'Armed',
      pipelineValue: 'Local'
    },
    recording: {
      badge: 'Live',
      title: 'Recording in progress',
      description:
        'Toolify is listening now. Keep speaking and stop when you are ready to transcribe.',
      accent: 'text-red-300',
      orbClass:
        'border-red-500/40 bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.32),_rgba(31,10,10,0.94)_72%)] text-red-200',
      ringClass: 'border-red-500/25',
      statusValue: 'Listening',
      activityValue: levelValue,
      pipelineValue: 'Buffered'
    },
    processing: {
      badge: 'Working',
      title: 'Processing latest capture',
      description:
        'The recording has stopped. The transcription pipeline is finishing the latest pass.',
      accent: 'text-blue-300',
      orbClass:
        'border-blue-500/40 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.3),_rgba(9,18,31,0.94)_72%)] text-blue-200',
      ringClass: 'border-blue-500/25',
      statusValue: 'Analyzing',
      activityValue: formatDuration(duration),
      pipelineValue: 'Transcribing'
    }
  }[mode]

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(63,63,70,0.2),_transparent_38%),linear-gradient(180deg,_rgba(24,24,27,0.92),_rgba(9,9,11,1))]" />
      <div className="absolute inset-x-10 top-10 h-px bg-gradient-to-r from-transparent via-zinc-700/70 to-transparent" />
      <div className="absolute inset-x-16 bottom-12 h-32 rounded-full bg-zinc-800/20 blur-3xl" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-zinc-800/90 bg-zinc-950/90 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.95)] backdrop-blur-xl">
        <div className="border-b border-zinc-800/80 bg-zinc-900/40 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Capture Console
              </div>
              <div className="mt-1 text-sm font-medium text-zinc-100">Voice dictation status</div>
            </div>
            <div
              className={cn(
                'rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                mode === 'recording' &&
                  'border-red-500/30 bg-red-500/10 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.18)]',
                mode === 'processing' &&
                  'border-blue-500/30 bg-blue-500/10 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.16)]',
                mode === 'ready' && 'border-zinc-700 bg-zinc-900/80 text-zinc-300'
              )}
            >
              {content.badge}
            </div>
          </div>
        </div>

        <div className="relative px-6 py-7">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(255,255,255,0.02),_transparent_38%)]" />

          <div className="relative flex flex-col items-center text-center">
            <div className="relative flex h-44 w-44 items-center justify-center">
              <div
                className={cn(
                  'absolute inset-3 rounded-full border opacity-90',
                  content.ringClass,
                  mode === 'recording' && 'animate-ping',
                  mode === 'processing' && 'animate-pulse'
                )}
              />
              <div
                className={cn(
                  'absolute inset-0 rounded-full border',
                  content.ringClass,
                  mode === 'recording' && 'animate-pulse',
                  mode === 'processing' && 'animate-pulse'
                )}
              />
              <div
                className={cn(
                  'relative flex h-32 w-32 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_60px_-30px_rgba(0,0,0,0.9)]',
                  content.orbClass
                )}
              >
                {mode === 'processing' ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : (
                  <Mic className={cn('h-10 w-10', content.accent)} />
                )}
              </div>
            </div>

            <div className="mt-2 max-w-sm">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                {content.title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{content.description}</p>
            </div>

            <div className="mt-6 grid w-full grid-cols-3 gap-2">
              <StatusMetric label="State" value={content.statusValue} />
              <StatusMetric
                label={mode === 'recording' ? 'Input' : 'Activity'}
                value={content.activityValue}
              />
              <StatusMetric
                label={mode === 'recording' ? 'Elapsed' : 'Pipeline'}
                value={mode === 'recording' ? formatDuration(duration) : content.pipelineValue}
              />
            </div>

            <div className="mt-4 w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                <span>Signal monitor</span>
                <span>
                  {mode === 'ready' ? 'Standby baseline' : `${displaySpectrum.length} bands`}
                </span>
              </div>
              <div className="mt-3 flex h-14 items-end gap-1.5">
                {displaySpectrum.map((value, index) => (
                  <div
                    key={`${mode}-${index}`}
                    className="flex-1 rounded-full bg-zinc-800/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <div
                      className={cn(
                        'w-full rounded-full transition-all duration-150',
                        mode === 'recording' && 'bg-red-300/90',
                        mode === 'processing' && 'bg-blue-300/90',
                        mode === 'ready' && 'bg-zinc-500/60'
                      )}
                      style={{ height: `${Math.max(10, Math.round(value * 100))}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
