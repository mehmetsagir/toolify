import { useMemo, useState } from 'react'
import type { HistoryItem } from '../../../shared/types'
import { useHistory } from '@renderer/hooks/useHistory'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent } from '@renderer/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/utils'
import { Clock3, Copy, Languages, Loader2, Mic2, Search, Trash2 } from 'lucide-react'

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function formatDuration(seconds?: number): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatCaptureTotal(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

function HistoryStat({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint: string
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/70 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">{value}</div>
      <div className="mt-1 text-xs text-zinc-400">{hint}</div>
    </div>
  )
}

function EmptyState({
  title,
  description
}: {
  title: string
  description: string
}): React.ReactElement {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-800 bg-zinc-950/70 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <Clock3 className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-zinc-100">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{description}</p>
    </div>
  )
}

function HistoryEntryCard({
  item,
  onCopy,
  onDelete
}: {
  item: HistoryItem
  onCopy: (text: string) => void
  onDelete: (id: string) => void
}): React.ReactElement {
  const translationLabel =
    item.translated && item.sourceLanguage && item.targetLanguage
      ? `${item.sourceLanguage.toUpperCase()} -> ${item.targetLanguage.toUpperCase()}`
      : 'Translated'

  return (
    <Card className="overflow-hidden border-zinc-800/80 bg-zinc-900/80 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] transition-colors hover:border-zinc-700 hover:bg-zinc-900">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-2.5 py-1 text-zinc-400">
                  {formatDate(item.timestamp)}
                </span>
                {item.provider && (
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                    {item.provider}
                  </span>
                )}
              </div>

              <p className="mt-3 text-sm leading-6 text-zinc-100 line-clamp-4">{item.text}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.duration && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-200"
                  >
                    <Mic2 className="mr-1 h-3.5 w-3.5" />
                    {formatDuration(item.duration)}
                  </Badge>
                )}
                {item.translated && (
                  <Badge
                    variant="success"
                    className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/15"
                  >
                    <Languages className="mr-1 h-3.5 w-3.5" />
                    {translationLabel}
                  </Badge>
                )}
                {item.success === false && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-amber-700/70 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200"
                  >
                    Needs review
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={() => onCopy(item.text)}
                title="Copy transcription"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-red-900 hover:bg-red-500/10 hover:text-red-200"
                onClick={() => onDelete(item.id)}
                title="Delete transcription"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function History(): React.ReactElement {
  const { items, settings, loading, deleteItem, clearAll } = useHistory()
  const [search, setSearch] = useState('')
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter(
      (item) => item.text.toLowerCase().includes(q) || item.provider?.toLowerCase().includes(q)
    )
  }, [items, search])

  const stats = useMemo(() => {
    const translatedCount = items.filter((item) => item.translated).length
    const providerCount = new Set(items.map((item) => item.provider).filter(Boolean)).size
    const totalRecordedSeconds = items.reduce((total, item) => total + (item.duration ?? 0), 0)

    return {
      translatedCount,
      providerCount,
      totalRecordedSeconds
    }
  }, [items])

  const copyToClipboard = (text: string): void => {
    void navigator.clipboard.writeText(text)
  }

  const retentionLabel =
    settings?.autoDeleteDays && settings.autoDeleteDays > 0
      ? `Auto-delete after ${settings.autoDeleteDays}d`
      : 'Manual retention'

  const capacityLabel =
    settings?.maxHistoryItems && settings.maxHistoryItems > 0
      ? `${items.length}/${settings.maxHistoryItems} slots used`
      : `${items.length} items stored`

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-300 shadow-[0_20px_40px_-30px_rgba(0,0,0,0.9)]">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          Loading history...
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 text-zinc-100">
      <div className="overflow-hidden rounded-[28px] border border-zinc-800/80 bg-[linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] shadow-[0_24px_60px_-40px_rgba(0,0,0,1)]">
        <div className="border-b border-zinc-800/80 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Archive
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
                Transcription history
              </h1>
              <p className="mt-2 text-sm text-zinc-400">
                Search, review, and prune captured dictation from one compact utility panel.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs text-zinc-400 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Capacity
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-100">{capacityLabel}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Retention
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-100">{retentionLabel}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="Search transcriptions or providers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-xl border-zinc-700/80 bg-zinc-950/90 pl-10 pr-4 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-zinc-500 focus-visible:ring-zinc-500"
              />
            </div>

            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-red-900/80 bg-red-500/10 px-4 text-red-200 hover:bg-red-500/15 hover:text-red-100"
                  disabled={items.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear all
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear All History</DialogTitle>
                  <DialogDescription>
                    This will permanently delete all {items.length} transcription records. This
                    action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await clearAll()
                      setClearDialogOpen(false)
                    }}
                  >
                    Delete All
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <HistoryStat label="Saved" value={String(items.length)} hint="Total archived captures" />
        <HistoryStat
          label="Translated"
          value={String(stats.translatedCount)}
          hint="Entries with language conversion"
        />
        <HistoryStat
          label="Captured"
          value={formatCaptureTotal(stats.totalRecordedSeconds)}
          hint={
            stats.providerCount > 0
              ? `${stats.providerCount} provider${stats.providerCount === 1 ? '' : 's'} used`
              : 'No provider metadata yet'
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-zinc-800/80 bg-zinc-950/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        {filtered.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? 'No history yet' : 'No matches found'}
            description={
              items.length === 0
                ? 'Your completed transcriptions will appear here so they can be copied or cleaned up later.'
                : `No entries matched "${search}". Try a different keyword or clear the search.`
            }
          />
        ) : (
          <div className="custom-scrollbar flex h-full flex-col gap-3 overflow-y-auto pr-1">
            {filtered.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
                  index > 0 && 'delay-75'
                )}
              >
                <HistoryEntryCard
                  item={item}
                  onCopy={copyToClipboard}
                  onDelete={(id) => {
                    void deleteItem(id)
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
