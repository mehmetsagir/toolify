import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Label } from '@renderer/components/ui/label'
import { Button } from '@renderer/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import type { HistorySettings as HistorySettingsType } from '../../../../shared/types'

const AUTO_DELETE_OPTIONS = [
  { value: '0', label: 'Never' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' }
]

const MAX_ITEMS_OPTIONS = [
  { value: '0', label: 'Unlimited' },
  { value: '50', label: '50 items' },
  { value: '100', label: '100 items' },
  { value: '200', label: '200 items' },
  { value: '500', label: '500 items' }
]

export default function HistorySettings(): ReactElement {
  const [historySettings, setHistorySettings] = useState<HistorySettingsType | null>(null)
  const [historyCount, setHistoryCount] = useState<number>(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    Promise.all([window.api.getHistorySettings(), window.api.getAllHistory()]).then(
      ([hs, items]) => {
        setHistorySettings(hs)
        setHistoryCount(items.length)
      }
    )
  }, [])

  const handleAutoDeleteChange = async (value: string): Promise<void> => {
    const days = parseInt(value, 10)
    const updated: HistorySettingsType = {
      autoDeleteDays: days,
      maxHistoryItems: historySettings?.maxHistoryItems ?? 0
    }
    setHistorySettings(updated)
    await window.api.saveHistorySettings(updated)
  }

  const handleMaxItemsChange = async (value: string): Promise<void> => {
    const count = parseInt(value, 10)
    const updated: HistorySettingsType = {
      autoDeleteDays: historySettings?.autoDeleteDays ?? 0,
      maxHistoryItems: count
    }
    setHistorySettings(updated)
    await window.api.saveHistorySettings(updated)
  }

  const handleClearHistory = async (): Promise<void> => {
    setClearing(true)
    try {
      await window.api.clearHistory()
      setHistoryCount(0)
    } finally {
      setClearing(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="rounded-[20px] bg-white/[0.03] divide-y divide-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="px-4 py-3 flex flex-col gap-1.5">
          <Label className="text-xs text-zinc-400">Auto-Delete After</Label>
          <Select
            value={String(historySettings?.autoDeleteDays ?? 0)}
            onValueChange={handleAutoDeleteChange}
            disabled={historySettings === null}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTO_DELETE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="px-4 py-3 flex flex-col gap-1.5">
          <Label className="text-xs text-zinc-400">Maximum History Items</Label>
          <Select
            value={String(historySettings?.maxHistoryItems ?? 0)}
            onValueChange={handleMaxItemsChange}
            disabled={historySettings === null}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAX_ITEMS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* History count + clear */}
      <div className="rounded-[20px] bg-white/[0.03] p-4 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-200">Saved Recordings</span>
          <span className="text-xs text-zinc-500">
            {historyCount === 0
              ? 'No recordings saved'
              : `${historyCount} recording${historyCount !== 1 ? 's' : ''} stored`}
          </span>
        </div>
        {!showConfirm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={historyCount === 0}
            className="text-red-400 border-red-900 hover:bg-red-950 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear All
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Are you sure?
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearHistory}
              disabled={clearing}
            >
              {clearing ? 'Clearing...' : 'Confirm'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
