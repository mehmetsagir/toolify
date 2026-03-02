import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { AudioLines, CheckCircle2, ChevronRight, Mic, Shield, Sparkles } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Progress } from '@renderer/components/ui/progress'
import { cn } from '@renderer/lib/utils'
import { usePermissions } from '@renderer/hooks/usePermissions'
import type { Settings, TranscriptionProvider } from '../../../../shared/types'
import type { ReactNode } from 'react'

type StepId = 'welcome' | 'microphone' | 'accessibility' | 'speech' | 'finish'

interface OnboardingFlowProps {
  settings: Settings
  saveSettings: (updates: Partial<Settings>) => void
  onClose: () => void
}

const PROVIDERS: Array<{
  value: TranscriptionProvider
  label: string
  note: string
}> = [
  { value: 'openai', label: 'OpenAI Whisper', note: 'Best default when you have an API key.' },
  { value: 'apple-stt', label: 'Apple Speech', note: 'Native dictation on macOS.' },
  { value: 'local-whisper', label: 'Local Whisper', note: 'Offline transcription on-device.' }
]

const STEP_ORDER: StepId[] = ['welcome', 'microphone', 'accessibility', 'speech', 'finish']

export default function OnboardingFlow({
  settings,
  saveSettings,
  onClose
}: OnboardingFlowProps): ReactElement {
  const { permissions, checkPermissions } = usePermissions()
  const [step, setStep] = useState<StepId>('welcome')
  const [pendingAction, setPendingAction] = useState<
    'microphone' | 'accessibility' | 'speech' | null
  >(null)

  const microphoneGranted = permissions.microphone === 'granted'
  const accessibilityGranted = permissions.accessibility === true
  const speechGranted = permissions.appleStt.permissionGranted === true
  const requiredReady = microphoneGranted && accessibilityGranted
  const currentIndex = STEP_ORDER.indexOf(step)
  const progressValue = ((currentIndex + 1) / STEP_ORDER.length) * 100

  const summary = useMemo(
    () => [
      {
        label: 'Microphone',
        status: microphoneGranted ? 'Ready' : 'Needs access'
      },
      {
        label: 'Accessibility',
        status: accessibilityGranted ? 'Ready' : 'Needs access'
      },
      {
        label: 'Speech',
        status: speechGranted ? 'Ready' : 'Optional'
      }
    ],
    [accessibilityGranted, microphoneGranted, speechGranted]
  )

  useEffect(() => {
    if (step === 'finish' && !requiredReady) {
      setStep('microphone')
    }
  }, [requiredReady, step])

  const goNext = (): void => {
    const next = STEP_ORDER[currentIndex + 1]
    if (next) setStep(next)
  }

  const completeOnboarding = (): void => {
    saveSettings({
      onboardingCompleted: true,
      onboardingDismissed: false
    })
    onClose()
  }

  const dismissOnboarding = (): void => {
    saveSettings({
      onboardingDismissed: true
    })
    onClose()
  }

  const handleMicrophone = async (): Promise<void> => {
    setPendingAction('microphone')
    try {
      const status = await window.api.checkMicrophonePermission()
      if (status === 'denied' || status === 'restricted') {
        window.api.openSystemPreferences('microphone')
      } else {
        await window.api.requestMicrophonePermission()
      }
      await checkPermissions()
    } finally {
      setPendingAction(null)
    }
  }

  const handleAccessibility = async (): Promise<void> => {
    setPendingAction('accessibility')
    try {
      const granted = await window.api.requestAccessibilityPermission()
      if (!granted) {
        window.api.openAccessibilitySettings()
      }
      setTimeout(() => {
        void checkPermissions()
      }, 1200)
    } finally {
      setPendingAction(null)
    }
  }

  const handleSpeech = async (): Promise<void> => {
    setPendingAction('speech')
    try {
      const result = await window.api.requestSpeechRecognitionPermission()
      if (!result.granted) {
        window.api.openSystemPreferences('speechRecognition')
      }
      await checkPermissions()
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-xl">
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 border-b border-white/[0.06] bg-[linear-gradient(180deg,rgba(14,15,19,0.98),rgba(8,8,11,0.95))] px-5 py-5 lg:border-b-0 lg:border-r lg:px-6 lg:py-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-orange-300" />
              Setup Guide
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.05em] text-white">
                First-run setup
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Let&apos;s unlock microphone, accessibility and speech access so Toolify can work
                reliably in the packaged app.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-zinc-500">
              <span>Progress</span>
              <span>
                {currentIndex + 1}/{STEP_ORDER.length}
              </span>
            </div>
            <Progress value={progressValue} className="h-1.5 bg-white/[0.08]" />
          </div>

          <div className="grid gap-2">
            {STEP_ORDER.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => setStep(item)}
                className={cn(
                  'flex items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors',
                  item === step ? 'bg-white/[0.08] text-white' : 'bg-white/[0.03] text-zinc-400'
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-xs font-semibold text-zinc-200">
                  {index + 1}
                </div>
                <div className="text-sm capitalize">{item}</div>
              </button>
            ))}
          </div>

          <div className="mt-auto rounded-[20px] bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Status</div>
            <div className="mt-3 space-y-2">
              {summary.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{item.label}</span>
                  <span className="text-zinc-500">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto bg-[linear-gradient(180deg,rgba(18,19,24,0.98),rgba(10,10,14,0.95))] px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center">
            {step === 'welcome' && (
              <StepCard
                eyebrow="Welcome"
                title="We’ll set up the packaged app properly."
                description="The DMG build needs a short permission pass before shortcuts, recording and automatic paste behave correctly."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <FeatureCard
                    icon={<Mic className="h-4 w-4" />}
                    title="Microphone"
                    note="Required for recording."
                  />
                  <FeatureCard
                    icon={<Shield className="h-4 w-4" />}
                    title="Accessibility"
                    note="Required for shortcuts and paste."
                  />
                  <FeatureCard
                    icon={<AudioLines className="h-4 w-4" />}
                    title="Speech"
                    note="Optional for Apple STT."
                  />
                </div>
                <StepActions
                  primaryLabel="Start setup"
                  onPrimary={goNext}
                  secondaryLabel="Set up later"
                  onSecondary={dismissOnboarding}
                />
              </StepCard>
            )}

            {step === 'microphone' && (
              <StepCard
                eyebrow="Step 1"
                title="Grant microphone access"
                description="Without this, Toolify cannot capture audio at all."
              >
                <PermissionStateCard
                  ready={microphoneGranted}
                  title={microphoneGranted ? 'Microphone ready' : 'Microphone access missing'}
                  note={
                    microphoneGranted
                      ? 'macOS already allows audio capture.'
                      : 'Click request to trigger the native permission prompt.'
                  }
                />
                <StepActions
                  primaryLabel={microphoneGranted ? 'Continue' : 'Request microphone'}
                  onPrimary={microphoneGranted ? goNext : () => void handleMicrophone()}
                  primaryLoading={pendingAction === 'microphone'}
                  secondaryLabel="Set up later"
                  onSecondary={dismissOnboarding}
                />
              </StepCard>
            )}

            {step === 'accessibility' && (
              <StepCard
                eyebrow="Step 2"
                title="Enable Accessibility"
                description="This is required for global shortcut capture and automatic paste after transcription."
              >
                <PermissionStateCard
                  ready={accessibilityGranted}
                  title={
                    accessibilityGranted ? 'Accessibility ready' : 'Accessibility access missing'
                  }
                  note={
                    accessibilityGranted
                      ? 'Keyboard automation is available.'
                      : 'Toolify will try to prompt first, then open the correct System Settings page.'
                  }
                />
                <StepActions
                  primaryLabel={accessibilityGranted ? 'Continue' : 'Grant accessibility'}
                  onPrimary={accessibilityGranted ? goNext : () => void handleAccessibility()}
                  primaryLoading={pendingAction === 'accessibility'}
                  secondaryLabel="Set up later"
                  onSecondary={dismissOnboarding}
                />
              </StepCard>
            )}

            {step === 'speech' && (
              <StepCard
                eyebrow="Step 3"
                title="Apple Speech is optional"
                description="Only needed if you want to use the native Apple Speech provider. You can skip this and configure it later."
              >
                <PermissionStateCard
                  ready={speechGranted}
                  title={speechGranted ? 'Speech recognition ready' : 'Optional speech access'}
                  note={
                    speechGranted
                      ? 'Apple Speech can be used immediately.'
                      : 'Request it now, or skip and stay on OpenAI / Local Whisper.'
                  }
                />

                <div className="grid gap-2 sm:grid-cols-3">
                  {PROVIDERS.map((provider) => (
                    <button
                      key={provider.value}
                      type="button"
                      onClick={() => saveSettings({ transcriptionProvider: provider.value })}
                      className={cn(
                        'rounded-[18px] bg-white/[0.04] px-4 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors',
                        settings.transcriptionProvider === provider.value
                          ? 'bg-white/[0.09] text-white'
                          : 'text-zinc-400 hover:bg-white/[0.06]'
                      )}
                    >
                      <div className="text-sm font-medium">{provider.label}</div>
                      <div className="mt-1 text-xs leading-5">{provider.note}</div>
                    </button>
                  ))}
                </div>

                <StepActions
                  primaryLabel={speechGranted ? 'Continue' : 'Request speech access'}
                  onPrimary={speechGranted ? goNext : () => void handleSpeech()}
                  primaryLoading={pendingAction === 'speech'}
                  secondaryLabel="Skip this step"
                  onSecondary={goNext}
                />
              </StepCard>
            )}

            {step === 'finish' && (
              <StepCard
                eyebrow="Finish"
                title="Setup is ready"
                description="You can finish now and continue in Settings at any time."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ChecklistRow ready={microphoneGranted} label="Microphone granted" />
                  <ChecklistRow ready={accessibilityGranted} label="Accessibility granted" />
                  <ChecklistRow ready={speechGranted} label="Speech optional granted" />
                  <ChecklistRow
                    ready={Boolean(settings.transcriptionProvider)}
                    label={`Provider: ${settings.transcriptionProvider ?? 'openai'}`}
                  />
                </div>

                {!requiredReady && (
                  <p className="mt-4 text-sm text-amber-300">
                    Finish is locked until microphone and accessibility are granted.
                  </p>
                )}

                <StepActions
                  primaryLabel="Finish setup"
                  onPrimary={completeOnboarding}
                  primaryDisabled={!requiredReady}
                  secondaryLabel="Set up later"
                  onSecondary={dismissOnboarding}
                />
              </StepCard>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function StepCard({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}): ReactElement {
  return (
    <div className="rounded-[28px] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_30px_70px_rgba(0,0,0,0.24)] sm:p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">{eyebrow}</div>
      <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{description}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  note
}: {
  icon: ReactElement
  title: string
  note: string
}): ReactElement {
  return (
    <div className="rounded-[20px] bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-zinc-200">
        {icon}
      </div>
      <div className="mt-3 text-sm font-medium text-zinc-100">{title}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-400">{note}</div>
    </div>
  )
}

function PermissionStateCard({
  ready,
  title,
  note
}: {
  ready: boolean
  title: string
  note: string
}): ReactElement {
  return (
    <div className="rounded-[22px] bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center gap-2">
        <CheckCircle2 className={cn('h-5 w-5', ready ? 'text-emerald-300' : 'text-zinc-600')} />
        <span className="text-sm font-medium text-zinc-100">{title}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{note}</p>
    </div>
  )
}

function ChecklistRow({ ready, label }: { ready: boolean; label: string }): ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-black/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <CheckCircle2 className={cn('h-4.5 w-4.5', ready ? 'text-emerald-300' : 'text-zinc-600')} />
      <span className="text-sm text-zinc-200">{label}</span>
    </div>
  )
}

function StepActions({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  primaryDisabled,
  primaryLoading
}: {
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel: string
  onSecondary: () => void
  primaryDisabled?: boolean
  primaryLoading?: boolean
}): ReactElement {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
      <Button variant="ghost" onClick={onSecondary} className="justify-start text-zinc-300">
        {secondaryLabel}
      </Button>
      <Button onClick={onPrimary} disabled={primaryDisabled || primaryLoading} className="min-w-40">
        {primaryLoading ? 'Working...' : primaryLabel}
        {!primaryLoading && <ChevronRight className="h-4 w-4" />}
      </Button>
    </div>
  )
}
