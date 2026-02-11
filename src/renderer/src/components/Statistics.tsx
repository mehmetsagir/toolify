import { useEffect, useState } from 'react'
import { BarChart3, Clock, FileText, CheckCircle2, XCircle, Sparkles } from 'lucide-react'
import type { Statistics } from '../../../shared/types'

export function Statistics(): React.JSX.Element {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatistics()

    // Reload statistics when window becomes visible
    const handleVisibility = (): void => {
      if (!document.hidden) {
        loadStatistics()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const loadStatistics = (): void => {
    window.api
      .getStatistics()
      .then((data) => {
        setStats(data || null)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to load statistics:', error)
        setLoading(false)
      })
  }

  if (loading || !stats) {
    return <div className="text-zinc-500 text-sm">Loading...</div>
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US')
  }

  const successRate =
    stats.totalRecordings > 0
      ? ((stats.successfulTranscriptions / stats.totalRecordings) * 100).toFixed(1)
      : '0'

  const mostUsedProvider = Object.entries(stats.providerUsage).reduce(
    (max, [provider, count]) => {
      if (count > max.count) {
        return { provider, count }
      }
      return max
    },
    { provider: 'openai', count: 0 }
  )

  const providerName =
    {
      openai: 'OpenAI Whisper',
      'local-whisper': 'Local Whisper',
      'apple-stt': 'Apple STT',
      'google-cloud': 'Google Cloud'
    }[mostUsedProvider.provider] || 'N/A'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-100">
        <BarChart3 className="w-5 h-5" />
        <h3 className="font-semibold">Statistics</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Total Recordings */}
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Total Recordings</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {formatNumber(stats.totalRecordings)}
          </div>
        </div>

        {/* Total Duration */}
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <Clock className="w-4 h-4" />
            <span>Total Duration</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {formatDuration(stats.totalDuration)}
          </div>
        </div>

        {/* Total Characters */}
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <FileText className="w-4 h-4" />
            <span>Total Characters</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {formatNumber(stats.totalCharacters)}
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{successRate}%</div>
        </div>
      </div>

      {/* Success/Failure Breakdown */}
      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Successful: {formatNumber(stats.successfulTranscriptions)}</span>
          </div>
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-4 h-4" />
            <span>Failed: {formatNumber(stats.failedTranscriptions)}</span>
          </div>
        </div>
      </div>

      {/* Provider Usage */}
      <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
        <div className="text-zinc-400 text-xs mb-2">Model Usage</div>
        <div className="space-y-2">
          {Object.entries(stats.providerUsage)
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([provider, count]) => {
              const providerKey = provider as
                | 'openai'
                | 'local-whisper'
                | 'apple-stt'
                | 'google-cloud'
              const displayName = providerName[providerKey] || provider
              const percentage =
                stats.totalRecordings > 0 ? ((count / stats.totalRecordings) * 100).toFixed(0) : '0'

              return (
                <div key={provider} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{displayName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400">{formatNumber(count)}</span>
                    <span className="text-zinc-500 text-xs">({percentage}%)</span>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {stats.totalRecordings === 0 && (
        <div className="text-center text-zinc-500 text-sm py-4">No recordings yet</div>
      )}
    </div>
  )
}
