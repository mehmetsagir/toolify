import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Trash2,
  Copy,
  Clock,
  Calendar,
  Mic,
  CheckCircle2
} from 'lucide-react'
import type { HistoryItem } from '../../../shared/types'

interface HistoryProps {
  onClose: () => void
  onCopy: (text: string) => void
}

type FilterType = 'all' | 'today' | 'week'

export const History: React.FC<HistoryProps> = ({ onCopy }) => {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async (): Promise<void> => {
    try {
      const items = await window.api.getAllHistory()
      setHistory(items)
      if (items.length > 0 && !selectedItemId) {
        setSelectedItemId(items[0].id)
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }

  const filteredHistory = useMemo(() => {
    let filtered = history

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.text.toLowerCase().includes(query) ||
          (item.sourceLanguage && item.sourceLanguage.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000

    switch (activeFilter) {
      case 'today':
        filtered = filtered.filter((item) => item.timestamp >= today)
        break
      case 'week':
        filtered = filtered.filter((item) => item.timestamp >= weekAgo)
        break
    }

    return filtered
  }, [history, searchQuery, activeFilter])

  const selectedItem = useMemo(
    () => history.find((item) => item.id === selectedItemId),
    [history, selectedItemId]
  )

  const handleDelete = async (id: string): Promise<void> => {
    try {
      const success = await window.api.deleteHistoryItem(id)
      if (success) {
        setHistory((prev) => prev.filter((item) => item.id !== id))
        if (selectedItemId === id) {
          setSelectedItemId(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const handleCopy = (text: string) => {
    onCopy(text)
    setCopiedId(selectedItemId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return ''
    return `${Math.round(seconds)}s`
  }

  const getFilterCount = (type: FilterType): number => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000

    switch (type) {
      case 'all':
        return history.length
      case 'today':
        return history.filter((item) => item.timestamp >= today).length
      case 'week':
        return history.filter((item) => item.timestamp >= weekAgo).length
    }
  }

  const getTotalDuration = (): string => {
    const totalSeconds = history.reduce((acc, item) => acc + (item.duration || 0), 0)
    if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`
    const minutes = Math.floor(totalSeconds / 60)
    return `${minutes}m`
  }

  return (
    <div className="flex h-full w-full bg-[#1C1C1E] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 bg-[#1C1C1E] border-r border-white/5 flex flex-col">
        <div className="p-4 pt-8">
          <h2 className="text-sm font-medium text-zinc-400 mb-4 px-2">Dictation History</h2>
          <div className="space-y-1">
            <SidebarItem
              icon={<Mic size={18} />}
              label="All"
              count={getFilterCount('all')}
              active={activeFilter === 'all'}
              color="bg-blue-500"
              onClick={() => setActiveFilter('all')}
            />
            <SidebarItem
              icon={<Calendar size={18} />}
              label="Today"
              count={getFilterCount('today')}
              active={activeFilter === 'today'}
              color="bg-green-500"
              onClick={() => setActiveFilter('today')}
            />
            <SidebarItem
              icon={<Clock size={18} />}
              label="This Week"
              count={getFilterCount('week')}
              active={activeFilter === 'week'}
              color="bg-orange-500"
              onClick={() => setActiveFilter('week')}
            />
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-zinc-500 px-2">
            <span>Total Duration</span>
            <span>{getTotalDuration()}</span>
          </div>
          <button
            onClick={() => window.api.clearHistory().then(() => setHistory([]))}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 transition-colors"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        </div>
      </div>

      {/* List View */}
      <div className="w-80 flex-shrink-0 bg-[#1C1C1E] border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-zinc-900 text-white rounded-lg pl-9 pr-4 py-2 text-sm border border-white/5 focus:border-white/10 focus:outline-none placeholder:text-zinc-600"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItemId(item.id)}
              className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${
                selectedItemId === item.id ? 'bg-blue-500/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${selectedItemId === item.id ? 'text-blue-400' : 'text-zinc-400'}`}>
                  {formatDate(item.timestamp)}
                </span>
                <span className="text-xs text-zinc-600">{formatDuration(item.duration)}</span>
              </div>
              <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">
                {item.text || <span className="italic text-zinc-600">No transcription</span>}
              </p>
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-white/5 text-center text-xs text-zinc-600">
          {filteredHistory.length} of {history.length}
        </div>
      </div>

      {/* Detail View */}
      <div className="flex-1 bg-[#1C1C1E] flex flex-col min-w-0">
        {selectedItem ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="mb-8">
                <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Transcription</h3>
                <p className="text-lg text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.text}
                </p>
              </div>

              <div className="border-t border-white/5 pt-6">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-white/5">
                    <DetailRow label="Date" value={formatDate(selectedItem.timestamp)} />
                    <DetailRow label="Duration" value={formatDuration(selectedItem.duration)} />
                    <DetailRow label="Provider" value={selectedItem.provider || 'Unknown'} />
                    <DetailRow label="Language" value={selectedItem.sourceLanguage || 'Auto'} />
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-white/5 flex items-center justify-between bg-[#1C1C1E]">
              <button
                onClick={() => handleCopy(selectedItem.text)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
              >
                {copiedId === selectedItem.id ? (
                  <>
                    <CheckCircle2 size={16} className="text-green-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleDelete(selectedItem.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Select an item to view details
          </div>
        )}
      </div>
    </div>
  )
}

interface SidebarItemProps {
  icon: React.ReactElement
  label: string
  count: number
  active: boolean
  color: string
  onClick: () => void
}

const SidebarItem = ({ icon, label, count, active, color, onClick }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
      active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-md ${active ? color : 'bg-zinc-800'} text-white`}>
        {React.isValidElement(icon) ? React.cloneElement(icon, { size: 14 } as React.HTMLAttributes<SVGElement>) : icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
    <span className="text-xs opacity-60">{count}</span>
  </button>
)

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <tr className="group">
    <td className="py-3 text-zinc-500 w-32">{label}</td>
    <td className="py-3 text-zinc-300">{value}</td>
  </tr>
)
