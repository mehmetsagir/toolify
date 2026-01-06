import React from 'react'
import { Trash2, History as HistoryIcon } from 'lucide-react'

interface HistorySettingsProps {
  autoDeleteDays: number
  setAutoDeleteDays: (val: number) => void
  maxItems: number
  setMaxItems: (val: number) => void
}

export const HistorySettings: React.FC<HistorySettingsProps> = ({
  autoDeleteDays,
  setAutoDeleteDays,
  maxItems,
  setMaxItems
}) => {
  return (
    <div className="space-y-6 pt-8 border-t border-white/5">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1.5 tracking-tight">History</h3>
        <p className="text-sm text-zinc-500">Manage transcription history storage and cleanup</p>
      </div>
      <div className="space-y-4">
        {/* Auto Delete Days */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <Trash2 size={12} />
            <span>Auto Delete After (Days)</span>
          </div>
          <div className="relative group">
            <input
              type="number"
              value={autoDeleteDays}
              onChange={(e) => setAutoDeleteDays(parseInt(e.target.value) || 0)}
              min="0"
              placeholder="0 = Never delete"
              className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
          </div>
          <p className="text-[10px] text-zinc-600 px-1">
            {autoDeleteDays === 0
              ? 'History items will never be automatically deleted'
              : `Items older than ${autoDeleteDays} days will be automatically deleted`}
          </p>
        </div>

        {/* Max Items */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <HistoryIcon size={12} />
            <span>Maximum History Items</span>
          </div>
          <div className="relative group">
            <input
              type="number"
              value={maxItems}
              onChange={(e) => setMaxItems(parseInt(e.target.value) || 0)}
              min="0"
              placeholder="0 = Unlimited"
              className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
          </div>
          <p className="text-[10px] text-zinc-600 px-1">
            {maxItems === 0
              ? 'Unlimited history items'
              : `Keep only the ${maxItems} most recent items`}
          </p>
        </div>

        {/* Clear Old History Button */}
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
          <button
            onClick={async () => {
              if (window.api?.clearOldHistory) {
                try {
                  const deletedCount = await window.api.clearOldHistory()
                  if (deletedCount > 0) {
                    alert(`Cleared ${deletedCount} old history item(s)`)
                  } else {
                    alert('No old items to clear')
                  }
                } catch (error) {
                  console.error('Failed to clear old history:', error)
                  alert('Failed to clear old history')
                }
              }
            }}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg px-4 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            <span>Clear Old History Now</span>
          </button>
        </div>
      </div>
    </div>
  )
}
