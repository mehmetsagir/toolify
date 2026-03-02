import { useState, useEffect } from 'react'
import type { ReactElement, ReactNode } from 'react'
import {
  Settings2,
  Languages,
  Mic,
  Clock,
  Shield,
  Info,
  HardDrive,
  ArrowUpRight
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@renderer/components/ui/tabs'
import { cn } from '@renderer/lib/utils'
import { useSettings } from '@renderer/hooks/useSettings'
import GeneralSettings from './GeneralSettings'
import DictationSettings from './DictationSettings'
import AudioSettings from './AudioSettings'
import ModelsSettings from './ModelsSettings'
import HistorySettings from './HistorySettings'
import PermissionsSettings from './PermissionsSettings'
import UpdateBanner from './UpdateBanner'
import AboutSection from './AboutSection'

const TABS = [
  {
    value: 'general',
    label: 'General',
    icon: Settings2,
    eyebrow: 'Workspace',
    description: 'Daily behavior, launch preferences, alerts and completion feedback.',
    detail: 'Core app behavior'
  },
  {
    value: 'dictation',
    label: 'Dictation',
    icon: Languages,
    eyebrow: 'Capture',
    description: 'Provider, language flow and translation rules for each transcription.',
    detail: 'Speech pipeline'
  },
  {
    value: 'audio',
    label: 'Audio',
    icon: Mic,
    eyebrow: 'Control',
    description: 'Keyboard trigger, overlay visibility and recording feedback.',
    detail: 'Input controls'
  },
  {
    value: 'models',
    label: 'Models',
    icon: HardDrive,
    eyebrow: 'Offline',
    description: 'Download, inspect and remove on-device Whisper models.',
    detail: 'Local runtime assets'
  },
  {
    value: 'history',
    label: 'History',
    icon: Clock,
    eyebrow: 'Library',
    description: 'Retention windows, capacity limits and destructive cleanup actions.',
    detail: 'Saved sessions'
  },
  {
    value: 'permissions',
    label: 'Permissions',
    icon: Shield,
    eyebrow: 'Security',
    description: 'macOS access checks for microphone, accessibility and speech APIs.',
    detail: 'System access'
  },
  {
    value: 'about',
    label: 'About',
    icon: Info,
    eyebrow: 'Product',
    description: 'Version details, usage totals and provider distribution in one place.',
    detail: 'App profile'
  }
] as const

type TabValue = (typeof TABS)[number]['value']

interface SectionPanelProps {
  tab: (typeof TABS)[number]
  children: ReactNode
}

function SectionPanel({ tab, children }: SectionPanelProps): ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,rgba(17,18,24,0.94),rgba(10,10,14,0.9))] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_24px_70px_rgba(0,0,0,0.22)]">
      <div className="bg-[linear-gradient(180deg,rgba(39,39,42,0.16),rgba(9,9,11,0.03))] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
              {tab.eyebrow}
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-zinc-50 sm:text-2xl">
              {tab.label}
            </h3>
          </div>
          <div className="rounded-full bg-white/[0.035] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            {tab.detail}
          </div>
        </div>
        <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400">{tab.description}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.24))]">
        {children}
      </div>
    </div>
  )
}

export default function Settings(): ReactElement {
  const [activeTab, setActiveTab] = useState<TabValue>('general')
  const { settings, loading, saveSettings } = useSettings()

  useEffect(() => {
    const cleanup = window.api.onShowHistory(() => {
      setActiveTab('history')
    })
    return cleanup
  }, [])

  if (loading || !settings) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.08),transparent_30%),radial-gradient(circle_at_right,_rgba(56,189,248,0.08),transparent_28%),linear-gradient(180deg,#09090b_0%,#111318_100%)]">
        <div className="flex items-center gap-3 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-400 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
          Loading settings workspace
        </div>
      </div>
    )
  }

  const renderTabContent = (tab: TabValue): ReactElement => {
    switch (tab) {
      case 'general':
        return <GeneralSettings settings={settings} saveSettings={saveSettings} />
      case 'dictation':
        return <DictationSettings settings={settings} saveSettings={saveSettings} />
      case 'audio':
        return <AudioSettings settings={settings} saveSettings={saveSettings} />
      case 'models':
        return <ModelsSettings />
      case 'history':
        return <HistorySettings />
      case 'permissions':
        return <PermissionsSettings />
      case 'about':
        return <AboutSection />
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.08),transparent_30%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.08),transparent_30%),linear-gradient(180deg,#09090b_0%,#111318_100%)] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0,transparent_32%,transparent_68%,rgba(255,255,255,0.03)_100%)] opacity-50" />
      <UpdateBanner />
      <div className="relative flex min-h-0 flex-1 overflow-hidden p-2.5 sm:p-3.5 md:p-4">
        <Tabs
          orientation="vertical"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden rounded-[24px] bg-black/10 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_28px_90px_rgba(0,0,0,0.38)] backdrop-blur-sm xl:flex-row"
        >
          <aside className="flex shrink-0 flex-col xl:w-[320px]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,rgba(24,24,27,0.9),rgba(9,9,11,0.82))] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
              <div className="px-4 py-4 sm:px-5 sm:py-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.035] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                  Preferences Console
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-zinc-50">
                  Toolify settings
                </h1>
                <p className="mt-2.5 max-w-md text-sm leading-6 text-zinc-400">
                  A focused desktop workspace for dictation, automation, privacy and product status.
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 pb-2.5 sm:px-3 sm:pb-3">
                <TabsList className="custom-scrollbar h-auto w-full flex-wrap items-stretch justify-start gap-2 overflow-y-auto bg-transparent p-0 xl:flex-1 xl:flex-col xl:flex-nowrap xl:pr-1">
                  {TABS.map(({ value, label, icon: Icon, eyebrow, description }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={cn(
                        'h-auto basis-[calc(50%-0.25rem)] justify-start whitespace-normal rounded-[18px] bg-transparent px-3 py-3 text-left text-zinc-300 shadow-none sm:basis-[calc(33.333%-0.4rem)] xl:w-full xl:basis-auto xl:px-3.5 xl:py-3.5',
                        'hover:bg-white/[0.04] hover:text-zinc-100',
                        'data-[state=active]:bg-white/[0.06] data-[state=active]:text-zinc-50 data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]'
                      )}
                    >
                      <div className="flex w-full min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/24 text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">
                            {eyebrow}
                          </div>
                          <div className="mt-1 flex min-w-0 items-start justify-between gap-3">
                            <span className="min-w-0 break-words text-sm font-medium">{label}</span>
                            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                          </div>
                          <p className="mt-1.5 line-clamp-2 break-words pr-4 text-[11px] leading-5 text-zinc-500">
                            {description}
                          </p>
                        </div>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
          </aside>

          <div className="min-h-0 flex-1">
            {TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="m-0 h-full">
                <SectionPanel tab={tab}>{renderTabContent(tab.value)}</SectionPanel>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  )
}
