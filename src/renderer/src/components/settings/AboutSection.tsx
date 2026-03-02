import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { Github, Mic, FileText, Clock, Cpu } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import type { Statistics } from '../../../../shared/types'

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI Whisper',
  'local-whisper': 'Local Whisper',
  'apple-stt': 'Apple Speech',
  'google-cloud': 'Google Cloud STT'
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hours}h ${remainMins}m`
}

function formatNumber(n: number): string {
  return n.toLocaleString()
}

interface StatCardProps {
  icon: ReactElement
  label: string
  value: string
}

function StatCard({ icon, label, value }: StatCardProps): ReactElement {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        {icon}
        {label}
      </div>
      <span className="text-lg font-semibold text-zinc-100 tabular-nums">{value}</span>
    </div>
  )
}

export default function AboutSection(): ReactElement {
  const [version, setVersion] = useState<string>('')
  const [statistics, setStatistics] = useState<Statistics | null>(null)

  useEffect(() => {
    Promise.all([window.api.getVersion(), window.api.getStatistics()]).then(([v, stats]) => {
      setVersion(v)
      setStatistics(stats ?? null)
    })
  }, [])

  const providerEntries = statistics
    ? Object.entries(statistics.providerUsage).filter(([, count]) => count > 0)
    : []

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      {/* App identity */}
      <div className="flex flex-col gap-3 rounded-[24px] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Mic className="h-6 w-6 text-zinc-200" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Toolify</h2>
            {version && <p className="text-xs text-zinc-500">Version {version}</p>}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.api.openExternal('https://github.com/mehmetsagir/toolify')}
          className="gap-1.5 self-start rounded-xl border-zinc-700/70 bg-black/20 sm:self-auto"
        >
          <Github className="h-4 w-4" />
          View on GitHub
        </Button>
      </div>

      {/* Statistics */}
      {statistics && (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Usage Statistics
            </span>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <StatCard
                icon={<Mic className="h-3.5 w-3.5" />}
                label="Total Recordings"
                value={formatNumber(statistics.totalRecordings)}
              />
              <StatCard
                icon={<FileText className="h-3.5 w-3.5" />}
                label="Total Characters"
                value={formatNumber(statistics.totalCharacters)}
              />
              <StatCard
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Total Duration"
                value={formatDuration(statistics.totalDuration)}
              />
              <StatCard
                icon={<Cpu className="h-3.5 w-3.5" />}
                label="Successful"
                value={formatNumber(statistics.successfulTranscriptions)}
              />
            </div>
          </div>

          {providerEntries.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Provider Usage
              </span>
              <div className="overflow-hidden rounded-[22px] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                {providerEntries.map(([provider, count]) => {
                  const total = statistics.totalRecordings || 1
                  const pct = Math.round((count / total) * 100)
                  return (
                    <div
                      key={provider}
                      className="flex items-center justify-between px-4 py-3 not-last:border-b not-last:border-white/[0.04]"
                    >
                      <span className="text-sm text-zinc-300">
                        {PROVIDER_LABELS[provider] ?? provider}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-zinc-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-xs tabular-nums text-zinc-500">
                          {count}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
